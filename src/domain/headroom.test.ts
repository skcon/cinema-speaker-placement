import { describe, expect, it } from 'vitest'
import {
  headroomStatus,
  splAtDistance,
  subwooferSensitivity,
  sumLevels,
  wattsForHeadroom,
} from './headroom'
import { fromInches } from './units'

// Every expected value below is worked out by hand from
// SPL = sensitivity + 10·log10(P) − 20·log10(d), with
// 10·log10(2) = 3.0103, 20·log10(2) = 6.0206, 20·log10(3) = 9.5424.
describe('SPL at a distance', () => {
  it('is the sensitivity at 1 W and 1 m', () => {
    expect(splAtDistance({ sensitivity: 90, watts: 1, distance: 1 })).toBe(90)
  })

  it('gains 20 dB from 100 W and loses 6 dB at 2 m', () => {
    expect(
      splAtDistance({ sensitivity: 87, watts: 100, distance: 2 }),
    ).toBeCloseTo(100.9794, 4)
  })

  it('gains 3 dB per doubling of power', () => {
    const at100 = splAtDistance({ sensitivity: 87, watts: 100, distance: 3 })
    const at200 = splAtDistance({ sensitivity: 87, watts: 200, distance: 3 })
    expect(at200 - at100).toBeCloseTo(3.0103, 4)
  })

  it('loses 6 dB per doubling of distance', () => {
    const at2 = splAtDistance({ sensitivity: 87, watts: 100, distance: 2 })
    const at4 = splAtDistance({ sensitivity: 87, watts: 100, distance: 4 })
    expect(at2 - at4).toBeCloseTo(6.0206, 4)
  })

  it('works out 88 dB, 50 W at 3 m', () => {
    // 88 + 16.9897 − 9.5424
    expect(
      splAtDistance({ sensitivity: 88, watts: 50, distance: 3 }),
    ).toBeCloseTo(95.4473, 4)
  })

  it('takes a speaker nearer than half a meter as half a meter away', () => {
    // 90 + 0 + 6.0206: no infinite level for a speaker on top of the MLP.
    expect(
      splAtDistance({ sensitivity: 90, watts: 1, distance: 0 }),
    ).toBeCloseTo(96.0206, 4)
  })
})

describe('summing levels', () => {
  it('leaves a single level as it is', () => {
    expect(sumLevels([100])).toBe(100)
  })

  it('adds 3 dB for two equal levels (power sum)', () => {
    expect(sumLevels([100, 100])).toBeCloseTo(103.0103, 4)
  })

  it('adds 6 dB for four equal levels', () => {
    expect(sumLevels([95, 95, 95, 95])).toBeCloseTo(101.0206, 4)
  })

  it('adds 0.41 dB when the second level is 10 dB lower', () => {
    // 10·log10(1 + 0.1)
    expect(sumLevels([90, 100])).toBeCloseTo(100.4139, 4)
  })
})

describe('the power that would give a headroom', () => {
  it('is the same power at 0 dB more', () => {
    expect(wattsForHeadroom({ watts: 100, headroomDb: 0, wantedDb: 0 })).toBe(
      100,
    )
  })

  it('doubles for every 3 dB short', () => {
    // 87 dB, 100 W at 2 m is 100.98 dB, 1.02 dB short of 102 dB: reaching
    // it takes 87 + 10·log10(P) − 6.0206 = 102, so P = 10^2.10206 = 126.49 W.
    expect(
      wattsForHeadroom({ watts: 100, headroomDb: -1.0206, wantedDb: 0 }),
    ).toBeCloseTo(126.49, 2)
    expect(
      wattsForHeadroom({ watts: 100, headroomDb: 0, wantedDb: 3.0103 }),
    ).toBeCloseTo(200, 3)
  })
})

describe('headroom status', () => {
  it('is enough from 3 dB, tight from 0 dB, and short below', () => {
    expect(headroomStatus(3)).toBe('enough')
    expect(headroomStatus(2.99)).toBe('tight')
    expect(headroomStatus(0)).toBe('tight')
    expect(headroomStatus(-0.01)).toBe('short')
  })
})

describe('a subwoofer’s rough sensitivity', () => {
  it('is 88 dB for a sealed 12 in driver', () => {
    expect(
      subwooferSensitivity({
        enclosure: 'sealed',
        driverDiameter: fromInches(12),
      }),
    ).toBeCloseTo(88, 9)
  })

  it('grows with cone area: 20·log10 of the diameter ratio', () => {
    // 88 + 20·log10(15/12) = 88 + 1.9382
    expect(
      subwooferSensitivity({
        enclosure: 'sealed',
        driverDiameter: fromInches(15),
      }),
    ).toBeCloseTo(89.9382, 4)
    // 88 − 20·log10(12/10) = 88 − 1.5836
    expect(
      subwooferSensitivity({
        enclosure: 'sealed',
        driverDiameter: fromInches(10),
      }),
    ).toBeCloseTo(86.4164, 4)
  })

  it('adds 3 dB for a ported enclosure', () => {
    // 88 + 20·log10(18/12) + 3 = 88 + 3.5218 + 3
    expect(
      subwooferSensitivity({
        enclosure: 'ported',
        driverDiameter: fromInches(18),
      }),
    ).toBeCloseTo(94.5218, 4)
  })
})
