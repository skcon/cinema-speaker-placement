/**
 * Auto-place for subwoofers.
 *
 * ## The rule
 *
 * 1. **Arrangement**: the subwoofers take the cited arrangement for their
 *    count (SUBWOOFER_ARRANGEMENTS), scaled to the Room: each position is a
 *    fraction of the room's width and length. Welti's study found its
 *    configurations held up when scaled to rooms of other proportions
 *    (docs/research/multi-subwoofer-placement.md section 2, Investigation
 *    5); carrying them over this way is the research file's reading, with
 *    the caveats in its section 4.
 * 2. **Walls**: a subwoofer stands off its wall by the subwoofer wall
 *    clearance (SUBWOOFER_WALL_CLEARANCE, our modelling assumption), and
 *    keeps that distance from every other wall too.
 * 3. **Height**: every subwoofer is at SUBWOOFER_HEIGHT (our modelling
 *    assumption).
 *
 * Subwoofers don't depend on the MLP: Welti optimized for a seating area,
 * not one seat. They have no Dolby placement range, so nothing grades them.
 */
import type { SubwooferCount } from './layout'
import { SUBWOOFER_HEIGHT, SUBWOOFER_WALL_CLEARANCE } from './reference'
import { nearestWall, type Room, type RoomPoint, type Wall } from './room'
import {
  SUBWOOFER_ARRANGEMENTS,
  type RoomFraction,
  type SubwooferNumber,
} from './subwoofer-arrangements'

/** Where one subwoofer goes and the wall it stands against. */
export type SubwooferPlacement = {
  readonly number: SubwooferNumber
  readonly position: RoomPoint
  readonly wall: Wall
}

/** Where each of `count` subwoofers goes in the Room, Subwoofer 1 first. */
export function autoPlaceSubwoofers(
  room: Room,
  count: SubwooferCount,
): SubwooferPlacement[] {
  return SUBWOOFER_ARRANGEMENTS[count].positions.map((fraction, index) => {
    const onPlan = pointAtFraction(room, fraction)
    return {
      number: subwooferNumber(index),
      position: {
        ...insideClearance(room, onPlan),
        z: SUBWOOFER_HEIGHT.meters,
      },
      wall: nearestWall(room, onPlan),
    }
  })
}

/** The floor point at room fractions, in room coordinates. */
function pointAtFraction(
  { length, width }: Room,
  fraction: RoomFraction,
): RoomPoint {
  return {
    x: (fraction.width - 0.5) * width,
    y: fraction.length * length,
    z: 0,
  }
}

/** The point moved inside the subwoofer wall clearance of every wall. */
function insideClearance({ length, width }: Room, { x, y }: RoomPoint) {
  const clearance = SUBWOOFER_WALL_CLEARANCE.meters
  const xLimit = width / 2 - clearance
  return {
    x: clamp(x, -xLimit, xLimit),
    y: clamp(y, clearance, length - clearance),
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}

/** The subwoofer number at a 0-based position in an arrangement. */
function subwooferNumber(index: number): SubwooferNumber {
  const number = index + 1
  if (number === 1 || number === 2 || number === 3 || number === 4) {
    return number
  }
  throw new Error(`No subwoofer number for arrangement position ${index}`)
}
