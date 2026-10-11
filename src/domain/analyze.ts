import type { Config } from './config'
import { defaultMlp } from './mlp'
import type { RoomPoint } from './room'

/** Everything derived from a config. Later tickets add placements, checks and the estimated response. */
export type RoomAnalysis = {
  /** The MLP in room coordinates. */
  mlp: RoomPoint
}

/** The domain entry point: derive the room plan from a config. */
export function analyzeRoom(config: Config): RoomAnalysis {
  return { mlp: defaultMlp(config.room) }
}
