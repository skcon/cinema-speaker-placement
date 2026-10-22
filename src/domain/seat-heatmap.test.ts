import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { SEAT_SCORE } from './reference'
import { seatHeatmap } from './seat-heatmap'
import {
  recommendSeat,
  type ScoredSeat,
  type SeatRecommendation,
} from './seat-score'

/** A scored seat at (x, y) with only the score that matters here. */
function seat(x: number, y: number, score: number): ScoredSeat {
  return {
    position: { x, y, z: 1.2 },
    score,
    responseDeviationDb: 0,
    placementFit: 1,
    distances: {
      speakers: [],
      subwoofers: [],
      leftRightSpread: 0,
      behindFrontStage: y,
      fromWall: 1,
      shortfall: 0,
    },
  }
}

/**
 * A recommendation of `candidates`: by default the first one is
 * recommended and is the MLP.
 */
function recommendation(
  candidates: readonly ScoredSeat[],
  {
    recommended = candidates[0]!,
    current = recommended,
  }: { recommended?: ScoredSeat; current?: ScoredSeat } = {},
): SeatRecommendation {
  return {
    recommended,
    offCenterLine: undefined,
    current,
    mlpIsRecommended: recommended === current,
    mlpKeepsSeatingDistances: true,
    mlpWithinMeaningfulDifference: recommended === current,
    candidates,
  }
}

/** The cell's relative score whose center is nearest (x, y). */
function relativeScoreAt(
  { cells }: ReturnType<typeof seatHeatmap>,
  x: number,
  y: number,
) {
  return cells.find(
    (c) => Math.abs(c.center.x - x) < 0.13 && Math.abs(c.center.y - y) < 0.26,
  )?.relativeScore
}

