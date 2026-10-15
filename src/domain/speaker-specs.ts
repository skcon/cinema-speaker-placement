/**
 * Speaker specs, entered per speaker group (GLOSSARY.md), with optional own
 * specs per subwoofer (issue #2, user stories 13-19), and the one
 * amplifier power per channel. Every group has the same shape: a group's
 * `specs` plus, for subwoofers only, own specs by subwoofer id.
 *
 * Specs are inputs for the acoustic estimates (the response, headroom.ts);
 * nothing here does any acoustics with them.
 */
import {
  DOLBY_LAYOUTS,
  type ChannelId,
  type OverheadChannelId,
} from './dolby-layouts'
import type { Layout } from './layout'
import { checkRange, type AcceptedRange, type RangeProblem } from './range'
import { SPEAKER_TYPE_GEOMETRY } from './reference'
import type { RoomPoint } from './room'
import type { SubwooferId } from './subwoofer-arrangements'
import { fromInches } from './units'

/** How a subwoofer's driver is loaded: a closed box or a box with a port. */
export const ENCLOSURES = ['sealed', 'ported'] as const

export type Enclosure = (typeof ENCLOSURES)[number]

/** What the app knows about a subwoofer model. Lengths in meters. */
export type SubwooferSpecs = {
  readonly enclosure: Enclosure
  /**
   * The driver's nominal diameter, in meters. Drivers are sold by the inch,
   * so the UI shows it in inches in both unit systems.
   */
  readonly driverDiameter: number
  /** The amplifier's continuous (RMS) power, in watts. */
  readonly rmsWatts: number
  /** The amplifier's peak power, in watts: at least the RMS power. */
  readonly peakWatts: number
}

/**
 * The Subwoofers speaker group: the specs its subwoofers share, and the
 * own specs of any subwoofer that has them (a mixed set of subwoofers, user
 * story 19).
 */
export type SubwooferGroup = {
  readonly specs: SubwooferSpecs
  /**
   * Own specs by subwoofer id, only for subwoofers of the layout that have
   * them; every other subwoofer uses the group's `specs`.
   */
  readonly ownSpecs: Readonly<Partial<Record<SubwooferId, SubwooferSpecs>>>
}

/**
 * Whether a listener-level speaker is a bookshelf (on a stand) or a tower
 * (on the floor). It sets where its woofer is (SPEAKER_TYPE_GEOMETRY).
 */
export const SPEAKER_TYPES = ['bookshelf', 'tower'] as const

export type SpeakerType = (typeof SPEAKER_TYPES)[number]

/** What the app knows about a listener-level speaker model. */
export type SpeakerSpecs = {
  readonly type: SpeakerType
  /**
   * dB SPL on axis at 1 m from a 1 W input, as speaker data sheets rate it
   * (often as 2.83 V, which is 1 W into 8 Ω). The headroom estimate then
   * scales it by the amplifier's watts, taken as delivered into the
   * speaker's rated load (headroom.ts).
   */
  readonly sensitivity: number
}

/**
 * What the app knows about an overhead speaker model: only its
 * sensitivity, as overheads are mounted in or on the ceiling.
 */
export type OverheadSpecs = { readonly sensitivity: number }

/** A speaker group of listener-level channels, which share one model. */
export const LISTENER_GROUP_IDS = [
  'front',
  'center',
  'surrounds',
  'rearSurrounds',
] as const

export type ListenerGroupId = (typeof LISTENER_GROUP_IDS)[number]

/** Every speaker group but the Subwoofers, in the order the form shows them. */
export const SPEAKER_GROUP_IDS = [...LISTENER_GROUP_IDS, 'overheads'] as const

export type SpeakerGroupId = (typeof SPEAKER_GROUP_IDS)[number]

/** Specs per speaker group (GLOSSARY.md), each a group's shared `specs`. */
export type SpeakerGroups = {
  readonly [G in ListenerGroupId]: { readonly specs: SpeakerSpecs }
} & {
  readonly overheads: { readonly specs: OverheadSpecs }
  readonly subwoofers: SubwooferGroup
}

/** A channel a Speaker of some speaker group plays: listener-level or overhead. */
export type SpeakerChannelId = ChannelId | OverheadChannelId

