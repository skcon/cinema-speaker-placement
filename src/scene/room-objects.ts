import {
  formatLength,
  furnitureFootprint,
  furnitureLabel,
  openingLabel,
  openingSpan,
  openingVerticalSpan,
  fromWallFrame,
  inwardDirection,
  wallStart,
  type Opening,
  type Room,
  type Wall,
  screenSurface,
  SEAT_ROW_HEAD_OFFSET,
  type FurnitureBox,
  type FloorPoint,
  type RoomObjectId,
  type RoomObjectKind,
  type RoomObjects,
  type RoomPoint,
  type RoomScreen,
  roomObjectId,
  SCREEN_ID,
  SEAT_ROW_ID,
  type SeatRow,
  type SeatRowFootprint,
  type UnitSystem,
} from '@/domain'
import type { CameraView } from '@/scene/orbit'
import {
  DOOR_COLOR,
  DOOR_SWING_COLOR,
  FURNITURE_COLOR,
  FURNITURE_FRONT_COLOR,
  SCENE_COLORS,
  SCREEN_COLOR,
  WINDOW_COLOR,
} from '@/scene/palette'
import {
  FLAT_ON_FLOOR,
  FLOOR_LAYERS,
  toScenePosition,
  type Vec3,
} from '@/scene/top-down'

/**
 * Pure geometry and words for the room objects in the room view (ADR
 * 0006): drawn, never part of the estimated response.
 *
 * Each kind of room object is described once, in ROOM_OBJECT_DRAWINGS
 * (at the end): what is drawn for one from above and in 3D, the
 * rectangle a press picks it up by, its legend entries, its drag help
 * and its words for screen readers. The room view only reads them
 * through roomObjectDrawings, roomObjectGrabs, roomObjectsLegend,
 * roomObjectsDragHelp and describeRoomObjects, and draws the shapes with
 * one renderer per shape kind.
 */

/**
 * How deep the Screen's bar is drawn seen from above, in meters: a drawing
 * size only, deep enough to see and grab, not the depth of a TV.
 */
export const SCREEN_BAR_DEPTH = 0.08

/**
 * How far in front of its wall (or standoff) the 3D panel is drawn, in
 * meters, so it doesn't z-fight with the wall plane: a drawing offset only.
 */
const SCREEN_PANEL_OFFSET = 0.01

/** The Screen from above: a bar on the floor plan. */
export type ScreenBar = {
  /** The middle of the bar, on the floor. */
  center: RoomPoint
  /** Along the front wall. */
  width: number
  /** Into the room. */
  depth: number
}

/**
 * The Screen as a bar its width wide along the front wall, its back on the
 * wall (or, for an acoustically transparent screen, at its standoff) and
 * SCREEN_BAR_DEPTH deep into the room, so it never covers the "Front wall"
 * label outside the wall.
 */
export function screenBar(screen: RoomScreen): ScreenBar {
  const { fromFrontWall } = screenSurface(screen)
  return {
    center: { x: screen.x, y: fromFrontWall + SCREEN_BAR_DEPTH / 2, z: 0 },
    width: screen.width,
    depth: SCREEN_BAR_DEPTH,
  }
}

/**
 * The Screen in 3D: a panel in Three.js coordinates, upright and facing
 * into the room (a Three.js plane faces +z, which is room +y), from its
 * bottom edge up.
 */
export function screenPanel(screen: RoomScreen): {
  position: Vec3
  size: [width: number, height: number]
} {
  const { bottom, top, fromFrontWall } = screenSurface(screen)
  return {
    position: toScenePosition({
      x: screen.x,
      y: fromFrontWall + SCREEN_PANEL_OFFSET,
      z: (bottom + top) / 2,
    }),
    size: [screen.width, screen.height],
  }
}

/**
 * The Seat row in words, for the room view's screen-reader description,
 * for example "A seat row 2 m wide and 0.9 m deep, with the MLP 0.35 m in
 * front of its back; dragging it moves the MLP."
 */
export function describeSeatRow(
  { width, depth }: SeatRow,
  units: UnitSystem,
): string {
  const length = (meters: number) => formatLength(meters, units)
  return (
    `A seat row ${length(width)} wide and ${length(depth)} deep, with the ` +
    `MLP ${length(SEAT_ROW_HEAD_OFFSET)} in front of its back; dragging it ` +
    `moves the MLP.`
  )
}

