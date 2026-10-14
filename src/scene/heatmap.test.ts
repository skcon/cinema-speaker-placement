import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, recommendSeat, seatHeatmap } from '@/domain'
import {
  describeHeatmap,
  HEATMAP_STOPS,
  heatmapColor,
  heatmapGradient,
} from '@/scene/heatmap'

/** Relative luminance of a #rrggbb color (WCAG 2.x). */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
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

  it('blends between stops, and keeps levels outside 0 to 1 at the ends', () => {
    // Halfway between #00224e and #35456c.
    expect(heatmapColor(0.125)).toBe('#1b345d')
    expect(heatmapColor(-1)).toBe('#00224e')
    expect(heatmapColor(2)).toBe('#fee838')
  })

  it('gets lighter with every step up, so it reads in order without color vision', () => {
    const levels = Array.from({ length: 21 }, (_, i) => i / 20)
    const lightness = levels.map((level) => luminance(heatmapColor(level)))

    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i]).toBeGreaterThan(lightness[i - 1])
    }
  })

  it('draws the legend as a CSS gradient through every stop', () => {
    expect(heatmapGradient()).toBe(
      `linear-gradient(to right, ${HEATMAP_STOPS.join(', ')})`,
    )
  })
})

describe('heatmap description for screen readers', () => {
  const heatmap = seatHeatmap(recommendSeat(DEFAULT_CONFIG).candidates)

  it('says where the highest seat scores are, and that they are a relative estimate', () => {
    expect(describeHeatmap(heatmap, 'metric')).toMatch(
      /^Seat-score heatmap shown \(a relative estimate\): highest around \d\.\d+ m from the front wall, (on|[\d.]+ m (left|right) of) the center line\.$/,
    )
  })

  it('names the side of the center line, or says the best seat is on it', () => {
    expect(
      describeHeatmap({ ...heatmap, best: { x: 0, y: 2, z: 1.2 } }, 'metric'),
    ).toMatch(/highest around 2 m from the front wall, on the center line\./)
    const off = { ...heatmap, best: { x: -0.5, y: 2, z: 1.2 } }

    expect(describeHeatmap(off, 'metric')).toMatch(
      /highest around 2 m from the front wall, 0\.5 m left of the center line\./,
    )
    expect(
      describeHeatmap({ ...off, best: { x: 0.5, y: 2, z: 1.2 } }, 'metric'),
    ).toMatch(/0\.5 m right of the center line\./)
  })

  it('says nothing while there is no heatmap yet', () => {
    expect(describeHeatmap(null, 'metric')).toBe('')
  })
})
