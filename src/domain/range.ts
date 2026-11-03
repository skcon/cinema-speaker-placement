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

/** `value` held inside [low, high]. */
export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}

/**
 * A range `margin` in from each edge, or the range itself when that would
 * leave nothing: auto-place keeps angles a margin inside Dolby's ranges
 * where the room allows (OVERHEAD_AIM, LISTENER_LEVEL_AIM).
 */
export function insetRange(
  { min, max }: AcceptedRange,
  margin: number,
): AcceptedRange {
  return max - min > 2 * margin
    ? { min: min + margin, max: max - margin }
    : { min, max }
}
