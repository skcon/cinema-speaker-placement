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
  type RefObject,
} from 'react'
import {
  Color,
  DoubleSide,
  FrontSide,
  InstancedMesh,
  Object3D,
  Plane,
  Vector3,
} from 'three'
import {
  type DragTarget,
  floorCenter,
  floorCorners,
  type FloorPoint,
  wallBases,
  type PlaceableId,
  type PlacedItem,
  type PlacedOverhead,
  type PlacedSpeaker,
  type PlacedSubwoofer,
  type Room,
  type RoomPoint,
  type SeatHeatmap,
  type UnitSystem,
} from '@/domain'
import { type SelectionDimensions } from '@/scene/dimensions'
import { HEATMAP_OPACITY } from '@/scene/heatmap'
import { heatmapColor } from '@/scene/heatmap-color'
import {
  LABEL_BACKDROP_CSS,
  LABEL_COLORS,
  SCENE_COLORS,
  type LabelTone,
} from '@/scene/palette'
import {
  itemsInDrawOrder,
  MLP_MARKER_RADIUS,
  OVERHEAD_MARKER_DOT,
  OVERHEAD_MARKER_RADIUS,
  OVERHEAD_MARKER_RING_INNER,
  overheadMarker,
  SPEAKER_FOOTPRINT,
  speakerMarker,
  SUBWOOFER_FOOTPRINT,
  subwooferMarker,
} from '@/scene/speakers'
import {
  createDragController,
  type DragCallbacks,
  type DragController,
} from '@/scene/drag'
import {
  roomObjectDrawings,
  type RoomObjectDrawing,
  type RoomObjectShape,
  type RoomObjectsInView,
} from '@/scene/room-objects'
import type { LabelPlacement } from '@/scene/label-layout'
import {
  layoutTopDownLabels,
  preferredSceneLabelPlacements,
  sceneLabels,
  type SceneLabel,
  type SceneLabelKind,
} from '@/scene/scene-labels'
import { pressAt, type GrabArea } from '@/scene/grab-areas'
import {
  FLAT_ON_FLOOR,
  FLOOR_LAYERS,
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

/** The ring around the Selected item, inner and outer radius in meters. */
const SELECTION_RING = { inner: 0.33, outer: 0.38 } as const

/** How far the ring and Dimension lines sit above the item, so they draw over it. */
const SELECTION_LIFT = 0.02

/** The ring around the recommended seat, inner and outer radius in meters. */
const RECOMMENDED_RING = { inner: 0.24, outer: 0.3 } as const

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
  items,
  roomObjects,
  gridSpacing,
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
  /**
   * The speakers, subwoofers and the MLP by id, as the Room analysis has
   * them. The overheads are on the ceiling: drawn over everything else
   * from straight above.
   */
  items: ReadonlyMap<PlaceableId, PlacedItem>
  /**
   * The room objects: the Seat row around the MLP, the Screen, the
   * furniture boxes and the openings. Drawn, and dragged from above.
   */
  roomObjects: RoomObjectsInView
  /** Distance between floor grid lines, in meters. */
  gridSpacing: number
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
  // The callbacks only call store actions, which never change.
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
  const drawings = roomObjectDrawings(roomObjects, view)
  const labels = sceneLabels({
    room,
    units,
    items,
    roomObjects: drawings,
    recommendedSeat,
    selection,
  })
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
        <RuleOfThumbLine room={room} fromFrontWall={ruleOfThumbFromFrontWall} />
        {heatmap && heatmap.cells.length > 0 && (
          // Remounted when the number of cells changes: an instanced
          // mesh's count is fixed.
          <HeatmapCells key={heatmap.cells.length} heatmap={heatmap} />
        )}
        {/* Remounted when the view changes, as each view draws them anew. */}
        <RoomObjects key={view} drawings={drawings} />
        <Walls room={room} />
        {view === '3d' && <RoomBox room={room} />}
        {recommendedSeat && <RecommendedSeatMarker at={recommendedSeat} />}
        <ItemMarkers items={items} />
        <SceneLabels
          labels={labels}
          view={view}
          room={room}
          items={items}
          labelLayer={labelLayer}
        />
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
        {selection && <SelectionMarks selection={selection} />}
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
 * How each kind of scene label looks: its fixed text `tone` and classes,
 * and whether it is drawn over every other label (`raised`).
 */
const LABEL_LOOKS = {
  frontWall: { tone: 'muted', className: '' },
  roomWidth: { tone: 'muted', className: '' },
  roomLength: { tone: 'muted', className: '' },
  distance: {
    tone: 'selection',
    className: 'border font-medium tabular-nums',
    raised: true,
  },
  mlp: { tone: 'mlp', className: 'font-medium' },
  recommended: { tone: 'recommended', className: 'font-medium' },
  speaker: {
    tone: 'text',
    className: 'flex flex-col items-center leading-tight',
  },
  subwoofer: { tone: 'text', className: 'leading-tight font-medium' },
  roomObject: { tone: 'muted', className: '' },
} as const satisfies Record<
  SceneLabelKind,
  { tone: LabelTone; className: string; raised?: boolean }
>

/**
 * Every scene label (see sceneLabels), each where the label layout puts
 * it: from straight above, clear of each other, the markers and the front
 * wall line, dropping a speaker's grade line where there is no room (see
 * layoutTopDownLabels); in the 3D view, which turns under them, at their
 * preferred places.
 */
function SceneLabels({
  labels,
  view,
  room,
  items,
  labelLayer,
}: {
  labels: readonly SceneLabel[]
  view: CameraView
  room: Room
  items: ReadonlyMap<PlaceableId, PlacedItem>
  labelLayer: LabelLayer
}) {
  const size = useThree((state) => state.size)
  const placements =
    view === 'top-down'
      ? layoutTopDownLabels(labels, { room, viewport: size, items })
      : preferredSceneLabelPlacements(labels)
  return labels.map((label) => {
    const placement = placements.get(label.id)
    return (
      placement && (
        <PlacedSceneLabel
          key={label.id}
          label={label}
          placement={placement}
          layer={labelLayer}
        />
      )
    )
  })
}

/**
 * A text label pinned to a room point, drawn as HTML over the canvas and
 * moved off it by its placement's offset, in a fixed tone on a light
 * backdrop (see LABEL_LOOKS), so it reads on the light scene in either app
 * theme and over the heatmap.
 */
function PlacedSceneLabel({
  label: { kind, at, text, detail, turned },
  placement: { offset, compact },
  layer,
}: {
  label: SceneLabel
  placement: LabelPlacement
  layer: LabelLayer
}) {
  const look: { tone: LabelTone; className: string; raised?: boolean } =
    LABEL_LOOKS[kind]
  const turn = turned ? ' rotate(-90deg)' : ''
  return (
    <Html
      position={toScenePosition(at)}
      portal={layer}
      center
      zIndexRange={look.raised ? RAISED_LABEL_Z_INDEX : undefined}
    >
      <span
        className={cn(
          'block rounded-sm px-1 text-xs whitespace-nowrap select-none',
          look.className,
        )}
        style={{
          color: LABEL_COLORS[look.tone],
          backgroundColor: LABEL_BACKDROP_CSS,
          ...(kind === 'distance' && {
            backgroundColor: SCENE_COLORS.background,
            borderColor: SCENE_COLORS.selection,
          }),
          transform: `translate(${offset.x}px, ${offset.y}px)${turn}`,
        }}
      >
        {detail === undefined ? (
          text
        ) : (
          <>
            <span className="font-medium">{text}</span>
            {!compact && (
              <span style={{ color: LABEL_COLORS.muted }}>{detail}</span>
            )}
          </>
        )}
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
      z={FLOOR_LAYERS.grid}
      color={SCENE_COLORS.grid}
      width={1}
    />
  ))
}

