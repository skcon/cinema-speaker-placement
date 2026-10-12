/**
 * The target curve the estimated response is compared against (GLOSSARY.md):
 * flat, or a house curve with a bass boost, each with a tolerance band.
 */
import { HOUSE_CURVE, TARGET_TOLERANCE } from './reference'

/** The target curves a config can choose. `house` is our own shape (HOUSE_CURVE). */
export const TARGET_CURVES = ['flat', 'house'] as const

export type TargetCurveKind = (typeof TARGET_CURVES)[number]

/** The target at one frequency, with its tolerance band, in dB. */
export type TargetPoint = {
  readonly frequency: number
  readonly level: number
  readonly low: number
  readonly high: number
}

/** The target level in dB at `frequency` Hz. */
function targetLevel(kind: TargetCurveKind, frequency: number): number {
  if (kind === 'flat') return 0
  const { boostDb, cornerHz } = HOUSE_CURVE
  return boostDb / (1 + (frequency / cornerHz) ** 2)
}

/** The target curve at each frequency, with its ±3 dB band. */
export function targetCurve(
  kind: TargetCurveKind,
  frequencies: readonly number[],
): TargetPoint[] {
  return frequencies.map((frequency) => {
    const level = targetLevel(kind, frequency)
    return {
      frequency,
      level,
      low: level - TARGET_TOLERANCE.db,
      high: level + TARGET_TOLERANCE.db,
    }
  })
}
