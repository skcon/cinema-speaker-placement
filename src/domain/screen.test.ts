import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOM, type Room } from './room'
import {
  checkScreenDimension,
  defaultScreen,
  fitScreenToRoom,
  isValidScreen,
  screenDimension,
  screenMovedTo,
  screenSurface,
  withAcousticTransparency,
  withScreenDimension,
  withScreenKind,
  type RoomScreen,
} from './screen'

/** The default room: 6 x 4.5 x 2.6 m. */
const ROOM: Room = DEFAULT_ROOM

/** A 65 in TV, centred on the front wall of the default room. */
const TV: RoomScreen = {
  kind: 'tv',
  width: 1.44,
  height: 0.81,
  bottomEdge: 0.93,
  x: 0,
  standoff: null,
}

/** An acoustically transparent 120 in projection screen, off-centre. */
const AT_SCREEN: RoomScreen = {
  kind: 'projection',
  width: 2.66,
  height: 1.5,
  bottomEdge: 0.6,
  x: 0.5,
  standoff: 0.75,
}

describe('the screen a room gets when one is added', () => {
  it('is a 65 in TV centred on the front wall, its lower third at ear height', () => {
    expect(defaultScreen(ROOM)).toEqual(TV)
  })

  it('fits the smallest room', () => {
    const room = { length: 2, width: 2, height: 2 }

    expect(isValidScreen(room, defaultScreen(room))).toBe(true)
  })
})

describe('whether a screen is valid in a room', () => {
  it('accepts a TV on the wall and an acoustically transparent projection screen', () => {
    expect(isValidScreen(ROOM, TV)).toBe(true)
    expect(isValidScreen(ROOM, AT_SCREEN)).toBe(true)
  })

  it.each([
    ['too narrow', { ...TV, width: 0.4 }],
    ['wider than the front wall', { ...TV, width: 4.6 }],
    ['too short', { ...TV, height: 0.2 }],
    ['above the ceiling', { ...TV, bottomEdge: 2 }],
    ['below the floor', { ...TV, bottomEdge: -0.1 }],
    ['past a side wall', { ...TV, x: 1.6 }],
    ['a TV with a standoff', { ...TV, standoff: 0.5 }],
    ['a standoff too small', { ...AT_SCREEN, standoff: 0.01 }],
    ['a standoff too large', { ...AT_SCREEN, standoff: 2 }],
    ['a width that is not a number', { ...TV, width: Number.NaN }],
  ])('rejects a screen %s', (_, screen) => {
    expect(isValidScreen(ROOM, screen)).toBe(false)
  })

  it('accepts a screen up to half a millimeter past a side wall, as share links round', () => {
    const atWall = (4.5 - 1.44) / 2

    expect(isValidScreen(ROOM, { ...TV, x: atWall + 0.0004 })).toBe(true)
    expect(isValidScreen(ROOM, { ...TV, x: atWall + 0.001 })).toBe(false)
  })
})

describe('checking one dimension of a screen', () => {
  it('accepts a width up to the front wall and says the range otherwise', () => {
    expect(checkScreenDimension(ROOM, TV, 'width', 4.5)).toBeNull()
    expect(checkScreenDimension(ROOM, TV, 'width', 4.6)).toEqual({
      problem: 'too-large',
      min: 0.5,
      max: 4.5,
    })
  })

  it('keeps the top edge under the ceiling', () => {
    expect(checkScreenDimension(ROOM, TV, 'height', 1.67)).toBeNull()
    expect(checkScreenDimension(ROOM, TV, 'height', 1.7)).toEqual({
      problem: 'too-large',
      min: 0.3,
      max: 2.6 - 0.93,
    })
    expect(checkScreenDimension(ROOM, TV, 'bottomEdge', 1.8)).toEqual({
      problem: 'too-large',
      min: 0,
      max: 2.6 - 0.81,
    })
  })

  it('keeps the screen on the front wall, measured from the left wall to its left edge', () => {
    expect(checkScreenDimension(ROOM, TV, 'fromLeftWall', 0)).toBeNull()
    expect(checkScreenDimension(ROOM, TV, 'fromLeftWall', 3.07)).toEqual({
      problem: 'too-large',
      min: 0,
      max: 4.5 - 1.44,
    })
  })

  it('says when the value is not a number', () => {
    expect(checkScreenDimension(ROOM, TV, 'standoff', Number.NaN)).toEqual({
      problem: 'not-a-number',
      min: 0.05,
      max: 1.5,
    })
  })
})

describe('reading one dimension of a screen', () => {
  it('gives its lengths as stored', () => {
    expect(screenDimension(ROOM, AT_SCREEN, 'width')).toBe(2.66)
    expect(screenDimension(ROOM, AT_SCREEN, 'standoff')).toBe(0.75)
  })

  it('measures from the left wall to its left edge', () => {
    expect(screenDimension(ROOM, TV, 'fromLeftWall')).toBeCloseTo(1.53, 9)
    expect(screenDimension(ROOM, AT_SCREEN, 'fromLeftWall')).toBeCloseTo(
      2.25 + 0.5 - 1.33,
      9,
    )
  })

  it('gives no standoff for a screen on the wall', () => {
    expect(screenDimension(ROOM, TV, 'standoff')).toBeNull()
  })
})

