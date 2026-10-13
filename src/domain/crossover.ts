/**
 * The crossover between the Speakers and the Subwoofers (bass management):
 * below it the Subwoofers play, above it the Speakers. Modelled as an
 * acoustic 4th-order Linkwitz-Riley crossover (CROSSOVER in reference.ts).
 */
import type { Complex } from './complex'
import { linkwitzRiley4 } from './filters'
import { checkRange, type RangeProblem } from './range'
import { CROSSOVER } from './reference'

/** The crossover a config starts with, in Hz. */
export const DEFAULT_CROSSOVER_HZ: number = CROSSOVER.defaultHz

/** Why a crossover frequency was rejected, with the accepted range. */
export type CrossoverProblem = RangeProblem

/** `null` when `hz` is an accepted crossover frequency. */
export function checkCrossover(hz: number): CrossoverProblem | null {
  return checkRange(hz, CROSSOVER.limits)
}

/** What the Subwoofers get at `frequency` with the crossover at `crossoverHz`. */
export function crossoverLowPass(
  frequency: number,
  crossoverHz: number,
): Complex {
  return linkwitzRiley4('low-pass', frequency, crossoverHz)
}

/** What the Speakers get at `frequency` with the crossover at `crossoverHz`. */
export function crossoverHighPass(
  frequency: number,
  crossoverHz: number,
): Complex {
  return linkwitzRiley4('high-pass', frequency, crossoverHz)
}
