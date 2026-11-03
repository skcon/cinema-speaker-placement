import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  recommendSeat,
  seatHeatmap,
  type HeatmapCell,
  type SeatHeatmap,
  type TooCloseCell,
} from '@/domain'
import {
  describeHeatmap,
  hatchSegments,
  HEATMAP_STOPS,
  heatmapCellReadout,
  heatmapGradient,
  heatmapScoreRange,
  TOO_CLOSE_LABEL,
} from '@/scene/heatmap'
import { heatmapColor } from '@/scene/heatmap-color'
import { luminance } from '@/scene/palette'

describe('heatmap color scale', () => {
  it('runs from dark blue at the lowest score to yellow at the highest (cividis)', () => {
    expect(heatmapColor(0)).toBe('#00224e')
    expect(heatmapColor(1)).toBe('#fee838')
    expect(heatmapColor(0.5)).toBe('#666970')
  })

  it('blends between stops as the legend gradient does, and keeps relative scores outside 0 to 1 at the ends', () => {
    // Halfway between #00224e and #35456c.
    expect(heatmapColor(0.125)).toBe('#1b345d')
    expect(heatmapColor(-1)).toBe('#00224e')
    expect(heatmapColor(2)).toBe('#fee838')
  })

  it('gets lighter with every step up, so it reads in order without color vision', () => {
    const relativeScores = Array.from({ length: 21 }, (_, i) => i / 20)
    const lightness = relativeScores.map((relativeScore) =>
      luminance(heatmapColor(relativeScore)),
    )

    expect(lightness).toEqual(lightness.toSorted((a, b) => a - b))
    expect(new Set(lightness).size).toBe(lightness.length)
  })

  it('draws the legend as a CSS gradient through every stop', () => {
    expect(heatmapGradient()).toBe(
      `linear-gradient(to right, ${HEATMAP_STOPS.join(', ')})`,
    )
  })
})

describe('heatmap description for screen readers', () => {
  const heatmap = seatHeatmap(recommendSeat(DEFAULT_CONFIG))
  /** The default room's heatmap with another seat recommended at (x, y). */
  const recommending = (x: number, y: number): SeatHeatmap => ({
    ...heatmap,
    recommended: { x, y, z: 1.2 },
    mlpIsRecommended: false,
    scoresAboutTheSame: false,
  })

  /** A heatmap with only the parts the description reads. */
  const plain = (overrides: Partial<SeatHeatmap>): SeatHeatmap => ({
    ...recommending(0, 2),
    scoreRange: { lowest: 0.62, highest: 0.914 },
    tooClose: [],
    ...overrides,
  })

  it('says where the recommended seat is, the range of seat scores, and that the colors are a relative estimate', () => {
    expect(describeHeatmap(plain({}), 'metric')).toBe(
      'Seat-score heatmap shown (a relative estimate): highest around 2 m ' +
        'from the front wall, on the center line (the recommended seat). ' +
        'Seat scores run from 62 to 91 of 100.',
    )
  })

  it('says why seats are left blank, when some are too close', () => {
    expect(describeHeatmap(recommending(0, 2), 'metric')).toMatch(
      /of 100\. Seats left blank are too close to a speaker, a wall or the front stage\.$/,
    )
  })

  it('names the side of the center line the recommended seat is on', () => {
    expect(describeHeatmap(recommending(-0.5, 2), 'metric')).toMatch(
      /highest around 2 m from the front wall, 0\.5 m left of the center line \(the recommended seat\)\./,
    )
    expect(describeHeatmap(recommending(0.5, 2), 'metric')).toMatch(
      /0\.5 m right of the center line \(the recommended seat\)\./,
    )
  })

  it('says so when no seat scores meaningfully better than the MLP', () => {
    const atMlp = { ...recommending(0, 2), mlpIsRecommended: true }

    expect(describeHeatmap(atMlp, 'metric')).toMatch(
      /^Seat-score heatmap shown \(a relative estimate\): no seat scores meaningfully better than the MLP, so it stays the recommended seat\. Seat scores run/,
    )
  })

  it('says when the seats score about the same', () => {
    const even = plain({
      scoresAboutTheSame: true,
      scoreRange: { lowest: 0.6, highest: 0.61 },
    })

    expect(describeHeatmap(even, 'metric')).toMatch(
      /\(the recommended seat\)\. Seat scores run from 60 to 61 of 100\. Seats score about the same\.$/,
    )
  })

  it('says nothing while there is no heatmap yet', () => {
    expect(describeHeatmap(null, 'metric')).toBe('')
  })
})

