import {
  formatLength,
  type FloorPoint,
  type HeatmapCell,
  type Room,
  type RoomPoint,
  type SeatHeatmap,
  type TooCloseCell,
  type UnitSystem,
  type WeakerSeatScorePart,
} from '@/domain'

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

/**
 * The hatch over the seats left blank for breaking the seating distances:
 * its line color (neutral, so it means no score rather than a bad one;
 * at least 3:1 against the floor) and the spacing between its lines, in
 * meters on the floor.
 */
export const TOO_CLOSE_HATCH = {
  color: '#737373',
  spacing: 0.1,
} as const

/** The legend's name for the hatched seats. */
export const TOO_CLOSE_LABEL =
  'Too close to a speaker, a wall or the front stage'

/** The hatch as a CSS background, for the legend's swatch. */
export function tooCloseHatchPattern(): string {
  return (
    `repeating-linear-gradient(135deg, ${TOO_CLOSE_HATCH.color} 0 1px, ` +
    `transparent 1px 4px)`
  )
}

/** A seat score (0 to 1) as a whole number out of 100. */
function outOf100(score: number): number {
  return Math.round(score * 100)
}

/**
 * The lowest and highest seat score of the heatmap's cells, as whole
 * numbers out of 100, for the legend; null without cells (#155).
 */
export function heatmapScoreRange({
  scoreRange,
}: Pick<SeatHeatmap, 'scoreRange'>): {
  lowest: number
  highest: number
} | null {
  return (
    scoreRange && {
      lowest: outOf100(scoreRange.lowest),
      highest: outOf100(scoreRange.highest),
    }
  )
}

/** What the readout says pulls a seat down most. */
const WEAKER_PART_TEXT = {
  bass: 'Bass smoothness pulls it down most.',
  placement: 'Placement fit pulls it down most.',
  neither: 'Neither bass nor placement pulls it down.',
} as const satisfies Record<WeakerSeatScorePart, string>

/**
 * What a hovered or tapped heatmap cell says (#155): its seat score, where
 * its seat is from the front wall and the nearer side wall, and which part
 * of the seat score pulls it down most; or, for a seat left blank, why.
 */
export function heatmapCellReadout(
  cell: HeatmapCell | TooCloseCell,
  room: Room,
  units: UnitSystem,
): string {
  const where =
    `${formatLength(cell.seat.y, units)} from the front wall and ` +
    fromSideWall(cell.seat, room, units)
  return cell.kind === 'scored'
    ? `Seat score ${outOf100(cell.score)} of 100 here, ${where}. ` +
        WEAKER_PART_TEXT[cell.weaker]
    : `No seat score here, ${where}: ${TOO_CLOSE_LABEL.toLowerCase()}.`
}

/** How far a seat is from the nearer side wall, naming it. */
function fromSideWall({ x }: RoomPoint, { width }: Room, units: UnitSystem) {
  const distance = formatLength(width / 2 - Math.abs(x), units)
  if (Math.abs(x) < ON_CENTER_LINE) return `${distance} from either side wall`
  return `${distance} from the ${x < 0 ? 'left' : 'right'} wall`
}

/** Rounding error allowed when stepping the hatch (a float's noise). */
const HATCH_EPSILON = 1e-9

/**
 * The hatch over the too-close cells, as floor line segments: the lines
 * where x + y is a whole number of `spacing`s, clipped to each cell, so
 * the lines of neighbouring cells meet and the hatch reads as one area.
 * Lines that only touch a cell's corner are left out.
 */
export function hatchSegments(
  cells: readonly TooCloseCell[],
  spacing: number,
): [FloorPoint, FloorPoint][] {
  return cells.flatMap(({ center, width, depth }) => {
    const [left, right] = [center.x - width / 2, center.x + width / 2]
    const [front, back] = [center.y - depth / 2, center.y + depth / 2]
    const first = Math.ceil((left + front) / spacing - HATCH_EPSILON)
    const last = Math.floor((right + back) / spacing + HATCH_EPSILON)
    const segments: [FloorPoint, FloorPoint][] = []
    for (let k = first; k <= last; k++) {
      const sum = k * spacing
      const from = Math.max(left, sum - back)
      const to = Math.min(right, sum - front)
      if (to - from > HATCH_EPSILON) {
        segments.push([
          { x: from, y: sum - from },
          { x: to, y: sum - to },
        ])
      }
    }
    return segments
  })
}

/** Within this distance of the center line (in meters), a seat is on it. */
const ON_CENTER_LINE = 0.01

/**
 * The heatmap for a screen reader: where the recommended seat is (the
 * ringed one), or that the MLP stays it, the range of the seat scores,
 * whether the seats score about the same, and why seats are left blank
 * when some are too close. Empty while there is no heatmap.
 */
export function describeHeatmap(
  heatmap: SeatHeatmap | null,
  units: UnitSystem,
): string {
  if (!heatmap) return ''
  const shown = 'Seat-score heatmap shown (a relative estimate): '
  const recommendedClause = heatmap.mlpIsRecommended
    ? 'no seat scores meaningfully better than the MLP, so it stays the ' +
      'recommended seat.'
    : `highest around ${whereIs(heatmap.recommended, units)} ` +
      `(the recommended seat).`
  const range = heatmapScoreRange(heatmap)
  const rangeNote = range
    ? ` Seat scores run from ${range.lowest} to ${range.highest} of 100.`
    : ''
  const aboutTheSameNote = heatmap.scoresAboutTheSame
    ? ' Seats score about the same.'
    : ''
  const tooCloseNote =
    heatmap.tooClose.length > 0
      ? ` Seats left blank are ${TOO_CLOSE_LABEL.toLowerCase()}.`
      : ''
  return shown + recommendedClause + rangeNote + aboutTheSameNote + tooCloseNote
}

/** Where a seat is, from the front wall and the center line. */
function whereIs({ x, y }: RoomPoint, units: UnitSystem) {
  const side =
    Math.abs(x) < ON_CENTER_LINE
      ? 'on the center line'
      : `${formatLength(Math.abs(x), units)} ${x < 0 ? 'left' : 'right'} ` +
        `of the center line`
  return `${formatLength(y, units)} from the front wall, ${side}`
}
