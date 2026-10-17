/**
 * The timeout for a logic test that does seconds of work on purpose: a
 * sweep over many rooms, or a speed check that runs its work several
 * times. Alone they take 1-4 s; with the CPU busy (other test workers, a
 * second suite, a build) several times that, past the default 5 s (#93).
 * Only for tests whose comment says why they are heavy: the speed checks
 * (see relative-speed.ts), not this timeout, catch a slow analysis.
 */
export const HEAVY_TEST_TIMEOUT_MS = 30_000