/** The speaker group each channel's Speaker belongs to. */
export const SPEAKER_GROUP_OF: Readonly<
  Record<SpeakerChannelId, SpeakerGroupId>
> = {
  L: 'front',
  R: 'front',
  C: 'center',
  Ls: 'surrounds',
  Rs: 'surrounds',
  Lrs: 'rearSurrounds',
  Rrs: 'rearSurrounds',
  Ltf: 'overheads',
  Rtf: 'overheads',
  Ltm: 'overheads',
  Rtm: 'overheads',
  Ltr: 'overheads',
  Rtr: 'overheads',
}

/**
 * The speaker groups (other than the Subwoofers) a layout has speakers in,
 * in form order.
 */
export function speakerGroupsIn({
  dolbyLayout,
}: Layout): readonly SpeakerGroupId[] {
  const { channels, overheadChannels } = DOLBY_LAYOUTS[dolbyLayout]
  const inLayout = [...channels, ...overheadChannels].map(
    ({ channel }) => SPEAKER_GROUP_OF[channel],
  )
  return SPEAKER_GROUP_IDS.filter((group) => inLayout.includes(group))
}

/** The speaker groups' names, as the UI shows them (GLOSSARY.md). */
export const SPEAKER_GROUP_NAMES = {
  front: 'Front L/R',
  center: 'Center',
  surrounds: 'Surrounds',
  rearSurrounds: 'Rear surrounds',
  overheads: 'Overheads',
} as const satisfies Record<SpeakerGroupId, string>

/**
 * The specs every listener-level speaker group starts with: a bookshelf
 * speaker with 88 dB sensitivity. Our default, typical of home theater
 * speakers, not a cited or measured product.
 */
export const DEFAULT_SPEAKER_SPECS = {
  type: 'bookshelf',
  sensitivity: 88,
} as const satisfies SpeakerSpecs

/** The overheads' starting specs: the same 88 dB, ours. */
export const DEFAULT_OVERHEAD_SPECS = {
  sensitivity: DEFAULT_SPEAKER_SPECS.sensitivity,
} as const satisfies OverheadSpecs

/**
 * Accepted sensitivities in dB SPL (1 W, 1 m), inclusive: our product
 * limits that catch typos, not cited values. Home speakers mostly rate
 * from the low 80s to the mid 90s.
 */
const SENSITIVITY_LIMITS = {
  min: 70,
  max: 110,
} as const satisfies AcceptedRange

/** `null` when a sensitivity is a number inside its accepted range. */
export function checkSensitivity(sensitivity: number): RangeProblem | null {
  return checkRange(sensitivity, SENSITIVITY_LIMITS)
}

/** Whether a speaker type is one the app knows. */
function isSpeakerType(value: unknown): value is SpeakerType {
  return SPEAKER_TYPES.some((type) => type === value)
}

/** Whether every spec of a listener-level or overhead group is accepted. */
export function areValidSpeakerSpecs(
  specs: SpeakerSpecs | OverheadSpecs,
): boolean {
  if ('type' in specs && !isSpeakerType(specs.type)) return false
  return checkSensitivity(specs.sensitivity) === null
}

/**
 * The amplifier power per channel every Speaker starts with, in watts
 * (user story 16): ours, typical of an AV receiver, not a cited value.
 */
export const DEFAULT_AMPLIFIER_WATTS = 100

/**
 * Accepted amplifier power per channel in watts, inclusive: our typo
 * limits, from a small amplifier up to large separate power amplifiers.
 */
const AMPLIFIER_WATTS_LIMITS = {
  min: 1,
  max: 5000,
} as const satisfies AcceptedRange

/** `null` when an amplifier power is a number inside its accepted range. */
export function checkAmplifierWatts(watts: number): RangeProblem | null {
  return checkRange(watts, AMPLIFIER_WATTS_LIMITS)
}

/**
 * Where a speaker's woofer is, given its position (its acoustic center,
 * the tweeter) and type: straight below it by the type's offset, and never
 * lower than the floor margin (SPEAKER_TYPE_GEOMETRY, ours).
 */
