/**
 * Speed checks that hold on a busy machine (#93).
 *
 * A wall-clock bound ("under 2 s") fails whenever the machine is loaded:
 * other test workers, a second suite, a build. Instead, a speed check
 * measures its work in yardsticks: the CPU time the work takes over the CPU
 * time a fixed workload takes, both measured in the same test.
 *
 * - CPU time, not wall-clock time, so time spent waiting for a busy CPU
 *   does not count. It is the test process's CPU time: Vitest's default
 *   `forks` pool runs one test file at a time per process, so no other
 *   test counts.
 * - Over a yardstick, so a slower or faster machine (CI, a laptop, shared
 *   cores running slower) moves both alike and the ratio stays put.
 *
 * On a 4-core machine with two suites running at once (load 8-17), the
 * ratios moved by about 10 %; a 3x slower hot loop moved them about 2.5x.
 */

/** Node's CPU time, in microseconds. */
interface CpuUsage {
  readonly user: number
  readonly system: number
}

/**
 * Node's `process`, the part used here: the app is typed for the browser,
 * while Vitest runs the tests in Node.
 */
declare const process: {
  cpuUsage(previous?: CpuUsage): CpuUsage
}

/**
 * A fixed workload in the style of the acoustic model: complex products,
 * trigonometry and short-lived objects. About 65 ms of CPU time under
 * Vitest. Never change it without re-measuring every bound that uses it.
 * It returns its result, so the JIT cannot drop the loop.
 */
function yardstick(): number {
  let re = 1
  let im = 0
  let sum = 0
  for (let i = 0; i < 1_000_000; i++) {
    const phase = { re: Math.cos(i * 1e-3), im: Math.sin(i * 1e-3) }
    const nextRe = re * phase.re - im * phase.im
    im = re * phase.im + im * phase.re
    re = nextRe
    sum += Math.hypot(re, im) / (1 + (i % 7))
  }
  return sum
}

/** The CPU time `work` takes in this process, in milliseconds. */
function cpuMillisecondsFor(work: () => unknown): number {
  const started = process.cpuUsage()
  work()
  const { user, system } = process.cpuUsage(started)
  return (user + system) / 1000
}

/**
 * How many yardsticks `work` takes: the fastest of `rounds` runs of each,
 * interleaved. The fastest run is the one least disturbed by JIT warm-up
 * and garbage collection; the work's own memos make later runs no slower
 * than the first.
 */
export function yardsticksFor(work: () => unknown, rounds = 3): number {
  let fastestYardstick = cpuMillisecondsFor(yardstick)
  let fastestWork = Infinity
  for (let round = 0; round < rounds; round++) {
    fastestWork = Math.min(fastestWork, cpuMillisecondsFor(work))
    fastestYardstick = Math.min(fastestYardstick, cpuMillisecondsFor(yardstick))
  }
  return fastestWork / fastestYardstick
}
