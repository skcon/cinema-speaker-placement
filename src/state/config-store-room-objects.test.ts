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
    })
  })
})
