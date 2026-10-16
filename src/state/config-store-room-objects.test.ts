import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  decodeConfig,
  DEFAULT_CONFIG,
  encodeConfig,
  recommendSeat,
  SCREEN_ID,
  SEAT_ROW_ID,
  type Config,
} from '@/domain'
import { createConfigStore, type ConfigStore } from '@/state/config-store'
import { V1_LINKS } from '@/test/share-link-fixtures'

/** The default 65 in TV, centred on the default room's front wall. */
const TV = {
  kind: 'tv',
  width: 1.44,
  height: 0.81,
  bottomEdge: 0.93,
  x: 0,
  standoff: null,
} as const

function screen(store: ConfigStore) {
  return store.getState().config.roomObjects.screen
}

/** A store with the default room and its default TV. */
function storeWithTv(): ConfigStore {
  return createConfigStore({
    ...DEFAULT_CONFIG,
    roomObjects: { ...DEFAULT_CONFIG.roomObjects, screen: TV },
  })
}

function analysis(store: ConfigStore) {
  return analyzeRoom(store.getState().config)
}

function seatRowSize(store: ConfigStore) {
  return store.getState().config.roomObjects.seatRow
}

describe('the seat row', () => {
  it('starts 2 m wide and 0.9 m deep, auto with the MLP at the 38% seed', () => {
    const store = createConfigStore()

    expect(seatRowSize(store)).toEqual({ width: 2, depth: 0.9 })
    // The MLP is 2.28 m from the front wall: the couch back 0.35 m behind it.
    expect(analysis(store).mlpPlacement).toBe('auto')
    const { center, width, depth } = analysis(store).seatRow
    expect(center.x).toBeCloseTo(0, 9)
    expect(center.y).toBeCloseTo(2.18, 9)
    expect(width).toBeCloseTo(2, 9)
    expect(depth).toBeCloseTo(0.9, 9)
  })

  it('moves the MLP when dragged, making it manual, and the analysis follows, as one undo step', () => {
    const store = createConfigStore()
    const before = analysis(store)

    store.getState().beginGesture()
    store.getState().moveRoomObject(SEAT_ROW_ID, { x: 0.2, y: 2.8 })
    store.getState().moveRoomObject(SEAT_ROW_ID, { x: 0.4, y: 3.1 })
    store.getState().endGesture()

    const after = analysis(store)
    expect(store.getState().config.manualPositions).toEqual({
      MLP: { x: 0.4, y: 3.1, z: 1.2 },
    })
    expect(after.mlpPlacement).toBe('manual')
    // The couch came with the MLP: its back still 0.35 m behind it.
    expect(after.seatRow.center.x).toBeCloseTo(0.4, 9)
    expect(after.seatRow.center.y + after.seatRow.depth / 2).toBeCloseTo(
      3.45,
      9,
    )
    // The grades and the estimated response are worked out at the new MLP.
    expect(after.speakers.map((s) => s.placementRange)).not.toEqual(
      before.speakers.map((s) => s.placementRange),
    )
    expect(after.response.estimated).not.toEqual(before.response.estimated)

    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('keeps the MLP inside its wall clearances when dragged into a wall', () => {
    const store = createConfigStore()

    store.getState().moveRoomObject(SEAT_ROW_ID, { x: 0, y: 9 })

    // The 6 m room's back wall, less the MLP's clearance.
    expect(analysis(store).mlp.y).toBeLessThan(6)
    expect(analysis(store).seatRow.center.y).toBeLessThan(6)
  })

  it('goes back with the MLP on Auto-place, and undo restores both', () => {
    const store = createConfigStore()
    store.getState().moveRoomObject(SEAT_ROW_ID, { x: 0.4, y: 3.1 })
    const dragged = store.getState().config
    const { recommended } = recommendSeat(DEFAULT_CONFIG)

    store.getState().autoPlace()

    expect(analysis(store).mlp).toEqual(recommended.position)
    expect(analysis(store).seatRow.center.x).toBeCloseTo(
      recommended.position.x,
      9,
    )
    store.getState().undo()
    expect(store.getState().config).toBe(dragged)
    expect(analysis(store).seatRow.center.x).toBeCloseTo(0.4, 9)
  })

  it('moves so the MLP lands on the recommended seat on "Move MLP here"', () => {
    const store = createConfigStore()
    const seat = { x: -0.5, y: 2.5, z: 1.2 }

    store.getState().moveMlpToRecommendedSeat(seat)

    expect(analysis(store).seatRow.center.x).toBeCloseTo(-0.5, 9)
    expect(
      analysis(store).seatRow.center.y + analysis(store).seatRow.depth / 2,
    ).toBeCloseTo(2.85, 9)
    store.getState().undo()
    expect(analysis(store).seatRow.center.x).toBeCloseTo(0, 9)
  })

  it('is resized within its ranges, each change one undo step, and rejects a size outside them', () => {
    const store = createConfigStore()

    store.getState().setSeatRowDimension('width', 3.2)
    store.getState().setSeatRowDimension('depth', 1.1)
    store.getState().setSeatRowDimension('width', 8.5)
    store.getState().setSeatRowDimension('depth', 0.3)
    store.getState().setSeatRowDimension('depth', Number.NaN)

    expect(seatRowSize(store)).toEqual({ width: 3.2, depth: 1.1 })
    // A deeper couch reaches further forward; its back stays behind the MLP.
    expect(analysis(store).seatRow.center.y).toBeCloseTo(2.63 - 1.1 / 2, 9)
    store.getState().undo()
    expect(seatRowSize(store)).toEqual({ width: 3.2, depth: 0.9 })
    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
  })

  it('records nothing for a size it already has', () => {
    const store = createConfigStore()

    store.getState().setSeatRowDimension('width', 2)

    expect(store.getState().config).toBe(DEFAULT_CONFIG)
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('round-trips through the share link, moved and resized', () => {
    const store = createConfigStore()
    store.getState().moveRoomObject(SEAT_ROW_ID, { x: -0.31234, y: 3.45678 })
    store.getState().setSeatRowDimension('depth', 1.3)
    const config: Config = store.getState().config

    const reopened = createConfigStore()
    reopened.getState().openEncodedConfig(encodeConfig(config))

    expect(seatRowSize(reopened)).toEqual({ width: 2, depth: 1.3 })
    expect(analysis(reopened).mlp).toEqual({ x: -0.312, y: 3.457, z: 1.2 })
    expect(analysis(reopened).seatRow.center.x).toBeCloseTo(-0.312, 9)
  })

  it('comes from a version 1 link as its seat row width, 0.9 m deep, where its MLP is', () => {
    const store = createConfigStore()

    // 15 x 15 m with the MLP moved by hand to (-7.2, 0.3) and an 8 m row.
    store.getState().openEncodedConfig(V1_LINKS.largestRoom.encoded)

    expect(store.getState().linkProblem).toBeNull()
    expect(seatRowSize(store)).toEqual({ width: 8, depth: 0.9 })
    // Cut off at the left wall (x -7.5): from -7.5 to -3.2.
    expect(analysis(store).seatRow.center.x).toBeCloseTo(-5.35, 9)
    expect(analysis(store).seatRow.width).toBeCloseTo(4.3, 9)
  })
})

describe('the screen', () => {
  it('is not there to begin with, as in v1.0.0', () => {
    expect(screen(createConfigStore())).toBeNull()
  })

  it('is added as a 65 in TV centred on the front wall, as one undo step', () => {
    const store = createConfigStore()

    store.getState().addScreen()

    expect(screen(store)).toEqual(TV)
    store.getState().undo()
    expect(screen(store)).toBeNull()
    store.getState().redo()
    expect(screen(store)).toEqual(TV)
  })

  it('is added only once', () => {
    const store = storeWithTv()

    store.getState().addScreen()

    expect(store.getState().history.canUndo).toBe(false)
  })

  it('is removed, and undo brings it back', () => {
    const store = storeWithTv()

    store.getState().removeScreen()

    expect(screen(store)).toBeNull()
    store.getState().undo()
    expect(screen(store)).toEqual(TV)
  })

  it('is resized within its ranges, and rejects a size outside them', () => {
    const store = storeWithTv()

    store.getState().setScreenDimension('width', 2)
    store.getState().setScreenDimension('height', 1.1)
    store.getState().setScreenDimension('bottomEdge', 0.7)
    // Wider than the 4.5 m front wall, then through the 2.6 m ceiling.
    store.getState().setScreenDimension('width', 5)
    store.getState().setScreenDimension('bottomEdge', 2)

    expect(screen(store)).toEqual({
      ...TV,
      width: 2,
      height: 1.1,
      bottomEdge: 0.7,
    })
    store.getState().undo()
    expect(screen(store)).toMatchObject({ height: 1.1, bottomEdge: 0.93 })
  })

  it('changes nothing without a screen', () => {
    const store = createConfigStore()

    store.getState().setScreenDimension('width', 2)
    store.getState().setScreenKind('projection')
    store.getState().setScreenAcousticallyTransparent(true)
    store.getState().moveRoomObject(SCREEN_ID, { x: 1, y: 0 })
    store.getState().removeScreen()

    expect(store.getState().config).toBe(DEFAULT_CONFIG)
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('becomes an acoustically transparent projection screen, with a standoff to edit', () => {
    const store = storeWithTv()

    store.getState().setScreenKind('projection')
    store.getState().setScreenAcousticallyTransparent(true)
    store.getState().setScreenDimension('standoff', 0.6)

    expect(screen(store)).toEqual({
      ...TV,
      kind: 'projection',
      standoff: 0.6,
    })
  })

  it('drops its standoff when it becomes a TV', () => {
    const store = storeWithTv()
    store.getState().setScreenKind('projection')
    store.getState().setScreenAcousticallyTransparent(true)

    store.getState().setScreenKind('tv')

    expect(screen(store)).toEqual(TV)
  })

  it('is dragged along the front wall as one undo step, stopping at a side wall', () => {
    const store = storeWithTv()

    store.getState().beginGesture()
    store.getState().moveRoomObject(SCREEN_ID, { x: 1, y: 2 })
    store.getState().moveRoomObject(SCREEN_ID, { x: 5, y: 3 })
    store.getState().endGesture()

    expect(screen(store)?.x).toBeCloseTo(1.53, 9)
    store.getState().undo()
    expect(screen(store)).toEqual(TV)
  })

  it('shrinks with the room, and undo gives both back', () => {
    const store = storeWithTv()
    store.getState().setScreenDimension('width', 4)

    store.getState().setRoomDimension('width', 3)

    expect(screen(store)).toMatchObject({ width: 3, x: 0 })
    store.getState().undo()
    expect(store.getState().config.room.width).toBe(4.5)
    expect(screen(store)?.width).toBe(4)
  })

  it('round-trips through the share link', () => {
    const store = storeWithTv()
    store.getState().setScreenKind('projection')
    store.getState().setScreenAcousticallyTransparent(true)
    store.getState().moveRoomObject(SCREEN_ID, { x: -0.4567, y: 0 })
    const config: Config = store.getState().config

    const reopened = createConfigStore()
    reopened.getState().openEncodedConfig(encodeConfig(config))

    expect(screen(reopened)).toEqual({
      ...config.roomObjects.screen,
      x: -0.457,
    })
  })

  it('is not there in a room from a version 1 link', () => {
    const store = createConfigStore()

    store.getState().openEncodedConfig(V1_LINKS.imperialRoom.encoded)

    expect(store.getState().linkProblem).toBeNull()
    expect(screen(store)).toBeNull()
    expect(
      decodeConfig(V1_LINKS.imperialRoom.encoded).config.roomObjects,
    ).toEqual({
      seatRow: { width: 3.048, depth: 0.9 },
      screen: null,
      furniture: [],
      openings: [],
    })
  })
})

function furniture(store: ConfigStore) {
  return store.getState().config.roomObjects.furniture
}

/** A store with the default room and a cabinet against the front wall. */
function storeWithCabinet(): ConfigStore {
  const store = createConfigStore()
  store.getState().addFurniture('cabinet')
  return store
}

describe('furniture boxes', () => {
  it('are not there to begin with, nor in a room from a version 1 link', () => {
    expect(furniture(createConfigStore())).toEqual([])
    const store = createConfigStore()
    store.getState().openEncodedConfig(V1_LINKS.imperialRoom.encoded)
    expect(furniture(store)).toEqual([])
  })

  it('are added from a preset against the middle of the front wall, each as one undo step', () => {
    const store = createConfigStore()

    store.getState().addFurniture('cabinet')
    store.getState().addFurniture('shelf')

    expect(furniture(store)).toEqual([
      {
        name: 'Cabinet',
        width: 1.6,
        depth: 0.45,
        height: 0.5,
        x: 0,
        y: 0.225,
        rotation: 0,
      },
      expect.objectContaining({ name: 'Shelf', height: 1.8, y: 0.15 }),
    ])
    store.getState().undo()
    expect(furniture(store).map(({ name }) => name)).toEqual(['Cabinet'])
    store.getState().redo()
    expect(furniture(store)).toHaveLength(2)
  })

  it('stop at eight', () => {
    const store = createConfigStore()
    for (let added = 0; added < 9; added += 1) {
      store.getState().addFurniture('table')
    }

    expect(furniture(store)).toHaveLength(8)
  })

  it('are renamed, trimmed, and keep their name for one that is rejected', () => {
    const store = storeWithCabinet()

    store.getState().setFurnitureName('furniture-1', ' TV-bänk ')
    store.getState().setFurnitureName('furniture-1', 'A very long name')
    store.getState().setFurnitureName('furniture-1', '')

    expect(furniture(store)[0]?.name).toBe('TV-bänk')
    store.getState().undo()
    expect(furniture(store)[0]?.name).toBe('Cabinet')
  })

  it('are resized and moved from the walls within their ranges', () => {
    const store = storeWithCabinet()

    store.getState().setFurnitureDimension('furniture-1', 'height', 0.8)
    store.getState().setFurnitureDimension('furniture-1', 'fromFrontWall', 1)
    store.getState().setFurnitureDimension('furniture-1', 'width', 9)

    expect(furniture(store)[0]).toMatchObject({
      height: 0.8,
      width: 1.6,
      y: 1.225,
    })
  })

  it('are turned a quarter turn at a time, as undo steps', () => {
    const store = storeWithCabinet()

    store.getState().turnFurniture('furniture-1')
    store.getState().turnFurniture('furniture-1')

    // Turned once against the front wall it moved in to 0.8 m.
    expect(furniture(store)[0]).toMatchObject({ rotation: 180, y: 0.8 })
    store.getState().undo()
    expect(furniture(store)[0]?.rotation).toBe(90)
  })

  it('are dragged as one undo step, stopping at the walls', () => {
    const store = storeWithCabinet()

    store.getState().beginGesture()
    store.getState().moveRoomObject('furniture-1', { x: 1, y: 2 })
    store.getState().moveRoomObject('furniture-1', { x: 9, y: 3 })
    store.getState().endGesture()

    expect(furniture(store)[0]).toMatchObject({ x: 1.45, y: 3 })
    store.getState().undo()
    expect(furniture(store)[0]).toMatchObject({ x: 0, y: 0.225 })
  })

  it('are removed, the next one moving up, and undo brings it back', () => {
    const store = storeWithCabinet()
    store.getState().addFurniture('shelf')

    store.getState().removeFurniture('furniture-1')

    expect(furniture(store).map(({ name }) => name)).toEqual(['Shelf'])
    store.getState().undo()
    expect(furniture(store).map(({ name }) => name)).toEqual([
      'Cabinet',
      'Shelf',
    ])
  })

  it('change nothing for a box that is not there', () => {
    const store = storeWithCabinet()
    const before = store.getState().config

    store.getState().removeFurniture('furniture-2')
    store.getState().turnFurniture('furniture-3')
    store.getState().moveRoomObject('furniture-2', { x: 1, y: 1 })

    expect(store.getState().config).toBe(before)
  })

  it('shrink with the room, and undo gives both back', () => {
    const store = storeWithCabinet()
    store.getState().setFurnitureDimension('furniture-1', 'width', 4)

    store.getState().setRoomDimension('width', 3)

    expect(furniture(store)[0]).toMatchObject({ width: 3, x: 0 })
    store.getState().undo()
    expect(furniture(store)[0]?.width).toBe(4)
  })

  it('give placement warnings in the analysis, and leave the estimate as it is', () => {
    const store = storeWithCabinet()
    const before = analysis(store).response
    store.getState().setFurnitureDimension('furniture-1', 'height', 2)
    store.getState().setFurnitureDimension('furniture-1', 'fromFrontWall', 1)

    expect(
      analysis(store).placementWarnings.map(({ id, items }) => [id, ...items]),
    ).toContainEqual(['W4', 'C', 'furniture-1'])
    expect(analysis(store).response).toEqual(before)
  })

  it('round-trip through the share link to the millimeter', () => {
    const store = storeWithCabinet()
    store.getState().setFurnitureName('furniture-1', 'Hylla för CD')
    store.getState().turnFurniture('furniture-1')
    store.getState().moveRoomObject('furniture-1', { x: -1.23456, y: 3.21 })
    const config: Config = store.getState().config

    const reopened = createConfigStore()
    reopened.getState().openEncodedConfig(encodeConfig(config))

    expect(furniture(reopened)).toEqual([
      { ...config.roomObjects.furniture[0], x: -1.235 },
    ])
  })
})

function openings(store: ConfigStore) {
  return store.getState().config.roomObjects.openings
}

/** A store with the default room and a door in the middle of the back wall. */
function storeWithDoor(): ConfigStore {
  const store = createConfigStore()
  store.getState().addOpening('door')
  return store
}

/** The default door: 0.9 m, in the middle of the default room's back wall. */
const DOOR = { kind: 'door', wall: 'back', position: 2.25, width: 0.9 }

describe('doors and windows', () => {
  it('are not there to begin with, nor in a room from a version 1 link', () => {
    expect(openings(createConfigStore())).toEqual([])
    const store = createConfigStore()
    store.getState().openEncodedConfig(V1_LINKS.imperialRoom.encoded)
    expect(openings(store)).toEqual([])
  })

  it('are added, a door on the back wall and a window on the right wall, each as one undo step', () => {
    const store = createConfigStore()

    store.getState().addOpening('door')
    store.getState().addOpening('window')

    expect(openings(store)).toEqual([
      DOOR,
      {
        kind: 'window',
        wall: 'right',
        position: 3,
        width: 1.2,
        sill: 0.9,
        height: 1.2,
      },
    ])
    store.getState().undo()
    expect(openings(store)).toEqual([DOOR])
    store.getState().redo()
    expect(openings(store)).toHaveLength(2)
  })

  it('stop at six', () => {
    const store = createConfigStore()
    for (let added = 0; added < 7; added += 1) {
      store.getState().addOpening('window')
    }

    expect(openings(store)).toHaveLength(6)
  })

  it('move to another wall, and are resized and moved along it within their ranges', () => {
    const store = storeWithDoor()

    store.getState().setOpeningWall('opening-1', 'left')
    store.getState().setOpeningDimension('opening-1', 'fromCorner', 1)
    store.getState().setOpeningDimension('opening-1', 'width', 0.8)
    store.getState().setOpeningDimension('opening-1', 'width', 0.1)
    store.getState().setOpeningDimension('opening-1', 'sill', 0.5)

    expect(openings(store)).toEqual([
      { ...DOOR, wall: 'left', position: 1.45, width: 0.8 },
    ])
    store.getState().undo()
    expect(openings(store)[0]).toMatchObject({ position: 1.45, width: 0.9 })
  })

  it('are dragged along their wall as one undo step, stopping at a corner', () => {
    const store = storeWithDoor()

    store.getState().beginGesture()
    store.getState().moveRoomObject('opening-1', { x: 1, y: 3 })
    store.getState().moveRoomObject('opening-1', { x: 9, y: 3 })
    store.getState().endGesture()

    expect(openings(store)).toEqual([{ ...DOOR, position: 4.05 }])
    store.getState().undo()
    expect(openings(store)).toEqual([DOOR])
  })

  it('are removed, the next one moving up, and undo brings it back', () => {
    const store = storeWithDoor()
    store.getState().addOpening('window')

    store.getState().removeOpening('opening-1')

    expect(openings(store).map(({ kind }) => kind)).toEqual(['window'])
    store.getState().undo()
    expect(openings(store).map(({ kind }) => kind)).toEqual(['door', 'window'])
  })

  it('change nothing for an opening that is not there', () => {
    const store = storeWithDoor()
    const before = store.getState().config

    store.getState().removeOpening('opening-2')
    store.getState().setOpeningWall('opening-2', 'front')
    store.getState().moveRoomObject('opening-3', { x: 1, y: 1 })

    expect(store.getState().config).toBe(before)
  })

  it('stay on their wall when the room shrinks, and undo gives both back', () => {
    const store = storeWithDoor()

    store.getState().setRoomDimension('width', 2)

    // Into the right corner of the 2 m back wall.
    expect(openings(store)[0]?.position).toBeCloseTo(1.55, 12)
    store.getState().undo()
    expect(openings(store)).toEqual([DOOR])
  })

  it('warn about a speaker dragged in front of a door, and stop when it moves away', () => {
    const store = storeWithDoor()
    const doorWarnings = () =>
      analysis(store)
        .placementWarnings.filter(({ id }) => id === 'W1')
        .map(({ items }) => items)
    expect(doorWarnings()).toEqual([])

    store.getState().moveItem('Ls', { x: 0.2, y: 5.6 })
    expect(doorWarnings()).toEqual([['Ls', 'opening-1']])

    store.getState().moveItem('Ls', { x: -1.5, y: 5.6 })
    expect(doorWarnings()).toEqual([])
  })

  it('leave the estimated response as it is', () => {
    const store = storeWithDoor()
    store.getState().addOpening('window')

    expect(analysis(store).response).toEqual(
      analyzeRoom(DEFAULT_CONFIG).response,
    )
  })

  it('round-trip through the share link to the millimeter', () => {
    const store = storeWithDoor()
    store.getState().addOpening('window')
    store.getState().setOpeningDimension('opening-2', 'width', 36 * 0.0254)
    store.getState().moveRoomObject('opening-1', { x: -1.23456, y: 6 })
    const config: Config = store.getState().config

    const reopened = createConfigStore()
    reopened.getState().openEncodedConfig(encodeConfig(config))

    expect(openings(reopened)).toEqual([
      { ...DOOR, position: 1.015 },
      { ...config.roomObjects.openings[1], width: 0.914 },
    ])
  })
})
