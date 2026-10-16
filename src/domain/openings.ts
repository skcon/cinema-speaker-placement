/**
 * Openings (GLOSSARY.md): doors and windows on the Room's walls, room
 * objects. They are drawn and give placement warnings (W1, W2, W3 and
 * W5), and are never part of the estimated response (ADR 0006): the
 * low-frequency model still assumes closed, rigid walls. A Room has up to
 * OPENINGS.maxCount of them, and room-objects.ts keeps their list and ids.
 *
 * An opening sits on one wall. `position` is where its middle is along
 * that wall, from the wall's start: the left wall for the front and back
 * walls (so along room x, from -width / 2), the front wall for the left
 * and right walls (along room y). A door reaches from the floor to
 * OPENINGS.doorHeight (ours); a window from its sill to its top. Every
 * opening stays on its wall, between the corners, the floor and the
 * ceiling.
 */
import { ROUNDING_SLACK, toMillimeter } from './manual-positions'
import {
  hasValidLengths,
  type LengthTolerance,
  type ObjectLengths,
} from './object-lengths'
import { clamp, type AcceptedRange } from './range'
import { OPENINGS } from './reference'
import {
  distanceToWall,
  WALLS,
  type FloorPoint,
  type Room,
  type RoomPoint,
  type Wall,
} from './room'

/** What an opening is. */
export const OPENING_KINDS = ['door', 'window'] as const

export type OpeningKind = (typeof OPENING_KINDS)[number]

/** A door: a wall, where along it and how wide (see above), in meters. */
export type Door = {
  kind: 'door'
  wall: Wall
  /** Its middle along the wall, from the wall's start. */
  position: number
  width: number
}

/** A window: as a door, plus how high its sill is and how high it is. */
export type WindowOpening = {
  kind: 'window'
  wall: Wall
  /** Its middle along the wall, from the wall's start. */
  position: number
  width: number
  /** From the floor to its bottom edge. */
  sill: number
  /** From its sill to its top. */
  height: number
}

export type Opening = Door | WindowOpening

/**
 * An opening's lengths as they are edited (see OPENING_LENGTHS): its
 * width, where it is as `fromCorner` (from the wall's start to its nearest
 * edge), and for a window its sill and height.
 */
export type OpeningDimension = 'width' | 'fromCorner' | 'sill' | 'height'

/** How long `wall` is, corner to corner, in meters. */
export function wallLength(room: Room, wall: Wall): number {
  return wall === 'front' || wall === 'back' ? room.width : room.length
}

/** Where an opening is along its wall: its two edges, from the wall's start. */
export function openingSpan(opening: Opening): { start: number; end: number } {
  return {
    start: opening.position - opening.width / 2,
    end: opening.position + opening.width / 2,
  }
}

/** Where a point on the floor plan is along `wall`, from the wall's start. */
export function alongWall(room: Room, wall: Wall, point: FloorPoint): number {
  return wall === 'front' || wall === 'back'
    ? point.x + room.width / 2
    : point.y
}

/** The point on `wall`'s base `along` meters from the wall's start. */
export function pointOnWall(room: Room, wall: Wall, along: number): FloorPoint {
  switch (wall) {
    case 'front':
      return { x: along - room.width / 2, y: 0 }
    case 'back':
      return { x: along - room.width / 2, y: room.length }
    case 'left':
      return { x: -room.width / 2, y: along }
    case 'right':
      return { x: room.width / 2, y: along }
  }
}

/** The opening's two edges on the floor plan, its start edge first. */
export function openingEnds(
  room: Room,
  opening: Opening,
): [FloorPoint, FloorPoint] {
  const { start, end } = openingSpan(opening)
  return [
    pointOnWall(room, opening.wall, start),
    pointOnWall(room, opening.wall, end),
  ]
}

/**
 * How high the opening reaches: a door from the floor to
 * OPENINGS.doorHeight (no higher than the ceiling), a window from its sill
 * to its top.
 */
export function openingVerticalSpan(
  room: Room,
  opening: Opening,
): { bottom: number; top: number } {
  return opening.kind === 'door'
    ? { bottom: 0, top: Math.min(OPENINGS.doorHeight, room.height) }
    : { bottom: opening.sill, top: opening.sill + opening.height }
}

/** A point on a wall: how far along it (from its start) and how high. */
export type WallPoint = { along: number; z: number }

/** Whether `point` on `wall` is inside the opening (its edges count). */
export function isInOpening(
  room: Room,
  opening: Opening,
  wall: Wall,
  { along, z }: WallPoint,
): boolean {
  const { start, end } = openingSpan(opening)
  const { bottom, top } = openingVerticalSpan(room, opening)
  return (
    opening.wall === wall &&
    along >= start &&
    along <= end &&
    z >= bottom &&
    z <= top
  )
}

