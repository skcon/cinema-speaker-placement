/**
 * The crossover between the Speakers and the Subwoofers (bass management):
 * below it the Subwoofers play, above it the Speakers. The estimate models
 * it as an acoustic 4th-order Linkwitz-Riley crossover (`linkwitzRiley4`
 * in filters.ts; CROSSOVER in reference.ts).
 */
import { checkRange, type RangeProblem } from './range'
import { CROSSOVER } from './reference'

/** The crossover a config starts with, in Hz. */
export const DEFAULT_CROSSOVER_HZ: number = CROSSOVER.defaultHz

/**
 * Why a crossover frequency was rejected, with the accepted range (named
 * like RoomDimensionProblem, for the UI's error messages).
 */
export type CrossoverProblem = RangeProblem

/** `null` when `hz` is an accepted crossover frequency. */
export function checkCrossover(hz: number): CrossoverProblem | null {
  return checkRange(hz, CROSSOVER.limits)
}
