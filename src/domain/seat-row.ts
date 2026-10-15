/**
 * The Seat row (GLOSSARY.md): a couch or row of seats drawn around the
 * MLP, the listener's head: centered across the room on it, with the
 * couch's back edge SEAT_ROW.headOffset behind it and the rest of its
 * depth in front, as a seated head rests near the back cushion. A visual
 * cue only: nothing is analyzed at its seats.
 */
import { checkRange, type RangeProblem } from './range'
import { SEAT_ROW } from './reference'
import type { FloorPoint, Room, RoomPoint } from './room'

/** The seat row width a config starts with, in meters. */
export const DEFAULT_SEAT_ROW_WIDTH: number = SEAT_ROW.defaultWidth

/** `null` when `meters` is an accepted seat row width. */
export function checkSeatRowWidth(meters: number): RangeProblem | null {
  return checkRange(meters, SEAT_ROW.limits)
}

/** The nearest accepted seat row width, or NaN for a value that is not a number. */
export function clampSeatRowWidth(meters: number): number {
  const { min, max } = SEAT_ROW.limits
  return Number.isFinite(meters) ? Math.min(Math.max(meters, min), max) : NaN
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
 * The seat row as a rectangle `width` wide, centered across the room on
 * the MLP, and SEAT_ROW's depth deep, its back edge SEAT_ROW.headOffset
 * behind the MLP. It is cut off where it would go through a wall: the MLP
 * may sit closer to the back wall than the head offset (its wall
 * clearance is smaller), and then the couch back stops at the wall.
 */
export function seatRowFootprint(
  room: Room,
  mlp: RoomPoint,
  width: number,
): SeatRowFootprint {
  const half = room.width / 2
  const [left, right] = clip(mlp.x - width / 2, mlp.x + width / 2, -half, half)
  const couchBack = mlp.y + SEAT_ROW.headOffset
  const [front, back] = clip(
    couchBack - SEAT_ROW.depth,
    couchBack,
    0,
    room.length,
  )
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
