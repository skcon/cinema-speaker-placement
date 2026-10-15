import { Color, LinearSRGBColorSpace } from 'three'
import { HEATMAP_STOPS } from '@/scene/heatmap'

/**
 * The heatmap's colors with Three.js, apart from heatmap.ts so the room
 * view's legend and description don't load Three.js before the lazy scene.
 *
 * The stops are read and written as they are, with no color-space
 * conversion (LinearSRGBColorSpace is Three.js's working space), so they
 * blend in sRGB as the legend's CSS gradient does.
 */
const STOP_COLORS = HEATMAP_STOPS.map((stop) =>
  new Color().setStyle(stop, LinearSRGBColorSpace),
)

/**
 * The color of a relative score (0 the lowest score, 1 the highest), as
 * #rrggbb, blended between the neighbouring stops.
 */
export function heatmapColor(relativeScore: number): string {
  const clamped = Math.min(1, Math.max(0, relativeScore))
  const position = clamped * (STOP_COLORS.length - 1)
  const index = Math.min(Math.floor(position), STOP_COLORS.length - 2)
  const color = new Color().lerpColors(
    STOP_COLORS[index]!,
    STOP_COLORS[index + 1]!,
    position - index,
  )
  return `#${color.getHexString(LinearSRGBColorSpace)}`
}
