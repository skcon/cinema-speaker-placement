import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOM, seatRowFootprint } from '@/domain'
import { checkLength, withLength } from './object-lengths'
import { DEFAULT_SEAT_ROW, isValidSeatRow, SEAT_ROW_LENGTHS } from './seat-row'

/** The default room: the seat row's limits don't depend on it. */
const ROOM = DEFAULT_ROOM

describe('seat row footprint', () => {
  it('puts the MLP 0.35 m in front of the couch back, centered across, as wide and deep as set', () => {
    // The couch back is 0.35 m behind the head (y 2.63); the couch reaches
    // 0.9 m forward from there (y 1.73), so its middle is at y 2.18.
    const footprint = seatRowFootprint(
      DEFAULT_ROOM,
      { x: 0.5, y: 2.28, z: 1.2 },
      { width: 2, depth: 0.9 },
    )

    expect(footprint.center.x).toBeCloseTo(0.5, 9)
    expect(footprint.center.y).toBeCloseTo(2.18, 9)
    expect(footprint.width).toBeCloseTo(2, 9)
    expect(footprint.depth).toBeCloseTo(0.9, 9)
  })

  it('reaches further forward when deeper, its back staying 0.35 m behind the MLP', () => {
    // Back at y 2.63, 1.6 m deep: from y 1.03, middle at y 1.83.
    const footprint = seatRowFootprint(
      DEFAULT_ROOM,
      { x: 0, y: 2.28, z: 1.2 },
      { width: 2, depth: 1.6 },
    )

    expect(footprint.center.y).toBeCloseTo(1.83, 9)
    expect(footprint.depth).toBeCloseTo(1.6, 9)
  })

  it('stops at the walls', () => {
    // The 4.5 m wide room's right wall is 1.95 m right of a seat at 0.3 m.
    // Its back wall (y 6) is 0.3 m behind the head, inside the 0.35 m
    // offset, so the couch back is cut at the wall: y 5.15 to 6.
    const footprint = seatRowFootprint(
      DEFAULT_ROOM,
      { x: 1.95, y: 5.7, z: 1.2 },
      { width: 3, depth: 0.9 },
    )

    expect(footprint.width).toBeCloseTo(1.8, 9)
    expect(footprint.center.x).toBeCloseTo(1.35, 9)
    expect(footprint.depth).toBeCloseTo(0.85, 9)
    expect(footprint.center.y).toBeCloseTo(5.575, 9)
  })
})

describe('seat row size', () => {
  it('starts as a three-seat couch, 2 m wide and 0.9 m deep', () => {
    expect(DEFAULT_SEAT_ROW).toEqual({ width: 2, depth: 0.9 })
    expect(isValidSeatRow(ROOM, DEFAULT_SEAT_ROW)).toBe(true)
  })

  it.each([
    ['width', 0.5, null],
    ['width', 8, null],
    ['width', 0.49, 'too-small'],
    ['width', 8.01, 'too-large'],
    ['depth', 0.5, null],
    ['depth', 2, null],
    ['depth', 0.49, 'too-small'],
    ['depth', 2.01, 'too-large'],
    ['depth', Number.NaN, 'not-a-number'],
  ] as const)('checks a %s of %d m: %s', (dimension, meters, problem) => {
    expect(
      checkLength(SEAT_ROW_LENGTHS, ROOM, DEFAULT_SEAT_ROW, dimension, meters)
        ?.problem ?? null,
    ).toBe(problem)
  })

  it('is valid only with both lengths in range', () => {
    expect(isValidSeatRow(ROOM, { width: 3, depth: 1.2 })).toBe(true)
    expect(isValidSeatRow(ROOM, { width: 0.4, depth: 0.9 })).toBe(false)
    expect(isValidSeatRow(ROOM, { width: 2, depth: 2.5 })).toBe(false)
  })

  it('changes one length, or gives null for a length out of range', () => {
    expect(
      withLength(SEAT_ROW_LENGTHS, ROOM, DEFAULT_SEAT_ROW, 'depth', 1.1),
    ).toEqual({
      width: 2,
      depth: 1.1,
    })
    expect(
      withLength(SEAT_ROW_LENGTHS, ROOM, DEFAULT_SEAT_ROW, 'width', 9),
    ).toBeNull()
    expect(
      withLength(SEAT_ROW_LENGTHS, ROOM, DEFAULT_SEAT_ROW, 'width', Number.NaN),
    ).toBeNull()
  })
})
