import { describe, expect, it } from 'vitest'
import {
  checkFurnitureDimension,
  checkFurnitureName,
  fitFurnitureToRoom,
  furnitureDimension,
  furnitureFootprint,
  furnitureLabel,
  furnitureMovedTo,
  furnitureSolid,
  furnitureTurned,
  isValidFurnitureBox,
  newFurnitureBox,
  withFurnitureDimension,
  withFurnitureName,
  type FurnitureBox,
} from './furniture'
import { DEFAULT_ROOM } from './room'

/** The default room: 6 m long, 4.5 m wide, 2.6 m high. */
const ROOM = DEFAULT_ROOM

/** A 1.6 x 0.45 x 0.5 m cabinet with its back on the middle of the front wall. */
const CABINET: FurnitureBox = {
  name: 'Cabinet',
  width: 1.6,
  depth: 0.45,
  height: 0.5,
  x: 0,
  y: 0.225,
  rotation: 0,
}

/** Each side of `actual` as `expected`, to a nanometer. */
function expectRectangle(
  actual: Record<string, number>,
  expected: Record<string, number>,
) {
  expect(Object.keys(actual)).toEqual(Object.keys(expected))
  for (const [side, meters] of Object.entries(expected)) {
    expect(actual[side]).toBeCloseTo(meters, 9)
  }
}

