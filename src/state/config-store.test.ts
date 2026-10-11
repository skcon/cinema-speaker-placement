import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, encodeConfig, type Config } from '@/domain'
import { createConfigStore } from '@/state/config-store'

const IMPERIAL_ROOM: Config = {
  ...DEFAULT_CONFIG,
  units: 'imperial',
  room: { length: 8, width: 5, height: 3 },
}

describe('config store', () => {
  it('starts with the default config: metric, 6 x 4.5 x 2.6 m', () => {
    const store = createConfigStore()

    expect(store.getState().config).toEqual({
      units: 'metric',
      room: { length: 6, width: 4.5, height: 2.6 },
    })
  })

  it('can start from a given config', () => {
    const store = createConfigStore({
      units: 'imperial',
      room: { length: 8, width: 5, height: 3 },
    })

    expect(store.getState().config).toEqual({
      units: 'imperial',
      room: { length: 8, width: 5, height: 3 },
    })
  })

  it('stores a new room dimension in meters', () => {
    const store = createConfigStore()

    store.getState().setRoomDimension('length', 7.25)
    store.getState().setRoomDimension('height', 3)

    expect(store.getState().config.room).toEqual({
      length: 7.25,
      width: 4.5,
      height: 3,
    })
  })

  it('ignores an out-of-range or non-numeric dimension, so the config stays valid', () => {
    const store = createConfigStore()

    store.getState().setRoomDimension('width', 20)
    store.getState().setRoomDimension('height', 1.5)
    store.getState().setRoomDimension('length', Number.NaN)

    expect(store.getState().config.room).toEqual({
      length: 6,
      width: 4.5,
      height: 2.6,
    })
  })

  it('switches units without changing the room, which stays in meters', () => {
    const store = createConfigStore()

    store.getState().setUnits('imperial')

    expect(store.getState().config).toEqual({
      units: 'imperial',
      room: { length: 6, width: 4.5, height: 2.6 },
    })
  })
})

describe('opening a share link', () => {
  it("replaces the config with the link's config", () => {
    const store = createConfigStore()

    store.getState().openShareLink(encodeConfig(IMPERIAL_ROOM))

    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
    expect(store.getState().linkProblem).toBeNull()
  })

  it('falls back to the default room and keeps the problem when the link is broken', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().openShareLink('not-a-share-link')

    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().linkProblem).toBe('unreadable')
  })

  it('shows the default room for an address without a share link', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().openShareLink(undefined)

    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().linkProblem).toBeNull()
  })

  it('forgets an earlier problem once a good link opens', () => {
    const store = createConfigStore()
    store.getState().openShareLink('not-a-share-link')

    store.getState().openShareLink(encodeConfig(IMPERIAL_ROOM))

    expect(store.getState().linkProblem).toBeNull()
  })

  it('can dismiss the problem and keep the default room', () => {
    const store = createConfigStore()
    store.getState().openShareLink('not-a-share-link')

    store.getState().dismissLinkProblem()

    expect(store.getState().linkProblem).toBeNull()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
  })
})
