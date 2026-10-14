import type { RangeProblem } from '@/domain'

/** The usual inline errors for a number that is not one, or outside its range. */
export function rangeErrorMessage(
  noun: string,
  label: string,
  format: (value: number) => string,
): (problem: RangeProblem) => string {
  return (problem) =>
    problem.problem === 'not-a-number'
      ? `Enter the ${noun} as a number.`
      : `${label} must be between ${format(problem.min)} and ${format(problem.max)}.`
}
