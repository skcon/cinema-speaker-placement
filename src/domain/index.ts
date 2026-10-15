/**
 * The domain's public interface. The state and presentation layers import
 * from `@/domain` only, so the modules behind it can change freely.
 */
export {
  analyzeRoom,
  type PlacedSpeaker,
  type PlacedSubwoofer,
  type ResponseAnalysis,
  type RoomAnalysis,
} from './analyze'
export type {
  EstimatedResponse,
  ResponseComponent,
  ResponseModel,
  ResponseRow,
} from './estimated-response'
export type { ResponseDeviation, ResponseSummary } from './response-summary'
export type {
  ResponseCause,
  ResponseNotes,
  ResponseStrength,
  ResponseWeakness,
} from './response-notes'
export type { Surface } from './boundary-interference'
export type { RoomMode, RoomModeKind } from './room-modes'
export {
  recommendSeat,
  scoreSeat,
  type ScoredSeat,
  type SeatRecommendation,
} from './seat-score'
export { seatHeatmap, type HeatmapCell, type SeatHeatmap } from './seat-heatmap'
export { frontWallFraction, seatRuleOfThumb, type SeatRuleOfThumb } from './mlp'
export {
  checkSeatRowWidth,
  clampSeatRowWidth,
  seatRowFootprint,
  type SeatRowFootprint,
} from './seat-row'
export { DEFAULT_CONFIG, type Config } from './config'
export {
  checkCrossover,
  DEFAULT_CROSSOVER_HZ,
  type CrossoverProblem,
} from './crossover'
export {
  placeAtWallDistance,
  placeManually,
  withAutoPlacement,
  withLayout,
  withMlpAtRecommendedSeat,
  withRoom,
} from './config-edits'
export {
  MLP_ID,
  type ManualPositions,
  type PlaceableId,
  type Placement,
} from './manual-positions'
export {
  V1_DOLBY_LAYOUTS,
  type ChannelId,
  type DolbyLayout,
} from './dolby-layouts'
export {
  evenerSubwooferCounts,
  SUBWOOFER_ARRANGEMENT_SOURCE,
  SUBWOOFER_ARRANGEMENTS,
  subwooferIds,
  SUBWOOFERS,
  type SubwooferId,
} from './subwoofer-arrangements'
export {
  formatLayout,
  SUBWOOFER_COUNTS,
  type Layout,
  type SubwooferCount,
} from './layout'
export { suggestsAtmosEnabledSpeakers } from './atmos-enabled'
export type { PlacementGrade } from './placement-range'
export type { RangeProblem } from './range'
export {
  checkRoomDimension,
  DEFAULT_ROOM,
  floorCenter,
  floorCorners,
  wallBases,
  type FloorPoint,
  type Room,
  type RoomDimension,
  type RoomDimensionProblem,
  type RoomPoint,
  type RoomSegment,
  type Wall,
  type WallDistance,
  wallDistances,
} from './room'
export type {
  ChannelHeadroom,
  GroupHeadroom,
  HeadroomAnalysis,
  HeadroomStatus,
  SubwooferHeadroom,
} from './headroom'
export {
  areValidSpeakerSpecs,
  areValidSubwooferSpecs,
  checkAmplifierWatts,
  checkSensitivity,
  checkSubwooferSpec,
  DEFAULT_AMPLIFIER_WATTS,
  DEFAULT_SPEAKER_SPECS,
  DEFAULT_SUBWOOFER_SPECS,
  ENCLOSURES,
  LISTENER_GROUP_IDS,
  mapSubwooferSpecFields,
  SPEAKER_GROUP_IDS,
  SPEAKER_GROUP_NAMES,
  SPEAKER_GROUP_OF,
  SPEAKER_TYPES,
  speakerGroupsIn,
  type SpeakerChannelId,
  SUBWOOFER_SPEC_FIELDS,
  type Enclosure,
  type OverheadSpecs,
  type SpeakerGroupId,
  type SpeakerSpecs,
  type SpeakerType,
  type SpeakerGroups,
  type SubwooferGroup,
  type SubwooferSpecField,
  type SubwooferSpecProblem,
  type SubwooferSpecs,
} from './speaker-specs'
export {
  HEADROOM_STATUS,
  LOW_CEILING_FOR_OVERHEADS,
  REFERENCE_LEVEL,
  SPEAKER_TYPE_GEOMETRY,
  TARGET_TOLERANCE,
} from './reference'
export {
  TARGET_CURVE_KINDS,
  TARGET_CURVES,
  type TargetCurveKind,
  type TargetCurveSpec,
} from './target-curve'
export {
  decodeConfig,
  encodeConfig,
  type DecodedConfig,
  type EncodedConfig,
  type ShareLinkProblem,
} from './share-link'
export {
  parseRecentRooms,
  RECENT_ROOMS_LIMIT,
  removeRecentRoom,
  saveRecentRoom,
  serializeRecentRooms,
  summarizeRecentRooms,
  type DescribedRecentRoom,
  type RecentRoom,
  type RecentRoomsSummary,
} from './recent-rooms'
export {
  formatLength,
  formatInches,
  fromInches,
  toInches,
  UNIT_SYSTEM_NAMES,
  UNIT_SYSTEMS,
  type LengthPart,
  type LengthUnit,
  type Rounding,
  type UnitSystem,
  type UnitSystemSpec,
} from './units'
