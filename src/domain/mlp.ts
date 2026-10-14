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
  return {
    x: 0,
    y: room.length * MLP_FRONT_WALL_FRACTION.fraction,
    z: EAR_HEIGHT.meters,
  }
}