/** Closer to the centre line than this (half a millimeter) counts as centred. */
const CENTRED_WITHIN = 0.0005

/**
 * The Screen in words, for the room view's screen-reader description, for
 * example "A TV on the front wall, 1.44 m wide and 0.81 m high, its bottom
 * edge 0.93 m above the floor, centred."
 */
export function describeScreen(screen: RoomScreen, units: UnitSystem): string {
  const length = (meters: number) => formatLength(meters, units)
  const what =
    screen.standoff !== null
      ? `An acoustically transparent projection screen ${length(screen.standoff)} in front of the front wall`
      : `${screen.kind === 'tv' ? 'A TV' : 'A projection screen'} on the front wall`
  const where =
    Math.abs(screen.x) < CENTRED_WITHIN
      ? 'centred'
      : `its middle ${length(Math.abs(screen.x))} ${screen.x < 0 ? 'left' : 'right'} of centre`
  return (
    `${what}, ${length(screen.width)} wide and ${length(screen.height)} ` +
    `high, its bottom edge ${length(screen.bottomEdge)} above the floor, ` +
    `${where}.`
  )
}

/**
 * How deep the strip along a furniture box's front is drawn, in meters,
 * at most: a drawing size only, so a turned box shows which way it faces.
 */
export const FURNITURE_FRONT_STRIP = 0.05

/** A furniture box from above: a rectangle, with a strip along its front. */
export type FurniturePlan = {
  /** The middle of the box, on the floor. */
  center: RoomPoint
  /** Along room x and room y, as it is turned. */
  size: [alongX: number, alongY: number]
  /** The strip along its front, inside the rectangle. */
  front: { center: RoomPoint; size: [alongX: number, alongY: number] }
}

/**
 * A furniture box from above, as it is turned: unturned its front faces
 * the back wall (room +y); each quarter turn clockwise turns it to the
 * left wall, the front wall and the right wall.
 */
export function furniturePlan(box: FurnitureBox): FurniturePlan {
  const { left, right, front, back } = furnitureFootprint(box)
  const alongX = right - left
  const alongY = back - front
  const strip = Math.min(FURNITURE_FRONT_STRIP, alongX / 3, alongY / 3)
  const center = { x: box.x, y: box.y, z: 0 }
  const across = { alongX, alongY: strip }
  const along = { alongX: strip, alongY }
  const { at, size } = {
    0: { at: { x: box.x, y: back - strip / 2 }, size: across },
    90: { at: { x: left + strip / 2, y: box.y }, size: along },
    180: { at: { x: box.x, y: front + strip / 2 }, size: across },
    270: { at: { x: right - strip / 2, y: box.y }, size: along },
  }[box.rotation]
  return {
    center,
    size: [alongX, alongY],
    front: { center: { ...at, z: 0 }, size: [size.alongX, size.alongY] },
  }
}

/**
 * A furniture box in 3D: a box in Three.js coordinates (y up), standing
 * on the floor.
 */
export function furnitureBlock(box: FurnitureBox): {
  position: Vec3
  size: Vec3
} {
  const { size } = furniturePlan(box)
  return {
    position: toScenePosition({ x: box.x, y: box.y, z: box.height / 2 }),
    size: [size[0], box.height, size[1]],
  }
}

/**
 * The furniture boxes in words, for the room view's screen-reader
 * description, for example "Furniture: Cabinet (box 1), 1.6 m wide, 0.45 m
 * deep and 0.5 m high." Empty without boxes.
 */
export function describeFurniture(
  furniture: readonly FurnitureBox[],
  units: UnitSystem,
): string {
  if (furniture.length === 0) return ''
  const length = (meters: number) => formatLength(meters, units)
  const boxes = furniture.map(
    (box, index) =>
      `${furnitureLabel(box, index)}, ${length(box.width)} wide, ` +
      `${length(box.depth)} deep and ${length(box.height)} high`,
  )
  return `Furniture: ${boxes.join('; ')}.`
}

/**
 * How deep an opening's mark is drawn seen from above, in meters: a
 * drawing size only, deep enough to see and grab, along the inside of its
 * wall.
 */
export const OPENING_MARK_DEPTH = 0.1

