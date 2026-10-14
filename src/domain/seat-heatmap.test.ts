import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  recommendSeat,
  seatHeatmap,
  type ScoredSeat,
} from '@/domain'

/** A scored seat at (x, y) with only the score that matters here. */
function seat(x: number, y: number, score: number): ScoredSeat {
  return {
    position: { x, y, z: 1.2 },
    score,
    responseDeviationDb: 0,
    placementFit: 1,
  }
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
    const { cells } = seatHeatmap(grid)

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

  it('levels the scores from 0 (lowest) to 1 (highest in the grid)', () => {
    const { cells, lowest, highest } = seatHeatmap(grid)
    const levelAt = (x: number, y: number) =>
      cells.find(
        (c) =>
          Math.abs(c.center.x - x) < 0.13 && Math.abs(c.center.y - y) < 0.26,
      )?.level

    expect(lowest).toBe(0.2)
    expect(highest).toBe(0.8)
    expect(levelAt(-0.5, 2)).toBe(0)
    expect(levelAt(0, 1)).toBe(1)
    expect(levelAt(0.5, 2)).toBeCloseTo(0.5)
  })

  it('names the best-scoring candidate, the first of equals', () => {
    expect(seatHeatmap(grid).best).toEqual({ x: 0, y: 1, z: 1.2 })
    expect(seatHeatmap([seat(0, 1, 0.5), seat(0, 2, 0.5)]).best).toEqual({
      x: 0,
      y: 1,
      z: 1.2,
    })
  })

  it('shows a grid of equal scores at the top level', () => {
    const { cells } = seatHeatmap([seat(0, 1, 0.5), seat(0, 2, 0.5)])

    expect(cells.map((c) => c.level)).toEqual([1, 1])
  })

  it('is empty without candidates', () => {
    expect(seatHeatmap([])).toMatchObject({ cells: [], best: null })
  })

  it('covers exactly the default room inside the 0.3 m wall clearance, leaving the clearance blank', () => {
    const { room } = DEFAULT_CONFIG
    const { cells } = seatHeatmap(recommendSeat(DEFAULT_CONFIG).candidates)

    const area = cells.reduce((sum, c) => sum + c.width * c.depth, 0)
    expect(area).toBeCloseTo((room.width - 0.6) * (room.length - 0.6))
    for (const { center, width, depth } of cells) {
      expect(Math.abs(center.x) + width / 2).toBeLessThanOrEqual(
        room.width / 2 - 0.3 + 1e-9,
      )
      expect(center.y - depth / 2).toBeGreaterThanOrEqual(0.3 - 1e-9)
      expect(center.y + depth / 2).toBeLessThanOrEqual(room.length - 0.3 + 1e-9)
    }
  })
})