/**
 * Whether `point` is in front of the opening on the floor plan: between
 * its edges along the wall, and at most `depth` meters into the room from
 * it.
 */
export function isInFrontOfOpening(
  room: Room,
  opening: Opening,
  point: FloorPoint,
  depth: number,
): boolean {
  const { start, end } = openingSpan(opening)
  const along = alongWall(room, opening.wall, point)
  const out = distanceToWall(room, { ...point, z: 0 }, opening.wall)
  return along >= start && along <= end && out >= 0 && out <= depth
}

/**
 * How far `point` is from the opening on the floor plan: from the nearest
 * point of its base, between its edges, in meters.
 */
export function floorDistanceToOpening(
  room: Room,
  opening: Opening,
  point: FloorPoint,
): number {
  const { start, end } = openingSpan(opening)
  const along = alongWall(room, opening.wall, point)
  const beside = along < start ? start - along : along > end ? along - end : 0
  const out = distanceToWall(room, { ...point, z: 0 }, opening.wall)
  return Math.hypot(beside, out)
}

/**
 * Where on `wall` the first-order reflection from `source` to `listener`
 * hits it (the image-source point: the angle in equals the angle out), or
 * null when either is not inside the Room in front of the wall. The point
 * divides the way from source to listener in the ratio of their
 * distances to the wall.
 */
export function wallReflectionPoint(
  room: Room,
  wall: Wall,
  source: RoomPoint,
  listener: RoomPoint,
): WallPoint | null {
  const fromSource = distanceToWall(room, source, wall)
  const fromListener = distanceToWall(room, listener, wall)
  if (fromSource < 0 || fromListener < 0 || fromSource + fromListener === 0) {
    return null
  }
  const share = fromSource / (fromSource + fromListener)
  const at = (axis: 'x' | 'y' | 'z') =>
    source[axis] + (listener[axis] - source[axis]) * share
  return {
    along: alongWall(room, wall, { x: at('x'), y: at('y') }),
    z: at('z'),
  }
}

/**
 * How far a stored opening may reach past its wall's ends or the ceiling,
 * in meters: a share link writes its lengths to the millimeter
 * (roundOpeningForLink), which can move an edge half a millimeter for
 * each.
 */
const FIT_SLACK = 2 * ROUNDING_SLACK

/**
 * The accepted range of each of the opening's lengths in `room`, given
 * its others: OPENINGS' limits, on its wall and under the ceiling. A
 * wider opening moves in from a corner instead (see OPENING_LENGTHS.set),
 * so its width is only limited by the wall. A door has no sill or height
 * to set: theirs are its own, fixed. Stored, an opening may reach
 * FIT_SLACK past its limits, its wall's ends and the ceiling.
 */
function openingLimits(
  room: Room,
  opening: Opening,
  tolerance: LengthTolerance,
): Record<OpeningDimension, AcceptedRange> {
  const { width, sill, height } = OPENINGS.limits
  const slack = tolerance === 'stored' ? FIT_SLACK : 0
  const wall = wallLength(room, opening.wall)
  const { bottom, top } = openingVerticalSpan(room, opening)
  const tall = top - bottom
  return {
    width: { min: width.min, max: Math.min(width.max, wall) + slack },
    // Never an empty range, even for a stored opening a little wider
    // than its wall.
    fromCorner: {
      min: 0 - slack, // +0 when typed, not -0
      max: Math.max(-slack, wall - opening.width) + slack,
    },
    sill:
      opening.kind === 'door'
        ? { min: 0, max: 0 }
        : {
            min: sill.min,
            max: Math.min(sill.max, room.height - tall) + slack,
          },
    height:
      opening.kind === 'door'
        ? { min: tall, max: tall }
        : {
            min: height.min,
            max: Math.min(height.max, room.height - opening.sill) + slack,
          },
  }
}

/**
 * The opening's lengths: its width, where it is as `fromCorner` (from the
 * wall's start to its nearest edge), and a window's sill and height (a
 * door has none: see openingVerticalSpan). A wider opening moves in from
 * a corner it would pass.
 */
