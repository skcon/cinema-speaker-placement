import { EAR_HEIGHT, MLP_FRONT_WALL_FRACTION } from './reference'
import type { Room, RoomPoint } from './room'

/**
 * The auto MLP, only a seed: centered side to side, at ear height, and at
 * the "38% rule" distance from the front wall (a heuristic, see
 * MLP_FRONT_WALL_FRACTION). It is where the first visit starts and where
 * the seat score is first calibrated (seat-score.ts); it is not derived
 * from the recommended seat, which would make the analysis wait for the
 * seat score (ADR 0004). Auto-place and "Move MLP here" put the MLP at the
 * recommended seat, which makes it manual.
 */
export function defaultMlp(room: Room): RoomPoint {
  return { x: 0, y: seatRuleOfThumb(room).fromFrontWall, z: EAR_HEIGHT.meters }
}

/** The informal "38% rule" in a Room: a reference only. */
export type SeatRuleOfThumb = {
  /** The rule's share of the room length from the front wall, 0 to 1. */
  readonly fraction: number
  /** The rule's distance from the front wall, in meters. */
  readonly fromFrontWall: number
}

/**
 * Where the informal "38% rule" puts the seat in this Room
 * (MLP_FRONT_WALL_FRACTION): shown beside the recommended seat as a
 * reference only, and the seed of the first-visit MLP.
 */
export function seatRuleOfThumb(room: Room): SeatRuleOfThumb {
  const { fraction } = MLP_FRONT_WALL_FRACTION
  return { fraction, fromFrontWall: room.length * fraction }
}

/** How far back a seat is, as a share of the room length from the front wall. */
export function frontWallFraction(room: Room, seat: RoomPoint): number {
  return seat.y / room.length
}
