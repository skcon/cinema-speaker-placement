/**
 * Analog filter responses at a frequency, for the crossover and the
 * enclosure roll-off: Butterworth filters built from 2nd-order sections,
 * with s = j·f/fc.
 */
import { divide, multiply, type Complex } from './complex'

/** Pass the low or the high frequencies. */
export type FilterKind = 'low-pass' | 'high-pass'

/**
 * One 2nd-order section with quality factor `q`: 1 / (s² + s/q + 1) as a
 * low-pass, s² / (s² + s/q + 1) as a high-pass.
 */
function secondOrder(
  kind: FilterKind,
  q: number,
  frequency: number,
  corner: number,
): Complex {
  const w = frequency / corner
  // s² + s/q + 1 with s = jw.
  const denominator = { re: 1 - w * w, im: w / q }
  const numerator =
    kind === 'low-pass' ? { re: 1, im: 0 } : { re: -w * w, im: 0 }
  return divide(numerator, denominator)
}

/**
 * The quality factors of the 2nd-order sections of an even-order
 * Butterworth filter: 1 / (2·sin((2k − 1)·π / (2n))), k = 1 … n/2.
 */
function butterworthQs(order: 2 | 4): number[] {
  return Array.from(
    { length: order / 2 },
    (_, i) => 1 / (2 * Math.sin(((2 * i + 1) * Math.PI) / (2 * order))),
  )
}

/**
 * An even-order Butterworth filter: maximally flat, −3 dB at `corner` and
 * 6·order dB per octave beyond it.
 */
export function butterworth(
  kind: FilterKind,
  order: 2 | 4,
  frequency: number,
  corner: number,
): Complex {
  return butterworthQs(order).reduce<Complex>(
    (product, q) => multiply(product, secondOrder(kind, q, frequency, corner)),
    { re: 1, im: 0 },
  )
}

/**
 * A 4th-order Linkwitz-Riley filter: a 2nd-order Butterworth twice, −6 dB
 * at `corner`, 24 dB per octave beyond it. Its low- and high-pass outputs
 * are in phase and sum flat.
 */
export function linkwitzRiley4(
  kind: FilterKind,
  frequency: number,
  corner: number,
): Complex {
  const section = butterworth(kind, 2, frequency, corner)
  return multiply(section, section)
}
