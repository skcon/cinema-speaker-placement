import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { SEAT_SCORE } from './reference'
import type { RoomPoint } from './room'
import { heatmapCellAt, seatHeatmap } from './seat-heatmap'
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
    tooClose = [],
  }: {
    recommended?: ScoredSeat
    current?: ScoredSeat
    tooClose?: readonly RoomPoint[]
  } = {},
): SeatRecommendation {
  return {
    recommended,
    offCenterLine: undefined,
    current,
    mlpIsRecommended: recommended === current,
    mlpKeepsSeatingDistances: true,
    mlpWithinMeaningfulDifference: recommended === current,
    candidates,
    tooClose,
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
        tooClose: [],
      }),
    ).toMatchObject({
      cells: [],
      tooClose: [],
      scoreRange: null,
      scoresAboutTheSame: true,
    })
  })

  it('covers the default room’s seats that keep the seating distances, and marks the rest of the grid too close (#119, #155)', () => {
    // The 15 x 15 grid inside the 0.3 m wall clearance. The seats kept are
    // at least 0.5 m from the side and back walls (the outermost columns
    // and the back row go) and 1.5 m behind the 0.5 m front-stage line
    // (from the sixth row). Six seats of the last row kept go too: the
    // surrounds installed for them stand on the back wall, within 0.5 m.
    const { room } = DEFAULT_CONFIG
    const recommendation = recommendSeat(DEFAULT_CONFIG)
    const { cells, tooClose } = seatHeatmap(recommendation)
    const halfWidth = room.width / 2 - 0.3
    const front = 0.3
    const back = room.length - 0.3

    expect(cells).toHaveLength(13 * 9 - 6)
    expect(cells).toHaveLength(recommendation.candidates.length)
    expect(tooClose).toHaveLength(15 * 15 - cells.length)
    // Together they tile the grid area exactly, and the wall clearance
    // stays blank.
    const area = [...cells, ...tooClose].reduce(
      (sum, c) => sum + c.width * c.depth,
      0,
    )
    expect(area).toBeCloseTo(2 * halfWidth * (back - front), 9)
    for (const { center, width, depth } of [...cells, ...tooClose]) {
      expect(Math.abs(center.x) + width / 2).toBeLessThanOrEqual(
        halfWidth + 1e-9,
      )
      expect(center.y - depth / 2).toBeGreaterThanOrEqual(front - 1e-9)
      expect(center.y + depth / 2).toBeLessThanOrEqual(back + 1e-9)
    }
    // The front rows, within 1.5 m of the front stage, are too close.
    expect(tooClose.some(({ seat }) => seat.y === front)).toBe(true)
    expect(cells.every(({ seat }) => seat.y > 2)).toBe(true)
  })
})

describe('seat-score heatmap numbers (#155)', () => {
  const grid = [
    seat(0, 1, 0.8),
    seat(0, 2, 0.6),
    seat(0.5, 1, 0.7),
    seat(0.5, 2, 0.5),
  ]

  it('gives the range of the shown seats’ scores, on the seat score’s own 0 to 1 scale', () => {
    const { scoreRange } = seatHeatmap(recommendation(grid))

    expect(scoreRange).toEqual({ lowest: 0.5, highest: 0.8 })
  })

  it('keeps each cell’s seat, its seat score and the part that pulls it down most', () => {
    const weakBass = { ...seat(0, 1, 0.5), responseDeviationDb: 9 }
    const weakPlacement = { ...seat(0, 2, 0.5), placementFit: 0.2 }
    const { cells } = seatHeatmap(recommendation([weakBass, weakPlacement]))

    expect(cells[0]).toMatchObject({
      kind: 'scored',
      seat: { x: 0, y: 1, z: 1.2 },
      score: 0.5,
      weaker: 'bass',
    })
    expect(cells[1]).toMatchObject({
      seat: { x: 0, y: 2 },
      weaker: 'placement',
    })
  })

  it('gives each seat too close its own cell on the same grid, so the candidates’ cells stop halfway to it', () => {
    const { cells, tooClose } = seatHeatmap(
      recommendation([seat(0, 2, 0.6), seat(0, 3, 0.5)], {
        tooClose: [{ x: 0, y: 1, z: 1.2 }],
      }),
    )

    expect(tooClose).toEqual([
      {
        kind: 'tooClose',
        seat: { x: 0, y: 1, z: 1.2 },
        center: { x: 0, y: 1.25 },
        width: SEAT_SCORE.gridSpacing,
        depth: 0.5,
      },
    ])
    expect(cells[0]).toMatchObject({ center: { x: 0, y: 2 }, depth: 1 })
  })

  it('finds the cell under a floor point, scored or too close, and none outside the grid', () => {
    const heatmap = seatHeatmap(
      recommendation(grid, { tooClose: [{ x: -0.5, y: 1, z: 1.2 }] }),
    )

    expect(heatmapCellAt(heatmap, { x: 0.1, y: 1.2 })).toMatchObject({
      kind: 'scored',
      seat: { x: 0, y: 1 },
    })
    expect(heatmapCellAt(heatmap, { x: 0.4, y: 1.9 })).toMatchObject({
      kind: 'scored',
      seat: { x: 0.5, y: 2 },
    })
    expect(heatmapCellAt(heatmap, { x: -0.4, y: 1.1 })).toMatchObject({
      kind: 'tooClose',
      seat: { x: -0.5, y: 1 },
    })
    expect(heatmapCellAt(heatmap, { x: 0, y: 0.5 })).toBeNull()
    expect(heatmapCellAt(heatmap, { x: 2, y: 1.5 })).toBeNull()
  })
})
