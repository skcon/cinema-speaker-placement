import { Html, Line, OrthographicCamera } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useRef, type ReactNode, type RefObject } from 'react'
import type { Room, RoomPoint } from '@/domain'
import { cn } from '@/ui/lib/utils'
import {
  FLAT_ON_FLOOR,
  floorGrid,
  floorOutline,
  floorPlane,
  frontWall,
  toScenePosition,
  topDownCamera,
  type Segment,
} from '@/scene/top-down'

/** Neutral palette matching the light theme; the MLP gets the one accent. */
const COLORS = {
  floor: '#f5f5f5',
  grid: '#e5e5e5',
  walls: '#737373',
  frontWall: '#171717',
  mlp: '#2563eb',
} as const

/**
 * Small heights (in meters) that stack the flat floor layers so they don't
 * z-fight. The top-down camera is orthographic, so they don't move anything.
 */
const LAYER = { grid: 0.005, walls: 0.01 } as const

/** Radius of the MLP marker, in meters. */
const MLP_MARKER_RADIUS = 0.18

/**
 * The react-three-fiber scene: the Room drawn to scale from straight above,
 * fit to the panel, with the MLP marker. Loaded lazily, so Three.js stays
 * out of the main bundle.
 */
export function RoomCanvas({
  room,
  mlp,
  gridSpacing,
}: {
  room: Room
  mlp: RoomPoint
  /** Distance between floor grid lines, in meters. */
  gridSpacing: number
}) {
  // Labels render into this layer over the canvas. Without a fixed target,
  // drei's Html can remount once r3f connects events and lose its content.
  const labelLayer = useRef<HTMLDivElement>(null!)
  return (
    <div className="absolute inset-0">
      <Canvas frameloop="demand" flat dpr={[1, 2]}>
        <TopDownCamera room={room} />
        <Floor room={room} />
        <FloorGrid room={room} spacing={gridSpacing} />
        <Walls room={room} labelLayer={labelLayer} />
        <MlpMarker mlp={mlp} labelLayer={labelLayer} />
      </Canvas>
      <div ref={labelLayer} className="pointer-events-none absolute inset-0" />
    </div>
  )
}

type LabelLayer = RefObject<HTMLDivElement>

/** A text label pinned to a room point, drawn as HTML over the canvas. */
function SceneLabel({
  at,
  layer,
  className,
  children,
}: {
  at: RoomPoint
  layer: LabelLayer
  className: string
  children: ReactNode
}) {
  return (
    <Html position={toScenePosition(at)} portal={layer} center>
      <span
        className={cn('block text-xs whitespace-nowrap select-none', className)}
      >
        {children}
      </span>
    </Html>
  )
}

function TopDownCamera({ room }: { room: Room }) {
  const size = useThree((state) => state.size)
  return <OrthographicCamera makeDefault {...topDownCamera(room, size)} />
}

function Floor({ room }: { room: Room }) {
  const { position, rotation, size } = floorPlane(room)
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={COLORS.floor} />
    </mesh>
  )
}

function FloorGrid({ room, spacing }: { room: Room; spacing: number }) {
  const { across, down } = floorGrid(room, spacing)
  return [...across, ...down].map((segment, index) => (
    <FloorLine
      key={index}
      points={segment}
      z={LAYER.grid}
      color={COLORS.grid}
      width={1}
    />
  ))
}

function Walls({ room, labelLayer }: { room: Room; labelLayer: LabelLayer }) {
  const outline = floorOutline(room)
  return (
    <>
      <FloorLine
        points={[...outline, outline[0]!]}
        z={LAYER.walls}
        color={COLORS.walls}
        width={2}
      />
      <FloorLine
        points={frontWall(room)}
        z={LAYER.walls}
        color={COLORS.frontWall}
        width={5}
      />
      {/* Room coordinates start at the middle of the front wall; the label
          sits a fixed few pixels above it at any zoom. */}
      <SceneLabel
        at={{ x: 0, y: 0, z: 0 }}
        layer={labelLayer}
        className="-translate-y-3.5 text-muted-foreground"
      >
        Front wall
      </SceneLabel>
    </>
  )
}

/** A line on the floor at layer height `z`, `width` pixels wide. */
function FloorLine({
  points,
  z,
  color,
  width,
}: {
  points: RoomPoint[] | Segment
  z: number
  color: string
  width: number
}) {
  return (
    <Line
      points={points.map((point) => toScenePosition({ ...point, z }))}
      color={color}
      lineWidth={width}
    />
  )
}

function MlpMarker({
  mlp,
  labelLayer,
}: {
  mlp: RoomPoint
  labelLayer: LabelLayer
}) {
  return (
    <>
      <mesh position={toScenePosition(mlp)} rotation={FLAT_ON_FLOOR}>
        <circleGeometry args={[MLP_MARKER_RADIUS, 32]} />
        <meshBasicMaterial color={COLORS.mlp} />
      </mesh>
      {/* Shifted below the marker by CSS, so it never covers it. */}
      <SceneLabel
        at={mlp}
        layer={labelLayer}
        className="translate-y-5 font-medium text-blue-600"
      >
        MLP
      </SceneLabel>
    </>
  )
}