describe('heatmap score range for the legend (#155)', () => {
  it('gives the shown cells’ lowest and highest seat score out of 100, rounded', () => {
    expect(
      heatmapScoreRange({ scoreRange: { lowest: 0.624, highest: 0.906 } }),
    ).toEqual({ lowest: 62, highest: 91 })
  })

  it('gives none without cells', () => {
    expect(heatmapScoreRange({ scoreRange: null })).toBeNull()
  })
})

describe('heatmap cell readout (#155)', () => {
  const room = { length: 6, width: 4.5, height: 2.6 }
  const area = { center: { x: 0, y: 0 }, width: 0.25, depth: 0.25 }
  const scored = (
    x: number,
    y: number,
    overrides: Partial<HeatmapCell> = {},
  ): HeatmapCell => ({
    kind: 'scored',
    ...area,
    seat: { x, y, z: 1.2 },
    score: 0.784,
    weaker: 'bass',
    relativeScore: 0.5,
    ...overrides,
  })

  it('gives the seat score, the distances from the front wall and the nearer side wall, and that bass pulls it down most', () => {
    expect(heatmapCellReadout(scored(-1, 2.1), room, 'metric')).toBe(
      'Seat score 78 of 100 here, 2.1 m from the front wall and 1.25 m ' +
        'from the left wall. Bass smoothness pulls it down most.',
    )
  })

  it('names the right wall, or either one on the center line, in the user’s units', () => {
    expect(heatmapCellReadout(scored(1, 2.1), room, 'metric')).toMatch(
      /1\.25 m from the right wall\./,
    )
    expect(heatmapCellReadout(scored(0, 2.1), room, 'imperial')).toMatch(
      /^Seat score 78 of 100 here, 6 ft 10.7 in from the front wall and 7 ft 4.6 in from either side wall\./,
    )
  })

  it('says when placement pulls it down most, or nothing does', () => {
    expect(
      heatmapCellReadout(scored(0, 2, { weaker: 'placement' }), room, 'metric'),
    ).toMatch(/Placement fit pulls it down most\.$/)
    expect(
      heatmapCellReadout(scored(0, 2, { weaker: 'neither' }), room, 'metric'),
    ).toMatch(/Neither bass nor placement pulls it down\.$/)
  })

  it('says why a blank seat has no score', () => {
    const tooClose: TooCloseCell = {
      kind: 'tooClose',
      ...area,
      seat: { x: -2, y: 0.3, z: 1.2 },
    }

    expect(heatmapCellReadout(tooClose, room, 'metric')).toBe(
      'No seat score here, 0.3 m from the front wall and 0.25 m from the ' +
        'left wall: too close to a speaker, a wall or the front stage.',
    )
    expect(TOO_CLOSE_LABEL).toBe(
      'Too close to a speaker, a wall or the front stage',
    )
  })
})

describe('too-close hatch (#155)', () => {
  const cell = (x: number, y: number, size: number): TooCloseCell => ({
    kind: 'tooClose',
    seat: { x, y, z: 1.2 },
    center: { x, y },
    width: size,
    depth: size,
  })

  it('draws diagonal lines (x + y a whole number of spacings) clipped to each cell', () => {
    // A 1 m cell from (0, 0) to (1, 1), lines 0.5 m apart: x + y = 0.5,
    // 1 and 1.5 (x + y = 0 and 2 only touch its corners).
    expect(hatchSegments([cell(0.5, 0.5, 1)], 0.5)).toEqual([
      [
        { x: 0, y: 0.5 },
        { x: 0.5, y: 0 },
      ],
      [
        { x: 0, y: 1 },
        { x: 1, y: 0 },
      ],
      [
        { x: 0.5, y: 1 },
        { x: 1, y: 0.5 },
      ],
    ])
  })

  it('lines up across neighbouring cells, so the hatch reads as one area', () => {
    const [left, right] = [cell(0.5, 0.5, 1), cell(1.5, 0.5, 1)]
    const segments = hatchSegments([left, right], 0.5)
    // The line x + y = 1.5 leaves the left cell at (1, 0.5) and enters the
    // right one there.
    expect(segments).toContainEqual([
      { x: 0.5, y: 1 },
      { x: 1, y: 0.5 },
    ])
    expect(segments).toContainEqual([
      { x: 1, y: 0.5 },
      { x: 1.5, y: 0 },
    ])
  })

  it('draws nothing without cells', () => {
    expect(hatchSegments([], 0.1)).toEqual([])
  })
})