describe('a furniture box', () => {
  it('is added from a preset with its back on the middle of the front wall', () => {
    expect(newFurnitureBox(ROOM, 'cabinet')).toEqual(CABINET)
    expect(newFurnitureBox(ROOM, 'table')).toEqual({
      name: 'Table',
      width: 1.2,
      depth: 0.6,
      height: 0.45,
      x: 0,
      y: 0.3,
      rotation: 0,
    })
    expect(newFurnitureBox(ROOM, 'shelf')).toMatchObject({
      name: 'Shelf',
      height: 1.8,
      y: 0.15,
    })
  })

  it('is added shorter than a ceiling lower than the preset', () => {
    const low = { length: 3, width: 2, height: 2 }
    // 1.8 m shelf under a 2 m ceiling: fits. A 0.8 m shelf in a 2 m room: fits.
    expect(newFurnitureBox(low, 'shelf').height).toBe(1.8)
    expect(isValidFurnitureBox(low, newFurnitureBox(low, 'shelf'))).toBe(true)
  })

  it('covers its width across and its depth along the room, unturned', () => {
    expectRectangle(furnitureFootprint({ ...CABINET, x: 1, y: 2 }), {
      left: 0.2,
      right: 1.8,
      front: 1.775,
      back: 2.225,
    })
  })

  it('swaps them when turned a quarter turn either way, and not when turned half', () => {
    const at = { ...CABINET, x: 1, y: 2 }
    const turned = { left: 0.775, right: 1.225, front: 1.2, back: 2.8 }

    expectRectangle(furnitureFootprint({ ...at, rotation: 90 }), turned)
    expectRectangle(furnitureFootprint({ ...at, rotation: 270 }), turned)
    expect(furnitureFootprint({ ...at, rotation: 180 })).toEqual(
      furnitureFootprint(at),
    )
  })

  it('is a solid from the floor to its top', () => {
    expect(furnitureSolid(CABINET)).toEqual({
      left: -0.8,
      right: 0.8,
      front: 0,
      back: 0.45,
      top: 0.5,
    })
  })

  describe('name', () => {
    it.each([
      'Cabinet',
      'Coffee table',
      'TV-bänk',
      'Étagère',
      "Kid's desk",
      'Shelf (2/3)',
      'A',
    ])('accepts %s', (name) => {
      expect(checkFurnitureName(name)).toBeNull()
    })

    it.each([
      ['', 'empty'],
      ['   ', 'empty'],
      ['Coffee tables', 'too-long'],
      ['Bokhylla 書架', 'characters'],
      ['Shelf 😀', 'characters'],
      ['Shelf "big"', 'characters'],
    ])('rejects "%s": %s', (name, problem) => {
      expect(checkFurnitureName(name)).toBe(problem)
    })

    it('is trimmed when it is set, and a rejected one changes nothing', () => {
      expect(withFurnitureName(CABINET, '  Sideboard ')).toEqual({
        ...CABINET,
        name: 'Sideboard',
      })
      expect(withFurnitureName(CABINET, 'Coffee tables')).toBeNull()
    })
  })

  describe('lengths', () => {
    it('are limited to 0.1–8 m across and along, and 0.1 m up to the ceiling', () => {
      expect(checkFurnitureDimension(ROOM, CABINET, 'width', 0.1)).toBeNull()
      expect(checkFurnitureDimension(ROOM, CABINET, 'width', 0.09)).toEqual({
        problem: 'too-small',
        min: 0.1,
        max: 4.5,
      })
      // The default room is 4.5 m wide, so the width stops there.
      expect(checkFurnitureDimension(ROOM, CABINET, 'width', 4.6)).toEqual({
        problem: 'too-large',
        min: 0.1,
        max: 4.5,
      })
      expect(checkFurnitureDimension(ROOM, CABINET, 'depth', 6)).toBeNull()
      expect(checkFurnitureDimension(ROOM, CABINET, 'height', 2.6)).toBeNull()
      expect(
        checkFurnitureDimension(ROOM, CABINET, 'height', 2.61),
      ).toMatchObject({ problem: 'too-large', max: 2.6 })
    })

    it('run along the walls the box is turned to', () => {
      const turned = { ...CABINET, rotation: 90 } as const
      // Turned, its width runs along the 6 m room.
      expect(checkFurnitureDimension(ROOM, turned, 'width', 6)).toBeNull()
      expect(checkFurnitureDimension(ROOM, turned, 'depth', 4.6)).toEqual({
        problem: 'too-large',
        min: 0.1,
        max: 4.5,
      })
    })

    it('move a box that grows past a wall in from it', () => {
      const atLeftWall = { ...CABINET, x: -1.45 } // left side at -2.25
      expect(withFurnitureDimension(ROOM, atLeftWall, 'width', 2)).toEqual({
        ...atLeftWall,
        width: 2,
        x: -1.25,
      })
      // Deeper from the front wall: it grows into the room.
      expect(withFurnitureDimension(ROOM, CABINET, 'depth', 0.6)).toEqual({
        ...CABINET,
        depth: 0.6,
        y: 0.3,
      })
    })

    it('reject a value out of range', () => {
      expect(withFurnitureDimension(ROOM, CABINET, 'height', 0)).toBeNull()
    })
  })

  describe('position from the walls', () => {
    it('is from the left wall to its left side and from the front wall to its front', () => {
      const box = { ...CABINET, x: -1, y: 2 }
      expect(furnitureDimension(ROOM, box, 'fromLeftWall')).toBeCloseTo(0.45, 9)
      expect(furnitureDimension(ROOM, box, 'fromFrontWall')).toBeCloseTo(
        1.775,
        9,
      )
    })

    it('moves the box, inside the room', () => {
      expect(
        withFurnitureDimension(ROOM, CABINET, 'fromLeftWall', 0),
      ).toMatchObject({ x: -1.45 })
      expect(
        withFurnitureDimension(ROOM, CABINET, 'fromFrontWall', 1),
      ).toMatchObject({ y: 1.225 })
      // 4.5 m wall - 1.6 m box: 2.9 m at most.
      expect(
        checkFurnitureDimension(ROOM, CABINET, 'fromLeftWall', 3),
      ).toMatchObject({ problem: 'too-large', max: 2.9 })
    })
  })

  describe('drag', () => {
    it('moves its middle to the pointer', () => {
      expect(furnitureMovedTo(ROOM, CABINET, { x: 1, y: 3 })).toEqual({
        ...CABINET,
        x: 1,
        y: 3,
      })
    })

    it('stops at the walls', () => {
      expect(furnitureMovedTo(ROOM, CABINET, { x: -5, y: 9 })).toEqual({
        ...CABINET,
        x: -1.45,
        y: 5.775,
      })
    })

    it('comes back as it was when it stays put or the pointer is lost', () => {
      expect(furnitureMovedTo(ROOM, CABINET, { x: 0, y: 0 })).toBe(CABINET)
      expect(furnitureMovedTo(ROOM, CABINET, { x: Number.NaN, y: 1 })).toBe(
        CABINET,
      )
    })
  })

  describe('turn', () => {
    it('goes a quarter turn clockwise each time, round to where it started', () => {
      const middle = { ...CABINET, y: 3 }
      const once = furnitureTurned(ROOM, middle)
      const twice = furnitureTurned(ROOM, once)
      const thrice = furnitureTurned(ROOM, twice)

      expect([once, twice, thrice].map(({ rotation }) => rotation)).toEqual([
        90, 180, 270,
      ])
      expect(furnitureTurned(ROOM, thrice)).toEqual(middle)
    })

    it('moves the box in from a wall it would cross', () => {
      // Against the front wall, turned: 1.6 m now runs along the room.
      expect(furnitureTurned(ROOM, CABINET)).toEqual({
        ...CABINET,
        rotation: 90,
        y: 0.8,
      })
    })

    it('stays as it was when it would not fit the room turned', () => {
      const long = { ...CABINET, width: 4.5, y: 3, x: 0 }
      const narrow = { length: 4, width: 4.5, height: 2.6 }
      expect(furnitureTurned(narrow, long)).toBe(long)
    })
  })

  describe('validity', () => {
    it('needs the whole box inside the room, to the millimeter', () => {
      expect(isValidFurnitureBox(ROOM, CABINET)).toBe(true)
      // Half a millimeter past the front wall: a share link's rounding.
      expect(isValidFurnitureBox(ROOM, { ...CABINET, y: 0.2245 })).toBe(true)
      expect(isValidFurnitureBox(ROOM, { ...CABINET, y: 0.22 })).toBe(false)
      expect(isValidFurnitureBox(ROOM, { ...CABINET, x: 1.5 })).toBe(false)
    })

    it('needs a trimmed, accepted name', () => {
      expect(isValidFurnitureBox(ROOM, { ...CABINET, name: ' TV' })).toBe(false)
      expect(isValidFurnitureBox(ROOM, { ...CABINET, name: '' })).toBe(false)
    })
  })

  describe('in a smaller room', () => {
    it('shrinks and moves in to fit', () => {
      const big = { ...CABINET, width: 4, height: 2.5, x: 0.25, y: 5 }
      expect(
        fitFurnitureToRoom({ length: 4, width: 3, height: 2.2 }, big),
      ).toEqual({ ...big, width: 3, height: 2.2, x: 0, y: 3.775 })
    })

    it('stays as it was when it fits', () => {
      expect(fitFurnitureToRoom(ROOM, CABINET)).toBe(CABINET)
    })
  })

  it('is named in words by its name and its place in the list, from 1', () => {
    expect(furnitureLabel(CABINET, 1)).toBe('Cabinet (box 2)')
  })
})
