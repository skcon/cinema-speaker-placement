/**
 * The Seat row (GLOSSARY.md): the couch or row of seats the MLP, the
 * listener's head, sits on. A room object (ADR 0006): drawn, never part of
 * the estimated response, and nothing is analyzed at its other seats.
 *
 * Its width and depth are in the config. Where it is follows the MLP,
 * which stays the one source of truth for the position: centered across
 * the room on the MLP, with the couch's back edge SEAT_ROW.headOffset
 * behind it and the rest of its depth in front, as a seated head rests
 * near the back cushion. So dragging the seat row moves the MLP, and
 * moving the MLP (by hand, Auto-place or "Move MLP here") moves the seat
 * row with it.
 */
import { hasValidLengths, type ObjectLengths } from './object-lengths'
import { SEAT_ROW } from './reference'
import type { FloorPoint, Room, RoomPoint } from './room'

/** The seat row's size, in meters. */
export type SeatRow = {
  /** Side to side. */
  width: number
  /** Front to back, from its front edge to the back of its back. */
  depth: number
}

/** How far the seat row's back edge is behind the MLP, in meters. */
export const SEAT_ROW_HEAD_OFFSET: number = SEAT_ROW.headOffset

/** One of the seat row's lengths the user sets. */
export type SeatRowDimension = keyof SeatRow

/** The seat row a config starts with: about a three-seat couch. */
export const DEFAULT_SEAT_ROW: SeatRow = {
  width: SEAT_ROW.defaultWidth,
  depth: SEAT_ROW.defaultDepth,
}

const LIMITS = {
  width: SEAT_ROW.widthLimits,
  depth: SEAT_ROW.depthLimits,
} as const satisfies Record<SeatRowDimension, unknown>

/**
 * The seat row's lengths: its width and depth, each within SEAT_ROW's
 * limits whatever the Room (a seat row wider than the room is drawn cut
 * off at the walls). A share link stores them as typed, so a config holds
 * them to the same limits.
 */
export const SEAT_ROW_LENGTHS: ObjectLengths<SeatRow, SeatRowDimension> = {
  dimensions: ['width', 'depth'],
  limits: () => LIMITS,
  read: (_, seatRow, dimension) => seatRow[dimension],
  set: (_, seatRow, dimension, meters) => ({ ...seatRow, [dimension]: meters }),
}

/** Whether both of the seat row's lengths are accepted. */
export function isValidSeatRow(room: Room, seatRow: SeatRow): boolean {
  return hasValidLengths(SEAT_ROW_LENGTHS, room, seatRow)
}

/** Where the seat row is drawn on the floor plan, in meters. */
export type SeatRowFootprint = {
  /** The middle of the rectangle. */
  readonly center: FloorPoint
  /** Side to side. */
  readonly width: number
  /** Front to back. */
  readonly depth: number
}

/**
 * The seat row as a rectangle its width wide, centered across the room on
 * the MLP, and its depth deep, its back edge SEAT_ROW.headOffset behind
 * the MLP. It is cut off where it would go through a wall: the MLP may sit
 * closer to the back wall than the head offset (its wall clearance is
 * smaller), and then the couch back stops at the wall; a seat row wider
 * than the room, or deep enough to reach the front wall, stops there too.
 */
export function seatRowFootprint(
  room: Room,
  mlp: RoomPoint,
  { width, depth }: SeatRow,
): SeatRowFootprint {
  const half = room.width / 2
  const [left, right] = clip(mlp.x - width / 2, mlp.x + width / 2, -half, half)
  const couchBack = mlp.y + SEAT_ROW_HEAD_OFFSET
  const [front, back] = clip(couchBack - depth, couchBack, 0, room.length)
  return {
    center: { x: (left + right) / 2, y: (front + back) / 2 },
    width: right - left,
    depth: back - front,
  }
}

function clip(
  from: number,
  to: number,
  low: number,
  high: number,
): [number, number] {
  return [Math.max(from, low), Math.min(to, high)]
}
