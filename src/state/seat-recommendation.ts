import type { Config } from '@/domain'

/**
 * The fields of the config the seat score doesn't depend on. Everything
 * else counts, including fields added later, so a new input can never be
 * left out of the memo by accident.
 */
const NOT_SCORED = [
  'units',
  'seatRowWidth',
] as const satisfies readonly (keyof Config)[]

/**
 * What the recommended seat is memoized on: the whole config except the
 * fields in NOT_SCORED (a blocklist, not an allowlist).
 */
export function seatScoreKey(config: Config): string {
  return JSON.stringify(
    Object.entries(config).filter(
      ([field]) => !NOT_SCORED.some((notScored) => notScored === field),
    ),
  )
}
