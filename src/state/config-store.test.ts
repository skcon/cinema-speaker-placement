import { describe, expect, it } from 'vitest'
import { analyzeRoom, DEFAULT_CONFIG, encodeConfig } from '@/domain'
import { createConfigStore } from '@/state/config-store'
import { IMPERIAL_ROOM } from '@/test/share-link-fixtures'

describe('config store', () => {
  it('starts with the default config: metric, 6 x 4.5 x 2.6 m, 5.1.2', () => {
    const store = createConfigStore()

    expect(store.getState().config).toEqual({
      units: 'metric',
      room: { length: 6, width: 4.5, height: 2.6 },
      layout: { dolbyLayout: '5.1.2', subwoofers: 1 },
    })
  })

  it('can start from a given config', () => {
    const store = createConfigStore({
      units: 'imperial',
      room: { length: 8, width: 5, height: 3 },
      layout: { dolbyLayout: '7.1.4', subwoofers: 2 },
    })

    expect(store.getState().config).toEqual({
      units: 'imperial',
      room: { length: 8, width: 5, height: 3 },
      layout: { dolbyLayout: '7.1.4', subwoofers: 2 },
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

    expect(store.getState().config).toMatchObject({
      units: 'imperial',
      room: { length: 6, width: 4.5, height: 2.6 },
    })
  })

  it('switches to another v1 layout, keeping the room and the subwoofer count', () => {
    const store = createConfigStore({
      ...DEFAULT_CONFIG,
      room: { length: 8, width: 5, height: 3 },
      layout: { dolbyLayout: '5.1.2', subwoofers: 2 },
    })

    store.getState().setLayout('7.1.4')

    expect(store.getState().config).toMatchObject({
      room: { length: 8, width: 5, height: 3 },
      layout: { dolbyLayout: '7.1.4', subwoofers: 2 },
    })
  })

  it('auto-place keeps the room and layout and puts every speaker at its auto-placed position', () => {
    const store = createConfigStore()
    store.getState().setLayout('7.1')
    store.getState().setRoomDimension('width', 5)

    store.getState().autoPlace()

    const sevenOneInFiveMeters = {
      ...DEFAULT_CONFIG,
      room: { length: 6, width: 5, height: 2.6 },
      layout: { dolbyLayout: '7.1', subwoofers: 1 },
    } as const
    expect(store.getState().config).toEqual(sevenOneInFiveMeters)
    expect(analyzeRoom(store.getState().config).speakers).toEqual(
      analyzeRoom(sevenOneInFiveMeters).speakers,
    )
  })

  it('auto-place changes nothing while every position is derived, so undo has nothing to record', () => {
    const store = createConfigStore()
    const before = store.getState().config
    let notified = 0
    store.subscribe(() => {
      notified += 1
    })

    store.getState().autoPlace()

    expect(store.getState().config).toBe(before)
    expect(notified).toBe(0)
  })
})

describe('opening an encoded config', () => {
  it("replaces the config with the link's config", () => {
    const store = createConfigStore()

    store.getState().openEncodedConfig(encodeConfig(IMPERIAL_ROOM))

    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
    expect(store.getState().linkProblem).toBeNull()
  })

  it('falls back to the default room and keeps the problem when the link is broken', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().openEncodedConfig('not-an-encoded-config')

    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().linkProblem).toBe('unreadable')
  })

  it('shows the default room without an encoded config', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().openEncodedConfig(undefined)

    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().linkProblem).toBeNull()
  })

  it('forgets an earlier problem once a good link opens', () => {
    const store = createConfigStore()
    store.getState().openEncodedConfig('not-an-encoded-config')

    store.getState().openEncodedConfig(encodeConfig(IMPERIAL_ROOM))

    expect(store.getState().linkProblem).toBeNull()
  })

  it('can dismiss the problem and keep the default room', () => {
    const store = createConfigStore()
    store.getState().openEncodedConfig('not-an-encoded-config')

    store.getState().dismissLinkProblem()

    expect(store.getState().linkProblem).toBeNull()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
  })
})
