import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  encodeConfig,
  withCrossover,
  withDragged,
  withLayout,
  withPositionLength,
  withRoomDimension,
  withSubwooferHasOwnSpecs,
  withSpeakersFollowSeat,
  withSubwooferSpecs,
  type Config,
  type DragTarget,
  type FloorPoint,
} from '@/domain'
import {
  createConfigStore,
  isShowingLinkFallback,
  isUneditedSinceOpened,
  type ConfigEdit,
  type ConfigStore,
} from '@/state/config-store'
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

  it('switches units without changing the room, which stays in meters', () => {
    const store = createConfigStore()

    store.getState().setUnits('imperial')

    expect(store.getState().config).toMatchObject({
      units: 'imperial',
      room: { length: 6, width: 4.5, height: 2.6 },
    })
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

describe('applying a config edit', () => {
  // What each edit does is tested in the domain; here, how the store
  // records it.
  it('stores the config the edit gives', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store
      .getState()
      .applyEdit((config) => withRoomDimension(config, 'length', 7))

    expect(store.getState().config).toEqual(
      withRoomDimension(IMPERIAL_ROOM, 'length', 7),
    )
  })

  it('gives each edit the config as the edits before it left it', () => {
    const store = createConfigStore()
    const seen: Config[] = []

    store
      .getState()
      .applyEdit((config) => withRoomDimension(config, 'length', 7))
    store.getState().applyEdit((config) => {
      seen.push(config)
      return config
    })

    expect(seen).toEqual([store.getState().config])
    expect(seen[0]?.room.length).toBe(7)
  })

  it('makes an edit one undo step, which redo makes again', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().applyEdit((config) => withCrossover(config, 60))
    const edited = store.getState().config
    expect(store.getState().history).toEqual({ canUndo: true, canRedo: false })

    store.getState().undo()
    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
    expect(store.getState().history).toEqual({ canUndo: false, canRedo: true })
    store.getState().redo()
    expect(store.getState().config).toEqual(edited)
  })

  it.each<[string, ConfigEdit]>([
    ['gives the same config back', (config) => config],
    ['is rejected', (config) => withRoomDimension(config, 'width', 20)],
    ['changes nothing', (config) => withCrossover(config, 100)],
  ])(
    'changes no state for an edit that %s, so undo has nothing to record',
    (_, edit) => {
      const store = createConfigStore(IMPERIAL_ROOM)
      let notified = 0
      store.subscribe(() => {
        notified += 1
      })

      store.getState().applyEdit(edit)

      expect(store.getState().config).toBe(IMPERIAL_ROOM)
      expect(store.getState().history.canUndo).toBe(false)
      expect(notified).toBe(0)
    },
  )

  it('makes one undo step per edit', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store
      .getState()
      .applyEdit((config) =>
        withLayout(config, { ...config.layout, subwoofers: 4 }),
      )
    store
      .getState()
      .applyEdit((config) => withSubwooferHasOwnSpecs(config, 'Sub4', true))
    store
      .getState()
      .applyEdit((config) =>
        withSubwooferSpecs(config, 'Sub4', { rmsWatts: 400 }),
      )

    store.getState().undo()
    expect(store.getState().config.speakerGroups.subwoofers.ownSpecs).toEqual({
      ...IMPERIAL_ROOM.speakerGroups.subwoofers.ownSpecs,
      Sub4: IMPERIAL_ROOM.speakerGroups.subwoofers.specs,
    })
    store.getState().undo()
    expect(store.getState().config.layout.subwoofers).toBe(4)
    store.getState().undo()
    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
    expect(store.getState().history.canUndo).toBe(false)
  })
})

/** Drag `target` to `to`, as the room view does on each pointer move. */
function drag(store: ConfigStore, target: DragTarget, to: FloorPoint) {
  store.getState().applyEdit((config) => withDragged(config, target, to))
}

function manual(store: ConfigStore) {
  return store.getState().config.manualPositions
}

