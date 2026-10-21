import {
  Html,
  Line,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { cn } from 'cn'
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  Color,
  DoubleSide,
  InstancedMesh,
  Object3D,
  Plane,
  Vector3,
} from 'three'
import {
  type DragTarget,
  floorCenter,
  floorCorners,
  type Opening,
  type FloorPoint,
  type FurnitureBox,
  wallBases,
  type PlacedOverhead,
  type PlacedSpeaker,
  type PlacedSubwoofer,
  type Room,
  type RoomPoint,
  type RoomScreen,
  type SeatHeatmap,
  type SeatRowFootprint,
  type UnitSystem,
} from '@/domain'
import { roomDimensions, type SelectionDimensions } from '@/scene/dimensions'
import { HEATMAP_OPACITY } from '@/scene/heatmap'
import { heatmapColor } from '@/scene/heatmap-color'
import {
  LABEL_BACKDROP_CSS,
  LABEL_COLORS,
  SCENE_COLORS,
  type LabelTone,
} from '@/scene/palette'
import {
  GRADE_STYLES,
  MLP_MARKER_RADIUS,
  OVERHEAD_MARKER_DOT,
  OVERHEAD_MARKER_RADIUS,
  OVERHEAD_MARKER_RING_INNER,
  overheadMarker,
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
  doorSwing,
  furnitureBlock,
  furniturePlan,
  openingMark,
  openingPanel,
  screenBar,
  screenPanel,
} from '@/scene/room-objects'
import { pressAt, type GrabArea } from '@/scene/grab-areas'
import {
  FLAT_ON_FLOOR,
  floorGrid,
  floorPlane,
  toFloorPoint,
  toScenePosition,
  topDownCamera,
} from '@/scene/top-down'
import {
  orbitCamera,
  orbitLimits,
  roomBoxEdges,
  type CameraView,
} from '@/scene/orbit'

/**
 * Small heights (in meters) that stack the flat floor layers so they don't
 * z-fight. The top-down camera is orthographic, so they don't move anything.
 */
const LAYER = {
  grid: 0.005,
  seatRow: 0.007,
  ruleOfThumb: 0.008,
  heatmap: 0.009,
  doorSwing: 0.0092,
  furniture: 0.0094,
  furnitureFront: 0.0097,
  walls: 0.01,
  opening: 0.0105,
  screen: 0.011,
  recommended: 0.012,
} as const

/** The ring around the Selected item, inner and outer radius in meters. */
const SELECTION_RING = { inner: 0.33, outer: 0.38 } as const

/** How far the ring and Dimension lines sit above the item, so they draw over it. */
const SELECTION_LIFT = 0.02

/** The ring around the recommended seat, inner and outer radius in meters. */
const RECOMMENDED_RING = { inner: 0.24, outer: 0.3 } as const

/** Free space between a speaker's center and its label, in pixels. */
const SPEAKER_LABEL_GAP_PX = 14

/**
 * The CSS z-index of a raised label: above drei's default range for the
 * other labels (which tops out at 16777271).
 */
const RAISED_LABEL_Z_INDEX = [16777272, 16777272]

/** The floor plane in Three.js coordinates, where pointer rays are read. */
const FLOOR = new Plane(new Vector3(0, 1, 0), 0)

/**
 * The side of the invisible square that takes presses in the top-down
 * view, in meters: far wider than any room and the margin around it, so
 * it covers the whole view.
 */
const PRESS_SURFACE_SIZE = 1000

/**
 * The react-three-fiber scene: the Room drawn to scale, with the MLP marker
 * and the speakers colored by grade. From straight above (`view`
 * "top-down", fit to the panel) every marker can be dragged; in the 3D
 * orbit view the room box is drawn up to the ceiling and nothing can be
 * dragged: it is for looking only. Loaded lazily, so Three.js stays out of
 * the main bundle.
 */
