import { describe, expect, it } from 'vitest'
import { add, decibels } from './complex'
import { linkwitzRiley4 } from './filters'
import { checkCrossover, DEFAULT_CROSSOVER_HZ } from './crossover'

describe('crossover (4th-order Linkwitz-Riley)', () => {
  it('defaults to 80 Hz', () => {
    expect(DEFAULT_CROSSOVER_HZ).toBe(80)
  })

  it('has both outputs 6 dB down at the crossover frequency', () => {
    // LR4 = two 2nd-order Butterworth sections, each −3.01 dB at fc.
    expect(decibels(linkwitzRiley4('low-pass', 80, 80))).toBeCloseTo(-6.021, 3)
    expect(decibels(linkwitzRiley4('high-pass', 80, 80))).toBeCloseTo(-6.021, 3)
    expect(decibels(linkwitzRiley4('low-pass', 120, 120))).toBeCloseTo(
      -6.021,
      3,
    )
  })

  it('rolls off at 24 dB per octave well outside the pass band', () => {
    // |LP| = 1 / (1 + (f/fc)⁴): 40·log10(2) ≈ 24.08 dB per octave far out.
    const octave = (f: number) =>
      decibels(linkwitzRiley4('low-pass', f, 80)) -
      decibels(linkwitzRiley4('low-pass', 2 * f, 80))
    expect(octave(640)).toBeCloseTo(24.08, 1)
    expect(
      decibels(linkwitzRiley4('high-pass', 10, 80)) -
        decibels(linkwitzRiley4('high-pass', 20, 80)),
    ).toBeCloseTo(-24.08, 1)
  })

  it('passes its own band at 0 dB', () => {
    expect(decibels(linkwitzRiley4('low-pass', 10, 80))).toBeCloseTo(0, 2)
    expect(decibels(linkwitzRiley4('high-pass', 800, 80))).toBeCloseTo(0, 2)
  })

  it('sums to a flat 0 dB, as the outputs are in phase at every frequency', () => {
    for (const f of [20, 40, 63, 80, 100, 160, 320, 500]) {
      const sum = add(
        linkwitzRiley4('low-pass', f, 80),
        linkwitzRiley4('high-pass', f, 80),
      )
      expect(decibels(sum)).toBeCloseTo(0, 9)
    }
  })

  it('accepts 40 to 200 Hz, and nothing else', () => {
    expect(checkCrossover(80)).toBeNull()
    expect(checkCrossover(40)).toBeNull()
    expect(checkCrossover(200)).toBeNull()
    expect(checkCrossover(39.9)).toEqual({
      problem: 'too-small',
      min: 40,
      max: 200,
    })
    expect(checkCrossover(201)).toMatchObject({ problem: 'too-large' })
    expect(checkCrossover(Number.NaN)).toMatchObject({
      problem: 'not-a-number',
    })
  })
})
