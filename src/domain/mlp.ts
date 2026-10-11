import { EAR_HEIGHT, MLP_FRONT_WALL_FRACTION } from './reference'
import type { Room, RoomPoint } from './room'

/**
 * The MLP until the recommended seat exists: centered side to side, at ear height, and
 * at the "38% rule" distance from the front wall (a heuristic, see
 * MLP_FRONT_WALL_FRACTION).
 */
export function defaultMlp(room: Room): RoomPoint {
  return {
    x: 0,
    y: room.length * MLP_FRONT_WALL_FRACTION.fraction,
    z: EAR_HEIGHT.meters,
  }
}
