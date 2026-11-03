import { describe, expect, it } from 'vitest'
import {
  clipToHalfPlane,
  clipToHalfPlanes,
  nearestPointIn,
  rectangle,
  xRangeAt,
} from './convex-region'

const square = rectangle(0, 2, 0, 2)

describe('convex regions', () => {
  it('is empty for a rectangle with no area to it', () => {
    expect(rectangle(1, 0, 0, 1)).toEqual([])
  })

  it('keeps the side of a half-plane its normal points to', () => {
    // x ≥ 1
    const clipped = clipToHalfPlane(square, {
      through: { x: 1, y: 0 },
      normal: { x: 1, y: 0 },
    })

    expect(xRangeAt(clipped, 1)).toEqual({ min: 1, max: 2 })
  })

  it('clips to a wedge: a diagonal half-plane cuts a triangle', () => {
    // y ≥ x
    const triangle = clipToHalfPlanes(square, [
      { through: { x: 0, y: 0 }, normal: { x: -1, y: 1 } },
    ])

    expect(xRangeAt(triangle, 1)).toEqual({ min: 0, max: 1 })
    expect(xRangeAt(triangle, 2)).toEqual({ min: 0, max: 2 })
  })

  it('is empty when the half-planes leave nothing', () => {
    const empty = clipToHalfPlanes(square, [
      { through: { x: 3, y: 0 }, normal: { x: 1, y: 0 } },
    ])

    expect(empty).toEqual([])
    expect(nearestPointIn(empty, { x: 0, y: 0 })).toBeNull()
  })

  it('finds the point itself when it is inside, else the nearest point of the edges', () => {
    expect(nearestPointIn(square, { x: 1, y: 1 })).toEqual({ x: 1, y: 1 })
    expect(nearestPointIn(square, { x: 3, y: 1 })).toEqual({ x: 2, y: 1 })
    expect(nearestPointIn(square, { x: -1, y: -1 })).toEqual({ x: 0, y: 0 })
  })

  it('has no x range along a line that misses it', () => {
    expect(xRangeAt(square, 3)).toBeNull()
    expect(xRangeAt(square, 2)).toEqual({ min: 0, max: 2 })
  })
})
