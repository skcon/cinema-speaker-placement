import { describe, expect, it } from 'vitest'
import { analyzeRoom } from './analyze'
import {
  interferenceLevels,
  overheadReflectingSurfaces,
} from './boundary-interference'
import { channelResponse } from './channel-response'
import { DEFAULT_CONFIG, type Config } from './config'
import { withLayout } from './config-edits'
import type { ResponseRow } from './estimated-response'
import { hearSpeaker } from './listening'
import { responseScore, summarizeResponse } from './response-summary'
import { distanceBetween } from './room'

/** The default room (6 × 4.5 × 2.6 m) with a 7.1.4 layout and two subwoofers. */
const SEVEN_ONE_FOUR: Config = withLayout(DEFAULT_CONFIG, {
  dolbyLayout: '7.1.4',
  subwoofers: 2,
})

/** The mean of `values`. */
function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** The reliable rows' mean deviation from the target, in dB. */
function meanDeviation(rows: readonly ResponseRow[]): number {
  return mean(
    rows.filter((row) => row.reliable).map((row) => row.estimated - row.target),
  )
}

/** The rows from `from` Hz up. */
function rowsFrom(rows: readonly ResponseRow[], from: number): ResponseRow[] {
  return rows.filter((row) => row.frequency >= from)
}

