/**
 * The domain's public interface. The state and presentation layers import
 * from `@/domain` only, so the modules behind it can change freely.
 */
export { analyzeRoom, type RoomAnalysis } from './analyze'
export {
  selectedItem,
  type PlacedItem,
  type PlacedOverhead,
  type PlacedSpeaker,
  type PlacedSubwoofer,
  type SelectedItem,
} from './placed-items'
export type { EstimatedResponse } from './estimated-response'
export type {
  ResponseCause,
  ResponseStrength,
  ResponseWeakness,
} from './response-notes'
export type { Surface } from './boundary-interference'
export { warningsAbout, type PlacementWarning } from './placement-warnings'
export type { RoomMode } from './room-modes'
export {
  compareMlp,
  findRecommendedSeat,
  recommendSeat,
  seatScoreInput,
  seatScoreKey,
  type OffCenterLine,
  type RecommendedSeat,
  type ScoredSeat,
  type SeatRecommendation,
} from './seat-score'
export { seatHeatmap, type SeatHeatmap } from './seat-heatmap'
export {
  SEAT_ROW_HEAD_OFFSET,
  type SeatRow,
  type SeatRowDimension,
  type SeatRowFootprint,
} from './seat-row'
export { DEFAULT_CONFIG, type Config } from './config'
export { checkCrossover, type CrossoverProblem } from './crossover'
export {
  withAmplifierWatts,
  withCrossover,
  withLayout,
  withPositionLength,
  withRoomDimension,
  withSpeakerSpecs,
  withSubwooferHasOwnSpecs,
  withSubwooferSpecs,
} from './config-edits'
export {
  canAutoPlace,
  placementLabel,
  speakersFollowSeat,
  withAutoPlacement,
  withMlpAt,
  withSpeakersFollowSeat,
} from './auto-place'
export type { PlacementLabel } from './auto-place'
export {
  dragAnchors,
  pressSelects,
  withDragged,
  type DragTarget,
} from './drag-targets'
export {
  MAX_FURNITURE,
  MAX_OPENINGS,
  roomObjectAt,
  roomObjectId,
  roomObjectLength,
  SCREEN_ID,
  SEAT_ROW_ID,
  withRoomObjectAdded,
  withRoomObjectDimension,
  withRoomObjectEdited,
  withRoomObjectRemoved,
  type FurnitureId,
  type OpeningId,
  type RoomObjectAddition,
  type RoomObjectDimension,
  type RoomObjectId,
  type RoomObjectKind,
  type RoomObjects,
} from './room-objects'
export {
  checkFurnitureName,
  FURNITURE_NAME_MAX_LENGTH,
  FURNITURE_PRESETS,
  furnitureFootprint,
  furnitureLabel,
  furnitureTurned,
  withFurnitureName,
  type FurnitureBox,
  type FurnitureDimension,
  type FurnitureNameProblem,
  type FurniturePreset,
} from './furniture'
export {
  OPENING_KINDS,
  openingLabel,
  openingSpan,
  openingVerticalSpan,
  withOpeningWall,
  type Opening,
  type OpeningDimension,
  type OpeningKind,
} from './openings'
export {
  defaultScreen,
  screenSurface,
  withAcousticTransparency,
  withScreenKind,
  type RoomScreen,
  type ScreenDimension,
  type ScreenKind,
} from './screen'
export type { ScreenRelation } from './placement'
export {
  MLP_ID,
  positionLengths,
  type PlaceableId,
  type PositionDimension,
  type PositionLength,
} from './manual-positions'
export {
  overheadSideSign,
  SUBWOOFER_NO_RANGE,
  V1_DOLBY_LAYOUTS,
} from './dolby-layouts'
export {
  evenerSubwooferCounts,
  SUBWOOFER_ARRANGEMENT_SOURCE,
  SUBWOOFER_ARRANGEMENTS,
  subwooferIds,
  SUBWOOFERS,
  type SubwooferId,
} from './subwoofer-arrangements'
export { formatLayout, SUBWOOFER_COUNTS, type SubwooferCount } from './layout'
export {
  ANGLE_GRADING,
  type AngleCheck,
  type PlacementGrade,
  type PlacementGrading,
  type UngradedAngle,
} from './placement-range'
export { checkRange, type RangeProblem } from './range'
export {
  checkRoomDimension,
  floorCenter,
  floorCorners,
  wallBases,
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
  wallStart,
  wallDistances,
} from './wall-frame'
export type {
  GroupHeadroom,
  HeadroomAnalysis,
  HeadroomStatus,
  SubwooferHeadroom,
} from './headroom'
export {
  checkAmplifierWatts,
  checkSensitivity,
  checkSubwooferSpec,
  DEFAULT_AMPLIFIER_WATTS,
  DEFAULT_SPEAKER_SPECS,
  DEFAULT_SUBWOOFER_SPECS,
  ENCLOSURES,
  mapSubwooferSpecFields,
  SPEAKER_GROUP_NAMES,
  SPEAKER_TYPES,
  speakerGroupsIn,
  SUBWOOFER_SPEC_FIELDS,
  type Enclosure,
  type SpeakerGroupId,
  type SpeakerType,
  type SubwooferSpecField,
  type SubwooferSpecProblem,
  type SubwooferSpecs,
} from './speaker-specs'
export {
  FRONT_STAGE_WALL_DISTANCE,
  LOW_CEILING_FOR_OVERHEADS,
  SEAT_SCORE,
  SEATING_DISTANCE,
  sourceOf,
  TARGET_TOLERANCE,
  type Citation,
  type SourceClass,
} from './reference'
export {
  TARGET_CURVE_KINDS,
  TARGET_CURVES,
  type TargetCurveKind,
} from './target-curve'
export {
  decodeConfig,
  encodeConfig,
  type EncodedConfig,
  type ShareLinkProblem,
} from './share-link'
export {
  parseRecentRooms,
  removeRecentRoom,
  saveRecentRoom,
  serializeRecentRooms,
  summarizeRecentRooms,
  type RecentRoom,
} from './recent-rooms'
export {
  formatLength,
  formatInches,
  fromInches,
  toInches,
  UNIT_SYSTEMS,
  type LengthUnit,
  type Rounding,
  type UnitSystem,
} from './units'
export {
  frontStageDistances,
  itemDistances,
  type DimensionLine,
  type ItemDistances,
} from './item-distances'