function Walls({ room }: { room: Room }) {
  const corners = floorCorners(room)
  return (
    <>
      <FloorLine
        points={[...corners, corners[0]]}
        z={FLOOR_LAYERS.walls}
        color={SCENE_COLORS.walls}
        width={2}
      />
      <FloorLine
        points={wallBases(room).front}
        z={FLOOR_LAYERS.walls}
        color={SCENE_COLORS.frontWall}
        width={5}
      />
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
 * The room objects as roomObjectDrawings has them for the view: the Seat
 * row, the Screen, the furniture boxes and the openings, drawn shape by
 * shape (their names are scene labels, see SceneLabels). Seen from above
 * they are dragged like the other markers (see grabAreas); the store keeps
 * each where it may go.
 */
function RoomObjects({ drawings }: { drawings: readonly RoomObjectDrawing[] }) {
  return drawings.map(({ id, shapes }) => (
    // Keyed by id: the room view names an object by it (roomObjectId).
    <Fragment key={id}>
      {shapes.map((shape, index) => (
        <RoomObjectPart key={index} shape={shape} />
      ))}
    </Fragment>
  ))
}

/** One shape drawn for a room object (see RoomObjectShape). */
function RoomObjectPart({ shape }: { shape: RoomObjectShape }) {
  switch (shape.kind) {
    case 'plane':
      return (
        <mesh position={shape.position} rotation={shape.rotation}>
          <planeGeometry args={shape.size} />
          <meshBasicMaterial
            color={shape.color}
            side={shape.doubleSided ? DoubleSide : FrontSide}
            transparent={shape.opacity < 1}
            opacity={shape.opacity}
          />
        </mesh>
      )
    case 'box':
      return (
        <mesh position={shape.position}>
          <boxGeometry args={shape.size} />
          <meshBasicMaterial
            color={shape.color}
            transparent={shape.opacity < 1}
            opacity={shape.opacity}
          />
        </mesh>
      )
    case 'label':
      // Drawn with the other scene labels, so it is laid out with them.
      return null
  }
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
  const z = FLOOR_LAYERS.ruleOfThumb
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
      cell.position.set(
        ...toScenePosition({ ...center, z: FLOOR_LAYERS.heatmap }),
      )
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

/** A violet ring around the recommended MLP (its label is a scene label). */
function RecommendedSeatMarker({ at }: { at: RoomPoint }) {
  return (
    <mesh
      position={toScenePosition({ ...at, z: FLOOR_LAYERS.recommended })}
      rotation={FLAT_ON_FLOOR}
    >
      <ringGeometry
        args={[RECOMMENDED_RING.inner, RECOMMENDED_RING.outer, 48]}
      />
      <meshBasicMaterial color={SCENE_COLORS.recommended} />
    </mesh>
  )
}

/**
 * Every placed item's marker, by its kind, in the order the room view
 * draws them (itemsInDrawOrder). Their labels are scene labels (see
 * SceneLabels).
 */
function ItemMarkers({
  items,
}: {
  items: ReadonlyMap<PlaceableId, PlacedItem>
}) {
  return itemsInDrawOrder(items).map((item) => {
    switch (item.kind) {
      case 'mlp':
        return <MlpMarker key={item.id} mlp={item.position} />
      case 'subwoofer':
        return <SubwooferMarker key={item.id} subwoofer={item} />
      case 'listenerLevel':
        return <SpeakerMarker key={item.id} speaker={item} />
      case 'overhead':
        return <OverheadMarker key={item.id} overhead={item} />
    }
  })
}

function MlpMarker({ mlp }: { mlp: RoomPoint }) {
  return (
    <mesh position={toScenePosition(mlp)} rotation={FLAT_ON_FLOOR}>
      <circleGeometry args={[MLP_MARKER_RADIUS, 32]} />
      <meshBasicMaterial color={SCENE_COLORS.mlp} />
    </mesh>
  )
}

function SpeakerMarker({ speaker }: { speaker: PlacedSpeaker }) {
  const { position, rotation, color } = speakerMarker(speaker)
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry
        args={[SPEAKER_FOOTPRINT.width, SPEAKER_FOOTPRINT.depth]}
      />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/**
 * An overhead speaker as a ring with a center dot, colored by grade, on
 * the ceiling: round, so it reads apart from the rectangular
 * listener-level cabinets. Drawn on both faces, so the 3D view sees it
 * from below. Dragged on the floor plan like the others (top-down only);
 * the store keeps it on the ceiling.
 */
function OverheadMarker({ overhead }: { overhead: PlacedOverhead }) {
  const { position, rotation, color } = overheadMarker(overhead)
  return (
    <>
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
    </>
  )
}

/**
 * A subwoofer as a neutral square on the floor plan. It sits lower than
 * the listener-level speakers, so a speaker above one (the Center over
 * Subwoofer 1) is drawn on top, with the subwoofer's outline around it.
 */
function SubwooferMarker({ subwoofer }: { subwoofer: PlacedSubwoofer }) {
  const { position, rotation, color } = subwooferMarker(subwoofer)
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[SUBWOOFER_FOOTPRINT, SUBWOOFER_FOOTPRINT]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/**
 * The Selected item, ringed, with its Dimension lines to its two nearest
 * walls and the MLP (their lengths are scene labels, drawn over every
 * other label, see SceneLabels). Drawn just above the item, so they read
 * over the floor and its marker.
 */
function SelectionMarks({
  selection: { at, lines },
}: {
  selection: SelectionDimensions
}) {
  const lift = (point: RoomPoint) => ({ ...point, z: point.z + SELECTION_LIFT })
  return (
    <>
      <mesh position={toScenePosition(lift(at))} rotation={FLAT_ON_FLOOR}>
        <ringGeometry args={[SELECTION_RING.inner, SELECTION_RING.outer, 48]} />
        <meshBasicMaterial color={SCENE_COLORS.selection} side={DoubleSide} />
      </mesh>
      {lines.map(({ target, from, to }) => (
        <Fragment key={target}>
          <Line
            points={[toScenePosition(lift(from)), toScenePosition(lift(to))]}
            color={SCENE_COLORS.selection}
            lineWidth={1.5}
            dashed
            dashSize={0.08}
            gapSize={0.05}
          />
        </Fragment>
      ))}
    </>
  )
}
