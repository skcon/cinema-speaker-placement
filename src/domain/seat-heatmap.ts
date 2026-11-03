/**
 * The seat-score heatmap (issue #16): the recommended seat's candidate
 * grid (recommendSeat) as cells on the floor plan, so good and bad
 * seating areas show. Nothing is scored or picked twice here: the cells
 * come from the candidates the recommendation already has, and its top
 * seat is the recommended seat, so the heatmap and the ring agree (#34).
 *
 * The grid's seats that break the seating distances get cells of their
 * own, unscored, so the view can say why they are blank (#155).
 */
import type { FloorPoint, RoomPoint } from './room'
import { SEAT_SCORE } from './reference'
import {
  weakerSeatScorePart,
  type SeatRecommendation,
  type WeakerSeatScorePart,
} from './seat-score'

/** One grid seat's area on the floor plan. */
type HeatmapArea = {
  /** The grid seat the cell is around, at ear height. */
  readonly seat: RoomPoint
  /** The middle of the cell (not always the seat: edge cells are cut). */
  readonly center: FloorPoint
  /** Across the room (x), in meters. */
  readonly width: number
  /** Down the room (y), in meters. */
  readonly depth: number
}

/** One candidate seat's area on the floor plan, with its score. */
export type HeatmapCell = HeatmapArea & {
  readonly kind: 'scored'
  /** The candidate's seat score, 0 (worst) to 1 (best). */
  readonly score: number
  /** The part of the seat score that pulls the seat down most. */
  readonly weaker: WeakerSeatScorePart
  /**
   * The candidate's seat score on the heatmap's scale, 0 to 1: the lowest
   * in the grid at 0 and the highest at 1, or nearer the middle when the
   * grid's scores are less than a meaningful difference apart.
   */
  readonly relativeScore: number
}

/**
 * A grid seat left blank because it breaks the seating distances: too
 * close to a speaker, a subwoofer, a wall or the front stage. Unscored.
 */
export type TooCloseCell = HeatmapArea & { readonly kind: 'tooClose' }

export type SeatHeatmap = {
  readonly cells: readonly HeatmapCell[]
  /** The grid's seats that break the seating distances, unscored. */
  readonly tooClose: readonly TooCloseCell[]
  /**
   * The lowest and highest seat score of the cells (0 to 1), or null
   * without cells. The colors are relative; these are the scores.
   */
  readonly scoreRange: {
    readonly lowest: number
    readonly highest: number
  } | null
  /** The recommended seat (recommendSeat's), the one the view rings. */
  readonly recommended: RoomPoint
  /** Whether the MLP stays the recommended seat: no seat beats it meaningfully. */
  readonly mlpIsRecommended: boolean
  /**
   * Whether the grid's scores are less than SEAT_SCORE's meaningful
   * difference apart: within the model's precision, the seats score
   * about the same.
   */
  readonly scoresAboutTheSame: boolean
}

/**
 * The heatmap of a recommendation's candidates, and of the grid seats
 * left out as too close. Each cell reaches halfway to the neighbouring
 * grid seats and no further than the outermost ones, so the cells tile
 * the grid exactly and the wall clearance around it (where no seat is
 * scored) stays blank.
 *
 * The scores are relative (made with the calibration at the current MLP),
 * so they are spread across this grid only, over at least SEAT_SCORE's
 * meaningful difference: a grid that far apart or more uses the whole
 * scale, and a closer one sits around its middle, so differences within
 * the model's precision don't show as strong contrast.
 */
export function seatHeatmap({
  candidates,
  tooClose,
  recommended,
  mlpIsRecommended,
}: SeatRecommendation): SeatHeatmap {
  const scores = candidates.map(({ score }) => score)
  const lowest = Math.min(...scores)
  const highest = Math.max(...scores)
  const spread = candidates.length > 0 ? highest - lowest : 0
  const scale = Math.max(spread, SEAT_SCORE.meaningfulDifference)
  // Where the lowest score sits: 0, or above it to center a narrow spread.
  const bottom = (1 - spread / scale) / 2
  const grid = [...candidates.map(({ position }) => position), ...tooClose]
  const spanX = cellSpans(grid.map(({ x }) => x))
  const spanY = cellSpans(grid.map(({ y }) => y))
  const areaOf = (seat: RoomPoint): HeatmapArea => {
    const [left, right] = spanX.get(seat.x)!
    const [front, back] = spanY.get(seat.y)!
    return {
      seat,
      center: { x: (left + right) / 2, y: (front + back) / 2 },
      width: right - left,
      depth: back - front,
    }
  }
  const cells = candidates.map((candidate): HeatmapCell => ({
    kind: 'scored',
    ...areaOf(candidate.position),
    score: candidate.score,
    weaker: weakerSeatScorePart(candidate),
    relativeScore: bottom + (candidate.score - lowest) / scale,
  }))
  return {
    cells,
    tooClose: tooClose.map((seat): TooCloseCell => ({
      kind: 'tooClose',
      ...areaOf(seat),
    })),
    scoreRange: candidates.length > 0 ? { lowest, highest } : null,
    recommended: recommended.position,
    mlpIsRecommended,
    scoresAboutTheSame: spread < SEAT_SCORE.meaningfulDifference,
  }
}

/**
 * The heatmap cell under a floor point, scored or too close, or null
 * outside the grid. On a shared edge, the first cell found wins.
 */
export function heatmapCellAt(
  { cells, tooClose }: SeatHeatmap,
  { x, y }: FloorPoint,
): HeatmapCell | TooCloseCell | null {
  return (
    [...cells, ...tooClose].find(
      ({ center, width, depth }) =>
        Math.abs(x - center.x) <= width / 2 &&
        Math.abs(y - center.y) <= depth / 2,
    ) ?? null
  )
}

/**
 * For each distinct grid coordinate, the span its cells cover: halfway to
 * the neighbouring coordinates, cut at the outermost ones. A single
 * coordinate (a room too small for two) gets one grid spacing around it.
 */
function cellSpans(
  coordinates: readonly number[],
): Map<number, readonly [low: number, high: number]> {
  const sorted = [...new Set(coordinates)].toSorted((a, b) => a - b)
  const half = SEAT_SCORE.gridSpacing / 2
  return new Map(
    sorted.map((value, i) => {
      if (sorted.length === 1) return [value, [value - half, value + half]]
      const low = i === 0 ? value : (sorted[i - 1]! + value) / 2
      const high =
        i === sorted.length - 1 ? value : (value + sorted[i + 1]!) / 2
      return [value, [low, high]]
    }),
  )
}