/**
 * How far in front of its wall the 3D panel is drawn, in meters, so it
 * doesn't z-fight with the wall: a drawing offset only.
 */
const OPENING_PANEL_OFFSET = 0.01

/** A rectangle on the floor plan: its middle and its size along x and y. */
export type FloorRect = {
  center: RoomPoint
  size: [alongX: number, alongY: number]
}

/**
 * A rectangle against the inside of the opening's wall, as wide as the
 * opening and `depth` deep into the room.
 */
function againstWall(room: Room, opening: Opening, depth: number): FloorRect {
  const center = fromWallFrame(room, opening.wall, {
    along: opening.position,
    out: depth / 2,
  })
  // Into the room along y means the wall runs along x.
  const alongX = inwardDirection(opening.wall).x === 0
  return {
    center: { ...center, z: 0 },
    size: alongX ? [opening.width, depth] : [depth, opening.width],
  }
}

/** An opening from above: a mark OPENING_MARK_DEPTH deep along its wall. */
export function openingMark(room: Room, opening: Opening): FloorRect {
  return againstWall(room, opening, OPENING_MARK_DEPTH)
}

/**
 * Where a door swings, from above: a square in front of it, as deep as
 * the door is wide. W1 warns about a speaker in it.
 */
export function doorSwing(room: Room, door: Opening): FloorRect {
  return againstWall(room, door, door.width)
}

/**
 * How a 3D panel on `wall` is turned about Three.js y to face into the
 * room: a Three.js plane faces +z (room +y), and turning it by `a` faces
 * it along (sin a, cos a) in room (x, y).
 */
function panelTurn(wall: Wall): number {
  const inward = inwardDirection(wall)
  return Math.atan2(inward.x, inward.y)
}

/**
 * An opening in 3D: an upright panel in Three.js coordinates on the inside
 * of its wall, from its bottom to its top (a door from the floor), turned
 * to face into the room (a Three.js plane faces +z, which is room +y).
 */
export function openingPanel(
  room: Room,
  opening: Opening,
): { position: Vec3; size: [width: number, height: number]; rotation: Vec3 } {
  const { bottom, top } = openingVerticalSpan(room, opening)
  const { x, y } = fromWallFrame(room, opening.wall, {
    along: opening.position,
    out: OPENING_PANEL_OFFSET,
  })
  return {
    position: toScenePosition({ x, y, z: (bottom + top) / 2 }),
    size: [opening.width, top - bottom],
    rotation: [0, panelTurn(opening.wall), 0],
  }
}

/**
 * The openings in words, for the room view's screen-reader description,
 * for example "Doors and windows: Door (opening 1) on the back wall, 0.9 m
 * wide, 1.8 m from the left wall." Empty without openings.
 */
export function describeOpenings(
  openings: readonly Opening[],
  units: UnitSystem,
): string {
  if (openings.length === 0) return ''
  const length = (meters: number) => formatLength(meters, units)
  const described = openings.map((opening, index) => {
    const size =
      opening.kind === 'window'
        ? `${length(opening.width)} wide and ${length(opening.height)} high, its sill ${length(opening.sill)} up`
        : `${length(opening.width)} wide`
    return (
      `${openingLabel(opening, index)} on the ${opening.wall} wall, ${size}, ` +
      `${length(openingSpan(opening).start)} from the ${wallStart(opening.wall)} wall`
    )
  })
  return `Doors and windows: ${described.join('; ')}.`
}

/**
 * What the room view says wherever it lists room objects (ADR 0006).
 */
const ROOM_OBJECTS_NOTE =
  'Room objects are drawn and used for placement warnings, not part of the estimated response.'

/**
 * How opaque a furniture box is drawn in 3D, so what stands behind it
 * shows through: a drawing choice only.
 */
const FURNITURE_BLOCK_OPACITY = 0.85

/** How opaque a door or window is drawn in 3D: a drawing choice only. */
const OPENING_PANEL_OPACITY = 0.6

/** The room objects as the room view shows them. */
export type RoomObjectsInView = {
  readonly room: Room
  /** As the config holds them. */
  readonly roomObjects: RoomObjects
  /**
   * Where the Seat row is drawn: around the MLP, cut off at the walls
   * (seatRowFootprint).
   */
  readonly seatRow: SeatRowFootprint
}

