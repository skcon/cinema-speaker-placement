import { describe, expect, it } from 'vitest'
import {
  checkRoomDimension,
  DEFAULT_ROOM,
  floorCenter,
  floorCorners,
  wallBases,
} from '@/domain'
import { azimuthFromMlp } from '@/domain/room'

describe('room geometry in room coordinates', () => {
  // 6 m long, 4.5 m wide: the side walls are at x = ±2.25
  it('puts the floor corners clockwise seen from above, starting front left', () => {
    expect(floorCorners(DEFAULT_ROOM)).toEqual([
      { x: -2.25, y: 0, z: 0 },
      { x: 2.25, y: 0, z: 0 },
      { x: 2.25, y: 6, z: 0 },
      { x: -2.25, y: 6, z: 0 },
    ])
  })

  it('runs each wall base from corner to corner, the front wall at y = 0', () => {
    expect(wallBases(DEFAULT_ROOM)).toEqual({
      front: [
        { x: -2.25, y: 0, z: 0 },
        { x: 2.25, y: 0, z: 0 },
      ],
      right: [
        { x: 2.25, y: 0, z: 0 },
        { x: 2.25, y: 6, z: 0 },
      ],
      back: [
        { x: 2.25, y: 6, z: 0 },
        { x: -2.25, y: 6, z: 0 },
      ],
      left: [
        { x: -2.25, y: 6, z: 0 },
        { x: -2.25, y: 0, z: 0 },
      ],
    })
  })

  it('centers the floor on the center line, halfway back', () => {
    expect(floorCenter(DEFAULT_ROOM)).toEqual({ x: 0, y: 3, z: 0 })
  })
})

describe('the default room', () => {
  it('is 6 m long, 4.5 m wide and 2.6 m high', () => {
    expect(DEFAULT_ROOM).toEqual({ length: 6, width: 4.5, height: 2.6 })
  })

  it('passes validation in every dimension', () => {
    expect(checkRoomDimension('length', DEFAULT_ROOM.length)).toBeNull()
    expect(checkRoomDimension('width', DEFAULT_ROOM.width)).toBeNull()
    expect(checkRoomDimension('height', DEFAULT_ROOM.height)).toBeNull()
  })
})

describe('room dimension ranges', () => {
  it.each([
    ['length', 2],
    ['length', 15],
    ['width', 2],
    ['width', 15],
    ['height', 2],
    ['height', 5],
  ] as const)('accepts a %s of %f m (inclusive limit)', (dimension, meters) => {
    expect(checkRoomDimension(dimension, meters)).toBeNull()
  })

  it.each([
    ['length', 1.99],
    ['width', 1.99],
    ['height', 1.99],
  ] as const)('rejects a %s of %f m as too small', (dimension, meters) => {
    expect(checkRoomDimension(dimension, meters)).toMatchObject({
      problem: 'too-small',
      min: 2,
    })
  })

  it.each([
    ['length', 15.01, 15],
    ['width', 15.01, 15],
    ['height', 5.01, 5],
  ] as const)('rejects a %s of %f m as too large', (dimension, meters, max) => {
    expect(checkRoomDimension(dimension, meters)).toMatchObject({
      problem: 'too-large',
      max,
    })
  })

  it('rejects values that are not finite numbers', () => {
    expect(checkRoomDimension('length', Number.NaN)).toMatchObject({
      problem: 'not-a-number',
    })
    expect(
      checkRoomDimension('height', Number.POSITIVE_INFINITY),
    ).toMatchObject({ problem: 'not-a-number' })
  })

  it('reports both limits with every problem, so the UI can show the range', () => {
    expect(checkRoomDimension('height', 9)).toEqual({
      problem: 'too-large',
      min: 2,
      max: 5,
    })
  })
})

describe('azimuth seen from the MLP', () => {
  const mlp = { x: 0, y: 2.28, z: 1.2 }

  it('is 0° toward the middle of the front wall and grows clockwise seen from above', () => {
    expect(azimuthFromMlp(mlp, { x: 0, y: 0, z: 1.2 })).toBe(0)
    expect(azimuthFromMlp(mlp, { x: 1, y: 1.28, z: 1.2 })).toBeCloseTo(45, 9)
    expect(azimuthFromMlp(mlp, { x: 1, y: 2.28, z: 1.2 })).toBeCloseTo(90, 9)
    expect(azimuthFromMlp(mlp, { x: -1, y: 1.28, z: 1.2 })).toBeCloseTo(-45, 9)
  })

  it('is +180° straight behind, never -180°', () => {
    expect(azimuthFromMlp(mlp, { x: 0, y: 5, z: 1.2 })).toBe(180)
  })

  it('ignores height', () => {
    expect(azimuthFromMlp(mlp, { x: 1, y: 1.28, z: 2.5 })).toBeCloseTo(45, 9)
  })

  it('measures from the center-front reference when the MLP is off the center line', () => {
    // The worked example in src/domain/room.ts
    const offCenter = { x: 0.5, y: 2.28, z: 1.2 }

    expect(azimuthFromMlp(offCenter, { x: 0, y: 0, z: 0 })).toBeCloseTo(0, 9)
    expect(azimuthFromMlp(offCenter, { x: 0.5, y: 0, z: 0 })).toBeCloseTo(
      12.4,
      1,
    )
  })
})
