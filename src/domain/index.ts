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
  METERS_PER_FOOT,
  feetAndInchesToMeters,
  formatLength,
  metersToFeetAndInches,
  roundToCentimeters,
  type FeetAndInches,
  type Rounding,
  type UnitSystem,
} from './units'