/**
 * One thing drawn for a room object, in Three.js coordinates (see
 * toScenePosition): a flat rectangle (`plane`, seen from its front only
 * unless `doubleSided`), a solid `box`, or a text `label` pinned to a
 * room point. An `opacity` under 1 draws it see-through.
 */
export type RoomObjectShape =
  | {
      readonly kind: 'plane'
      readonly position: Vec3
      readonly rotation: Vec3
      readonly size: [width: number, height: number]
      readonly color: string
      readonly opacity: number
      readonly doubleSided: boolean
    }
  | {
      readonly kind: 'box'
      readonly position: Vec3
      readonly size: Vec3
      readonly color: string
      readonly opacity: number
    }
  | { readonly kind: 'label'; readonly at: RoomPoint; readonly text: string }

/** What is drawn for one room object, named by its id. */
export type RoomObjectDrawing = {
  readonly id: RoomObjectId
  readonly shapes: readonly RoomObjectShape[]
}

/**
 * The rectangle on the floor plan a press picks a room object up by, at
 * least: `width` along x and `depth` along y (see grabAreas).
 */
export type GrabRectangle = {
  readonly center: FloorPoint
  readonly width: number
  readonly depth: number
}

/** A room object's grab rectangle, with the id a press on it picks up. */
export type RoomObjectGrab = {
  readonly target: RoomObjectId
  readonly marker: GrabRectangle
}

/**
 * One line of the room view's legend: its words, and its swatch, as
 * Tailwind classes for its shape and its fill and edge colors.
 */
export type LegendEntry = {
  readonly text: string
  readonly swatch: {
    readonly className: string
    readonly fill: string
    readonly edge?: string
  }
}

/** The Seat row as the view has it: its own size, and where it is drawn. */
type ViewedSeatRow = {
  readonly size: SeatRow
  readonly footprint: SeatRowFootprint
}

/**
 * Everything the room view shows of one kind of room object, `T` being
 * one object of the kind as the view has it.
 */
type KindDrawing<T> = {
  /** The kind's objects in the Room, in the config's order. */
  readonly of: (objects: RoomObjectsInView) => readonly T[]
  /** The id of the one at `index` (from 0) in that list. */
  readonly id: (index: number) => RoomObjectId
  /** What is drawn for one in each camera view. */
  readonly shapes: {
    readonly [V in CameraView]: (
      object: T,
      room: Room,
    ) => readonly RoomObjectShape[]
  }
  /** The rectangle a press picks one up by. */
  readonly grab: (object: T, room: Room) => GrabRectangle
  /** What the drag help says when the Room has any. */
  readonly help: string
  /**
   * The legend's entries for the kind, each shown when the Room has one
   * it is `for` (any of the kind without `for`).
   */
  readonly legend: readonly (LegendEntry & {
    readonly for?: (object: T) => boolean
  })[]
  /** The Room's ones in words, or '' when it has none. */
  readonly describe: (objects: readonly T[], units: UnitSystem) => string
}

/** A KindDrawing whose object type no longer shows. */
type AnyKindDrawing = {
  readonly drawings: (
    objects: RoomObjectsInView,
    view: CameraView,
  ) => readonly RoomObjectDrawing[]
  readonly grabs: (objects: RoomObjectsInView) => readonly RoomObjectGrab[]
  readonly legend: (objects: RoomObjectsInView) => readonly LegendEntry[]
  readonly help: (objects: RoomObjectsInView) => readonly string[]
  readonly describe: (objects: RoomObjectsInView, units: UnitSystem) => string
}

/** The room view's functions for one kind, from its KindDrawing. */
function kindDrawing<T>(kind: KindDrawing<T>): AnyKindDrawing {
  return {
    drawings: (objects, view) =>
      kind.of(objects).map((object, index) => ({
        id: kind.id(index),
        shapes: kind.shapes[view](object, objects.room),
      })),
    grabs: (objects) =>
      kind.of(objects).map((object, index) => ({
        target: kind.id(index),
        marker: kind.grab(object, objects.room),
      })),
    legend: (objects) => {
      const list = kind.of(objects)
      return kind.legend
        .filter((entry) => list.some(entry.for ?? (() => true)))
        .map(({ text, swatch }) => ({ text, swatch }))
    },
    help: (objects) => (kind.of(objects).length > 0 ? [kind.help] : []),
    describe: (objects, units) => kind.describe(kind.of(objects), units),
  }
}

