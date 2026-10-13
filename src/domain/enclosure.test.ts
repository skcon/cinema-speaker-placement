import { describe, expect, it } from 'vitest'
import { decibels } from './complex'
import { enclosureRollOff } from './enclosure'

const level = (enclosure: 'sealed' | 'ported', frequency: number) =>
  decibels(enclosureRollOff(enclosure, frequency))

describe('enclosure roll-off', () => {
  it('rolls a sealed subwoofer off as a 2nd-order high-pass, 3 dB down at its assumed 30 Hz corner', () => {
    expect(level('sealed', 30)).toBeCloseTo(-3.01, 2)
    // 12 dB per octave far below the corner: 40·log10(2)/2 ≈ 12.04 dB.
    expect(level('sealed', 4) - level('sealed', 2)).toBeCloseTo(12.04, 1)
  })

  it('rolls a ported subwoofer off as a 4th-order high-pass, 3 dB down at its assumed 20 Hz corner', () => {
    expect(level('ported', 20)).toBeCloseTo(-3.01, 2)
    // 24 dB per octave far below the corner.
    expect(level('ported', 2) - level('ported', 1)).toBeCloseTo(24.08, 1)
  })

  it('lets both through unchanged well above their corners', () => {
    expect(level('sealed', 200)).toBeCloseTo(0, 1)
    expect(level('ported', 200)).toBeCloseTo(0, 2)
  })

  it('makes a ported subwoofer go deeper but fall faster below its corner than a sealed one', () => {
    expect(level('ported', 25)).toBeGreaterThan(level('sealed', 25))
    expect(level('ported', 10)).toBeLessThan(level('sealed', 10))
  })
})
