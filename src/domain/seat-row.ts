/**
 * The Seat row (GLOSSARY.md): a couch or row of seats drawn centered on
 * the MLP. A visual cue only: nothing is analyzed at its seats.
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
 * The seat row as a rectangle centered on the MLP, `width` wide and
 * SEAT_ROW's depth deep, cut off where it would go through a wall.
 */
export function seatRowFootprint(
  room: Room,
  mlp: RoomPoint,
  width: number,
): SeatRowFootprint {
  const half = room.width / 2
  const [left, right] = clip(mlp.x - width / 2, mlp.x + width / 2, -half, half)
  const [front, back] = clip(
    mlp.y - SEAT_ROW.depth / 2,
    mlp.y + SEAT_ROW.depth / 2,
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