/** A rectangle lying flat on the floor at layer height `layer`. */
function onFloor(
  center: FloorPoint,
  size: [alongX: number, alongY: number],
  layer: number,
  color: string,
): RoomObjectShape {
  return {
    kind: 'plane',
    position: toScenePosition({ x: center.x, y: center.y, z: layer }),
    rotation: FLAT_ON_FLOOR,
    size,
    color,
    opacity: 1,
    doubleSided: false,
  }
}

/** The Seat row, drawn flat on the floor in either view. */
function seatRowShapes({ footprint }: ViewedSeatRow) {
  const { center, width, depth } = footprint
  return [
    onFloor(center, [width, depth], FLOOR_LAYERS.seatRow, SCENE_COLORS.seatRow),
  ]
}

/** A rectangle on the floor plan as a grab rectangle. */
function grabRectangle({ center, size }: FloorRect): GrabRectangle {
  return { center, width: size[0], depth: size[1] }
}

/**
 * Every kind of room object in the room view, in the order the view
 * draws, lists and describes them.
 */
const ROOM_OBJECT_DRAWINGS: { readonly [K in RoomObjectKind]: AnyKindDrawing } =
  {
    // A pale rectangle on the floor with the MLP near its back, in both
    // views; dragging it moves the MLP (see withDragged). It has no legend
    // entry: the MLP's marker sits on it.
    seatRow: kindDrawing<ViewedSeatRow>({
      of: ({ roomObjects, seatRow }) => [
        { size: roomObjects.seatRow, footprint: seatRow },
      ],
      id: () => SEAT_ROW_ID,
      shapes: { 'top-down': seatRowShapes, '3d': seatRowShapes },
      grab: ({ footprint }) => footprint,
      help: 'Drag the seat row to move it with the MLP.',
      legend: [],
      describe: (seatRows, units) =>
        seatRows.map(({ size }) => describeSeatRow(size, units)).join(' '),
    }),
    // A bar along the front wall from above (screenBar), dragged along the
    // wall; an upright panel at its height in 3D.
    screen: kindDrawing<RoomScreen>({
      of: ({ roomObjects }) => (roomObjects.screen ? [roomObjects.screen] : []),
      id: () => SCREEN_ID,
      shapes: {
        'top-down': (screen) => {
          const { center, width, depth } = screenBar(screen)
          return [
            onFloor(
              center,
              [width, depth],
              FLOOR_LAYERS.screen,
              SCENE_COLORS.screen,
            ),
          ]
        },
        '3d': (screen) => {
          const { position, size } = screenPanel(screen)
          return [
            {
              kind: 'plane',
              position,
              rotation: [0, 0, 0],
              size,
              color: SCENE_COLORS.screen,
              opacity: 1,
              doubleSided: true,
            },
          ]
        },
      },
      grab: screenBar,
      help: 'Drag the screen along the front wall.',
      legend: [
        {
          text: 'Screen (drawn only, not in the estimate)',
          swatch: { className: 'h-1 w-3 rounded-xs', fill: SCREEN_COLOR },
        },
      ],
      describe: (screens, units) =>
        screens.map((screen) => describeScreen(screen, units)).join(' '),
    }),
    // From above, a rectangle with a darker strip along its front and its
    // name, dragged by its middle; a solid box standing on the floor in 3D.
    furniture: kindDrawing<FurnitureBox>({
      of: ({ roomObjects }) => roomObjects.furniture,
      id: (index) => roomObjectId('furniture', index),
      shapes: {
        'top-down': (box) => {
          const { center, size, front } = furniturePlan(box)
          return [
            onFloor(
              center,
              size,
              FLOOR_LAYERS.furniture,
              SCENE_COLORS.furniture,
            ),
            onFloor(
              front.center,
              front.size,
              FLOOR_LAYERS.furnitureFront,
              SCENE_COLORS.furnitureFront,
            ),
            { kind: 'label', at: center, text: box.name },
          ]
        },
        '3d': (box) => {
          const { position, size } = furnitureBlock(box)
          return [
            {
              kind: 'box',
              position,
              size,
              color: SCENE_COLORS.furniture,
              opacity: FURNITURE_BLOCK_OPACITY,
            },
          ]
        },
      },
      grab: (box) => grabRectangle(furniturePlan(box)),
      help: 'Drag the furniture boxes to move them.',
      legend: [
        {
          text: 'Furniture box, front edge darker (drawn and warned about, not in the estimate)',
          swatch: {
            className: 'h-2.5 w-3 rounded-xs border-b-2',
            fill: FURNITURE_COLOR,
            edge: FURNITURE_FRONT_COLOR,
          },
        },
      ],
      describe: describeFurniture,
    }),
    // From above, a mark along the inside of its wall, dragged along it,
    // and a door's swing as a pale square in front of it; a see-through
    // upright panel at its height in 3D.
    opening: kindDrawing<Opening>({
      of: ({ roomObjects }) => roomObjects.openings,
      id: (index) => roomObjectId('opening', index),
      shapes: {
        'top-down': (opening, room) => {
          const mark = openingMark(room, opening)
          const markShape = onFloor(
            mark.center,
            mark.size,
            FLOOR_LAYERS.opening,
            SCENE_COLORS[opening.kind],
          )
          if (opening.kind !== 'door') return [markShape]
          const swing = doorSwing(room, opening)
          return [
            onFloor(
              swing.center,
              swing.size,
              FLOOR_LAYERS.doorSwing,
              SCENE_COLORS.doorSwing,
            ),
            markShape,
          ]
        },
        '3d': (opening, room) => [
          {
            kind: 'plane',
            ...openingPanel(room, opening),
            color: SCENE_COLORS[opening.kind],
            opacity: OPENING_PANEL_OPACITY,
            doubleSided: true,
          },
        ],
      },
      grab: (opening, room) => grabRectangle(openingMark(room, opening)),
      help: 'Drag doors and windows along their wall.',
      legend: [
        {
          text: 'Door and where it swings (drawn and warned about, not in the estimate)',
          swatch: {
            className: 'h-2.5 w-3 rounded-xs border-t-2',
            fill: DOOR_SWING_COLOR,
            edge: DOOR_COLOR,
          },
          for: ({ kind }) => kind === 'door',
        },
        {
          text: 'Window (drawn and warned about, not in the estimate)',
          swatch: { className: 'h-1 w-3 rounded-xs', fill: WINDOW_COLOR },
          for: ({ kind }) => kind === 'window',
        },
      ],
      describe: describeOpenings,
    }),
  }

