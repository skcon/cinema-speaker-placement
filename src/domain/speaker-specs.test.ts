import { describe, expect, it } from 'vitest'
import {
  checkSubwooferSpec,
  DEFAULT_SUBWOOFER_SPECS,
  speakerGroupsIn,
  type SubwooferSpecs,
} from './speaker-specs'

/** 1 in in meters (exact). */
const INCH = 0.0254

function specs(change: Partial<SubwooferSpecs>): SubwooferSpecs {
  return { ...DEFAULT_SUBWOOFER_SPECS, ...change }
}

describe('default subwoofer specs', () => {
  it('are a sealed 12 in subwoofer with 300 W RMS and 600 W peak', () => {
    expect(DEFAULT_SUBWOOFER_SPECS).toEqual({
      enclosure: 'sealed',
      driverDiameter: 12 * INCH,
      rmsWatts: 300,
      peakWatts: 600,
    })
  })

  it('pass their own checks', () => {
    for (const field of ['driverDiameter', 'rmsWatts', 'peakWatts'] as const) {
      expect(checkSubwooferSpec(DEFAULT_SUBWOOFER_SPECS, field)).toBeNull()
    }
  })
})

describe('checking a subwoofer spec', () => {
  it('accepts driver sizes from 6 in to 24 in', () => {
    for (const inches of [6, 8, 12, 18, 24]) {
      const driver = specs({ driverDiameter: inches * INCH })
      expect(checkSubwooferSpec(driver, 'driverDiameter')).toBeNull()
    }
  })

  it('rejects a driver size outside 6-24 in, with the accepted range in meters', () => {
    // 6 in and 24 in
    const range = {
      min: expect.closeTo(0.1524, 9) as number,
      max: expect.closeTo(0.6096, 9) as number,
    }

    expect(
      checkSubwooferSpec(
        specs({ driverDiameter: 5.9 * INCH }),
        'driverDiameter',
      ),
    ).toEqual({ problem: 'too-small', ...range })
    expect(
      checkSubwooferSpec(
        specs({ driverDiameter: 24.1 * INCH }),
        'driverDiameter',
      ),
    ).toEqual({ problem: 'too-large', ...range })
    expect(
      checkSubwooferSpec(
        specs({ driverDiameter: Number.NaN }),
        'driverDiameter',
      ),
    ).toEqual({ problem: 'not-a-number', ...range })
  })

  it('accepts RMS power from 10 W to 10,000 W and peak power from 10 W to 20,000 W', () => {
    expect(
      checkSubwooferSpec(specs({ rmsWatts: 10, peakWatts: 10 }), 'rmsWatts'),
    ).toBeNull()
    expect(
      checkSubwooferSpec(specs({ rmsWatts: 10, peakWatts: 10 }), 'peakWatts'),
    ).toBeNull()
    expect(
      checkSubwooferSpec(
        specs({ rmsWatts: 10_000, peakWatts: 20_000 }),
        'rmsWatts',
      ),
    ).toBeNull()
    expect(
      checkSubwooferSpec(
        specs({ rmsWatts: 10_000, peakWatts: 20_000 }),
        'peakWatts',
      ),
    ).toBeNull()
  })

  it('rejects power outside its range', () => {
    expect(checkSubwooferSpec(specs({ rmsWatts: 9 }), 'rmsWatts')).toEqual({
      problem: 'too-small',
      min: 10,
      max: 10_000,
    })
    expect(
      checkSubwooferSpec(specs({ peakWatts: 20_001 }), 'peakWatts'),
    ).toEqual({ problem: 'too-large', min: 10, max: 20_000 })
    expect(
      checkSubwooferSpec(specs({ rmsWatts: Number.NaN }), 'rmsWatts'),
    ).toEqual({ problem: 'not-a-number', min: 10, max: 10_000 })
  })

  it('needs the peak power to be at least the RMS power, and says so on either field', () => {
    const peakBelowRms = specs({ rmsWatts: 500, peakWatts: 400 })

    expect(checkSubwooferSpec(peakBelowRms, 'peakWatts')).toEqual({
      problem: 'peak-below-rms',
      rmsWatts: 500,
    })
    expect(checkSubwooferSpec(peakBelowRms, 'rmsWatts')).toEqual({
      problem: 'rms-above-peak',
      peakWatts: 400,
    })
    expect(
      checkSubwooferSpec(specs({ rmsWatts: 500, peakWatts: 500 }), 'peakWatts'),
    ).toBeNull()
  })

  it('reports a value outside its own range before comparing RMS and peak', () => {
    expect(
      checkSubwooferSpec(specs({ rmsWatts: 300, peakWatts: 5 }), 'peakWatts'),
    ).toEqual({ problem: 'too-small', min: 10, max: 20_000 })
  })
})

describe('speaker groups in a layout', () => {
  it.each([
    ['2.1', ['front']],
    ['3.1', ['front', 'center']],
    ['5.1', ['front', 'center', 'surrounds']],
    ['5.1.2', ['front', 'center', 'surrounds', 'overheads']],
    ['7.1', ['front', 'center', 'surrounds', 'rearSurrounds']],
    ['7.1.4', ['front', 'center', 'surrounds', 'rearSurrounds', 'overheads']],
  ] as const)('%s uses %j', (dolbyLayout, groups) => {
    expect(speakerGroupsIn({ dolbyLayout, subwoofers: 2 })).toEqual(groups)
  })
})
