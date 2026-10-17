/**
 * Openings (GLOSSARY.md): doors and windows on the Room's walls, room
 * objects. They are drawn and give placement warnings (W1, W2, W3 and
 * W5), and are never part of the estimated response (ADR 0006): the
 * low-frequency model still assumes closed, rigid walls. A Room has up to
 * OPENINGS.maxCount of them, and room-objects.ts keeps their list and ids.
 *
 * An opening sits on one wall. `position` is where its middle is along
 * that wall, from the wall's start (`along` in the wall frame,
 * wall-frame.ts): the left wall for the front and back walls, the front
 * wall for the left and right walls. A door reaches from the floor to
 * OPENINGS.doorHeight (ours); a window from its sill to its top. Every
 * opening stays on its wall, between the corners, the floor and the
 * ceiling.
 */
import { linkSlack } from './link-precision'
import {
  hasValidLengths,
  type LengthTolerance,
  type ObjectLengths,
} from './object-lengths'
import { clamp, type AcceptedRange } from './range'
import { OPENINGS } from './reference'
import { WALLS, type FloorPoint, type Room, type Wall } from './room'
import {
  fromWallFrame,
  toWallFrame,
  wallLength,
  type WallPoint,
} from './wall-frame'

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

/** Where an opening is along its wall: its two edges, from the wall's start. */
export function openingSpan(opening: Opening): { start: number; end: number } {
  return {
    start: opening.position - opening.width / 2,
    end: opening.position + opening.width / 2,
  }
}

/** The opening's two edges on the floor plan, its start edge first. */
export function openingEnds(
  room: Room,
  opening: Opening,
): [FloorPoint, FloorPoint] {
  const { start, end } = openingSpan(opening)
  return [
    fromWallFrame(room, opening.wall, { along: start, out: 0 }),
    fromWallFrame(room, opening.wall, { along: end, out: 0 }),
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
  const { along, out } = toWallFrame(room, opening.wall, point)
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
  const { along, out } = toWallFrame(room, opening.wall, point)
  const beside = along < start ? start - along : along > end ? along - end : 0
  return Math.hypot(beside, out)
}

/**
 * How far a stored opening may reach past its wall's ends or the ceiling,
 * in meters: a share link writes its lengths to the millimeter
 * (link-precision.ts), which can move an edge half a millimeter for
 * each.
 */
const FIT_SLACK = linkSlack('openings')

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
    position: toWallFrame(room, opening.wall, to).along,
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
