/**
 * The estimated response in words and as a short table: for the chart's
 * text summary and its screen-reader fallback.
 */
import type { ResponseRow } from './estimated-response'

/** How far the estimate is from the target at one frequency, in dB. */
export type ResponseDeviation = {
  readonly frequency: number
  readonly deviation: number
}

export type ResponseSummary = {
  /** The share of the reliable rows inside the target's tolerance band, 0 to 1. */
  readonly withinTolerance: number
  /** Where the estimate is furthest above the target. */
  readonly largestPeak: ResponseDeviation
  /** Where the estimate is furthest below the target. */
  readonly deepestDip: ResponseDeviation
}

/**
 * Summarize the reliable rows (all rows if none is): unreliable rows below
 * the lowest excited mode would only report the model's blind spot.
 */
export function summarizeResponse(
  rows: readonly ResponseRow[],
): ResponseSummary {
  const reliable = rows.filter((row) => row.reliable)
  const deviations = (reliable.length > 0 ? reliable : rows).map(
    (row): ResponseDeviation & { inside: boolean } => ({
      frequency: row.frequency,
      deviation: row.estimated - row.target,
      inside: row.estimated >= row.low && row.estimated <= row.high,
    }),
  )
  const extreme = (isBeyond: (a: number, b: number) => boolean) => {
    const { frequency, deviation } = deviations.reduce((best, candidate) =>
      isBeyond(candidate.deviation, best.deviation) ? candidate : best,
    )
    return { frequency, deviation }
  }
  return {
    withinTolerance:
      deviations.filter((d) => d.inside).length / deviations.length,
    largestPeak: extreme((a, b) => a > b),
    deepestDip: extreme((a, b) => a < b),
  }
}

/** Half a base-10 third octave, in decades: how near a row must be. */
const HALF_THIRD_OCTAVE = 0.05

/**
 * The rows nearest the base-10 third-octave frequencies (10^(k/10) Hz:
 * 20, 25.1, 31.6 ...) that the rows span, each within half a third octave;
 * a third-octave frequency with no row that near is skipped.
 */
export function responseTable(rows: readonly ResponseRow[]): ResponseRow[] {
  if (rows.length === 0) return []
  const decadesOf = (row: ResponseRow) => Math.log10(row.frequency)
  const first = Math.round(10 * decadesOf(rows[0]!))
  const last = Math.round(10 * decadesOf(rows.at(-1)!))
  return Array.from(
    { length: last - first + 1 },
    (_, i) => (first + i) / 10,
  ).flatMap((thirdOctave) => {
    const nearest = rows.reduce((best, row) =>
      Math.abs(decadesOf(row) - thirdOctave) <
      Math.abs(decadesOf(best) - thirdOctave)
        ? row
        : best,
    )
    return Math.abs(decadesOf(nearest) - thirdOctave) <= HALF_THIRD_OCTAVE
      ? [nearest]
      : []
  })
}
