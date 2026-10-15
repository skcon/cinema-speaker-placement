import { formatLength, type SeatHeatmap, type UnitSystem } from '@/domain'

/**
 * The seat-score heatmap's color scale, lowest score first: cividis
 * (Nuñez, Anderton and Renslow, 2018), sampled at five even stops. It is
 * perceptually ordered and gets lighter all the way up, so it reads in
 * order with any color vision and in grayscale, and it uses no green or
 * red, which the placement-range grades already mean. The scene blends it
 * with heatmapColor (heatmap-color.ts).
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

/** The scale as a left-to-right CSS gradient, for the legend. */
export function heatmapGradient(): string {
  return `linear-gradient(to right, ${HEATMAP_STOPS.join(', ')})`
}

/** Within this distance of the center line (in meters), a seat is on it. */
const ON_CENTER_LINE = 0.01

/**
 * The heatmap for a screen reader: where the recommended seat is (the
 * ringed one), or that the MLP stays it, and whether the seats score
 * about the same. Empty while there is no heatmap.
 */
export function describeHeatmap(
  heatmap: SeatHeatmap | null,
  units: UnitSystem,
): string {
  if (!heatmap) return ''
  const shown = 'Seat-score heatmap shown (a relative estimate): '
  const best = heatmap.mlpIsRecommended
    ? 'no seat scores meaningfully better than the MLP, so it stays the ' +
      'recommended seat.'
    : `highest around ${whereIs(heatmap.recommended, units)} ` +
      `(the recommended seat).`
  const even = heatmap.scoresAboutTheSame ? ' Seats score about the same.' : ''
  return shown + best + even
}

/** Where a seat is, from the front wall and the center line. */
function whereIs({ x, y }: SeatHeatmap['recommended'], units: UnitSystem) {
  const side =
    Math.abs(x) < ON_CENTER_LINE
      ? 'on the center line'
      : `${formatLength(Math.abs(x), units)} ${x < 0 ? 'left' : 'right'} ` +
        `of the center line`
  return `${formatLength(y, units)} from the front wall, ${side}`
}
