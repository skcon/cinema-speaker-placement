/**
 * A room object's lengths as one declaration (GLOSSARY.md, ADR 0006): the
 * lengths of one kind the user types (sizes, and where it is as distances
 * from the walls), how long each one is now, which values each accepts,
 * and how setting one changes the object.
 *
 * Each kind's module (seat-row.ts, screen.ts, furniture.ts, openings.ts)
 * declares its ObjectLengths once. What a field accepts, what setting a
 * length does and whether an object is valid all come from that one
 * declaration, so a value a field accepts always gives an object its
 * config may hold.
 */
import { checkRange, type AcceptedRange, type RangeProblem } from './range'
import type { Room } from './room'

/**
 * How closely a length is held to its limits: `typed` is what a field
 * accepts; `stored` is what a config may hold, a little past `typed` where
 * the kind says so (a share link stores some lengths to the millimeter,
 * and float noise at a wall or the ceiling).
 */
export type LengthTolerance = 'typed' | 'stored'

/** One kind's editable lengths, `D`, of an object `T` of that kind. */
export type ObjectLengths<T, D extends string> = {
  /** Every length the user edits, in the order the sidebar shows them. */
  readonly dimensions: readonly D[]
  /**
   * The accepted range of each length in `room`, given the object's other
   * lengths, held as closely as `tolerance` says.
   */
  readonly limits: (
    room: Room,
    object: T,
    tolerance: LengthTolerance,
  ) => Record<D, AcceptedRange>
  /**
   * How long `dimension` is now, in meters; null when this object doesn't
   * have it (a door's sill, the standoff of a screen on the wall).
   */
  readonly read: (room: Room, object: T, dimension: D) => number | null
  /**
   * The object with `dimension` set to `meters`, which its typed limits
   * accept and which the object has (see withLength).
   */
  readonly set: (room: Room, object: T, dimension: D, meters: number) => T
}

/**
 * `null` when the object has `dimension` and `meters` is in its typed
 * limits; why it is rejected otherwise (a length the object doesn't have
 * rejects every value as not a number).
 */
export function checkLength<T, D extends string>(
  lengths: ObjectLengths<T, D>,
  room: Room,
  object: T,
  dimension: D,
  meters: number,
): RangeProblem | null {
  const range = lengths.limits(room, object, 'typed')[dimension]
  if (lengths.read(room, object, dimension) === null) {
    return { problem: 'not-a-number', ...range }
  }
  return checkRange(meters, range)
}

/**
 * The object with `dimension` set to `meters`, or null when checkLength
 * rejects it.
 */
export function withLength<T, D extends string>(
  lengths: ObjectLengths<T, D>,
  room: Room,
  object: T,
  dimension: D,
  meters: number,
): T | null {
  return checkLength(lengths, room, object, dimension, meters) === null
    ? lengths.set(room, object, dimension, meters)
    : null
}

/**
 * Whether every length the object has is inside its stored limits in
 * `room`: the lengths part of a kind's validity.
 */
export function hasValidLengths<T, D extends string>(
  lengths: ObjectLengths<T, D>,
  room: Room,
  object: T,
): boolean {
  const limits = lengths.limits(room, object, 'stored')
  return lengths.dimensions.every((dimension) => {
    const meters = lengths.read(room, object, dimension)
    return meters === null || checkRange(meters, limits[dimension]) === null
  })
}
