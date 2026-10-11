/**
 * Speaker specs, entered per speaker group (GLOSSARY.md), with an optional
 * override per subwoofer (issue #2, user stories 13 and 17-19). Only the
 * Subwoofers group has specs so far; #13 adds the other groups with their
 * own spec type, in the same shape: a group's `specs` plus, for
 * subwoofers only, one optional override per speaker.
 *
 * Specs are inputs for the acoustic estimates of later tickets (#11-#13);
 * nothing here does any acoustics with them.
 */
import { fromSmallUnit } from './units'

/** How a subwoofer's driver is loaded: a closed box or a box with a port. */
export const ENCLOSURES = ['sealed', 'ported'] as const

export type Enclosure = (typeof ENCLOSURES)[number]

/** What the app knows about a subwoofer model. Lengths in meters. */
export type SubwooferSpecs = {
  readonly enclosure: Enclosure
  /** The driver's nominal diameter, in meters (a 12 in driver is 0.3048 m). */
  readonly driverDiameter: number
  /** The amplifier's continuous (RMS) power, in watts. */
  readonly rmsWatts: number
  /** The amplifier's peak power, in watts: at least the RMS power. */
  readonly peakWatts: number
}

/**
 * The Subwoofers speaker group: the specs its subwoofers share, and the
 * specs of any subwoofer that has its own (a mixed set of subwoofers, user
 * story 19).
 */
export type SubwooferGroup = {
  readonly specs: SubwooferSpecs
  /**
   * One entry per subwoofer of the layout, Subwoofer 1 first: its own
   * specs, or null when it uses the group's.
   */
  readonly overrides: readonly (SubwooferSpecs | null)[]
}

/** Specs per speaker group. #13 adds Front L/R, Center, Surrounds, Rear surrounds and Overheads. */
export type SpeakerGroups = { readonly subwoofers: SubwooferGroup }

/** The numeric subwoofer specs, which have accepted ranges. */
export type SubwooferSpecField = 'driverDiameter' | 'rmsWatts' | 'peakWatts'

/**
 * The specs every subwoofer starts with: a sealed 12 in subwoofer with a
 * 300 W RMS, 600 W peak amplifier. These are our defaults, a plausible
 * mid-range home theater subwoofer, not a cited or measured product.
 */
export const DEFAULT_SUBWOOFER_SPECS = {
  enclosure: 'sealed',
  driverDiameter: 0.3048,
  rmsWatts: 300,
  peakWatts: 600,
} as const satisfies SubwooferSpecs

/** First-visit speaker groups: our default specs, with no subwoofer of its own. */
export const DEFAULT_SPEAKER_GROUPS = {
  subwoofers: { specs: DEFAULT_SUBWOOFER_SPECS, overrides: [null] },
} as const satisfies SpeakerGroups

/**
 * Accepted values, inclusive (driver sizes in meters, power in watts).
 * Like the room limits, these are our product limits that catch typos, not
 * cited values: subwoofer drivers are sold from about 6 in to 24 in.
 */
const SUBWOOFER_SPEC_LIMITS = {
  driverDiameter: {
    min: fromSmallUnit(6, 'imperial'),
    max: fromSmallUnit(24, 'imperial'),
  },
  rmsWatts: { min: 10, max: 10_000 },
  peakWatts: { min: 10, max: 20_000 },
} as const satisfies Record<SubwooferSpecField, { min: number; max: number }>

/** Why a subwoofer spec was rejected. */
export type SubwooferSpecProblem =
  | {
      readonly problem: 'not-a-number' | 'too-small' | 'too-large'
      readonly min: number
      readonly max: number
    }
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
  const value = specs[field]
  const { min, max } = SUBWOOFER_SPEC_LIMITS[field]
  if (!Number.isFinite(value)) return { problem: 'not-a-number', min, max }
  if (value < min) return { problem: 'too-small', min, max }
  if (value > max) return { problem: 'too-large', min, max }
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

const SUBWOOFER_SPEC_FIELDS = [
  'driverDiameter',
  'rmsWatts',
  'peakWatts',
] as const satisfies readonly SubwooferSpecField[]

/** Whether every numeric spec passes its check. */
export function areValidSubwooferSpecs(specs: SubwooferSpecs): boolean {
  return SUBWOOFER_SPEC_FIELDS.every(
    (field) => checkSubwooferSpec(specs, field) === null,
  )
}
