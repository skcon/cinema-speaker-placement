import {
  formatLength,
  furnitureFootprint,
  furnitureLabel,
  openingLabel,
  openingSpan,
  openingVerticalSpan,
  pointOnWall,
  type Opening,
  type Room,
  type Wall,
  screenSurface,
  SEAT_ROW_HEAD_OFFSET,
  type FurnitureBox,
  type RoomPoint,
  type RoomScreen,
  type SeatRow,
  type UnitSystem,
} from '@/domain'
import { toScenePosition, type Vec3 } from '@/scene/top-down'

/**
 * Pure geometry and words for the room objects in the room view (ADR
 * 0006): drawn, never part of the estimated response.
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

/** Which way is into the room from each wall, on the floor plan. */
const INWARD = {
  front: { x: 0, y: 1 },
  back: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
} as const satisfies Record<Wall, { x: number; y: number }>

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
  const middle = pointOnWall(room, opening.wall, opening.position)
  const inward = INWARD[opening.wall]
  const alongX = opening.wall === 'front' || opening.wall === 'back'
  return {
    center: {
      x: middle.x + (inward.x * depth) / 2,
      y: middle.y + (inward.y * depth) / 2,
      z: 0,
    },
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

/** How each wall's 3D panel is turned to face into the room (about y). */
const PANEL_TURN = {
  front: 0,
  back: Math.PI,
  left: Math.PI / 2,
  right: -Math.PI / 2,
} as const satisfies Record<Wall, number>

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
  const middle = pointOnWall(room, opening.wall, opening.position)
  const inward = INWARD[opening.wall]
  return {
    position: toScenePosition({
      x: middle.x + inward.x * OPENING_PANEL_OFFSET,
      y: middle.y + inward.y * OPENING_PANEL_OFFSET,
      z: (bottom + top) / 2,
    }),
    size: [opening.width, top - bottom],
    rotation: [0, PANEL_TURN[opening.wall], 0],
  }
}

/** Where along each wall an opening is measured from, in words. */
const MEASURED_FROM = {
  front: 'the left wall',
  back: 'the left wall',
  left: 'the front wall',
  right: 'the front wall',
} as const satisfies Record<Wall, string>

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
      `${length(openingSpan(opening).start)} from ${MEASURED_FROM[opening.wall]}`
    )
  })
  return `Doors and windows: ${described.join('; ')}.`
}
