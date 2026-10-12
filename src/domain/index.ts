/**
 * The domain's public interface. The state and presentation layers import
 * from `@/domain` only, so the modules behind it can change freely.
 */
export {
  analyzeRoom,
  type PlacedSpeaker,
  type PlacedSubwoofer,
  type RoomAnalysis,
} from './analyze'
export { DEFAULT_CONFIG, type Config } from './config'
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
export type { PlacementGrade } from './placement-range'
export {
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
  areValidSubwooferSpecs,
  checkSubwooferSpec,
  DEFAULT_SUBWOOFER_SPECS,
  ENCLOSURES,
  mapSubwooferSpecFields,
  SUBWOOFER_SPEC_FIELDS,
  type Enclosure,
  type SpeakerGroups,
  type SubwooferGroup,
  type SubwooferSpecField,
  type SubwooferSpecProblem,
  type SubwooferSpecs,
} from './speaker-specs'
export {
  decodeConfig,
  encodeConfig,
  type DecodedConfig,
  type ShareLinkProblem,
} from './share-link'
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
