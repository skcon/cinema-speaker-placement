import { describe, expect, it } from 'vitest'
import { checkRoomDimension, DEFAULT_ROOM } from '@/domain'

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
