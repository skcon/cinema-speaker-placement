import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOM, seatRowFootprint } from '@/domain'

describe('seat row footprint', () => {
  it('puts the MLP 0.35 m in front of the couch back, centered across, as wide as set and 0.9 m deep', () => {
    // The couch back is 0.35 m behind the head (y 2.63); the couch reaches
    // 0.9 m forward from there (y 1.73), so its middle is at y 2.18.
    const footprint = seatRowFootprint(
      DEFAULT_ROOM,
      { x: 0.5, y: 2.28, z: 1.2 },
      2,
    )

    expect(footprint.center.x).toBeCloseTo(0.5, 9)
    expect(footprint.center.y).toBeCloseTo(2.18, 9)
    expect(footprint.width).toBeCloseTo(2, 9)
    expect(footprint.depth).toBeCloseTo(0.9, 9)
  })

  it('stops at the walls', () => {
    // The 4.5 m wide room's right wall is 1.95 m right of a seat at 0.3 m.
    // Its back wall (y 6) is 0.3 m behind the head, inside the 0.35 m
    // offset, so the couch back is cut at the wall: y 5.15 to 6.
    const footprint = seatRowFootprint(
      DEFAULT_ROOM,
      { x: 1.95, y: 5.7, z: 1.2 },
      3,
    )

    expect(footprint.width).toBeCloseTo(1.8, 9)
    expect(footprint.center.x).toBeCloseTo(1.35, 9)
    expect(footprint.depth).toBeCloseTo(0.85, 9)
    expect(footprint.center.y).toBeCloseTo(5.575, 9)
  })
})
