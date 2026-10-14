import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOM, seatRowFootprint } from '@/domain'

describe('seat row footprint', () => {
  it('is centered on the MLP, as wide as set and 0.9 m deep', () => {
    const footprint = seatRowFootprint(
      DEFAULT_ROOM,
      { x: 0.5, y: 2.28, z: 1.2 },
      2,
    )

    expect(footprint.center.x).toBeCloseTo(0.5, 9)
    expect(footprint.center.y).toBeCloseTo(2.28, 9)
    expect(footprint.width).toBeCloseTo(2, 9)
    expect(footprint.depth).toBeCloseTo(0.9, 9)
  })

  it('stops at the walls', () => {
    // The 4.5 m wide room's right wall is 1.95 m right of a seat at 0.3 m.
    const footprint = seatRowFootprint(
      DEFAULT_ROOM,
      { x: 1.95, y: 5.7, z: 1.2 },
      3,
    )

    expect(footprint.width).toBeCloseTo(1.8, 9)
    expect(footprint.center.x).toBeCloseTo(1.35, 9)
    expect(footprint.depth).toBeCloseTo(0.75, 9)
    expect(footprint.center.y).toBeCloseTo(5.625, 9)
  })
})