export function wooferPosition(
  position: RoomPoint,
  type: SpeakerType,
): RoomPoint {
  const { minWooferHeight } = SPEAKER_TYPE_GEOMETRY
  const drop = SPEAKER_TYPE_GEOMETRY[type].wooferBelowTweeter
  return { ...position, z: Math.max(position.z - drop, minWooferHeight) }
}

/** The numeric subwoofer specs, which have accepted ranges. */
export type SubwooferSpecField = 'driverDiameter' | 'rmsWatts' | 'peakWatts'

/**
 * The specs every subwoofer starts with: a sealed 12 in subwoofer with a
 * 300 W RMS, 600 W peak amplifier. These are our defaults, a plausible
 * mid-range home theater subwoofer, not a cited or measured product.
 */
export const DEFAULT_SUBWOOFER_SPECS = {
  enclosure: 'sealed',
  driverDiameter: fromInches(12),
  rmsWatts: 300,
  peakWatts: 600,
} as const satisfies SubwooferSpecs

/** First-visit speaker groups: our default specs, and no own specs for any subwoofer. */
export const DEFAULT_SPEAKER_GROUPS = {
  front: { specs: DEFAULT_SPEAKER_SPECS },
  center: { specs: DEFAULT_SPEAKER_SPECS },
  surrounds: { specs: DEFAULT_SPEAKER_SPECS },
  rearSurrounds: { specs: DEFAULT_SPEAKER_SPECS },
  overheads: { specs: DEFAULT_OVERHEAD_SPECS },
  subwoofers: { specs: DEFAULT_SUBWOOFER_SPECS, ownSpecs: {} },
} as const satisfies SpeakerGroups

/**
 * Accepted values, inclusive (driver sizes in meters, power in watts).
 * Like the room limits, these are our product limits that catch typos, not
 * cited values: subwoofer drivers are sold from about 6 in to 24 in.
 */
const SUBWOOFER_SPEC_LIMITS = {
  driverDiameter: {
    min: fromInches(6),
    max: fromInches(24),
  },
  rmsWatts: { min: 10, max: 10_000 },
  peakWatts: { min: 10, max: 20_000 },
} as const satisfies Record<SubwooferSpecField, AcceptedRange>

/** Why a subwoofer spec was rejected. */
export type SubwooferSpecProblem =
  | RangeProblem
  /** On the peak power: it is below the RMS power. */
  | { readonly problem: 'peak-below-rms'; readonly rmsWatts: number }
  /** On the RMS power: it is above the peak power. */
  | { readonly problem: 'rms-above-peak'; readonly peakWatts: number }

/**
 * Check one numeric spec of a subwoofer's specs: `null` when it is inside
 * its accepted range and, for the power, when the peak power is at least
 * the RMS power. A value outside its own range is reported first.
 */
export function checkSubwooferSpec(
  specs: SubwooferSpecs,
  field: SubwooferSpecField,
): SubwooferSpecProblem | null {
  const outOfRange = checkRange(specs[field], SUBWOOFER_SPEC_LIMITS[field])
  if (outOfRange) return outOfRange
  if (specs.peakWatts < specs.rmsWatts) {
    if (field === 'peakWatts') {
      return { problem: 'peak-below-rms', rmsWatts: specs.rmsWatts }
    }
    if (field === 'rmsWatts') {
      return { problem: 'rms-above-peak', peakWatts: specs.peakWatts }
    }
  }
  return null
}

/** The numeric subwoofer specs, in the order the form shows them. */
export const SUBWOOFER_SPEC_FIELDS = [
  'driverDiameter',
  'rmsWatts',
  'peakWatts',
] as const satisfies readonly SubwooferSpecField[]

/** One value per numeric subwoofer spec. */
export function mapSubwooferSpecFields<T>(
  value: (field: SubwooferSpecField) => T,
): Record<SubwooferSpecField, T> {
  // Every field is a key, as SUBWOOFER_SPEC_FIELDS lists them all.
  return Object.fromEntries(
    SUBWOOFER_SPEC_FIELDS.map((field) => [field, value(field)]),
  ) as Record<SubwooferSpecField, T>
}

/** Whether every numeric spec passes its check. */
export function areValidSubwooferSpecs(specs: SubwooferSpecs): boolean {
  return SUBWOOFER_SPEC_FIELDS.every(
    (field) => checkSubwooferSpec(specs, field) === null,
  )
}
