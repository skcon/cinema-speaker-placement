/**
 * The estimated response in words and as a short table: for the chart's
 * text summary and its screen-reader fallback.
 */
import type { ResponsePoint } from './estimated-response'
import { RESPONSE_BAND } from './reference'
import type { TargetPoint } from './target-curve'

/** How far the estimate is from the target at one frequency, in dB. */
export type ResponseDeviation = {
  readonly frequency: number
  readonly deviation: number
}

export type ResponseSummary = {
  /** The share of the response band inside the target's tolerance band, 0 to 1. */
  readonly withinTolerance: number
  /** Where the estimate is furthest above the target. */
  readonly largestPeak: ResponseDeviation
  /** Where the estimate is furthest below the target. */
  readonly deepestDip: ResponseDeviation
}

/** One row of the response table, levels in dB. */
export type ResponseTableRow = {
  readonly frequency: number
  readonly estimated: number
  readonly target: number
}

/** Summarize `points` against `target`, which has the same frequencies. */
export function summarizeResponse(
  points: readonly ResponsePoint[],
  target: readonly TargetPoint[],
): ResponseSummary {
  const deviations = points.map(({ frequency, level }, i) => ({
    frequency,
    level,
    deviation: level - (target[i]?.level ?? 0),
    inside:
      level >= (target[i]?.low ?? -Infinity) &&
      level <= (target[i]?.high ?? Infinity),
  }))
  const pick = (better: (a: number, b: number) => boolean) =>
    deviations.reduce((best, d) =>
      better(d.deviation, best.deviation) ? d : best,
    )
  const deviation = ({ frequency, deviation }: ResponseDeviation) => ({
    frequency,
    deviation,
  })
  return {
    withinTolerance:
      deviations.filter((d) => d.inside).length / deviations.length,
    largestPeak: deviation(pick((a, b) => a > b)),
    deepestDip: deviation(pick((a, b) => a < b)),
  }
}

/**
 * The estimate and the target at the base-10 third-octave frequencies of
 * the response band (every 16th point, see RESPONSE_BAND).
 */
export function responseTable(
  points: readonly ResponsePoint[],
  target: readonly TargetPoint[],
): ResponseTableRow[] {
  // Base-10 third octaves are tenths of a decade.
  const { steps, lowestHz, highestHz } = RESPONSE_BAND
  const pointsPerThirdOctave = Math.round(
    steps / (10 * Math.log10(highestHz / lowestHz)),
  )
  return points.flatMap(({ frequency, level }, i) =>
    i % pointsPerThirdOctave === 0
      ? [{ frequency, estimated: level, target: target[i]?.level ?? 0 }]
      : [],
  )
}
