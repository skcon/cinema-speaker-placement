/**
 * Auto-place for subwoofers.
 *
 * ## The rule
 *
 * 1. **Arrangement**: the subwoofers take the cited arrangement for their
 *    count (SUBWOOFER_ARRANGEMENTS), scaled to the Room: each position is a
 *    fraction of the room's width and length, on the wall the arrangement
 *    names.
 * 2. **Walls**: a subwoofer stands off its wall by the subwoofer wall
 *    clearance (SUBWOOFER_WALL_CLEARANCE, our modelling assumption), and
 *    keeps that distance from every other wall too.
 * 3. **Height**: every subwoofer is at SUBWOOFER_HEIGHT (our modelling
 *    assumption).
 *
 * ## How far the source supports scaling
 *
 * Welti found the 1-, 2- and 4-subwoofer layouts held up when scaled to
 * rooms of other proportions (docs/research/multi-subwoofer-placement.md
 * section 2, Investigation 5). His 3-subwoofer layout was only modelled in
 * his one test room, and whether the front/back pair of the 2-subwoofer
 * layout suits a room wider than long is not addressed (research section
 * 4, items 3 and 5; each arrangement's `caveat`). Those cases apply the
 * arrangement as room fractions without the source confirming it.
 *
 * Subwoofers don't depend on the MLP: Welti optimized for a seating area,
 * not one seat. They have no Dolby placement range, so nothing grades them.
 */
import type { SubwooferCount } from './layout'
import { clamp } from './range'
import { SUBWOOFER_HEIGHT, SUBWOOFER_WALL_CLEARANCE } from './reference'
import type { Room, RoomPoint, Wall } from './room'
import {
  SUBWOOFER_ARRANGEMENTS,
  type RoomFraction,
  type SubwooferId,
} from './subwoofer-arrangements'

/** Where one subwoofer goes and the wall it stands against. */
export type SubwooferPlacement = {
  readonly id: SubwooferId
  readonly position: RoomPoint
  readonly wall: Wall
}

/** Where each of `count` subwoofers goes in the Room, Subwoofer 1 first. */
export function autoPlaceSubwoofers(
  room: Room,
  count: SubwooferCount,
): SubwooferPlacement[] {
  return SUBWOOFER_ARRANGEMENTS[count].subwoofers.map(({ id, wall, at }) => ({
    id,
    position: {
      ...insideClearance(room, pointAtFraction(room, at)),
      z: SUBWOOFER_HEIGHT.meters,
    },
    wall,
  }))
}

/** The floor point at room fractions, in room coordinates. */
function pointAtFraction({ length, width }: Room, fraction: RoomFraction) {
  return { x: (fraction.width - 0.5) * width, y: fraction.length * length }
}

/** The point moved inside the subwoofer wall clearance of every wall. */
function insideClearance(
  { length, width }: Room,
  { x, y }: { x: number; y: number },
) {
  const clearance = SUBWOOFER_WALL_CLEARANCE.meters
  const xLimit = width / 2 - clearance
  return {
    x: clamp(x, -xLimit, xLimit),
    y: clamp(y, clearance, length - clearance),
  }
}
