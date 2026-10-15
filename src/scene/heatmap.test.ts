import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  recommendSeat,
  seatHeatmap,
  type SeatHeatmap,
} from '@/domain'
import {
  describeHeatmap,
  HEATMAP_STOPS,
  heatmapGradient,
} from '@/scene/heatmap'
import { heatmapColor } from '@/scene/heatmap-color'

/** Relative luminance of a #rrggbb color (WCAG 2.x). */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

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

  it('says where the recommended seat is, and that the scores are a relative estimate', () => {
    expect(describeHeatmap(recommending(0, 2), 'metric')).toBe(
      'Seat-score heatmap shown (a relative estimate): highest around 2 m ' +
        'from the front wall, on the center line (the recommended seat).',
    )
  })

  it('names the side of the center line the recommended seat is on', () => {
    expect(describeHeatmap(recommending(-0.5, 2), 'metric')).toMatch(
      /highest around 2 m from the front wall, 0\.5 m left of the center line \(the recommended seat\)\.$/,
    )
    expect(describeHeatmap(recommending(0.5, 2), 'metric')).toMatch(
      /0\.5 m right of the center line \(the recommended seat\)\.$/,
    )
  })

  it('says so when no seat scores meaningfully better than the MLP', () => {
    const atMlp = { ...recommending(0, 2), mlpIsRecommended: true }

    expect(describeHeatmap(atMlp, 'metric')).toBe(
      'Seat-score heatmap shown (a relative estimate): no seat scores ' +
        'meaningfully better than the MLP, so it stays the recommended seat.',
    )
  })

  it('says when the seats score about the same', () => {
    const even = { ...recommending(0, 2), scoresAboutTheSame: true }

    expect(describeHeatmap(even, 'metric')).toMatch(
      /\(the recommended seat\)\. Seats score about the same\.$/,
    )
  })

  it('says nothing while there is no heatmap yet', () => {
    expect(describeHeatmap(null, 'metric')).toBe('')
  })
})
