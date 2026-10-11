import {
  feetAndInchesToMeters,
  formatLength,
  metersToFeetAndInches,
  roundToCentimeters,
  type RoomDimensionProblem,
  type UnitSystem,
} from '@/domain'

/**
 * What the user has typed into a length field, kept as text so partial input
 * ("5.", "") survives re-renders. Conversion happens in the domain.
 */
export type LengthDraft =
  | { units: 'metric'; meters: string }
  | { units: 'imperial'; feet: string; inches: string }

/** The text a length field starts with. */
export function draftFromMeters(
  meters: number,
  units: UnitSystem,
): LengthDraft {
  if (units === 'metric') {
    return { units, meters: String(roundToCentimeters(meters)) }
  }
  const { feet, inches } = metersToFeetAndInches(meters)
  return { units, feet: String(feet), inches: String(inches) }
}

/**
 * The length a draft describes, in meters, or NaN when it is not a number.
 * An empty feet or inches box counts as 0 as long as the other one is filled.
 */
export function metersFromDraft(draft: LengthDraft): number {
  if (draft.units === 'metric') return parseDecimal(draft.meters)
  if (isBlank(draft.feet) && isBlank(draft.inches)) return Number.NaN
  return feetAndInchesToMeters({
    feet: isBlank(draft.feet) ? 0 : parseDecimal(draft.feet),
    inches: isBlank(draft.inches) ? 0 : parseDecimal(draft.inches),
  })
}

/** The inline error for a rejected room dimension. */
export function roomDimensionErrorMessage(
  label: string,
  { problem, min, max }: RoomDimensionProblem,
  units: UnitSystem,
): string {
  if (problem === 'not-a-number') {
    return `Enter the ${label.toLowerCase()} as a number.`
  }
  // Round the limits inward so the numbers shown are themselves accepted.
  return `${label} must be between ${formatLength(min, units, 'up')} and ${formatLength(max, units, 'down')}.`
}

const DECIMAL = /^(\d+([.,]\d*)?|[.,]\d+)$/

/** A non-negative decimal number; accepts a decimal comma. NaN otherwise. */
function parseDecimal(text: string): number {
  const trimmed = text.trim()
  return DECIMAL.test(trimmed) ? Number(trimmed.replace(',', '.')) : Number.NaN
}

function isBlank(text: string): boolean {
  return text.trim() === ''
}
