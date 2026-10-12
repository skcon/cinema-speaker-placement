import {
  checkSubwooferSpec,
  formatInches,
  fromInches,
  toInches,
  type Rounding,
  type SubwooferSpecField,
  type SubwooferSpecProblem,
  type SubwooferSpecs,
} from '@/domain'
import { parseDecimal } from '@/ui/lib/decimal'

/** The numeric subwoofer specs, in the order the form shows them. */
export const SUBWOOFER_SPEC_FIELDS = [
  'driverDiameter',
  'rmsWatts',
  'peakWatts',
] as const satisfies readonly SubwooferSpecField[]

/** How one numeric spec is labelled, written and read in a text field. */
type SpecText = {
  /** The field label, for example "RMS power". */
  readonly label: string
  /** The label as it reads mid-sentence, for example "driver size". */
  readonly noun: string
  /** The unit the field is in: "in" or "W". */
  readonly unit: string
  /** The stored value as the field's starting text. */
  readonly toText: (value: number) => string
  /** The value a field's text describes, in the stored unit; NaN if it is not a number. */
  readonly fromText: (text: string) => number
  /** The value with its unit, for messages. */
  readonly format: (value: number, rounding?: Rounding) => string
}

/** Watts with thousands separators, for example "10,000 W". */
export function formatWatts(watts: number): string {
  return `${watts.toLocaleString('en-US')} W`
}

const WATTS = {
  unit: 'W',
  toText: (watts) => String(watts),
  fromText: (text) => parseDecimal(text),
  format: (watts) => formatWatts(watts),
} as const satisfies Omit<SpecText, 'label' | 'noun'>

/**
 * The numeric subwoofer specs as text. The driver size is stored in meters
 * and shown in inches in both unit systems, as drivers are sold by the
 * inch; power is in watts.
 */
export const SUBWOOFER_SPEC_TEXT: Record<SubwooferSpecField, SpecText> = {
  driverDiameter: {
    label: 'Driver size',
    noun: 'driver size',
    unit: 'in',
    toText: (meters) => String(toInches(meters)),
    fromText: (text) => fromInches(parseDecimal(text)),
    format: (meters, rounding) => formatInches(meters, rounding),
  },
  rmsWatts: { label: 'RMS power', noun: 'RMS power', ...WATTS },
  peakWatts: { label: 'Peak power', noun: 'peak power', ...WATTS },
}

/** What the user has typed into each numeric spec field. */
export type SubwooferSpecDrafts = Record<SubwooferSpecField, string>

/** The text each spec field starts with. */
export function draftsFromSpecs(specs: SubwooferSpecs): SubwooferSpecDrafts {
  return {
    driverDiameter: SUBWOOFER_SPEC_TEXT.driverDiameter.toText(
      specs.driverDiameter,
    ),
    rmsWatts: SUBWOOFER_SPEC_TEXT.rmsWatts.toText(specs.rmsWatts),
    peakWatts: SUBWOOFER_SPEC_TEXT.peakWatts.toText(specs.peakWatts),
  }
}

/**
 * The specs the drafts describe, with the enclosure as stored. A field
 * still showing its stored value's text counts as the stored value, so an
 * untouched driver size isn't rounded on its way back. Unreadable numbers
 * are NaN.
 */
export function specsFromDrafts(
  drafts: SubwooferSpecDrafts,
  stored: SubwooferSpecs,
): SubwooferSpecs {
  const untouched = draftsFromSpecs(stored)
  const value = (field: SubwooferSpecField) =>
    drafts[field] === untouched[field]
      ? stored[field]
      : SUBWOOFER_SPEC_TEXT[field].fromText(drafts[field])
  return {
    enclosure: stored.enclosure,
    driverDiameter: value('driverDiameter'),
    rmsWatts: value('rmsWatts'),
    peakWatts: value('peakWatts'),
  }
}

/**
 * Drafts brought back in line with the stored specs after they changed. A
 * field starts over only when its stored value changed to something it
 * doesn't describe (a share link, say): after the user's own edit it keeps
 * what they typed ("12.0"), and a field with an invalid entry keeps it
 * while another field is stored.
 */
export function reseedDrafts(
  drafts: SubwooferSpecDrafts,
  previous: SubwooferSpecs,
  stored: SubwooferSpecs,
): SubwooferSpecDrafts {
  const fresh = draftsFromSpecs(stored)
  const keep = (field: SubwooferSpecField) =>
    previous[field] === stored[field] ||
    SUBWOOFER_SPEC_TEXT[field].fromText(drafts[field]) === stored[field]
  return {
    driverDiameter: keep('driverDiameter')
      ? drafts.driverDiameter
      : fresh.driverDiameter,
    rmsWatts: keep('rmsWatts') ? drafts.rmsWatts : fresh.rmsWatts,
    peakWatts: keep('peakWatts') ? drafts.peakWatts : fresh.peakWatts,
  }
}

/**
 * The specs to store from what the user typed: each field that passes its
 * check against the other typed values, and the stored value for the rest.
 */
export function acceptedSpecs(
  typed: SubwooferSpecs,
  stored: SubwooferSpecs,
): SubwooferSpecs {
  const accepted = (field: SubwooferSpecField) =>
    checkSubwooferSpec(typed, field) === null ? typed[field] : stored[field]
  return {
    enclosure: stored.enclosure,
    driverDiameter: accepted('driverDiameter'),
    rmsWatts: accepted('rmsWatts'),
    peakWatts: accepted('peakWatts'),
  }
}

/** The inline error for a rejected spec. */
export function subwooferSpecErrorMessage(
  field: SubwooferSpecField,
  problem: SubwooferSpecProblem,
): string {
  const { label, noun, format } = SUBWOOFER_SPEC_TEXT[field]
  switch (problem.problem) {
    case 'not-a-number':
      return `Enter the ${noun} as a number.`
    case 'too-small':
    case 'too-large':
      // Round the limits inward so the numbers shown are themselves accepted.
      return `${label} must be between ${format(problem.min, 'up')} and ${format(problem.max, 'down')}.`
    case 'peak-below-rms':
      return `Peak power can't be below the RMS power (${formatWatts(problem.rmsWatts)}).`
    case 'rms-above-peak':
      return `RMS power can't be above the peak power (${formatWatts(problem.peakWatts)}).`
  }
}
