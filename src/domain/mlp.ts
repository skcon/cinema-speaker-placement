import { EAR_HEIGHT, MLP_FRONT_WALL_FRACTION } from './reference'
import type { Room, RoomPoint } from './room'

/**
 * The auto MLP: centered side to side, at ear height, and at the "38%
 * rule" distance from the front wall (a heuristic, see
 * MLP_FRONT_WALL_FRACTION). It stays there rather than at the recommended
 * seat: the seat score is calibrated at the MLP (seat-score.ts), and the
 * user adopts the recommendation with "Move MLP here", which makes the
 * MLP manual.
 */
export function defaultMlp(room: Room): RoomPoint {
  return { x: 0, y: seatRuleOfThumb(room).fromFrontWall, z: EAR_HEIGHT.meters }
}

/** The informal "38% rule" in a Room, and where a seat is by the same measure. */
export type SeatRuleOfThumb = {
  /** The rule's share of the room length from the front wall, 0 to 1. */
  readonly fraction: number
  /** The rule's distance from the front wall, in meters. */
  readonly fromFrontWall: number
  /** The seat's share of the room length from the front wall, 0 to 1. */
  readonly seatFraction: number
}

/**
 * The informal "38% rule" in this Room, shown beside the recommended seat
 * as a reference only (MLP_FRONT_WALL_FRACTION), and how far back `seat`
 * is by the same measure.
 */
export function seatRuleOfThumb(
  room: Room,
  seat: RoomPoint = { x: 0, y: 0, z: 0 },
): SeatRuleOfThumb {
  const { fraction } = MLP_FRONT_WALL_FRACTION
  return {
    fraction,
    fromFrontWall: room.length * fraction,
    seatFraction: seat.y / room.length,
  }
}