export function RoomCanvas({
  room,
  mlp,
  speakers,
  overheads,
  subwoofers,
  screen,
  furniture,
  openings,
  gridSpacing,
  seatRow,
  recommendedSeat,
  heatmap,
  ruleOfThumbFromFrontWall,
  view,
  units,
  grabAreas,
  selection,
  onSelect,
  onDeselect,
  ...callbacks
}: {
  /** Which camera looks at the room; only the top-down view drags. */
  view: CameraView
  room: Room
  mlp: RoomPoint
  speakers: readonly PlacedSpeaker[]
  /** On the ceiling: drawn over everything else from straight above. */
  overheads: readonly PlacedOverhead[]
  subwoofers: readonly PlacedSubwoofer[]
  /** The Screen on the front wall, or null: drawn only. */
  screen: RoomScreen | null
  /** The furniture boxes, in the config's order: drawn, and dragged from above. */
  furniture: readonly FurnitureBox[]
  /**
   * The doors and windows, in the config's order: drawn on their walls,
   * and dragged along them from above.
   */
  openings: readonly Opening[]
  /** Distance between floor grid lines, in meters. */
  gridSpacing: number
  /** The Seat row around the MLP. */
  seatRow: SeatRowFootprint
  /** The recommended MLP, or null while it is worked out. */
  recommendedSeat: RoomPoint | null
  /** The seat-score heatmap, or null when it is off or not worked out yet. */
  heatmap: SeatHeatmap | null
  /** Where the "38% rule" puts the seat, in meters from the front wall. */
  ruleOfThumbFromFrontWall: number
  /** How the room's measurements are written. */
  units: UnitSystem
  /**
   * What a press in the top-down view picks up (see grabAreas): a drag
   * moves the picked target's anchor, keeping the grab offset.
   */
  grabAreas: readonly GrabArea[]
  /** The Selected item, highlighted with its Dimension lines, or null. */
  selection: SelectionDimensions | null
  /**
   * Pressing a drag target in the top-down view (pressSelects in the
   * domain says what that selects).
   */
  onSelect: (id: DragTarget) => void
  /** Clear the selection: a click on the empty floor in the top-down view does. */
  onDeselect: () => void
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
  // Nor can it outlive the top-down view: the 3D view is for looking only.
  useEffect(() => {
    if (view !== 'top-down') controller.cancel()
  }, [controller, view])
  const dragging = view === 'top-down'
  return (
    <div
      className="absolute inset-0"
      style={{
        cursor: dragging ? cursor : 'auto',
        // Light in either app theme, so the fixed label colors read.
        backgroundColor: SCENE_COLORS.background,
      }}
    >
      {/* No touch scrolling or zooming over the room, so a finger can drag. */}
      <Canvas
        frameloop="demand"
        flat
        dpr={[1, 2]}
        style={{ touchAction: 'none' }}
      >
        {view === '3d' ? (
          <OrbitView room={room} />
        ) : (
          <TopDownCamera room={room} />
        )}
        <Floor room={room} />
        <FloorGrid room={room} spacing={gridSpacing} />
        <SeatRow footprint={seatRow} />
        <RuleOfThumbLine room={room} fromFrontWall={ruleOfThumbFromFrontWall} />
        {heatmap && heatmap.cells.length > 0 && (
          // Remounted when the number of cells changes: an instanced
          // mesh's count is fixed.
          <HeatmapCells key={heatmap.cells.length} heatmap={heatmap} />
        )}
        {view === '3d' ? (
          <FurnitureBlocks furniture={furniture} />
        ) : (
          <FurniturePlans furniture={furniture} labelLayer={labelLayer} />
        )}
        <Walls room={room} labelLayer={labelLayer} />
        {view === '3d' ? (
          <OpeningPanels room={room} openings={openings} />
        ) : (
          <OpeningMarks room={room} openings={openings} />
        )}
        {screen &&
          (view === '3d' ? (
            <ScreenPanel screen={screen} />
          ) : (
            <ScreenBar screen={screen} />
          ))}
        <RoomDimensionLabels
          room={room}
          units={units}
          labelLayer={labelLayer}
        />
        {view === '3d' && <RoomBox room={room} />}
        {recommendedSeat && (
          <RecommendedSeatMarker at={recommendedSeat} labelLayer={labelLayer} />
        )}
        <MlpMarker mlp={mlp} labelLayer={labelLayer} />
        <SubwooferMarkers subwoofers={subwoofers} labelLayer={labelLayer} />
        <SpeakerMarkers speakers={speakers} labelLayer={labelLayer} />
        <OverheadMarkers overheads={overheads} labelLayer={labelLayer} />
        {dragging && (
          <PressSurface
            room={room}
            grabAreas={grabAreas}
            controller={controller}
            setCursor={setCursor}
            onSelect={onSelect}
            onDeselect={onDeselect}
          />
        )}
        {selection && (
          <SelectionMarks selection={selection} labelLayer={labelLayer} />
        )}
      </Canvas>
      <div ref={labelLayer} className="pointer-events-none absolute inset-0" />
    </div>
  )
}

type LabelLayer = RefObject<HTMLDivElement>

type DragCursor = 'auto' | 'grab' | 'grabbing'

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
 * An invisible square on the floor under the whole top-down view that
 * takes every press, so markers can be dragged: it turns the pointer into
 * a floor point and asks pressAt (see grabAreas) which drag target that
 * picks up, if any. A press on a target tells onSelect and picks it up by
 * its anchor (see dragAnchors); the anchor follows the pointer, keeping
 * where it was grabbed, until released, and the store keeps the target
 * where it may go. A click (that doesn't move) on no target clears the
 * selection.
 */
function PressSurface({
  room,
  grabAreas,
  controller,
  setCursor,
  onSelect,
  onDeselect,
}: {
  room: Room
  grabAreas: readonly GrabArea[]
  controller: DragController
  setCursor: (cursor: DragCursor) => void
  onSelect: (id: DragTarget) => void
  onDeselect: () => void
}) {
  const size = useThree((state) => state.size)
  const zoom = topDownCamera(room, size).zoom
  const hit = new Vector3()

  function floorPoint(event: ThreeEvent<PointerEvent | MouseEvent>) {
    const point = event.ray.intersectPlane(FLOOR, hit)
    return point && toFloorPoint(point)
  }

  function pressed(pointer: FloorPoint | null): GrabArea | null {
    return pointer && pressAt(grabAreas, pointer, zoom)
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

  // A click that is on no target and doesn't move clears the selection.
  function clickOff(event: ThreeEvent<MouseEvent>) {
    if (event.delta <= 2 && !pressed(floorPoint(event))) onDeselect()
  }

  return (
    <mesh
      position={toScenePosition({ ...floorCenter(room), z: 0 })}
      rotation={FLAT_ON_FLOOR}
      onPointerDown={(event) => {
        const pointer = floorPoint(event)
        if (!pointer || event.button !== 0) return
        const area = pressed(pointer)
        if (!area) return
        leaveTextField()
        if (
          !controller.press(event.pointerId, area.target, area.anchor, pointer)
        )
          return
        // A press selects the item, whether it then moves (a drag) or not.
        onSelect(area.target)
        event.stopPropagation()
        captureTarget(event).setPointerCapture(event.pointerId)
        setCursor('grabbing')
      }}
      onPointerMove={(event) => {
        const pointer = floorPoint(event)
        if (!pointer) return
        if (controller.isDragging()) {
          event.stopPropagation()
          controller.move(event.pointerId, pointer)
        } else {
          setCursor(pressed(pointer) ? 'grab' : 'auto')
        }
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onPointerOut={() => {
        if (!controller.isDragging()) setCursor('auto')
      }}
      onClick={clickOff}
      onContextMenu={clickOff}
    >
      <planeGeometry args={[PRESS_SURFACE_SIZE, PRESS_SURFACE_SIZE]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/**
 * A text label pinned to a room point, drawn as HTML over the canvas, in a
 * fixed `tone` on a light backdrop, so it reads on the light scene in either
 * app theme and over the heatmap.
 */
function SceneLabel({
  at,
  layer,
  tone,
  className,
  style,
  raised = false,
  children,
}: {
  at: RoomPoint
  layer: LabelLayer
  tone: LabelTone
  className: string
  style?: CSSProperties
  /** Drawn over every other label (the Selected item's distances). */
  raised?: boolean
  children: ReactNode
}) {
  return (
    <Html
      position={toScenePosition(at)}
      portal={layer}
      center
      zIndexRange={raised ? RAISED_LABEL_Z_INDEX : undefined}
    >
      <span
        className={cn(
          'block rounded-sm px-1 text-xs whitespace-nowrap select-none',
          className,
        )}
        style={{
          color: LABEL_COLORS[tone],
          backgroundColor: LABEL_BACKDROP_CSS,
          ...style,
        }}
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

/**
 * A perspective camera framing the room box, with orbit controls to look
 * around (drag to orbit, scroll or pinch to zoom). It is framed for the
 * panel's size when the view opens or the Room changes, so resizing the
 * panel doesn't undo the user's orbit.
 */
function OrbitView({ room: { length, width, height } }: { room: Room }) {
  const get = useThree((state) => state.get)
  const { camera, limits } = useMemo(() => {
    const room = { length, width, height }
    const { size } = get()
    return { camera: orbitCamera(room, size), limits: orbitLimits(room, size) }
  }, [length, width, height, get])
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={camera.position}
        fov={camera.fov}
        near={camera.near}
        far={camera.far}
      />
      <OrbitControls makeDefault target={camera.target} {...limits} />
    </>
  )
}

/** The room box outlined up to the ceiling, so its height reads in 3D. */
function RoomBox({ room }: { room: Room }) {
  return roomBoxEdges(room).map((edge, index) => (
    <Line
      key={index}
      points={edge.map(toScenePosition)}
      color={SCENE_COLORS.walls}
      lineWidth={1.5}
    />
  ))
}

function Floor({ room }: { room: Room }) {
  const { position, rotation, size } = floorPlane(room)
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={SCENE_COLORS.floor} />
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
      color={SCENE_COLORS.grid}
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
        color={SCENE_COLORS.walls}
        width={2}
      />
      <FloorLine
        points={wallBases(room).front}
        z={LAYER.walls}
        color={SCENE_COLORS.frontWall}
        width={5}
      />
      {/* Room coordinates start at the middle of the front wall; the label
          sits a fixed few pixels above it at any zoom. */}
      <SceneLabel
        at={{ x: 0, y: 0, z: 0 }}
        layer={labelLayer}
        tone="muted"
        className="-translate-y-3.5"
      >
        Front wall
      </SceneLabel>
    </>
  )
}

/**
 * The Room's width and length written just outside the back and left
 * walls, a fixed few pixels out at any zoom; the length turns to run along
 * its wall.
 */
function RoomDimensionLabels({
  room,
  units,
  labelLayer,
}: {
  room: Room
  units: UnitSystem
  labelLayer: LabelLayer
}) {
  const [width, length] = roomDimensions(room, units)
  return (
    <>
      <SceneLabel
        at={width.at}
        layer={labelLayer}
        tone="muted"
        className="translate-y-3.5"
      >
        &larr; {width.text} &rarr;
      </SceneLabel>
      <SceneLabel
        at={length.at}
        layer={labelLayer}
        tone="muted"
        className="-translate-x-3.5 -rotate-90"
      >
        &larr; {length.text} &rarr;
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

/**
 * The Seat row: a pale rectangle on the floor with the MLP near its back.
 * Seen from above it is dragged like the other markers; dragging it moves
 * the MLP (see withDragged), so the couch and the MLP move together.
 */
function SeatRow({ footprint }: { footprint: SeatRowFootprint }) {
  const { center, width, depth } = footprint
  return (
    <mesh
      position={toScenePosition({ ...center, z: LAYER.seatRow })}
      rotation={FLAT_ON_FLOOR}
    >
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial color={SCENE_COLORS.seatRow} />
    </mesh>
  )
}

/**
 * The Screen seen from above: a bar along the front wall (see screenBar),
 * dragged along the wall like the other markers; the store keeps it on the
 * wall.
 */
function ScreenBar({ screen }: { screen: RoomScreen }) {
  const { center, width, depth } = screenBar(screen)
  return (
    <mesh
      position={toScenePosition({ ...center, z: LAYER.screen })}
      rotation={FLAT_ON_FLOOR}
    >
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial color={SCENE_COLORS.screen} />
    </mesh>
  )
}

/**
 * The furniture boxes seen from above: each a rectangle with a darker
 * strip along its front and its name, dragged by its middle like the
 * other markers; the store keeps it inside the Room.
 */
function FurniturePlans({
  furniture,
  labelLayer,
}: {
  furniture: readonly FurnitureBox[]
  labelLayer: LabelLayer
}) {
  return furniture.map((box, index) => {
    const { center, size, front } = furniturePlan(box)
    return (
      // Keyed by place: the room view names a box by it (roomObjectId).
      <Fragment key={index}>
        <mesh
          position={toScenePosition({ ...center, z: LAYER.furniture })}
          rotation={FLAT_ON_FLOOR}
        >
          <planeGeometry args={size} />
          <meshBasicMaterial color={SCENE_COLORS.furniture} />
        </mesh>
        <mesh
          position={toScenePosition({
            ...front.center,
            z: LAYER.furnitureFront,
          })}
          rotation={FLAT_ON_FLOOR}
        >
          <planeGeometry args={front.size} />
          <meshBasicMaterial color={SCENE_COLORS.furnitureFront} />
        </mesh>
        <SceneLabel at={center} layer={labelLayer} tone="muted" className="">
          {box.name}
        </SceneLabel>
      </Fragment>
    )
  })
}

/** The furniture boxes in 3D: solid boxes standing on the floor. */
function FurnitureBlocks({
  furniture,
}: {
  furniture: readonly FurnitureBox[]
}) {
  return furniture.map((box, index) => {
    const { position, size } = furnitureBlock(box)
    return (
      <mesh key={index} position={position}>
        <boxGeometry args={size} />
        <meshBasicMaterial
          color={SCENE_COLORS.furniture}
          transparent
          opacity={0.85}
        />
      </mesh>
    )
  })
}

/**
 * The doors and windows seen from above: each a mark along the inside of
 * its wall, dragged along the wall like the other markers (the store keeps
 * it on its wall), and a door's swing as a pale square in front of it.
 */
function OpeningMarks({
  room,
  openings,
}: {
  room: Room
  openings: readonly Opening[]
}) {
  return openings.map((opening, index) => {
    const { center, size } = openingMark(room, opening)
    const swing = opening.kind === 'door' && doorSwing(room, opening)
    return (
      // Keyed by place: the room view names an opening by it (roomObjectId).
      <group key={index}>
        {swing && (
          <mesh
            position={toScenePosition({ ...swing.center, z: LAYER.doorSwing })}
            rotation={FLAT_ON_FLOOR}
          >
            <planeGeometry args={swing.size} />
            <meshBasicMaterial color={SCENE_COLORS.doorSwing} />
          </mesh>
        )}
        <mesh
          position={toScenePosition({ ...center, z: LAYER.opening })}
          rotation={FLAT_ON_FLOOR}
        >
          <planeGeometry args={size} />
          <meshBasicMaterial color={SCENE_COLORS[opening.kind]} />
        </mesh>
      </group>
    )
  })
}

/** The doors and windows in 3D: panels on their walls, at their height. */
function OpeningPanels({
  room,
  openings,
}: {
  room: Room
  openings: readonly Opening[]
}) {
  return openings.map((opening, index) => {
    const { position, size, rotation } = openingPanel(room, opening)
    return (
      <mesh key={index} position={position} rotation={rotation}>
        <planeGeometry args={size} />
        <meshBasicMaterial
          color={SCENE_COLORS[opening.kind]}
          side={DoubleSide}
          transparent
          opacity={0.6}
        />
      </mesh>
    )
  })
}

/** The Screen in 3D: an upright panel at its height on the front wall. */
function ScreenPanel({ screen }: { screen: RoomScreen }) {
  const { position, size } = screenPanel(screen)
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={SCENE_COLORS.screen} side={DoubleSide} />
    </mesh>
  )
}

/**
 * The informal "38% rule" as a faint dashed line across the room: a
 * reference only. It has no label in the scene, where one would run into
 * the speaker labels on a narrow screen; the legend names it.
 */
function RuleOfThumbLine({
  room,
  fromFrontWall,
}: {
  room: Room
  fromFrontWall: number
}) {
  const half = room.width / 2
  const z = LAYER.ruleOfThumb
  return (
    <Line
      points={[
        toScenePosition({ x: -half, y: fromFrontWall, z }),
        toScenePosition({ x: half, y: fromFrontWall, z }),
      ]}
      color={SCENE_COLORS.ruleOfThumb}
      lineWidth={1}
      dashed
      dashSize={0.15}
      gapSize={0.1}
    />
  )
}

/**
 * The seat-score heatmap: every cell in one instanced mesh (one draw
 * call), semi-transparent, above the floor, grid and seat row and under
 * the walls, markers and labels. It has no pointer handlers, so drags
 * pass through it.
 */
function HeatmapCells({ heatmap }: { heatmap: SeatHeatmap }) {
  const mesh = useRef<InstancedMesh>(null!)
  const invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => {
    const cell = new Object3D()
    const color = new Color()
    heatmap.cells.forEach(({ center, width, depth, relativeScore }, index) => {
      cell.position.set(...toScenePosition({ ...center, z: LAYER.heatmap }))
      cell.rotation.set(...FLAT_ON_FLOOR)
      cell.scale.set(width, depth, 1)
      cell.updateMatrix()
      mesh.current.setMatrixAt(index, cell.matrix)
      mesh.current.setColorAt(index, color.set(heatmapColor(relativeScore)))
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true
    // The canvas draws on demand.
    invalidate()
  }, [heatmap, invalidate])
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, heatmap.cells.length]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        transparent
        opacity={HEATMAP_OPACITY}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

/** A violet ring around the recommended MLP, labelled above it. */
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
        <meshBasicMaterial color={SCENE_COLORS.recommended} />
      </mesh>
      <SceneLabel
        at={at}
        layer={labelLayer}
        tone="recommended"
        className="-translate-y-6 font-medium"
      >
        Recommended
      </SceneLabel>
    </>
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
        <meshBasicMaterial color={SCENE_COLORS.mlp} />
      </mesh>
      {/* Shifted below the marker by CSS, so it never covers it. */}
      <SceneLabel
        at={mlp}
        layer={labelLayer}
        tone="mlp"
        className="translate-y-5 font-medium"
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
          tone="text"
          className="flex flex-col items-center leading-tight"
          style={{ transform: besideMarker(labelDirection) }}
        >
          <span className="font-medium">{label}</span>
          <span style={{ color: LABEL_COLORS.muted }}>
            {GRADE_STYLES[grade].label}
          </span>
        </SceneLabel>
      </Fragment>
    )
  })
}

/**
 * The overhead speakers as rings with a center dot, colored by grade, on
 * the ceiling: round, so they read apart from the rectangular
 * listener-level cabinets. Drawn on both faces, so the 3D view sees them
 * from below. Dragged on the floor plan like the others (top-down only);
 * the store keeps them on the ceiling.
 */
function OverheadMarkers({
  overheads,
  labelLayer,
}: {
  overheads: readonly PlacedOverhead[]
  labelLayer: LabelLayer
}) {
  return overheads.map((overhead) => {
    const { position, rotation, color, label, grade, labelDirection } =
      overheadMarker(overhead)
    return (
      <Fragment key={overhead.channel}>
        <mesh position={position} rotation={rotation}>
          <ringGeometry
            args={[
              OVERHEAD_MARKER_RADIUS * OVERHEAD_MARKER_RING_INNER,
              OVERHEAD_MARKER_RADIUS,
              32,
            ]}
          />
          <meshBasicMaterial color={color} side={DoubleSide} />
        </mesh>
        <mesh position={position} rotation={rotation}>
          <circleGeometry
            args={[OVERHEAD_MARKER_RADIUS * OVERHEAD_MARKER_DOT, 24]}
          />
          <meshBasicMaterial color={color} side={DoubleSide} />
        </mesh>
        <SceneLabel
          at={overhead.position}
          layer={labelLayer}
          tone="text"
          className="flex flex-col items-center leading-tight"
          style={{ transform: besideMarker(labelDirection) }}
        >
          <span className="font-medium">{label}</span>
          <span style={{ color: LABEL_COLORS.muted }}>
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
}: {
  subwoofers: readonly PlacedSubwoofer[]
  labelLayer: LabelLayer
}) {
  return subwoofers.map((subwoofer) => {
    const { position, rotation, color, label, labelDirection } =
      subwooferMarker(subwoofer)
    return (
      <Fragment key={subwoofer.id}>
        <mesh position={position} rotation={rotation}>
          <planeGeometry args={[SUBWOOFER_FOOTPRINT, SUBWOOFER_FOOTPRINT]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <SceneLabel
          at={subwoofer.position}
          layer={labelLayer}
          tone="text"
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

/**
 * The Selected item, ringed, with its Dimension lines to its two nearest
 * walls and the MLP, each labelled with its length (see
 * selectionDimensions) over every other label. Drawn just above the item,
 * so they read over the floor and its marker.
 */
function SelectionMarks({
  selection: { at, lines },
  labelLayer,
}: {
  selection: SelectionDimensions
  labelLayer: LabelLayer
}) {
  const lift = (point: RoomPoint) => ({ ...point, z: point.z + SELECTION_LIFT })
  return (
    <>
      <mesh position={toScenePosition(lift(at))} rotation={FLAT_ON_FLOOR}>
        <ringGeometry args={[SELECTION_RING.inner, SELECTION_RING.outer, 48]} />
        <meshBasicMaterial color={SCENE_COLORS.selection} side={DoubleSide} />
      </mesh>
      {lines.map(({ target, from, to, labelAt, text }) => (
        <Fragment key={target}>
          <Line
            points={[toScenePosition(lift(from)), toScenePosition(lift(to))]}
            color={SCENE_COLORS.selection}
            lineWidth={1.5}
            dashed
            dashSize={0.08}
            gapSize={0.05}
          />
          <SceneLabel
            at={labelAt}
            layer={labelLayer}
            tone="selection"
            raised
            className="border font-medium tabular-nums"
            style={{
              backgroundColor: SCENE_COLORS.background,
              borderColor: SCENE_COLORS.selection,
            }}
          >
            {text}
          </SceneLabel>
        </Fragment>
      ))}
    </>
  )
}
