/**
 * The domain's public interface. The state and presentation layers import
 * from `@/domain` only, so the modules behind it can change freely.
 */
export { analyzeRoom, type PlacedSpeaker, type RoomAnalysis } from './analyze'
export { DEFAULT_CONFIG, type Config } from './config'
export { V1_SPEAKER_FORMATS, type ChannelId } from './dolby-layouts'
export { formatLayout, type Layout, type SpeakerFormat } from './layout'
export { checkPlacementRange, type PlacementGrade } from './placement-range'
export {
  azimuthFromMlp,
  checkRoomDimension,
  DEFAULT_ROOM,
  floorCenter,
  floorCorners,
  wallBases,
  type Room,
  type RoomDimension,
  type RoomDimensionProblem,
  type RoomPoint,
  type RoomSegment,
  type Wall,
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
