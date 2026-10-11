/**
 * The domain's public interface. The state and presentation layers import
 * from `@/domain` only, so the modules behind it can change freely.
 */
export { analyzeRoom, type RoomAnalysis } from './analyze'
export { DEFAULT_CONFIG, type Config } from './config'
export {
  checkRoomDimension,
  DEFAULT_ROOM,
  type Room,
  type RoomDimension,
  type RoomDimensionProblem,
  type RoomPoint,
} from './room'
export {
  formatLength,
  UNIT_SYSTEMS,
  type LengthPart,
  type LengthUnit,
  type Rounding,
  type UnitSystem,
  type UnitSystemSpec,
} from './units'
