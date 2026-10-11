import { Html, Line, OrthographicCamera } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { cn } from 'cn'
import {
  Fragment,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  floorCorners,
  wallBases,
  type PlacedSpeaker,
  type Room,
  type RoomPoint,
} from '@/domain'
import {
  GRADE_STYLES,
  SPEAKER_FOOTPRINT,
  speakerMarker,
  type ScreenDirection,
} from '@/scene/speakers'
import {
  FLAT_ON_FLOOR,
  floorGrid,
  floorPlane,
  toScenePosition,
  topDownCamera,
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

/** Free space between a speaker's center and its label, in pixels. */
const SPEAKER_LABEL_GAP_PX = 14

/**
 * The react-three-fiber scene: the Room drawn to scale from straight above,
 * fit to the panel, with the MLP marker and the speakers colored by grade.
 * Loaded lazily, so Three.js stays out of the main bundle.
 */
export function RoomCanvas({
  room,
  mlp,
  speakers,
  gridSpacing,
}: {
  room: Room
  mlp: RoomPoint
  speakers: readonly PlacedSpeaker[]
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
        <SpeakerMarkers speakers={speakers} labelLayer={labelLayer} />
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
  style,
  children,
}: {
  at: RoomPoint
  layer: LabelLayer
  className: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <Html position={toScenePosition(at)} portal={layer} center>
      <span
        className={cn('block text-xs whitespace-nowrap select-none', className)}
        style={style}
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
  const corners = floorCorners(room)
  return (
    <>
      <FloorLine
        points={[...corners, corners[0]]}
        z={LAYER.walls}
        color={COLORS.walls}
        width={2}
      />
      <FloorLine
        points={wallBases(room).front}
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
  points: readonly RoomPoint[]
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

function SpeakerMarkers({
  speakers,
  labelLayer,
}: {
  speakers: readonly PlacedSpeaker[]
  labelLayer: LabelLayer
}) {
  return speakers.map((speaker) => {
    const { position, rotation, color, label, grade, labelDirection } =
      speakerMarker(speaker)
    return (
      <Fragment key={speaker.channel}>
        <mesh position={position} rotation={rotation}>
          <planeGeometry
            args={[SPEAKER_FOOTPRINT.width, SPEAKER_FOOTPRINT.depth]}
          />
          <meshBasicMaterial color={color} />
        </mesh>
        <SceneLabel
          at={speaker.position}
          layer={labelLayer}
          className="flex flex-col items-center leading-tight"
          style={{ transform: besideMarker(labelDirection) }}
        >
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">
            {GRADE_STYLES[grade].label}
          </span>
        </SceneLabel>
      </Fragment>
    )
  })
}

/**
 * A CSS transform that moves a centered label off its marker along
 * `direction`, by half its own size plus a gap, so the two never overlap.
 */
function besideMarker({ x, y }: ScreenDirection): string {
  const gap = `${SPEAKER_LABEL_GAP_PX}px`
  return `translate(calc(${x} * (50% + ${gap})), calc(${y} * (50% + ${gap})))`
}