describe('seat-score heatmap', () => {
  // A 3 x 2 grid, 0.5 m apart across and 1 m apart down the room.
  const grid = [
    seat(0, 1, 0.8),
    seat(0, 2, 0.6),
    seat(-0.5, 1, 0.4),
    seat(-0.5, 2, 0.2),
    seat(0.5, 1, 0.7),
    seat(0.5, 2, 0.5),
  ]

  it('gives each candidate a cell reaching halfway to its neighbours, and no further than the outermost candidates', () => {
    const { cells } = seatHeatmap(recommendation(grid))

    const center = cells.find((c) => c.center.x === 0 && c.center.y === 1.25)
    expect(center).toMatchObject({ width: 0.5, depth: 0.5 })
    // The corner cell covers x -0.5 to -0.25 and y 1.5 to 2.
    expect(cells).toContainEqual(
      expect.objectContaining({
        center: { x: -0.375, y: 1.75 },
        width: 0.25,
        depth: 0.5,
      }),
    )
    expect(cells).toHaveLength(6)
  })

  it('spreads scores at least a meaningful difference apart over the whole scale: 0 the lowest, 1 the highest', () => {
    const heatmap = seatHeatmap(recommendation(grid))

    expect(relativeScoreAt(heatmap, -0.5, 2)).toBe(0)
    expect(relativeScoreAt(heatmap, 0, 1)).toBe(1)
    expect(relativeScoreAt(heatmap, 0.5, 2)).toBeCloseTo(0.5)
    expect(heatmap.scoresAboutTheSame).toBe(false)
  })

  it('uses the whole scale from a spread of exactly the meaningful difference', () => {
    const heatmap = seatHeatmap(
      recommendation([
        seat(0, 1, 0.5 + SEAT_SCORE.meaningfulDifference),
        seat(0, 2, 0.5),
      ]),
    )

    expect(heatmap.cells.map((c) => c.relativeScore)).toEqual([1, 0])
    expect(heatmap.scoresAboutTheSame).toBe(false)
  })

  it('compresses a smaller spread around the middle of the scale, and says the seats score about the same', () => {
    // Half the meaningful difference apart: half the scale, centered.
    const spread = SEAT_SCORE.meaningfulDifference / 2
    const heatmap = seatHeatmap(
      recommendation([seat(0, 1, 0.5 + spread), seat(0, 2, 0.5)]),
    )

    const [high, low] = heatmap.cells.map((c) => c.relativeScore)
    expect(high).toBeCloseTo(0.75)
    expect(low).toBeCloseTo(0.25)
    expect(heatmap.scoresAboutTheSame).toBe(true)
  })

  it('shows a grid of equal scores in the middle of the scale', () => {
    const heatmap = seatHeatmap(
      recommendation([seat(0, 1, 0.5), seat(0, 2, 0.5)]),
    )

    expect(heatmap.cells.map((c) => c.relativeScore)).toEqual([0.5, 0.5])
    expect(heatmap.scoresAboutTheSame).toBe(true)
  })

  it('marks the recommended seat, not a second pick of its own', () => {
    // The MLP stays recommended though another seat scores a little higher.
    const mlp = seat(0, 2, 0.6)
    const heatmap = seatHeatmap(
      recommendation([seat(0, 1, 0.61), mlp], { recommended: mlp }),
    )

    expect(heatmap.recommended).toEqual({ x: 0, y: 2, z: 1.2 })
    expect(heatmap.mlpIsRecommended).toBe(true)
  })

  it('says when a seat other than the MLP is recommended', () => {
    const heatmap = seatHeatmap(
      recommendation(grid, { recommended: grid[0], current: grid[1] }),
    )

    expect(heatmap.recommended).toEqual({ x: 0, y: 1, z: 1.2 })
    expect(heatmap.mlpIsRecommended).toBe(false)
  })

  it('agrees with recommendSeat in the default room', () => {
    const recommended = recommendSeat(DEFAULT_CONFIG)
    const heatmap = seatHeatmap(recommended)

    expect(heatmap.recommended).toEqual(recommended.recommended.position)
    expect(heatmap.mlpIsRecommended).toBe(recommended.mlpIsRecommended)
  })

  it('is empty without candidates', () => {
    const mlp = seat(0, 2, 0.5)

    expect(
      seatHeatmap({
        recommended: mlp,
        offCenterLine: undefined,
        current: mlp,
        mlpIsRecommended: true,
        mlpKeepsSeatingDistances: true,
        mlpWithinMeaningfulDifference: true,
        candidates: [],
      }),
    ).toMatchObject({ cells: [], scoresAboutTheSame: true })
  })

  it('covers only the default room’s seats that keep the seating distances, leaving the rest blank (#119)', () => {
    // The 15 x 15 grid inside the 0.3 m wall clearance is 0.279 m apart
    // across and 0.386 m down the room. The seats kept are at least 0.5 m
    // from the side and back walls (the outermost columns and the back row
    // go) and 1.5 m behind the 0.5 m front-stage line (from the sixth row,
    // 2.23 m back). Six seats of the last row kept go too: the surrounds
    // installed for them stand on the back wall, within 0.5 m.
    const { room } = DEFAULT_CONFIG
    const recommendation = recommendSeat(DEFAULT_CONFIG)
    const { cells } = seatHeatmap(recommendation)
    const across = (room.width - 0.6) / 14
    const down = (room.length - 0.6) / 14
    const halfWidth = room.width / 2 - 0.3 - across
    const front = 0.3 + 5 * down
    const back = room.length - 0.3 - down

    expect(cells).toHaveLength(13 * 9 - 6)
    expect(cells).toHaveLength(recommendation.candidates.length)
    const area = cells.reduce((sum, c) => sum + c.width * c.depth, 0)
    expect(area).toBeLessThan(2 * halfWidth * (back - front))
    for (const { center, width, depth } of cells) {
      expect(Math.abs(center.x) + width / 2).toBeLessThanOrEqual(
        halfWidth + 1e-9,
      )
      expect(center.y - depth / 2).toBeGreaterThanOrEqual(front - 1e-9)
      expect(center.y + depth / 2).toBeLessThanOrEqual(back + 1e-9)
    }
  })
})
