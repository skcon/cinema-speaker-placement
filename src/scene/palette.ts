import { Color, LinearSRGBColorSpace } from 'three'
import { RECOMMENDED_SEAT_COLOR, RULE_OF_THUMB_COLOR } from '@/scene/speakers'

/**
 * The room view's palette: a light scene in both app themes (nothing themes
 * the canvas), neutral, with the MLP getting the one accent. `background`
 * fills the canvas around the room.
 */
export const SCENE_COLORS = {
  background: '#ffffff',
  floor: '#f5f5f5',
  grid: '#e5e5e5',
  walls: '#737373',
  frontWall: '#171717',
  mlp: '#2563eb',
  seatRow: '#dbeafe',
  ruleOfThumb: RULE_OF_THUMB_COLOR,
  recommended: RECOMMENDED_SEAT_COLOR,
} as const

/**
 * Text colors for the labels drawn over the scene. Fixed, not theme tokens,
 * because the scene stays light in dark mode; each meets WCAG AA (4.5:1) on
 * `SCENE_COLORS.floor` and `SCENE_COLORS.background`.
 */
export const LABEL_COLORS = {
  /** Names: speaker channels and angles, subwoofers. */
  text: '#171717',
  /** Secondary text: grades, "Front wall". */
  muted: '#525252',
  /** The MLP label, a darker shade of the MLP marker. */
  mlp: '#1d4ed8',
  /** The "Recommended" label, a darker shade of its ring. */
  recommended: '#6d28d9',
} as const

export type LabelTone = keyof typeof LABEL_COLORS

/** WCAG 2 contrast ratio between two CSS colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** WCAG relative luminance of a CSS color. */
function luminance(css: string): number {
  const { r, g, b } = new Color(css).getRGB(
    { r: 0, g: 0, b: 0 },
    LinearSRGBColorSpace,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
