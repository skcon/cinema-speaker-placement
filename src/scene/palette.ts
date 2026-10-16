import { Color, LinearSRGBColorSpace } from 'three'

/**
 * The ring around the recommended seat in the room view and its legend:
 * a color no grade uses.
 */
export const RECOMMENDED_SEAT_COLOR = '#7c3aed'

/** The Screen in the room view and its legend: a color no grade or item uses. */
export const SCREEN_COLOR = '#0891b2'

/** The "38% rule" reference line in the room view and its legend. */
export const RULE_OF_THUMB_COLOR = '#a3a3a3'

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
  screen: SCREEN_COLOR,
  ruleOfThumb: RULE_OF_THUMB_COLOR,
  recommended: RECOMMENDED_SEAT_COLOR,
  /** The Selected item's ring and Dimension lines. */
  selection: '#0f766e',
} as const

/**
 * Text colors for the labels drawn over the scene. Fixed, not theme tokens,
 * because the scene stays light in dark mode. Each meets WCAG AA (4.5:1) on
 * `SCENE_COLORS.floor` and `SCENE_COLORS.background`, and on
 * `LABEL_BACKDROP` laid over any heatmap cell on the floor (the darkest
 * stop is the worst case). Contrast over other markers is not checked.
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
  /** The Selected item's distances, the color of its Dimension lines. */
  selection: '#0f766e',
} as const

export type LabelTone = keyof typeof LABEL_COLORS

/**
 * The light backdrop behind every scene label, so a label stays readable
 * where it sits on a dark heatmap cell.
 */
export const LABEL_BACKDROP = { color: '#ffffff', opacity: 0.85 } as const

/** `LABEL_BACKDROP` as a CSS color. */
export const LABEL_BACKDROP_CSS = `color-mix(in srgb, ${LABEL_BACKDROP.color} ${LABEL_BACKDROP.opacity * 100}%, transparent)`

/**
 * A color laid over another at an opacity (0 to 1), as #rrggbb. It blends
 * in sRGB, as CSS and the flat scene do.
 */
export function blend(top: string, opacity: number, under: string): string {
  const color = new Color().lerpColors(
    new Color().setStyle(under, LinearSRGBColorSpace),
    new Color().setStyle(top, LinearSRGBColorSpace),
    opacity,
  )
  return `#${color.getHexString(LinearSRGBColorSpace)}`
}

/** WCAG 2 contrast ratio between two CSS colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** WCAG relative luminance of a CSS color. */
export function luminance(css: string): number {
  const { r, g, b } = new Color(css).getRGB(
    { r: 0, g: 0, b: 0 },
    LinearSRGBColorSpace,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
