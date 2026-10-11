/**
 * The domain's public interface. The state and presentation layers import
 * from `@/domain` only, so the modules behind it can change freely.
 */
export { analyzeRoom, type PlacedSpeaker, type RoomAnalysis } from './analyze'
export { DEFAULT_CONFIG, type Config } from './config'
export {
  formatLayout,
  type Layout,
  type SpeakerFormat,
  type SubwooferCount,
} from './layout'
export {
  V1_SPEAKER_FORMATS,
  type AngleRange,
  type ChannelId,
  type CitedAngleRange,
  type NoWiderRange,
} from './dolby-layouts'
export {
  checkPlacementRange,
  type PlacementGrade,
  type PlacementRangeCheck,
} from './placement-range'
export type { Citation, SourceKey } from './reference'
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
