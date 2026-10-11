import { UNIT_SYSTEMS, type UnitSystem } from '@/domain'

/**
 * What the user has typed into a length field: one text per part of the unit
 * system (one box for m, two for ft + in), kept as text so partial input
 * ("5.", "") survives re-renders. Conversion happens in the domain.
 */
export type LengthDraft = string[]

/** The text a length field starts with: the domain's rounded parts. */
export function draftFromMeters(
  meters: number,
  units: UnitSystem,
): LengthDraft {
  return UNIT_SYSTEMS[units].toParts(meters).map(({ value }) => String(value))
}

/**
 * The length a draft describes, in meters, or NaN when it is not a number.
 * An empty box counts as 0 as long as another one is filled (20 ft + empty
 * inches is 20 ft).
 */
export function metersFromDraft(draft: LengthDraft, units: UnitSystem): number {
  if (draft.every(isBlank)) return Number.NaN
  return UNIT_SYSTEMS[units].fromParts(
    draft.map((text) => (isBlank(text) ? 0 : parseDecimal(text))),
  )
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
