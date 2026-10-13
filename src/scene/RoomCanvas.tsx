import { Html, Line, OrthographicCamera } from '@react-three/drei'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { cn } from 'cn'
import {
  Fragment,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { Plane, Vector3 } from 'three'
import {
  floorCorners,
  MLP_ID,
  type FloorPoint,
  wallBases,
  type PlaceableId,
  type PlacedSpeaker,
  type PlacedSubwoofer,
  type Room,
  type RoomPoint,
} from '@/domain'
import {
  GRADE_STYLES,
  SPEAKER_FOOTPRINT,
  speakerMarker,
  SUBWOOFER_FOOTPRINT,
  subwooferMarker,
  type ScreenDirection,
} from '@/scene/speakers'
import {
  FLAT_ON_FLOOR,
  floorGrid,
  floorPlane,
  grabRadius,
  toFloorPoint,
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
const LAYER = { grid: 0.005, walls: 0.01, grab: 0.015 } as const

/** Radius of the MLP marker, in meters. */
const MLP_MARKER_RADIUS = 0.18

/** Free space between a speaker's center and its label, in pixels. */
const SPEAKER_LABEL_GAP_PX = 14

/**
 * Dragging items on the floor plan. A drag is `start`, any number of
 * `move`s (the point under the pointer, keeping where the item was
 * grabbed) and `end`, so it can become one undo step.
 */
export type DragHandlers = {
  start: () => void
  move: (id: PlaceableId, to: FloorPoint) => void
  end: () => void
}

/** The floor plane in Three.js coordinates, where pointer rays are read. */
const FLOOR = new Plane(new Vector3(0, 1, 0), 0)

/**
 * The react-three-fiber scene: the Room drawn to scale from straight above,
 * fit to the panel, with the MLP marker and the speakers colored by grade,
 * all of which can be dragged. Loaded lazily, so Three.js stays out of the
 * main bundle.
 */
export function RoomCanvas({
  room,
  mlp,
  speakers,
  subwoofers,
  gridSpacing,
  drag,
}: {
  room: Room
  mlp: RoomPoint
  speakers: readonly PlacedSpeaker[]
  subwoofers: readonly PlacedSubwoofer[]
  /** Distance between floor grid lines, in meters. */
  gridSpacing: number
  drag: DragHandlers
}) {
  // Labels render into this layer over the canvas. Without a fixed target,
  // drei's Html can remount once r3f connects events and lose its content.
  const labelLayer = useRef<HTMLDivElement>(null!)
  const [cursor, setCursor] = useState<DragCursor>('auto')
  const grab: Grab = { room, drag, setCursor }
  return (
    <div className="absolute inset-0" style={{ cursor }}>
      {/* No touch scrolling or zooming over the room, so a finger can drag. */}
      <Canvas
        frameloop="demand"
        flat
        dpr={[1, 2]}
        style={{ touchAction: 'none' }}
      >
        <TopDownCamera room={room} />
        <Floor room={room} />
        <FloorGrid room={room} spacing={gridSpacing} />
        <Walls room={room} labelLayer={labelLayer} />
        <MlpMarker mlp={mlp} labelLayer={labelLayer} grab={grab} />
        <SubwooferMarkers
          subwoofers={subwoofers}
          labelLayer={labelLayer}
          grab={grab}
        />
        <SpeakerMarkers
          speakers={speakers}
          labelLayer={labelLayer}
          grab={grab}
        />
      </Canvas>
      <div ref={labelLayer} className="pointer-events-none absolute inset-0" />
    </div>
  )
}

type LabelLayer = RefObject<HTMLDivElement>

type DragCursor = 'auto' | 'grab' | 'grabbing'

/** What a draggable marker needs: the Room, the handlers and the cursor. */
type Grab = {
  room: Room
  drag: DragHandlers
  setCursor: (cursor: DragCursor) => void
}

/**
 * Makes its markers draggable on the floor plan as item `id`, which is at
 * `at`. Pressing on a marker (or within a touch target of its center, see
 * grabRadius) picks it up; it follows the pointer, keeping where it was
 * grabbed, until released. The store keeps it inside the Room.
 */
function Draggable({
  id,
  at,
  radius,
  grab: { room, drag, setCursor },
  children,
}: {
  id: PlaceableId
  at: RoomPoint
  /** The marker's own radius, in meters. */
  radius: number
  grab: Grab
  children: ReactNode
}) {
  const size = useThree((state) => state.size)
  const zoom = topDownCamera(room, size).zoom
  // From the pointer to the item's center when it was grabbed, or null.
  const offset = useRef<FloorPoint | null>(null)
  const hit = new Vector3()

  function floorPoint(event: ThreeEvent<PointerEvent>): FloorPoint | null {
    const point = event.ray.intersectPlane(FLOOR, hit)
    return point && toFloorPoint(point)
  }

  function release(event: ThreeEvent<PointerEvent>) {
    if (!offset.current) return
    offset.current = null
    const target = event.target as Element
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId)
    }
    setCursor('grab')
    drag.end()
  }

  return (
    <group
      onPointerDown={(event) => {
        const pointer = floorPoint(event)
        if (!pointer || event.button !== 0) return
        event.stopPropagation()
        ;(event.target as Element).setPointerCapture(event.pointerId)
        offset.current = { x: at.x - pointer.x, y: at.y - pointer.y }
        setCursor('grabbing')
        drag.start()
      }}
      onPointerMove={(event) => {
        const pointer = offset.current && floorPoint(event)
        if (!pointer || !offset.current) return
        event.stopPropagation()
        drag.move(id, {
          x: pointer.x + offset.current.x,
          y: pointer.y + offset.current.y,
        })
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (!offset.current) setCursor('grab')
      }}
      onPointerOut={() => {
        if (!offset.current) setCursor('auto')
      }}
    >
      {children}
      {/* An invisible disc on the floor, under every marker, so a marker
          is easy to pick up with a finger; markers drawn above it win. */}
      <mesh
        position={toScenePosition({ ...at, z: LAYER.grab })}
        rotation={FLAT_ON_FLOOR}
      >
        <circleGeometry args={[grabRadius(radius, zoom), 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

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
  grab,
}: {
  mlp: RoomPoint
  labelLayer: LabelLayer
  grab: Grab
}) {
  return (
    <>
      <Draggable id={MLP_ID} at={mlp} radius={MLP_MARKER_RADIUS} grab={grab}>
        <mesh position={toScenePosition(mlp)} rotation={FLAT_ON_FLOOR}>
          <circleGeometry args={[MLP_MARKER_RADIUS, 32]} />
          <meshBasicMaterial color={COLORS.mlp} />
        </mesh>
      </Draggable>
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
  grab,
}: {
  speakers: readonly PlacedSpeaker[]
  labelLayer: LabelLayer
  grab: Grab
}) {
  return speakers.map((speaker) => {
    const { position, rotation, color, label, grade, labelDirection } =
      speakerMarker(speaker)
    return (
      <Fragment key={speaker.channel}>
        <Draggable
          id={speaker.channel}
          at={speaker.position}
          radius={SPEAKER_FOOTPRINT.width / 2}
          grab={grab}
        >
          <mesh position={position} rotation={rotation}>
            <planeGeometry
              args={[SPEAKER_FOOTPRINT.width, SPEAKER_FOOTPRINT.depth]}
            />
            <meshBasicMaterial color={color} />
          </mesh>
        </Draggable>
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
 * The subwoofers as neutral squares on the floor plan. They sit lower than
 * the listener-level speakers, so a speaker above one (the Center over
 * Subwoofer 1) is drawn on top, with the subwoofer's outline around it.
 */
function SubwooferMarkers({
  subwoofers,
  labelLayer,
  grab,
}: {
  subwoofers: readonly PlacedSubwoofer[]
  labelLayer: LabelLayer
  grab: Grab
}) {
  return subwoofers.map((subwoofer) => {
    const { position, rotation, color, label, labelDirection } =
      subwooferMarker(subwoofer)
    return (
      <Fragment key={subwoofer.id}>
        <Draggable
          id={subwoofer.id}
          at={subwoofer.position}
          radius={SUBWOOFER_FOOTPRINT / 2}
          grab={grab}
        >
          <mesh position={position} rotation={rotation}>
            <planeGeometry args={[SUBWOOFER_FOOTPRINT, SUBWOOFER_FOOTPRINT]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </Draggable>
        <SceneLabel
          at={subwoofer.position}
          layer={labelLayer}
          className="leading-tight font-medium"
          style={{ transform: besideMarker(labelDirection) }}
        >
          {label}
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
