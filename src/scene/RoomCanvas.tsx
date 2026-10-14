import { Html, Line, OrthographicCamera } from '@react-three/drei'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { cn } from 'cn'
import {
  Fragment,
  useEffect,
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
  type SeatRowFootprint,
} from '@/domain'
import {
  GRADE_STYLES,
  RECOMMENDED_SEAT_COLOR,
  SPEAKER_FOOTPRINT,
  speakerMarker,
  SUBWOOFER_FOOTPRINT,
  subwooferMarker,
  type ScreenDirection,
} from '@/scene/speakers'
import {
  createDragController,
  type DragCallbacks,
  type DragController,
} from '@/scene/drag'
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
  seatRow: '#dbeafe',
  ruleOfThumb: '#a3a3a3',
  recommended: RECOMMENDED_SEAT_COLOR,
} as const

/**
 * Small heights (in meters) that stack the flat floor layers so they don't
 * z-fight. The top-down camera is orthographic, so they don't move anything.
 */
const LAYER = {
  grid: 0.005,
  seatRow: 0.007,
  ruleOfThumb: 0.008,
  walls: 0.01,
  recommended: 0.012,
  grab: 0.015,
} as const

/** Radius of the MLP marker, in meters. */
const MLP_MARKER_RADIUS = 0.18

/** The ring around the recommended seat, inner and outer radius in meters. */
const RECOMMENDED_RING = { inner: 0.24, outer: 0.3 } as const

/** Free space between a speaker's center and its label, in pixels. */
const SPEAKER_LABEL_GAP_PX = 14

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
  seatRow,
  recommendedSeat,
  ruleOfThumbFromFrontWall,
  ...callbacks
}: {
  room: Room
  mlp: RoomPoint
  speakers: readonly PlacedSpeaker[]
  subwoofers: readonly PlacedSubwoofer[]
  /** Distance between floor grid lines, in meters. */
  gridSpacing: number
  /** The Seat row around the MLP. */
  seatRow: SeatRowFootprint
  /** The recommended MLP, or null while it is worked out. */
  recommendedSeat: RoomPoint | null
  /** Where the "38% rule" puts the seat, in meters from the front wall. */
  ruleOfThumbFromFrontWall: number
} & DragCallbacks) {
  // Labels render into this layer over the canvas. Without a fixed target,
  // drei's Html can remount once r3f connects events and lose its content.
  const labelLayer = useRef<HTMLDivElement>(null!)
  const [cursor, setCursor] = useState<DragCursor>('auto')
  // One controller for every marker, so only one pointer drags at a time.
  // The callbacks are store actions, which never change.
  const [controller] = useState(() => createDragController(callbacks))
  // A drag can't outlive the window's focus (alt-tab mid-drag, say).
  useEffect(() => {
    const endDrag = () => {
      controller.cancel()
      setCursor('auto')
    }
    window.addEventListener('blur', endDrag)
    return () => {
      window.removeEventListener('blur', endDrag)
      endDrag()
    }
  }, [controller])
  const markerDrag: MarkerDrag = { room, controller, setCursor }
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
        <SeatRow footprint={seatRow} />
        <RuleOfThumbLine
          room={room}
          fromFrontWall={ruleOfThumbFromFrontWall}
          labelLayer={labelLayer}
        />
        <Walls room={room} labelLayer={labelLayer} />
        {recommendedSeat && (
          <RecommendedSeatMarker at={recommendedSeat} labelLayer={labelLayer} />
        )}
        <MlpMarker mlp={mlp} labelLayer={labelLayer} markerDrag={markerDrag} />
        <SubwooferMarkers
          subwoofers={subwoofers}
          labelLayer={labelLayer}
          markerDrag={markerDrag}
        />
        <SpeakerMarkers
          speakers={speakers}
          labelLayer={labelLayer}
          markerDrag={markerDrag}
        />
      </Canvas>
      <div ref={labelLayer} className="pointer-events-none absolute inset-0" />
    </div>
  )
}

type LabelLayer = RefObject<HTMLDivElement>

type DragCursor = 'auto' | 'grab' | 'grabbing'

/** What a draggable marker needs: the Room, the drag controller and the cursor. */
type MarkerDrag = {
  room: Room
  controller: DragController
  setCursor: (cursor: DragCursor) => void
}

/**
 * The pointer-capture methods of a react-three-fiber event's `target`:
 * react-three-fiber replaces the DOM target with this object, which
 * captures the pointer for the 3D object that handled the event.
 */
type PointerCaptureTarget = {
  setPointerCapture: (pointerId: number) => void
  releasePointerCapture: (pointerId: number) => void
  hasPointerCapture: (pointerId: number) => boolean
}

function captureTarget(event: ThreeEvent<PointerEvent>): PointerCaptureTarget {
  return event.target as unknown as PointerCaptureTarget
}