describe('undo and redo', () => {
  it('step back and forward through edits', () => {
    const store = createConfigStore()
    store
      .getState()
      .applyEdit((config) => withRoomDimension(config, 'length', 7))
    store
      .getState()
      .applyEdit((config) =>
        withLayout(config, { ...config.layout, dolbyLayout: '7.1' }),
      )

    store.getState().undo()
    expect(store.getState().config.layout.dolbyLayout).toBe('5.1.2')
    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)

    store.getState().redo()
    store.getState().redo()
    expect(store.getState().config).toMatchObject({
      room: { length: 7 },
      layout: { dolbyLayout: '7.1' },
    })
  })

  it('take a whole drag back in one step, however many moves it made', () => {
    const store = createConfigStore()

    store.getState().beginGesture()
    drag(store, 'R', { x: 1, y: 1 })
    drag(store, 'R', { x: 1.2, y: 1.1 })
    drag(store, 'R', { x: 1.4, y: 1.2 })
    // The config follows the drag live.
    expect(manual(store)).toEqual({ R: { x: 1.4, y: 1.2, z: 1.2 } })
    store.getState().endGesture()

    expect(store.getState().history.canUndo).toBe(true)
    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().history.canUndo).toBe(false)
    store.getState().redo()
    expect(manual(store)).toEqual({ R: { x: 1.4, y: 1.2, z: 1.2 } })
  })

  it('record nothing for a drag that moved nothing', () => {
    const store = createConfigStore()

    store.getState().beginGesture()
    // The default room has no furniture: the edit changes nothing.
    drag(store, 'furniture-1', { x: 1, y: 1 })
    store.getState().endGesture()

    expect(store.getState().config).toBe(DEFAULT_CONFIG)
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('count a drag started twice (a second finger) as one, ended by its last end', () => {
    const store = createConfigStore()

    store.getState().beginGesture()
    drag(store, 'R', { x: 1, y: 1 })
    store.getState().beginGesture()
    drag(store, 'L', { x: -1, y: 1 })
    store.getState().endGesture()
    // Still dragging: nothing is recorded yet.
    expect(store.getState().history.canUndo).toBe(false)
    drag(store, 'R', { x: 1.5, y: 1 })
    store.getState().endGesture()
    // An extra end changes nothing.
    store.getState().endGesture()

    expect(Object.keys(manual(store)).toSorted()).toEqual(['L', 'R'])
    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('keep a sidebar edit applied as a drag starts as its own step', () => {
    // The room view leaves the text field (applying its edit) before it
    // starts the drag.
    const store = createConfigStore()

    store
      .getState()
      .applyEdit((config) => withPositionLength(config, 'C', 'height', 1.5))
    store.getState().beginGesture()
    drag(store, 'R', { x: 1, y: 1 })
    store.getState().endGesture()

    store.getState().undo()
    expect(Object.keys(manual(store))).toEqual(['C'])
    expect(manual(store).C?.z).toBe(1.5)
    store.getState().undo()
    expect(manual(store)).toEqual({})
  })

  it('wait while a drag is in progress', () => {
    const store = createConfigStore()
    store
      .getState()
      .applyEdit((config) => withRoomDimension(config, 'length', 7))

    store.getState().beginGesture()
    drag(store, 'R', { x: 1, y: 1 })
    store.getState().undo()
    store.getState().redo()

    expect(store.getState().config.room.length).toBe(7)
    expect(manual(store).R).toBeDefined()
    store.getState().endGesture()
    store.getState().undo()
    expect(manual(store)).toEqual({})
    expect(store.getState().config.room.length).toBe(7)
  })

  it('keep a drag one step when a share link opens in the middle of it', () => {
    const store = createConfigStore()

    store.getState().beginGesture()
    drag(store, 'R', { x: 1, y: 1 })
    store.getState().openEncodedConfig(encodeConfig(IMPERIAL_ROOM))
    store.getState().endGesture()
    // The link replaced the room and the drag with it; edits are tracked again.
    store.getState().setTargetCurve('flat')
    store
      .getState()
      .applyEdit((config) => withRoomDimension(config, 'length', 9))

    expect(store.getState().config).toMatchObject({
      ...IMPERIAL_ROOM,
      targetCurve: 'flat',
      room: { length: 9 },
    })
    store.getState().undo()
    expect(store.getState().config.room.length).toBe(8)
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('leave out view preferences: units and the target curve', () => {
    const store = createConfigStore()

    store.getState().setUnits('imperial')
    store.getState().setTargetCurve('house')
    expect(store.getState().history.canUndo).toBe(false)

    store
      .getState()
      .applyEdit((config) => withRoomDimension(config, 'length', 7))
    store.getState().undo()
    expect(store.getState().config).toMatchObject({
      units: 'imperial',
      targetCurve: 'house',
      room: { length: 6 },
    })
  })

  it('never undo into a share link opened from the address, nor past it', () => {
    const store = createConfigStore()
    store
      .getState()
      .applyEdit((config) => withRoomDimension(config, 'length', 7))

    store.getState().openEncodedConfig(encodeConfig(IMPERIAL_ROOM))

    expect(store.getState().history.canUndo).toBe(false)
    store.getState().undo()
    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
  })
})

describe('Speakers follow the seat (#123)', () => {
  /** Where Left is in the store's room. */
  const left = (store: ConfigStore) =>
    analyzeRoom(store.getState().config).speakers.find(
      ({ channel }) => channel === 'L',
    )?.position

  it('makes turning it off and on one undo step each', () => {
    const store = createConfigStore()

    store
      .getState()
      .applyEdit((config) => withSpeakersFollowSeat(config, false))
    const off = store.getState().config
    store.getState().applyEdit((config) => withSpeakersFollowSeat(config, true))

    store.getState().undo()
    expect(store.getState().config).toEqual(off)
    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('on: an MLP drag moves the speakers live, and is one undo step', () => {
    const store = createConfigStore()
    const before = left(store)

    store.getState().beginGesture()
    drag(store, 'MLP', { x: 0, y: 3 })
    const during = left(store)
    drag(store, 'MLP', { x: 0.2, y: 3.4 })
    store.getState().endGesture()

    expect(during).not.toEqual(before)
    expect(left(store)).not.toEqual(during)
    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('off: an MLP drag leaves the speakers where they are', () => {
    const store = createConfigStore(
      withSpeakersFollowSeat(DEFAULT_CONFIG, false),
    )
    const before = left(store)

    store.getState().beginGesture()
    drag(store, 'MLP', { x: 0.2, y: 3.4 })
    store.getState().endGesture()

    expect(left(store)).toEqual(before)
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

    store
      .getState()
      .applyEdit((config) => withRoomDimension(config, 'length', 7))

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

describe('unedited since opened', () => {
  it('holds for the room a link opened until it is edited', () => {
    const store = createConfigStore()
    store.getState().openEncodedConfig(encodeConfig(IMPERIAL_ROOM))
    expect(isUneditedSinceOpened(store.getState())).toBe(true)

    store
      .getState()
      .applyEdit((config) => withRoomDimension(config, 'length', 9))

    expect(isUneditedSinceOpened(store.getState())).toBe(false)
  })

  it('holds again when another link opens, and for the default room', () => {
    const store = createConfigStore()
    expect(isUneditedSinceOpened(store.getState())).toBe(true)
    store.getState().setUnits('imperial')
    expect(isUneditedSinceOpened(store.getState())).toBe(false)

    store.getState().openEncodedConfig(undefined)

    expect(isUneditedSinceOpened(store.getState())).toBe(true)
  })
})
