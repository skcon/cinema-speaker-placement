import { describe, expect, it } from 'vitest'
import { createConfigStore } from '@/state/config-store'

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
