/**
 * The domain's public interface. The state and presentation layers import
 * from `@/domain` only, so the modules behind it can change freely.
 */
export {
  analyzeRoom,
  type ResponseAnalysis,
  type RoomAnalysis,
} from './analyze'
export {
  selectedItem,
  type PlacedItem,
  type PlacedItems,
  type PlacedOverhead,
  type PlacedSpeaker,
  type PlacedSubwoofer,
  type SelectedItem,
} from './placed-items'
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
export {
  warningsAbout,
  type PlacementWarning,
  type PlacementWarningId,
  type WarnedItem,
} from './placement-warnings'
export type { RoomMode, RoomModeKind } from './room-modes'
export {
  recommendSeat,
  scoreSeat,
  type CenterLineWidthMode,
  type OffCenterLine,
  type ScoredSeat,
  type SeatRecommendation,
} from './seat-score'
export { seatHeatmap, type HeatmapCell, type SeatHeatmap } from './seat-heatmap'
export { frontWallFraction, seatRuleOfThumb, type SeatRuleOfThumb } from './mlp'
export {
  DEFAULT_SEAT_ROW,
  SEAT_ROW_HEAD_OFFSET,
  seatRowFootprint,
  type SeatRow,
  type SeatRowDimension,
  type SeatRowFootprint,
} from './seat-row'
export { DEFAULT_CONFIG, type Config } from './config'
export {
  checkCrossover,
  DEFAULT_CROSSOVER_HZ,
  type CrossoverProblem,
} from './crossover'
export {
  placeManually,
  withAmplifierWatts,
  withAutoPlacement,
  withCrossover,
  withLayout,
  withMlpAtRecommendedSeat,
  withPositionLength,
  withRoom,
  withRoomDimension,
  withSpeakerSpecs,
  withSubwooferHasOwnSpecs,
  withSubwooferSpecs,
} from './config-edits'
export {
  dragAnchors,
  pressSelects,
  withDragged,
  type DragTarget,
} from './drag-targets'
export {
  DEFAULT_ROOM_OBJECTS,
  isRoomObjectId,
  MAX_FURNITURE,
  MAX_OPENINGS,
  roomObjectAt,
  roomObjectId,
  roomObjectKind,
  roomObjectLength,
  SCREEN_ID,
  SEAT_ROW_ID,
  withRoomObjectAdded,
  withRoomObjectDimension,
  withRoomObjectEdited,
  withRoomObjectRemoved,
  type FurnitureId,
  type ListedRoomObjectKind,
  type OpeningId,
  type RoomObjectAddition,
  type RoomObjectDimension,
  type RoomObjectEdit,
  type RoomObjectId,
  type RoomObjectKind,
  type RoomObjectLength,
  type RoomObjectOf,
  type RoomObjects,
} from './room-objects'
export {
  checkFurnitureName,
  FURNITURE_NAME_MAX_LENGTH,
  FURNITURE_PRESETS,
  FURNITURE_ROTATIONS,
  furnitureFootprint,
  furnitureLabel,
  furnitureTurned,
  withFurnitureName,
  type FurnitureBox,
  type FurnitureDimension,
  type FurnitureFootprint,
  type FurnitureNameProblem,
  type FurniturePreset,
  type FurnitureRotation,
} from './furniture'
export {
  OPENING_KINDS,
  openingEnds,
  openingLabel,
  openingSpan,
  openingVerticalSpan,
  withOpeningWall,
  type Door,
  type Opening,
  type OpeningDimension,
  type OpeningKind,
  type WindowOpening,
} from './openings'
export {
  defaultScreen,
  SCREEN_KINDS,
  screenSurface,
  withAcousticTransparency,
  withScreenKind,
  type RoomScreen,
  type ScreenDimension,
  type ScreenKind,
  type ScreenSurface,
} from './screen'
export type { ScreenRelation } from './placement'
export {
  MLP_ID,
  positionLengths,
  type ManualPositions,
  type PlaceableId,
  type Placement,
  type PositionDimension,
  type PositionLength,
  type PositionLengths,
  type WallPositionLength,
} from './manual-positions'
export {
  OVERHEAD_CHANNEL_IDS,
  OVERHEAD_CHANNELS,
  overheadSideSign,
  SUBWOOFER_NO_RANGE,
  V1_DOLBY_LAYOUTS,
  type ChannelId,
  type DolbyLayout,
  type OverheadChannelId,
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
export {
  ANGLE_GRADING,
  type AngleCheck,
  type OverheadPlacementRangeCheck,
  type PlacementGrade,
  type PlacementGrading,
  type PlacementRangeCheck,
  type UngradedAngle,
} from './placement-range'
export { checkRange, type AcceptedRange, type RangeProblem } from './range'
export {
  checkRoomDimension,
  DEFAULT_ROOM,
  floorCenter,
  floorCorners,
  wallBases,
  WALLS,
  type FloorPoint,
  type Room,
  type RoomDimension,
  type RoomDimensionProblem,
  type RoomPoint,
  type RoomSegment,
  toRadians,
  type Wall,
} from './room'
export {
  fromWallFrame,
  inwardDirection,
  wallLength,
  wallStart,
  type WallDistance,
  wallDistances,
  type WallFramePoint,
} from './wall-frame'
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
  FRONT_STAGE_WALL_DISTANCE,
  FURNITURE,
  HEADROOM_STATUS,
  OPENINGS,
  LOW_CEILING_FOR_OVERHEADS,
  REFERENCE_LEVEL,
  SCREEN,
  SCREEN_FRONT_STAGE,
  SEAT_SCORE,
  sourceOf,
  SPEAKER_TYPE_GEOMETRY,
  TARGET_TOLERANCE,
  type Citation,
  type Source,
  type SourceClass,
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
export {
  frontStageDistances,
  itemDistances,
  type DimensionLine,
  type FrontStageDistance,
  type ItemDistances,
  type WallDimensionLine,
} from './item-distances'
