import { formatLength, type SeatHeatmap, type UnitSystem } from '@/domain'

/**
 * The seat-score heatmap's color scale, lowest score first: cividis
 * (Nuñez, Anderton and Renslow, 2018), sampled at five even stops. It is
 * perceptually ordered and gets lighter all the way up, so it reads in
 * order with any color vision and in grayscale, and it uses no green or
 * red, which the placement-range grades already mean.
 */
export const HEATMAP_STOPS = [
  '#00224e',
  '#35456c',
  '#666970',
  '#a59c74',
  '#fee838',
] as const

/**
 * How opaque the heatmap cells are: enough to read the colors, faint
 * enough to keep the floor grid and seat row visible through them.
 */
export const HEATMAP_OPACITY = 0.6

/** The color of a heatmap level (0 the lowest score, 1 the highest), as #rrggbb. */
export function heatmapColor(level: number): string {
  const clamped = Math.min(1, Math.max(0, level))
  const position = clamped * (HEATMAP_STOPS.length - 1)
  const index = Math.min(Math.floor(position), HEATMAP_STOPS.length - 2)
  const low = channels(HEATMAP_STOPS[index]!)
  const high = channels(HEATMAP_STOPS[index + 1]!)
  const t = position - index
  return `#${low
    .map((value, i) =>
      Math.round(value + (high[i]! - value) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/** The scale as a left-to-right CSS gradient, for the legend. */
export function heatmapGradient(): string {
  return `linear-gradient(to right, ${HEATMAP_STOPS.join(', ')})`
}

function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

/** Within this distance of the center line (in meters), a seat is on it. */
const ON_CENTER_LINE = 0.01

/**
 * The heatmap for a screen reader: where the highest seat scores are.
 * Empty while there is no heatmap.
 */
export function describeHeatmap(
  heatmap: SeatHeatmap | null,
  units: UnitSystem,
): string {
  if (!heatmap?.best) return ''
  const { x, y } = heatmap.best
  const side =
    Math.abs(x) < ON_CENTER_LINE
      ? 'on the center line'
      : `${formatLength(Math.abs(x), units)} ${x < 0 ? 'left' : 'right'} ` +
        `of the center line`
  return (
    `Seat-score heatmap shown (a relative estimate): highest around ` +
    `${formatLength(y, units)} from the front wall, ${side}.`
  )
}
