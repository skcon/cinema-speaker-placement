import { formatLength, type RangeProblem, type UnitSystem } from '@/domain'

/**
 * The inline error for a rejected length, in the user's units: `noun` in
 * "Enter the … as a number", `label` in "… must be between".
 */
export function lengthErrorMessage(
  noun: string,
  label: string,
  { problem, min, max }: RangeProblem,
  units: UnitSystem,
): string {
  if (problem === 'not-a-number') {
    return `Enter the ${noun} as a number.`
  }
  // Round the limits inward so the numbers shown are themselves accepted.
  return `${label} must be between ${formatLength(min, units, 'up')} and ${formatLength(max, units, 'down')}.`
}
