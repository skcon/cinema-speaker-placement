import { describe, expect, it } from 'vitest'
import {
  checkOpeningDimension,
  fitOpeningToRoom,
  isValidOpening,
  newOpening,
  openingDimension,
  openingEnds,
  openingLabel,
  openingMovedTo,
  openingSpan,
  openingVerticalSpan,
  roundOpeningForLink,
  withOpeningDimension,
  withOpeningWall,
  type Door,
  type Opening,
  type WindowOpening,
} from './openings'
import { DEFAULT_ROOM, WALLS, type Room } from './room'

/** The default room: 6 m long, 4.5 m wide, 2.6 m high. */
const ROOM: Room = DEFAULT_ROOM

/** A 0.9 m door in the middle of the back wall. */
const DOOR: Door = { kind: 'door', wall: 'back', position: 2.25, width: 0.9 }

/** A 1.2 m window on the right wall, 0.9 m up, 1.2 m high, 3 m back. */
const WINDOW: WindowOpening = {
  kind: 'window',
  wall: 'right',
  position: 3,
  width: 1.2,
  sill: 0.9,
  height: 1.2,
}

describe('a new opening', () => {
  it('is a 0.9 m door in the middle of the back wall', () => {
    expect(newOpening(ROOM, 'door')).toEqual(DOOR)
  })

  it('is a 1.2 m window 0.9 m up, 1.2 m high, in the middle of the right wall', () => {
    expect(newOpening(ROOM, 'window')).toEqual(WINDOW)
  })

  it('fits a small, low room', () => {
    const small = { length: 2, width: 2, height: 2 }

    expect(newOpening(small, 'window')).toEqual({
      ...WINDOW,
      position: 1,
      sill: 0.8,
    })
    expect(isValidOpening(small, newOpening(small, 'window'))).toBe(true)
  })
})

describe('where an opening is', () => {
  it('runs along its wall from its edge nearest the wall start', () => {
    expect(openingSpan(DOOR)).toEqual({ start: 1.8, end: 2.7 })
  })

  it('is measured from the left wall on the front and back walls, and from the front wall on the side walls', () => {
    const ends = (opening: Opening) =>
      openingEnds(ROOM, opening).flatMap(({ x, y }) => [x, y])
    const close = (values: number[]) =>
      values.map((value) => expect.closeTo(value, 9) as unknown)

    expect(ends(DOOR)).toEqual(close([-0.45, 6, 0.45, 6]))
    expect(ends(WINDOW)).toEqual(close([2.25, 2.4, 2.25, 3.6]))
    expect(ends({ ...DOOR, wall: 'left', position: 1 })).toEqual(
      close([-2.25, 0.55, -2.25, 1.45]),
    )
  })

  it('reaches from the floor to a typical door height (ours), or from its sill to its top', () => {
    expect(openingVerticalSpan(ROOM, DOOR)).toEqual({ bottom: 0, top: 2 })
    expect(openingVerticalSpan(ROOM, WINDOW)).toEqual({
      bottom: 0.9,
      top: 2.1,
    })
  })

  it('reaches no higher than the ceiling for a door in a low room', () => {
    expect(openingVerticalSpan({ ...ROOM, height: 1.9 }, DOOR).top).toBeCloseTo(
      1.9,
      12,
    )
  })
})

describe('editing an opening', () => {
  it('reads its distance from the corner as from its nearest edge', () => {
    expect(openingDimension(DOOR, 'fromCorner')).toBeCloseTo(1.8, 12)
    expect(openingDimension(WINDOW, 'sill')).toBe(0.9)
    expect(openingDimension(DOOR, 'sill')).toBeNull()
  })

  it('moves it along its wall by its distance from the corner', () => {
    expect(withOpeningDimension(ROOM, DOOR, 'fromCorner', 0)).toEqual({
      ...DOOR,
      position: 0.45,
    })
    expect(withOpeningDimension(ROOM, DOOR, 'fromCorner', 3.7)).toBeNull()
  })

  it('widens it, moving it in from the corner it would pass', () => {
    const inCorner = { ...DOOR, position: 0.45 }

    expect(withOpeningDimension(ROOM, inCorner, 'width', 1.5)).toEqual({
      ...DOOR,
      position: 0.75,
      width: 1.5,
    })
  })

  it('rejects a width outside its limits or wider than the wall', () => {
    expect(checkOpeningDimension(ROOM, DOOR, 'width', 0.2)).toMatchObject({
      problem: 'too-small',
    })
    expect(checkOpeningDimension(ROOM, DOOR, 'width', 4.6)).toMatchObject({
      problem: 'too-large',
      max: 4.5,
    })
    expect(checkOpeningDimension(ROOM, WINDOW, 'width', 6)).toBeNull()
  })

  it('keeps a window under the ceiling: sill plus height at most the room height', () => {
    expect(checkOpeningDimension(ROOM, WINDOW, 'sill', 1.4)).toBeNull()
    expect(checkOpeningDimension(ROOM, WINDOW, 'sill', 1.5)).toMatchObject({
      problem: 'too-large',
    })
    expect(checkOpeningDimension(ROOM, WINDOW, 'height', 1.8)).toMatchObject({
      problem: 'too-large',
    })
    expect(withOpeningDimension(ROOM, WINDOW, 'height', 1.7)).toEqual({
      ...WINDOW,
      height: 1.7,
    })
  })

  it('gives a door no sill or height to edit', () => {
    expect(withOpeningDimension(ROOM, DOOR, 'sill', 0.5)).toBeNull()
    expect(withOpeningDimension(ROOM, DOOR, 'height', 1)).toBeNull()
    expect(openingDimension(DOOR, 'height')).toBeNull()
  })

  it('moves it to another wall, keeping where it is along it as far as it fits', () => {
    expect(withOpeningWall(ROOM, WINDOW, 'front')).toEqual({
      ...WINDOW,
      wall: 'front',
      position: 3,
    })
    expect(withOpeningWall(ROOM, { ...WINDOW, position: 5.2 }, 'back')).toEqual(
      { ...WINDOW, wall: 'back', position: 3.9 },
    )
  })

  it('narrows it to fit a shorter wall', () => {
    const wide = { ...WINDOW, width: 5, position: 3 }

    expect(withOpeningWall(ROOM, wide, 'front')).toEqual({
      ...WINDOW,
      wall: 'front',
      width: 4.5,
      position: 2.25,
    })
  })
})

