/**
 * The seat-score heatmap (issue #16): the recommended seat's candidate
 * grid (recommendSeat) as cells on the floor plan, so good and bad
 * seating areas show. No second grid is scored here: the cells come from
 * the candidates the recommendation already has.
 */
import type { FloorPoint, RoomPoint } from './room'
import { SEAT_SCORE } from './reference'
import type { ScoredSeat } from './seat-score'

/** One candidate seat's area on the floor plan. */
export type HeatmapCell = {
  /** The middle of the cell (not always the candidate: edge cells are cut). */
  readonly center: FloorPoint
  /** Across the room (x), in meters. */
  readonly width: number
  /** Down the room (y), in meters. */
  readonly depth: number
  /** The candidate's seat score, 0 to 1. */
  readonly score: number
  /** The score levelled across the grid: 0 the lowest, 1 the highest. */
  readonly level: number
}

export type SeatHeatmap = {
  readonly cells: readonly HeatmapCell[]
  /** The best-scoring candidate (the first of equals), or null without any. */
  readonly best: RoomPoint | null
  /** The lowest and highest seat scores in the grid. */
  readonly lowest: number
  readonly highest: number
}

/**
 * The heatmap of a recommendation's candidates. Each cell reaches halfway
 * to the neighbouring candidates and no further than the outermost ones,
 * so the cells tile the candidate area exactly and the wall clearance
 * around it (where no seat is scored) stays blank. The scores are relative
 * (made with the calibration at the current MLP), so they are levelled
 * across this grid only; a grid of equal scores is all at the top level.
 */
export function seatHeatmap(candidates: readonly ScoredSeat[]): SeatHeatmap {
  if (candidates.length === 0) {
    return { cells: [], best: null, lowest: 0, highest: 0 }
  }
  const scores = candidates.map(({ score }) => score)
  const lowest = Math.min(...scores)
  const highest = Math.max(...scores)
  const range = highest - lowest
  const spanX = cellSpans(candidates.map(({ position }) => position.x))
  const spanY = cellSpans(candidates.map(({ position }) => position.y))
  const cells = candidates.map(({ position, score }): HeatmapCell => {
    const [left, right] = spanX.get(position.x)!
    const [front, back] = spanY.get(position.y)!
    return {
      center: { x: (left + right) / 2, y: (front + back) / 2 },
      width: right - left,
      depth: back - front,
      score,
      level: range > SCORE_EPSILON ? (score - lowest) / range : 1,
    }
  })
  const best = candidates.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best,
  )
  return { cells, best: best.position, lowest, highest }
}

/** Scores this close count as equal. */
const SCORE_EPSILON = 1e-9

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
      const low = i === 0 ? value : (sorted[i - 1] + value) / 2
      const high = i === sorted.length - 1 ? value : (value + sorted[i + 1]) / 2
      return [value, [low, high]]
    }),
  )
}
