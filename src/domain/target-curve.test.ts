import { describe, expect, it } from 'vitest'
import { targetCurve } from './target-curve'

describe('target curve', () => {
  it('is flat at 0 dB with a ±3 dB band by default', () => {
    expect(targetCurve('flat', [20, 63, 200])).toEqual([
      { frequency: 20, level: 0, low: -3, high: 3 },
      { frequency: 63, level: 0, low: -3, high: 3 },
      { frequency: 200, level: 0, low: -3, high: 3 },
    ])
  })

  it('as a house curve, boosts the bass: +3 dB at 100 Hz, close to +6 dB at 20 Hz', () => {
    // Our shelf, 6 / (1 + (f / 100)²) dB: 6/1.04 at 20 Hz, 6/2 at 100 Hz,
    // 6/5 at 200 Hz.
    const [at20, at100, at200] = targetCurve('house', [20, 100, 200])

    expect(at20?.level).toBeCloseTo(5.7692, 4)
    expect(at100?.level).toBeCloseTo(3, 10)
    expect(at200?.level).toBeCloseTo(1.2, 10)
  })

  it('keeps the ±3 dB band around the house curve', () => {
    const [at100] = targetCurve('house', [100])

    expect(at100?.low).toBeCloseTo(0, 10)
    expect(at100?.high).toBeCloseTo(6, 10)
  })
})