describe('dragging an opening', () => {
  it('slides it along its wall only, following the pointer', () => {
    expect(openingMovedTo(ROOM, DOOR, { x: -1, y: 3 })).toEqual({
      ...DOOR,
      position: 1.25,
    })
    expect(openingMovedTo(ROOM, WINDOW, { x: 0, y: 1.5 })).toEqual({
      ...WINDOW,
      position: 1.5,
    })
  })

  it('stops it at the corners', () => {
    expect(openingMovedTo(ROOM, DOOR, { x: -9, y: 6 })).toEqual({
      ...DOOR,
      position: 0.45,
    })
    expect(openingMovedTo(ROOM, WINDOW, { x: 2, y: 9 })).toEqual({
      ...WINDOW,
      position: 5.4,
    })
  })

  it('leaves it as it was for a point that is not a number, or where it is', () => {
    expect(openingMovedTo(ROOM, DOOR, { x: Number.NaN, y: 6 })).toBe(DOOR)
    expect(openingMovedTo(ROOM, DOOR, { x: 0, y: 2 })).toBe(DOOR)
  })
})

describe('openings stay on their wall and inside it', () => {
  it.each(WALLS)('on the %s wall, wherever it is dragged', (wall) => {
    const opening: Opening = { ...WINDOW, wall, position: 1 }
    for (const to of [
      { x: -50, y: -50 },
      { x: 50, y: 50 },
      { x: 0.3, y: 4.9 },
    ]) {
      const moved = openingMovedTo(ROOM, opening, to)
      expect(moved.wall).toBe(wall)
      expect(isValidOpening(ROOM, moved)).toBe(true)
    }
  })

  it('when the room shrinks: narrowed, moved in and lowered to fit', () => {
    const small = { length: 2, width: 2, height: 2 }
    const fitted = fitOpeningToRoom(small, {
      ...WINDOW,
      wall: 'front',
      width: 3,
      position: 3,
      sill: 1.5,
    })

    expect(fitted).toEqual({
      ...WINDOW,
      wall: 'front',
      width: 2,
      position: 1,
      sill: 0.8,
      height: 1.2,
    })
    expect(isValidOpening(small, fitted)).toBe(true)
  })

  it('come back as they were when they fit', () => {
    expect(fitOpeningToRoom(ROOM, WINDOW)).toBe(WINDOW)
  })

  it.each<[string, unknown]>([
    ['past the wall start', { ...DOOR, position: 0.4 }],
    ['past the wall end', { ...DOOR, position: 4.1 }],
    ['wider than the wall', { ...DOOR, width: 4.6 }],
    ['narrower than 0.3 m', { ...DOOR, width: 0.2 }],
    ['through the ceiling', { ...WINDOW, sill: 1.5 }],
    ['below the floor', { ...WINDOW, sill: -0.1 }],
    ['lower than 0.2 m', { ...WINDOW, height: 0.1 }],
    ['on no wall', { ...DOOR, wall: 'ceiling' }],
  ])('rejects one %s', (_, opening) => {
    expect(isValidOpening(ROOM, opening as Opening)).toBe(false)
  })

  it('accept one a share link rounded half a millimeter past its wall end', () => {
    expect(isValidOpening(ROOM, { ...DOOR, position: 0.4495 })).toBe(true)
  })
})

describe('an opening in a share link', () => {
  it('has every length to the millimeter', () => {
    expect(
      roundOpeningForLink({
        ...WINDOW,
        position: 1.23456,
        width: 36 * 0.0254,
        sill: 0.90049,
        height: 1.2000001,
      }),
    ).toEqual({
      ...WINDOW,
      position: 1.235,
      width: 0.914,
      sill: 0.9,
      height: 1.2,
    })
  })
})

describe('opening labels', () => {
  it('name each by its kind and number', () => {
    expect(openingLabel(DOOR, 0)).toBe('Door (opening 1)')
    expect(openingLabel(WINDOW, 1)).toBe('Window (opening 2)')
  })
})
