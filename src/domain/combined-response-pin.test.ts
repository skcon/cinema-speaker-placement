import { describe, expect, it } from 'vitest'
import { analyzeRoom } from './analyze'
import { DEFAULT_CONFIG } from './config'
import { withLayout } from './config-edits'
import { recommendSeat } from './seat-score'

/**
 * The combined estimated response and the seat score, pinned to their
 * values on develop before the Channel response (#157): the channel
 * response adds a curve, it never changes this one.
 */
describe('the combined estimated response (pinned)', () => {
  it('is unchanged for the default 5.1.2 room with one subwoofer', () => {
    const { response } = analyzeRoom(DEFAULT_CONFIG)
    const { rows, calibration } = response.estimated

    expect(response.score).toEqual({ value: 53, band: 'poor' })
    expect(response.summary.withinTolerance).toBeCloseTo(0.525, 10)
    expect(response.summary.largestPeak.deviation).toBeCloseTo(6.839057, 5)
    expect(response.summary.deepestDip.deviation).toBeCloseTo(-7.125139, 5)
    expect(calibration.subwooferDb).toBeCloseTo(-89.635427, 5)
    expect(calibration.speakersDb).toBeCloseTo(1.59669, 5)
    expect(calibration.levelDb).toBeCloseTo(0.574877, 5)
    expect([0, 40, 100, 160, 224].map((i) => rows[i]!.estimated)).toEqual([
      expect.closeTo(-13.383075, 5),
      expect.closeTo(-2.578938, 5),
      expect.closeTo(5.809239, 5),
      expect.closeTo(-2.995045, 5),
      expect.closeTo(-7.125139, 5),
    ])
  })

  it('is unchanged for a 7.1.4 room with two subwoofers', () => {
    const config = withLayout(DEFAULT_CONFIG, {
      dolbyLayout: '7.1.4',
      subwoofers: 2,
    })
    const { response } = analyzeRoom(config)
    const { rows, calibration } = response.estimated

    expect(response.score).toEqual({ value: 58, band: 'poor' })
    expect(calibration.subwooferDb).toBeCloseTo(-81.18071, 5)
    expect(calibration.levelDb).toBeCloseTo(0.022055, 5)
    expect([0, 40, 100, 160, 224].map((i) => rows[i]!.estimated)).toEqual([
      expect.closeTo(-25.056168, 5),
      expect.closeTo(-13.602497, 5),
      expect.closeTo(0.536152, 5),
      expect.closeTo(-2.724839, 5),
      expect.closeTo(-6.572317, 5),
    ])
  })

  it('pins the seat score (the 7.1.4 seat moved with #158)', () => {
    const fivePointOne = recommendSeat(DEFAULT_CONFIG).recommended
    expect(fivePointOne.position.x).toBe(0)
    expect(fivePointOne.position.y).toBeCloseTo(2.28, 10)
    expect(fivePointOne.score).toBeCloseTo(0.818698, 5)

    const sevenPointOne = recommendSeat(
      withLayout(DEFAULT_CONFIG, { dolbyLayout: '7.1.4', subwoofers: 2 }),
    ).recommended
    expect(sevenPointOne.position.y).toBeCloseTo(4.157143, 5)
    // 0.859899 until #158: the seat's front stage now stands where its
    // boundary interference strays least from the target in the Speakers'
    // band (front-wall-distance.ts), which the bass smoothness, over the
    // whole band, need not agree with.
    expect(sevenPointOne.score).toBeCloseTo(0.85231, 5)
  })
})
