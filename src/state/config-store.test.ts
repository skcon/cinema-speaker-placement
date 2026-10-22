import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, encodeConfig } from '@/domain'
import {
  createConfigStore,
  isShowingLinkFallback,
  isUneditedSinceOpened,
  type ConfigState,
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

  it('switches units without changing the room, which stays in meters', () => {
    const store = createConfigStore()

    store.getState().setUnits('imperial')

    expect(store.getState().config).toMatchObject({
      units: 'imperial',
      room: { length: 6, width: 4.5, height: 2.6 },
    })
  })

  it('auto-place changes nothing when everything is already where it puts it, so undo has nothing to record', () => {
    const store = createConfigStore()
    store.getState().autoPlace()
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

describe('room edits', () => {
  // The rules behind each edit are tested in the domain
  // (config-edits.test.ts); here, how each becomes an undo step. The
  // imperial room: 7.1.4 with two subwoofers, Subwoofer 2 with own specs.
  type Edit = (state: ConfigState) => void

  it.each<[string, Edit]>([
    ['a room dimension', (s) => s.setRoomDimension('length', 7)],
    ['the Dolby layout', (s) => s.setLayout('5.1')],
    ['the subwoofer count', (s) => s.setSubwooferCount(1)],
    [
      'group subwoofer specs',
      (s) => s.setSubwooferSpecs('group', { rmsWatts: 400 }),
    ],
    [
      'own subwoofer specs',
      (s) => s.setSubwooferSpecs('Sub2', { rmsWatts: 400 }),
    ],
    [
      'speaker group specs',
      (s) => s.setSpeakerSpecs('front', { type: 'bookshelf' }),
    ],
    ['the amplifier power', (s) => s.setAmplifierWatts(200)],
    ['giving own specs', (s) => s.setSubwooferHasOwnSpecs('Sub1', true)],
    ['giving up own specs', (s) => s.setSubwooferHasOwnSpecs('Sub2', false)],
    ['the crossover', (s) => s.setCrossover(60)],
  ])('make changing %s one undo step', (_, edit) => {
    const store = createConfigStore(IMPERIAL_ROOM)

    edit(store.getState())
    const edited = store.getState().config
    expect(edited).not.toEqual(IMPERIAL_ROOM)
    expect(store.getState().history.canUndo).toBe(true)

    store.getState().undo()
    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
    expect(store.getState().history.canUndo).toBe(false)
    store.getState().redo()
    expect(store.getState().config).toEqual(edited)
  })

  it.each<[string, Edit]>([
    ['an out-of-range dimension', (s) => s.setRoomDimension('width', 20)],
    ['the same dimension', (s) => s.setRoomDimension('length', 8)],
    ['the same layout', (s) => s.setLayout('7.1.4')],
    ['the same subwoofer count', (s) => s.setSubwooferCount(2)],
    [
      'out-of-range subwoofer specs',
      (s) => s.setSubwooferSpecs('group', { rmsWatts: 5 }),
    ],
    [
      'specs of a subwoofer without own specs',
      (s) => s.setSubwooferSpecs('Sub1', { rmsWatts: 400 }),
    ],
    [
      'the same own specs',
      (s) => s.setSubwooferSpecs('Sub2', { enclosure: 'sealed' }),
    ],
    [
      'an out-of-range sensitivity',
      (s) => s.setSpeakerSpecs('front', { sensitivity: Number.NaN }),
    ],
    [
      'the same speaker type',
      (s) => s.setSpeakerSpecs('front', { type: 'tower' }),
    ],
    ['an out-of-range amplifier power', (s) => s.setAmplifierWatts(5001)],
    ['the same amplifier power', (s) => s.setAmplifierWatts(150)],
    [
      'own specs for a subwoofer not in the layout',
      (s) => s.setSubwooferHasOwnSpecs('Sub3', true),
    ],
    [
      'own specs for a subwoofer that has them',
      (s) => s.setSubwooferHasOwnSpecs('Sub2', true),
    ],
    ['an out-of-range crossover', (s) => s.setCrossover(39)],
    ['the same crossover', (s) => s.setCrossover(100)],
  ])('ignore %s, so undo has nothing to record', (_, edit) => {
    const store = createConfigStore(IMPERIAL_ROOM)
    let notified = 0
    store.subscribe(() => {
      notified += 1
    })

    edit(store.getState())

    expect(store.getState().config).toBe(IMPERIAL_ROOM)
    expect(store.getState().history.canUndo).toBe(false)
    expect(notified).toBe(0)
  })

  it('make one undo step per edit', () => {
    const store = createConfigStore(IMPERIAL_ROOM)

    store.getState().setSubwooferCount(4)
    store.getState().setSubwooferHasOwnSpecs('Sub4', true)
    store.getState().setSubwooferSpecs('Sub4', { rmsWatts: 400 })

    store.getState().undo()
    expect(store.getState().config.speakerGroups.subwoofers.ownSpecs).toEqual({
      ...IMPERIAL_ROOM.speakerGroups.subwoofers.ownSpecs,
      Sub4: IMPERIAL_ROOM.speakerGroups.subwoofers.specs,
    })
    store.getState().undo()
    expect(store.getState().config.layout.subwoofers).toBe(4)
    store.getState().undo()
    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
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

describe('unedited since opened', () => {
  it('holds for the room a link opened until it is edited', () => {
    const store = createConfigStore()
    store.getState().openEncodedConfig(encodeConfig(IMPERIAL_ROOM))
    expect(isUneditedSinceOpened(store.getState())).toBe(true)

    store.getState().setRoomDimension('length', 9)

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
