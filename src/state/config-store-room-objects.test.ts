import { describe, expect, it } from 'vitest'
import {
  decodeConfig,
  DEFAULT_CONFIG,
  encodeConfig,
  SCREEN_ID,
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
  return createConfigStore({ ...DEFAULT_CONFIG, roomObjects: { screen: TV } })
}

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
    ).toEqual({ screen: null })
  })
})
