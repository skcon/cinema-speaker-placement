import { describe, expect, it } from 'vitest'
import { segmentHitsBox, type AxisBox } from './box-geometry'

/** A 1 x 1 x 1 m box from (1, 1, 0) to (2, 2, 1). */
const CUBE: AxisBox = {
  min: { x: 1, y: 1, z: 0 },
  max: { x: 2, y: 2, z: 1 },
}

/** The same rectangle on the floor plan, at every height. */
const COLUMN: AxisBox = {
  min: { x: 1, y: 1, z: -Infinity },
  max: { x: 2, y: 2, z: Infinity },
}

describe('a straight segment against a box', () => {
  it('hits a box it passes straight through', () => {
    // Along y at x = 1.5, z = 0.5: enters at y = 1, leaves at y = 2.
    expect(
      segmentHitsBox({ x: 1.5, y: 0, z: 0.5 }, { x: 1.5, y: 3, z: 0.5 }, CUBE),
    ).toBe(true)
  })

  it('hits a box it crosses diagonally', () => {
    // From (0, 0, 0.5) to (3, 3, 0.5): inside for x = y from 1 to 2.
    expect(
      segmentHitsBox({ x: 0, y: 0, z: 0.5 }, { x: 3, y: 3, z: 0.5 }, CUBE),
    ).toBe(true)
  })

  it('misses a box it passes over', () => {
    // At 1.2 m, above the 1 m top.
    expect(
      segmentHitsBox({ x: 1.5, y: 0, z: 1.2 }, { x: 1.5, y: 3, z: 1.2 }, CUBE),
    ).toBe(false)
  })

  it('misses a box it would reach only past its end', () => {
    // Stops at y = 0.9, short of the box's front at y = 1.
    expect(
      segmentHitsBox(
        { x: 1.5, y: 0, z: 0.5 },
        { x: 1.5, y: 0.9, z: 0.5 },
        CUBE,
      ),
    ).toBe(false)
  })

  it('misses a box beside it', () => {
    expect(
      segmentHitsBox({ x: 0.5, y: 0, z: 0.5 }, { x: 0.5, y: 3, z: 0.5 }, CUBE),
    ).toBe(false)
  })

  it('hits a box it starts inside', () => {
    expect(
      segmentHitsBox({ x: 1.5, y: 1.5, z: 0.5 }, { x: 5, y: 5, z: 1.2 }, CUBE),
    ).toBe(true)
  })

  it('clears a box by sloping over its corner', () => {
    // From (0, 1.5, 0) up to (3, 1.5, 3): at x = 1 it is 1 m up, level
    // with the top edge, so it touches it. Half a meter higher it is 1.5 m
    // up at x = 1, above the top.
    expect(
      segmentHitsBox({ x: 0, y: 1.5, z: 0 }, { x: 3, y: 1.5, z: 3 }, CUBE),
    ).toBe(true)
    expect(
      segmentHitsBox({ x: 0, y: 1.5, z: 0.5 }, { x: 3, y: 1.5, z: 3.5 }, CUBE),
    ).toBe(false)
  })

  it('reads a box of unbounded height as its floor-plan rectangle', () => {
    // High above the cube, but over its rectangle.
    expect(
      segmentHitsBox({ x: 1.5, y: 0, z: 4 }, { x: 1.5, y: 3, z: 4 }, COLUMN),
    ).toBe(true)
    expect(
      segmentHitsBox({ x: 0, y: 0, z: 4 }, { x: 0.9, y: 3, z: 4 }, COLUMN),
    ).toBe(false)
  })
})
