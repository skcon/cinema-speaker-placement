import { describe, expect, it } from 'vitest'
import { analyzeRoom, DEFAULT_CONFIG } from '@/domain'
import { summarizeResponse } from './response-summary'

const target = (levels: number[]) =>
  levels.map((level, i) => ({
    frequency: 20 * (i + 1),
    level,
    low: level - 3,
    high: level + 3,
  }))

describe('response summary', () => {
  it('gives the share inside the band, the largest peak and the deepest dip against the target', () => {
    const summary = summarizeResponse(
      [
        { frequency: 20, level: 0 },
        { frequency: 40, level: 4 },
        { frequency: 60, level: -5 },
        { frequency: 80, level: 2 },
      ],
      target([0, 0, 0, 1]),
    )

    expect(summary).toEqual({
      withinTolerance: 0.5,
      largestPeak: { frequency: 40, deviation: 4 },
      deepestDip: { frequency: 60, deviation: -5 },
    })
  })

  it('counts the band edges as inside', () => {
    const summary = summarizeResponse(
      [
        { frequency: 20, level: 3 },
        { frequency: 40, level: -3 },
      ],
      target([0, 0]),
    )

    expect(summary.withinTolerance).toBe(1)
  })

  it('is part of the analysis', () => {
    const { response } = analyzeRoom(DEFAULT_CONFIG)

    expect(response.summary).toEqual(
      summarizeResponse(response.estimated.points, response.target),
    )
  })
})

/** The third-octave rows of the chart's table: every 16th point. */
describe('table rows', () => {
  it('are the estimate and the target at the base-10 third-octave frequencies, 20 to 200 Hz', () => {
    const { response } = analyzeRoom(DEFAULT_CONFIG)

    expect(response.tableRows.map((row) => row.frequency)).toEqual(
      [20, 25.2, 31.7, 39.9, 50.2, 63.2, 79.6, 100.2, 126.2, 158.9, 200].map(
        (hz) => expect.closeTo(hz, 1) as number,
      ),
    )
    expect(response.tableRows[0]).toEqual({
      frequency: 20,
      estimated: response.estimated.points[0]!.level,
      target: 0,
    })
  })
})