/**
 * Leaves any text field the user is typing in, so its pending edit is
 * applied (as its own undo step) before a drag pauses the undo history.
 */
function leaveTextField() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
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
  markerDrag: { room, controller, setCursor },
  children,
}: {
  id: PlaceableId
  at: RoomPoint
  /** The marker's own radius, in meters. */
  radius: number
  markerDrag: MarkerDrag
  children: ReactNode
}) {
  const size = useThree((state) => state.size)
  const zoom = topDownCamera(room, size).zoom
  const hit = new Vector3()

  function floorPoint(event: ThreeEvent<PointerEvent>): FloorPoint | null {
    const point = event.ray.intersectPlane(FLOOR, hit)
    return point && toFloorPoint(point)
  }

  // Release, cancel and lost capture all end the drag (once).
  function release(event: ThreeEvent<PointerEvent>) {
    if (!controller.isDragging()) return
    const target = captureTarget(event)
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId)
    }
    controller.release(event.pointerId)
    if (!controller.isDragging()) setCursor('grab')
  }

  return (
    <group
      onPointerDown={(event) => {
        const pointer = floorPoint(event)
        if (!pointer || event.button !== 0) return
        leaveTextField()
        if (!controller.press(event.pointerId, id, at, pointer)) return
        event.stopPropagation()
        captureTarget(event).setPointerCapture(event.pointerId)
        setCursor('grabbing')
      }}
      onPointerMove={(event) => {
        if (!controller.isDragging()) return
        const pointer = floorPoint(event)
        if (!pointer) return
        event.stopPropagation()
        controller.move(event.pointerId, pointer)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (!controller.isDragging()) setCursor('grab')
      }}
      onPointerOut={() => {
        if (!controller.isDragging()) setCursor('auto')
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

/** The Seat row: a pale rectangle on the floor around the MLP, drawn only. */
function SeatRow({ footprint }: { footprint: SeatRowFootprint }) {
  const { center, width, depth } = footprint
  return (
    <mesh
      position={toScenePosition({ ...center, z: LAYER.seatRow })}
      rotation={FLAT_ON_FLOOR}
    >
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial color={COLORS.seatRow} />
    </mesh>
  )
}

/**
 * The informal "38% rule" as a faint dashed line across the room, labelled
 * at the left wall: a reference only.
 */
function RuleOfThumbLine({
  room,
  fromFrontWall,
  labelLayer,
}: {
  room: Room
  fromFrontWall: number
  labelLayer: LabelLayer
}) {
  const half = room.width / 2
  const z = LAYER.ruleOfThumb
  return (
    <>
      <Line
        points={[
          toScenePosition({ x: -half, y: fromFrontWall, z }),
          toScenePosition({ x: half, y: fromFrontWall, z }),
        ]}
        color={COLORS.ruleOfThumb}
        lineWidth={1}
        dashed
        dashSize={0.15}
        gapSize={0.1}
      />
      <SceneLabel
        at={{ x: -half, y: fromFrontWall, z }}
        layer={labelLayer}
        className="translate-x-1/2 -translate-y-2.5 text-[10px] text-muted-foreground"
      >
        38% rule
      </SceneLabel>
    </>
  )
}

/** A green ring around the recommended MLP, labelled above it. */
function RecommendedSeatMarker({
  at,
  labelLayer,
}: {
  at: RoomPoint
  labelLayer: LabelLayer
}) {
  return (
    <>
      <mesh
        position={toScenePosition({ ...at, z: LAYER.recommended })}
        rotation={FLAT_ON_FLOOR}
      >
        <ringGeometry
          args={[RECOMMENDED_RING.inner, RECOMMENDED_RING.outer, 48]}
        />
        <meshBasicMaterial color={COLORS.recommended} />
      </mesh>
      <SceneLabel
        at={at}
        layer={labelLayer}
        className="-translate-y-6 font-medium text-violet-700"
      >
        Recommended
      </SceneLabel>
    </>
  )
}

function MlpMarker({
  mlp,
  labelLayer,
  markerDrag,
}: {
  mlp: RoomPoint
  labelLayer: LabelLayer
  markerDrag: MarkerDrag
}) {
  return (
    <>
      <Draggable
        id={MLP_ID}
        at={mlp}
        radius={MLP_MARKER_RADIUS}
        markerDrag={markerDrag}
      >
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
  markerDrag,
}: {
  speakers: readonly PlacedSpeaker[]
  labelLayer: LabelLayer
  markerDrag: MarkerDrag
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
          markerDrag={markerDrag}
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
  markerDrag,
}: {
  subwoofers: readonly PlacedSubwoofer[]
  labelLayer: LabelLayer
  markerDrag: MarkerDrag
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
          markerDrag={markerDrag}
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