describe('the channel response', () => {
  it('is null for the MLP and for an item the layout has not', () => {
    const analysis = analyzeRoom(DEFAULT_CONFIG)

    expect(channelResponse(DEFAULT_CONFIG, analysis, 'MLP')).toBeNull()
    // 5.1.2 has neither rear surrounds nor a second subwoofer.
    expect(channelResponse(DEFAULT_CONFIG, analysis, 'Lrs')).toBeNull()
    expect(channelResponse(DEFAULT_CONFIG, analysis, 'Sub2')).toBeNull()
  })

  it('has the response score of its own rows, summarized as the combined one is', () => {
    const analysis = analyzeRoom(SEVEN_ONE_FOUR)

    for (const id of ['L', 'Ls', 'Ltf', 'Sub1'] as const) {
      const channel = channelResponse(SEVEN_ONE_FOUR, analysis, id)!
      const summary = summarizeResponse(channel.estimated.rows)
      expect(channel.summary).toEqual(summary)
      expect(channel.score).toEqual(responseScore(summary))
    }
  })

  describe('of a surround', () => {
    const analysis = analyzeRoom(SEVEN_ONE_FOUR)
    const channel = channelResponse(SEVEN_ONE_FOUR, analysis, 'Ls')!
    const ls = analysis.speakers.find(({ channel }) => channel === 'Ls')!

    it('is named after it', () => {
      expect(channel.id).toBe('Ls')
      expect(channel.name).toBe('Left Surround')
      expect(channel.kind).toBe('listenerLevel')
    })

    it('has the surround’s own boundary interference above the crossover', () => {
      const frequencies = analysis.response.estimated.rows.map(
        (row) => row.frequency,
      )
      const heard = hearSpeaker(SEVEN_ONE_FOUR, ls, analysis.mlp, frequencies)
      expect(channel.reflections).toEqual(heard.reflections)

      // From 300 Hz the 80 Hz low-pass leaves the subwoofers below
      // −60 dB and the high-pass passes the speaker within 0.01 dB, so the
      // curve is the surround's interference, shifted by the calibration.
      const rows = channel.estimated.rows
      const offsets = rows.flatMap((row, i) =>
        row.frequency >= 300 ? [row.estimated - heard.levels[i]!] : [],
      )
      expect(offsets.length).toBeGreaterThan(10)
      for (const offset of offsets) expect(offset).toBeCloseTo(offsets[0]!, 1)
    })

    it('differs from the combined response, which has the front stage', () => {
      const combined = rowsFrom(analysis.response.estimated.rows, 300)
      const surround = rowsFrom(channel.estimated.rows, 300)
      const largestGap = Math.max(
        ...surround.map((row, i) =>
          Math.abs(row.estimated - combined[i]!.estimated),
        ),
      )
      expect(largestGap).toBeGreaterThan(1)
    })

    it('has the subwoofers below the crossover, as bass management plays them', () => {
      const combined = analysis.response.estimated.rows
      const below = channel.estimated.rows.flatMap((row, i) =>
        row.frequency <= 40 ? [row.estimated - combined[i]!.estimated] : [],
      )
      // Well below the crossover both curves are the same subwoofers,
      // shifted only by each curve's overall level.
      expect(below.length).toBeGreaterThan(3)
      for (const gap of below) expect(gap).toBeCloseTo(below[0]!, 0)
    })

    it('is calibrated as the combined response is: 0 dB from the target on average', () => {
      expect(meanDeviation(channel.estimated.rows)).toBeCloseTo(0, 6)
      expect(channel.estimated.rows).toHaveLength(
        analysis.response.estimated.rows.length,
      )
    })
  })

  describe('of an overhead', () => {
    const analysis = analyzeRoom(SEVEN_ONE_FOUR)
    const channel = channelResponse(SEVEN_ONE_FOUR, analysis, 'Ltf')!
    const ltf = analysis.overheads.find(({ channel }) => channel === 'Ltf')!
    const { room } = SEVEN_ONE_FOUR

    it('is named after it', () => {
      expect(channel.name).toBe('Left Top Front')
      expect(channel.kind).toBe('overhead')
    })

    it('reflects off its nearest side wall and its nearest end wall, not the ceiling it is on or the floor', () => {
      // Left Top Front: on the ceiling, left of center and in the front half.
      expect(ltf.position.z).toBe(room.height)
      expect(ltf.position.x).toBeLessThan(0)
      expect(ltf.position.y).toBeLessThan(room.length / 2)
      expect(channel.reflections.map(({ surface }) => surface)).toEqual([
        'front wall',
        'left wall',
      ])
    })

    it('has the path differences of the walls’ image sources', () => {
      const { x, y, z } = ltf.position
      const direct = distanceBetween(ltf.position, analysis.mlp)
      const front = distanceBetween({ x, y: -y, z }, analysis.mlp) - direct
      const left =
        distanceBetween({ x: -room.width - x, y, z }, analysis.mlp) - direct
      const [frontWall, leftWall] = channel.reflections
      expect(frontWall!.pathDifference).toBeCloseTo(front, 10)
      expect(leftWall!.pathDifference).toBeCloseTo(left, 10)
      expect(leftWall!.relativeLevel).toBeCloseTo(direct / (direct + left), 10)
    })

    it('has that interference above the crossover', () => {
      const rows = channel.estimated.rows
      const levels = interferenceLevels(
        channel.reflections,
        rows.map((row) => row.frequency),
      )
      // Within 0.5 dB: in the notches the subwoofers' −50 dB leaves a trace.
      const offsets = rows.flatMap((row, i) =>
        row.frequency >= 300 ? [row.estimated - levels[i]!] : [],
      )
      for (const offset of offsets) expect(offset).toBeCloseTo(offsets[0]!, 0)
      expect(meanDeviation(rows)).toBeCloseTo(0, 6)
    })
  })

  describe('of a subwoofer', () => {
    const analysis = analyzeRoom(SEVEN_ONE_FOUR)
    const sub1 = channelResponse(SEVEN_ONE_FOUR, analysis, 'Sub1')!
    const sub2 = channelResponse(SEVEN_ONE_FOUR, analysis, 'Sub2')!

    it('is named after it, with no boundary interference', () => {
      expect(sub1.name).toBe('Subwoofer 1')
      expect(sub1.kind).toBe('subwoofer')
      expect(sub1.reflections).toEqual([])
      expect(sub1.estimated.components).toEqual([
        'room-modes',
        'enclosure',
        'crossover',
      ])
    })

    it('covers its own pass band: up to the crossover', () => {
      const frequencies = sub1.estimated.rows.map((row) => row.frequency)
      expect(frequencies[0]).toBe(20)
      expect(Math.max(...frequencies)).toBeLessThanOrEqual(
        SEVEN_ONE_FOUR.crossoverHz,
      )
      expect(Math.max(...frequencies)).toBeGreaterThan(
        SEVEN_ONE_FOUR.crossoverHz * 0.98,
      )
    })

    it('is that subwoofer alone: each one’s curve differs, and neither is the pair’s', () => {
      const pair = analysis.response.estimated.rows
      const gap = (a: readonly ResponseRow[], b: readonly ResponseRow[]) =>
        Math.max(
          ...a.map((row, i) => Math.abs(row.estimated - b[i]!.estimated)),
        )
      expect(gap(sub1.estimated.rows, sub2.estimated.rows)).toBeGreaterThan(3)
      expect(gap(sub1.estimated.rows, pair)).toBeGreaterThan(3)
    })

    it('is the one subwoofer of a one-subwoofer room heard through the low-pass', () => {
      const oneSub = withLayout(DEFAULT_CONFIG, {
        dolbyLayout: '5.1',
        subwoofers: 1,
      })
      const oneAnalysis = analyzeRoom(oneSub)
      const alone = channelResponse(oneSub, oneAnalysis, 'Sub1')!
      // Well below the crossover the combined response is the subwoofer,
      // within 0.5 dB of the speakers' high-pass leaking in.
      const combined = oneAnalysis.response.estimated.rows
      const gaps = alone.estimated.rows.flatMap((row, i) =>
        row.frequency <= 32 ? [row.estimated - combined[i]!.estimated] : [],
      )
      expect(gaps.length).toBeGreaterThan(3)
      for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!, 0)
      expect(alone.estimated.reliableFrom).toBe(
        oneAnalysis.response.estimated.reliableFrom,
      )
    })

    it('is calibrated 0 dB from the target on average', () => {
      expect(meanDeviation(sub1.estimated.rows)).toBeCloseTo(0, 6)
    })
  })

  it('reflects an overhead on the center line off both side walls', () => {
    expect(
      overheadReflectingSurfaces(
        { length: 6, width: 4, height: 2.6 },
        { x: 0, y: 2, z: 2.6 },
      ),
    ).toEqual(['front wall', 'left wall', 'right wall'])
  })
})
