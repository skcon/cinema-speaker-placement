/**
 * The domain's public interface. The state and presentation layers import
 * from `@/domain` only, so the modules behind it can change freely.
 */
export {
  checkRoomDimension,
  DEFAULT_ROOM,
  isValidRoom,
  ROOM_DIMENSION_LIMITS,
  type Room,
  type RoomDimension,
  type RoomDimensionProblem,
  type RoomPoint,
} from './room'
export {
  feetAndInchesToMeters,
  formatLength,
  metersToFeetAndInches,
  roundToCentimeters,
  type FeetAndInches,
  type UnitSystem,
} from './units'
