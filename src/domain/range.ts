/** Accepted values, inclusive. */
export type AcceptedRange = { readonly min: number; readonly max: number }

/** Why a value was rejected, with the accepted range. */
export type RangeProblem = {
  readonly problem: 'not-a-number' | 'too-small' | 'too-large'
  readonly min: number
  readonly max: number
}

/** `null` when the value is a finite number inside the range. */
export function checkRange(
  value: number,
  { min, max }: AcceptedRange,
): RangeProblem | null {
  if (!Number.isFinite(value)) return { problem: 'not-a-number', min, max }
  if (value < min) return { problem: 'too-small', min, max }
  if (value > max) return { problem: 'too-large', min, max }
  return null
}