describe('changing one dimension of a screen', () => {
  it('moves it along the wall by its distance from the left wall', () => {
    expect(withScreenDimension(ROOM, TV, 'fromLeftWall', 0.5)).toEqual({
      ...TV,
      x: 0.5 + 0.72 - 2.25,
    })
  })

  it('sets an accepted value', () => {
    expect(withScreenDimension(ROOM, TV, 'height', 1)).toEqual({
      ...TV,
      height: 1,
    })
  })

  it('rejects a value outside its range', () => {
    expect(withScreenDimension(ROOM, TV, 'width', 0.1)).toBeNull()
  })

  it('moves a widened screen in from the side wall it would cross', () => {
    const atRightWall = { ...TV, x: 1.53 }

    expect(withScreenDimension(ROOM, atRightWall, 'width', 2)).toEqual({
      ...atRightWall,
      width: 2,
      x: 1.25,
    })
  })

  it('sets a standoff only on an acoustically transparent screen', () => {
    expect(withScreenDimension(ROOM, AT_SCREEN, 'standoff', 0.5)).toEqual({
      ...AT_SCREEN,
      standoff: 0.5,
    })
    expect(withScreenDimension(ROOM, TV, 'standoff', 0.5)).toBeNull()
  })
})

describe('dragging a screen along the front wall', () => {
  it('moves its middle across the room', () => {
    expect(screenMovedTo(ROOM, TV, -1)).toEqual({ ...TV, x: -1 })
  })

  it('stops it at the side walls', () => {
    expect(screenMovedTo(ROOM, TV, 3)).toEqual({ ...TV, x: 1.53 })
  })

  it('leaves it where it is for a position that is not a number', () => {
    expect(screenMovedTo(ROOM, TV, Number.NaN)).toBe(TV)
  })
})

describe('the kind of screen', () => {
  it('keeps the size when a TV becomes a projection screen', () => {
    expect(withScreenKind(TV, 'projection')).toEqual({
      ...TV,
      kind: 'projection',
    })
  })

  it('puts a projection screen back on the wall when it becomes a TV', () => {
    expect(withScreenKind(AT_SCREEN, 'tv')).toEqual({
      ...AT_SCREEN,
      kind: 'tv',
      standoff: null,
    })
  })

  it('makes a projection screen acoustically transparent at the default standoff, and back', () => {
    const projection = { ...AT_SCREEN, standoff: null }

    expect(withAcousticTransparency(projection, true)).toEqual({
      ...projection,
      standoff: 0.75,
    })
    expect(withAcousticTransparency(AT_SCREEN, false)).toEqual(projection)
  })

  it('never makes a TV acoustically transparent', () => {
    expect(withAcousticTransparency(TV, true)).toBe(TV)
  })
})

describe('fitting a screen into a smaller room', () => {
  it('leaves a screen that fits as it is', () => {
    expect(fitScreenToRoom(ROOM, AT_SCREEN)).toBe(AT_SCREEN)
  })

  it('narrows a screen wider than the front wall and centres it', () => {
    const room = { ...ROOM, width: 2 }

    expect(fitScreenToRoom(room, AT_SCREEN)).toEqual({
      ...AT_SCREEN,
      width: 2,
      x: 0,
    })
  })

  it('moves an off-centre screen in from the side wall', () => {
    const room = { ...ROOM, width: 3 }

    expect(fitScreenToRoom(room, AT_SCREEN).x).toBeCloseTo(0.17, 9)
  })

  it('lowers the bottom edge first, then the height, under a lower ceiling', () => {
    const tall = { ...AT_SCREEN, bottomEdge: 1, height: 2 }

    expect(fitScreenToRoom({ ...ROOM, height: 2.5 }, tall)).toMatchObject({
      bottomEdge: 0.5,
      height: 2,
    })
    expect(
      fitScreenToRoom({ ...ROOM, height: 2 }, { ...tall, height: 2.4 }),
    ).toMatchObject({ bottomEdge: 0, height: 2 })
  })
})

describe('where the screen is in the room', () => {
  it('spans its width along the front wall, from its bottom edge up', () => {
    expect(screenSurface(TV)).toEqual({
      left: -0.72,
      right: 0.72,
      bottom: 0.93,
      top: 0.93 + 0.81,
      fromFrontWall: 0,
    })
  })

  it('stands an acoustically transparent screen off the wall', () => {
    expect(screenSurface(AT_SCREEN)).toMatchObject({
      left: 0.5 - 1.33,
      right: 0.5 + 1.33,
      fromFrontWall: 0.75,
    })
  })
})
