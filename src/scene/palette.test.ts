import { describe, expect, it } from 'vitest'
import { HEATMAP_OPACITY, HEATMAP_STOPS } from '@/scene/heatmap'
import {
  blend,
  contrastRatio,
  LABEL_BACKDROP,
  LABEL_COLORS,
  SCENE_COLORS,
} from '@/scene/palette'

/** WCAG 2 AA for normal-size text; the labels are 12 px. */
const AA_TEXT = 4.5

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a color on itself, in either order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
    expect(contrastRatio('#f5f5f5', '#f5f5f5')).toBeCloseTo(1, 5)
  })

  it('matches a known WCAG value', () => {
    // #767676 on white is the classic just-passing grey: 4.54:1.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })
})

describe('blend', () => {
  it('lays a color over another at an opacity, in sRGB as CSS does', () => {
    expect(blend('#ffffff', 1, '#000000')).toBe('#ffffff')
    expect(blend('#ffffff', 0, '#000000')).toBe('#000000')
    // The darkest heatmap stop at 0.6 over the floor.
    expect(blend('#00224e', 0.6, '#f5f5f5')).toBe('#627691')
  })
})

describe('room view label colors', () => {
  // The scene is drawn light in both themes, so the labels are fixed
  // colors that must read on the floor and the canvas background around it.
  it.each(Object.entries(LABEL_COLORS))(
    '%s (%s) meets WCAG AA on the canvas floor and background',
    (_, color) => {
      expect(contrastRatio(color, SCENE_COLORS.floor)).toBeGreaterThanOrEqual(
        AA_TEXT,
      )
      expect(
        contrastRatio(color, SCENE_COLORS.background),
      ).toBeGreaterThanOrEqual(AA_TEXT)
    },
  )

  it.each(Object.entries(LABEL_COLORS))(
    '%s (%s) meets WCAG AA on its backdrop over the darkest heatmap cell',
    (_, color) => {
      // The lowest score's stop, drawn at the heatmap's opacity on the floor.
      const darkestCell = blend(
        HEATMAP_STOPS[0],
        HEATMAP_OPACITY,
        SCENE_COLORS.floor,
      )
      const backdrop = blend(
        LABEL_BACKDROP.color,
        LABEL_BACKDROP.opacity,
        darkestCell,
      )

      expect(contrastRatio(color, backdrop)).toBeGreaterThanOrEqual(AA_TEXT)
    },
  )

  it('are fixed hex colors, never theme tokens that flip in dark mode', () => {
    for (const color of Object.values(LABEL_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    }
    expect(SCENE_COLORS.background).toMatch(/^#[0-9a-f]{6}$/)
  })
})
