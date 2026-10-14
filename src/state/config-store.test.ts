import { describe, expect, it } from 'vitest'
import { analyzeRoom, DEFAULT_CONFIG, encodeConfig } from '@/domain'
import { createConfigStore, isShowingLinkFallback } from '@/state/config-store'
import { IMPERIAL_ROOM } from '@/test/share-link-fixtures'

describe('config store', () => {
  it('starts with the default config: metric, 6 x 4.5 x 2.6 m, 5.1.2', () => {
    const store = createConfigStore()

    expect(store.getState().config).toMatchObject({
      units: 'metric',
      room: { length: 6, width: 4.5, height: 2.6 },
      layout: { dolbyLayout: '5.1.2', subwoofers: 1 },
    })
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
  })

  it('can start from a given config', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
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

  it('switches to another v1 layout, keeping the room, the subwoofers with their specs and positions, and dropping removed channels', () => {
    // Subwoofer 2 and the Right Rear Surround are manual.
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().setLayout('5.1')

    expect(store.getState().config).toEqual({
      ...IMPERIAL_ROOM,
      layout: { dolbyLayout: '5.1', subwoofers: 2 },
      manualPositions: { Sub2: IMPERIAL_ROOM.manualPositions.Sub2 },
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

describe('target curve', () => {
  it('starts flat and switches to the house curve and back, keeping the rest of the config', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().setTargetCurve('flat')
    expect(store.getState().config).toEqual({
      ...IMPERIAL_ROOM,
      targetCurve: 'flat',
    })

    store.getState().setTargetCurve('house')
    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
    expect(createConfigStore().getState().config.targetCurve).toBe('flat')
  })
})

describe('crossover', () => {
  it('starts at 80 Hz and takes any frequency from 40 to 200 Hz, keeping the rest of the config', () => {
    expect(createConfigStore().getState().config.crossoverHz).toBe(80)
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().setCrossover(60)
    expect(store.getState().config).toEqual({
      ...IMPERIAL_ROOM,
      crossoverHz: 60,
    })
    store.getState().setCrossover(200)
    expect(store.getState().config.crossoverHz).toBe(200)
  })

  it('is an undoable change, like the specs', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().setCrossover(60)
    store.getState().undo()
    expect(store.getState().config.crossoverHz).toBe(100)
    store.getState().redo()
    expect(store.getState().config.crossoverHz).toBe(60)
  })

  it.each([39, 201, Number.NaN])('ignores %d Hz', (hz) => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().setCrossover(hz)

    expect(store.getState().config).toBe(IMPERIAL_ROOM)
  })
})

describe('subwoofers', () => {
  const PORTED_15 = {
    enclosure: 'ported',
    driverDiameter: 0.381,
    rmsWatts: 800,
    peakWatts: 1600,
  } as const
  const SEALED_12 = IMPERIAL_ROOM.speakerGroups.subwoofers.ownSpecs.Sub2

  function subwooferGroup(store: ReturnType<typeof createConfigStore>) {
    return store.getState().config.speakerGroups.subwoofers
  }

  it('can be 1 to 4 for the same layout, none with own specs when added', () => {
    const store = createConfigStore()

    store.getState().setSubwooferCount(3)

    expect(store.getState().config.layout).toEqual({
      dolbyLayout: '5.1.2',
      subwoofers: 3,
    })
    expect(subwooferGroup(store).ownSpecs).toEqual({})
  })

  it('keep their own specs, by subwoofer, while they stay in the layout, and drop them when removed', () => {
    // Subwoofer 2 has its own specs.
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().setSubwooferCount(4)
    expect(subwooferGroup(store).ownSpecs).toEqual({ Sub2: SEALED_12 })

    store.getState().setSubwooferCount(1)
    expect(subwooferGroup(store).ownSpecs).toEqual({})

    store.getState().setSubwooferCount(2)
    expect(subwooferGroup(store).ownSpecs).toEqual({})
  })

  it('drop only the removed subwoofer’s own specs when going from 4 to 3', () => {
    const store = createConfigStore({
      ...IMPERIAL_ROOM,
      layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
      speakerGroups: {
        subwoofers: {
          specs: PORTED_15,
          ownSpecs: { Sub3: SEALED_12, Sub4: SEALED_12 },
        },
      },
    })

    store.getState().setSubwooferCount(3)

    expect(subwooferGroup(store).ownSpecs).toEqual({ Sub3: SEALED_12 })
  })

  it('share the Subwoofers group specs, which can be edited one spec at a time', () => {
    const store = createConfigStore()

    store.getState().setSubwooferSpecs('group', { enclosure: 'ported' })
    store.getState().setSubwooferSpecs('group', { driverDiameter: 0.381 })
    store.getState().setSubwooferSpecs('group', { peakWatts: 1600 })
    store.getState().setSubwooferSpecs('group', { rmsWatts: 800 })

    expect(subwooferGroup(store)).toEqual({
      specs: PORTED_15,
      ownSpecs: {},
    })
  })

  it('ignore specs out of range or with the peak power below the RMS power, so the config stays valid', () => {
    const store = createConfigStore()
    const before = store.getState().config

    store.getState().setSubwooferSpecs('group', { driverDiameter: 0.1 })
    store.getState().setSubwooferSpecs('group', { rmsWatts: 5 })
    store.getState().setSubwooferSpecs('group', { peakWatts: Number.NaN })
    // The default peak power is 600 W.
    store.getState().setSubwooferSpecs('group', { rmsWatts: 700 })

    expect(store.getState().config).toBe(before)
  })

  it('can each get own specs, starting from the group specs, and give them up again', () => {
    const store = createConfigStore({
      ...IMPERIAL_ROOM,
      speakerGroups: { subwoofers: { specs: PORTED_15, ownSpecs: {} } },
    })

    store.getState().setSubwooferHasOwnSpecs('Sub2', true)
    expect(subwooferGroup(store).ownSpecs).toEqual({ Sub2: PORTED_15 })

    store.getState().setSubwooferSpecs('Sub2', { enclosure: 'sealed' })
    expect(subwooferGroup(store)).toEqual({
      specs: PORTED_15,
      ownSpecs: { Sub2: { ...PORTED_15, enclosure: 'sealed' } },
    })

    store.getState().setSubwooferHasOwnSpecs('Sub2', false)
    expect(subwooferGroup(store).ownSpecs).toEqual({})
  })

  it('ignore spec edits for a subwoofer without own specs, or not in the layout', () => {
    const store = createConfigStore(IMPERIAL_ROOM)
    const before = store.getState().config

    // Subwoofer 1 uses the group specs; there are only two subwoofers.
    store.getState().setSubwooferSpecs('Sub1', { rmsWatts: 400 })
    store.getState().setSubwooferSpecs('Sub3', { rmsWatts: 400 })
    store.getState().setSubwooferHasOwnSpecs('Sub3', true)
    store.getState().setSubwooferHasOwnSpecs('Sub2', true)
    store.getState().setSubwooferHasOwnSpecs('Sub1', false)
    store.getState().setSubwooferSpecs('Sub2', { rmsWatts: 5000 })

    expect(store.getState().config).toBe(before)
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

describe('the default room shown for a broken link', () => {
  it('stays the fallback, even once the message is dismissed', () => {
    const store = createConfigStore()

    store.getState().openEncodedConfig('not-an-encoded-config')
    expect(isShowingLinkFallback(store.getState())).toBe(true)

    store.getState().dismissLinkProblem()
    expect(isShowingLinkFallback(store.getState())).toBe(true)
  })

  it('stops being the fallback once the config is edited', () => {
    const store = createConfigStore()
    store.getState().openEncodedConfig('not-an-encoded-config')

    store.getState().setRoomDimension('length', 7)

    expect(isShowingLinkFallback(store.getState())).toBe(false)
  })

  it('stops being the fallback once a good link opens', () => {
    const store = createConfigStore()
    store.getState().openEncodedConfig('not-an-encoded-config')

    store.getState().openEncodedConfig(encodeConfig(IMPERIAL_ROOM))

    expect(isShowingLinkFallback(store.getState())).toBe(false)
  })

  it('is not shown without a broken link, even for the default config', () => {
    const store = createConfigStore()

    store.getState().openEncodedConfig(undefined)

    expect(isShowingLinkFallback(store.getState())).toBe(false)
  })
})