export const OPENING_LENGTHS: ObjectLengths<Opening, OpeningDimension> = {
  dimensions: ['width', 'fromCorner', 'sill', 'height'],
  limits: openingLimits,
  read: (_, opening, dimension) => {
    switch (dimension) {
      case 'width':
        return opening.width
      case 'fromCorner':
        return openingSpan(opening).start
      default:
        return opening.kind === 'window' ? opening[dimension] : null
    }
  },
  set: (room, opening, dimension, meters) => {
    switch (dimension) {
      case 'fromCorner':
        return { ...opening, position: meters + opening.width / 2 }
      case 'width':
        return keepOnWall(room, { ...opening, width: meters })
      default:
        return opening.kind === 'window'
          ? { ...opening, [dimension]: meters }
          : opening
    }
  },
}

/**
 * The opening moved to another wall, as far along it as it was, moved in
 * from a corner and narrowed to fit a shorter wall.
 */
export function withOpeningWall(
  room: Room,
  opening: Opening,
  wall: Wall,
): Opening {
  return opening.wall === wall
    ? opening
    : fitOpeningToRoom(room, { ...opening, wall })
}

/**
 * The opening dragged on the floor plan to `to`: it slides along its own
 * wall, its middle to where `to` is along it, stopped at the corners.
 */
export function openingMovedTo(
  room: Room,
  opening: Opening,
  to: FloorPoint,
): Opening {
  if (!Number.isFinite(to.x) || !Number.isFinite(to.y)) return opening
  const moved = keepOnWall(room, {
    ...opening,
    position: alongWall(room, opening.wall, to),
  })
  return moved.position === opening.position ? opening : moved
}

/** The opening's middle moved in, if needed, so it is between the corners. */
function keepOnWall<O extends Opening>(room: Room, opening: O): O {
  const half = opening.width / 2
  const position = clamp(
    opening.position,
    half,
    Math.max(half, wallLength(room, opening.wall) - half),
  )
  return position === opening.position ? opening : { ...opening, position }
}

/**
 * The opening sized and moved, if needed, so it fits `room` (after the
 * Room shrinks, or on another wall): no wider than its wall, moved in from
 * the corners, and a window lowered (then made lower) to fit under the
 * ceiling. One that fits comes back as it was.
 */
export function fitOpeningToRoom(room: Room, opening: Opening): Opening {
  const width = Math.min(opening.width, wallLength(room, opening.wall))
  const narrowed = width === opening.width ? opening : { ...opening, width }
  const onWall = keepOnWall(room, narrowed)
  if (onWall.kind === 'door') return onWall
  const height = Math.min(onWall.height, room.height)
  const sill = Math.min(onWall.sill, room.height - height)
  return height === onWall.height && sill === onWall.sill
    ? onWall
    : { ...onWall, height, sill }
}

/**
 * Whether the opening is one a config may hold in `room`: a known kind on
 * a wall, and every length it has inside its stored limits (so the whole
 * opening on its wall and under the ceiling, to the millimeter).
 */
export function isValidOpening(room: Room, opening: Opening): boolean {
  return (
    OPENING_KINDS.includes(opening.kind) &&
    WALLS.includes(opening.wall) &&
    hasValidLengths(OPENING_LENGTHS, room, opening)
  )
}

/**
 * The opening a Room gets for `kind`: OPENINGS' preset, a door in the
 * middle of the back wall (behind the seats, away from the front stage),
 * a window in the middle of the right wall, fitted into the room. Drag or
 * edit it to where it really is.
 */
export function newOpening(room: Room, kind: OpeningKind): Opening {
  const opening: Opening =
    kind === 'door'
      ? {
          kind,
          wall: 'back',
          position: room.width / 2,
          width: OPENINGS.presets.door.width,
        }
      : {
          kind,
          wall: 'right',
          position: room.length / 2,
          ...OPENINGS.presets.window,
        }
  return fitOpeningToRoom(room, opening)
}

/**
 * The opening as a share link stores it: every length to the millimeter.
 * A typed imperial size is a long binary fraction in meters, and six
 * openings of them would not fit the URL budget; the millimeter is well
 * under the 0.1 in the app shows.
 */
export function roundOpeningForLink(opening: Opening): Opening {
  const position = toMillimeter(opening.position)
  const width = toMillimeter(opening.width)
  return opening.kind === 'door'
    ? { ...opening, position, width }
    : {
        ...opening,
        position,
        width,
        sill: toMillimeter(opening.sill),
        height: toMillimeter(opening.height),
      }
}

/** How the app names each kind of opening. */
const KIND_NAMES = {
  door: 'Door',
  window: 'Window',
} as const satisfies Record<OpeningKind, string>

/**
 * How the app names opening `index` (from 0) in words, for example
 * "Door (opening 1)".
 */
export function openingLabel(opening: Opening, index: number): string {
  return `${KIND_NAMES[opening.kind]} (opening ${index + 1})`
}