const DRAWN_KINDS = Object.values(ROOM_OBJECT_DRAWINGS)

/**
 * What the room view draws for every room object in `view`, one entry
 * per object: the seat row, the screen, the furniture boxes and the
 * openings, each list in the config's order.
 */
export function roomObjectDrawings(
  objects: RoomObjectsInView,
  view: CameraView,
): readonly RoomObjectDrawing[] {
  return DRAWN_KINDS.flatMap((kind) => kind.drawings(objects, view))
}

/**
 * The grab rectangle of each room object of `kind`, in the config's
 * order, with the id a press on it picks up (see grabAreas).
 */
export function roomObjectGrabs(
  objects: RoomObjectsInView,
  kind: RoomObjectKind,
): readonly RoomObjectGrab[] {
  return ROOM_OBJECT_DRAWINGS[kind].grabs(objects)
}

/** The legend's entries for the room objects the Room has. */
export function roomObjectsLegend(
  objects: RoomObjectsInView,
): readonly LegendEntry[] {
  return DRAWN_KINDS.flatMap((kind) => kind.legend(objects))
}

/**
 * How to drag the room objects the Room has, for the top-down view's
 * help, for example "Drag the seat row to move it with the MLP."
 */
export function roomObjectsDragHelp(objects: RoomObjectsInView): string {
  return DRAWN_KINDS.flatMap((kind) => kind.help(objects)).join(' ')
}

/**
 * The room objects in words, for the room view's screen-reader
 * description: each kind the Room has, then that they are drawn and
 * warned about but not part of the estimate (ADR 0006).
 */
export function describeRoomObjects(
  objects: RoomObjectsInView,
  units: UnitSystem,
): string {
  return [
    ...DRAWN_KINDS.map((kind) => kind.describe(objects, units)),
    ROOM_OBJECTS_NOTE,
  ]
    .filter(Boolean)
    .join(' ')
}
