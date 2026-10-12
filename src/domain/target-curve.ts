/**
 * The target curve the estimated response is compared against (GLOSSARY.md):
 * flat, or a house curve with a bass boost, each with a tolerance band.
 */
import { HOUSE_CURVE, TARGET_TOLERANCE } from './reference'

/** The target curves a config can choose. */
export const TARGET_CURVE_KINDS = ['flat', 'house'] as const

export type TargetCurveKind = (typeof TARGET_CURVE_KINDS)[number]

/** What each target curve is: its level and how the UI names it. */
export type TargetCurveSpec = {
  /** The target level in dB at a frequency in Hz. */
  readonly level: (frequency: number) => number
  /** Its option label, for example in a picker. */
  readonly label: string
  /** How a sentence names it: "the flat target". */
  readonly name: string
}

/** Every target curve. `house` is our own shape (HOUSE_CURVE). */
export const TARGET_CURVES = {
  flat: { level: () => 0, label: 'Flat', name: 'flat target' },
  house: {
    level: (frequency) =>
      HOUSE_CURVE.boostDb / (1 + (frequency / HOUSE_CURVE.cornerHz) ** 2),
    label: 'House curve (our assumption)',
    name: 'house curve',
  },
} as const satisfies Record<TargetCurveKind, TargetCurveSpec>

/** The target at one frequency, with its tolerance band, in dB. */
export type TargetPoint = {
  readonly frequency: number
  readonly level: number
  readonly low: number
  readonly high: number
}

/** The target curve at each frequency, with its ±3 dB band. */
export function targetCurve(
  kind: TargetCurveKind,
  frequencies: readonly number[],
): TargetPoint[] {
  const { level: levelAt } = TARGET_CURVES[kind]
  return frequencies.map((frequency) => {
    const level = levelAt(frequency)
    return {
      frequency,
      level,
      low: level - TARGET_TOLERANCE.db,
      high: level + TARGET_TOLERANCE.db,
    }
  })
}
