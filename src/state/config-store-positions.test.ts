import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  DEFAULT_CONFIG,
  encodeConfig,
  recommendSeat,
  type ChannelId,
  type Config,
  type OverheadChannelId,
} from '@/domain'
import { createConfigStore, type ConfigStore } from '@/state/config-store'
import { IMPERIAL_ROOM, V2_LINKS } from '@/test/share-link-fixtures'

/** The default room (6 x 4.5 x 2.6 m, 5.1.2) with this layout. */
function inLayout(dolbyLayout: Config['layout']['dolbyLayout']): Config {
  return { ...DEFAULT_CONFIG, layout: { dolbyLayout, subwoofers: 1 } }
}

function analysis(store: ConfigStore) {
  return analyzeRoom(store.getState().config)
}

function speaker(store: ConfigStore, channel: ChannelId) {
  const found = analysis(store).speakers.find((s) => s.channel === channel)
  if (!found) throw new Error(`no ${channel} speaker`)
  return found
}

function overhead(store: ConfigStore, channel: OverheadChannelId) {
  const found = analysis(store).overheads.find((o) => o.channel === channel)
  if (!found) throw new Error(`no ${channel} overhead`)
  return found
}

function manual(store: ConfigStore) {
  return store.getState().config.manualPositions
}

describe('auto and manual items', () => {
  it('start auto, and a drag makes the dragged one manual where it was left', () => {
    const store = createConfigStore()

    store.getState().moveItem('R', { x: 1.5, y: 1 })

    expect(speaker(store, 'R')).toMatchObject({
      position: { x: 1.5, y: 1, z: 1.2 },
      placement: 'manual',
    })
    expect(speaker(store, 'L').placement).toBe('auto')
  })

  it('stay auto when a subwoofer or the MLP is given a height, as theirs are fixed', () => {
    const store = createConfigStore()

    store.getState().setItemHeight('Sub1', 1)
    store.getState().setItemHeight('MLP', 1.6)

    expect(manual(store)).toEqual({})
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('stay inside the Room when dragged past a wall', () => {
    const store = createConfigStore()

    store.getState().moveItem('Sub1', { x: -8, y: 20 })
    store.getState().moveItem('MLP', { x: 9, y: -1 })

    // 0.3 m from the walls of the 4.5 x 6 m room (our wall clearance).
    expect(manual(store)).toEqual({
      Sub1: { x: -1.95, y: 5.7, z: 0.3 },
      MLP: { x: 1.95, y: 0.3, z: 1.2 },
    })
  })

  it('become manual when their height or a wall distance is edited', () => {
    const store = createConfigStore()

    store.getState().setItemHeight('C', 1.8)
    store.getState().setWallDistance('L', 'left', 0.5)

    expect(speaker(store, 'C')).toMatchObject({
      placement: 'manual',
      position: { z: 1.8 },
    })
    expect(speaker(store, 'L').placement).toBe('manual')
    expect(speaker(store, 'L').position.x).toBeCloseTo(-1.75, 9)
  })

  it('follow Room changes while auto, and stay put once manual', () => {
    const store = createConfigStore()
    store.getState().moveItem('L', { x: -1, y: 1 })
    const autoRight = speaker(store, 'R').position

    store.getState().setRoomDimension('length', 8)

    expect(speaker(store, 'R').position).not.toEqual(autoRight)
    expect(speaker(store, 'L').position).toEqual({ x: -1, y: 1, z: 1.2 })
  })

  it('follow the MLP while auto, and stay put once manual', () => {
    const store = createConfigStore()
    store.getState().moveItem('L', { x: -1, y: 1 })
    const autoRight = speaker(store, 'R').position

    store.getState().moveItem('MLP', { x: 0, y: 3.5 })

    expect(speaker(store, 'R').position).not.toEqual(autoRight)
    expect(speaker(store, 'R').placementRange.azimuth.shown).toBe(26)
    expect(speaker(store, 'L').position).toEqual({ x: -1, y: 1, z: 1.2 })
  })

  it('move in with a wall when the Room shrinks past them', () => {
    const store = createConfigStore()
    store.getState().moveItem('Rs', { x: 1.95, y: 5.5 })

    store.getState().setRoomDimension('width', 3)
    store.getState().setRoomDimension('length', 4)

    expect(manual(store).Rs).toEqual({ x: 1.2, y: 3.7, z: 1.2 })
  })

  it('all go back to auto on Auto-place, and the MLP goes to the recommended seat, in one undoable step', () => {
    const store = createConfigStore()
    store.getState().moveItem('L', { x: -1, y: 1 })
    store.getState().moveItem('Sub1', { x: 1, y: 5 })
    store.getState().moveItem('MLP', { x: 0, y: 3 })
    const beforeAutoPlace = store.getState().config
    const { recommended } = recommendSeat(DEFAULT_CONFIG)

    store.getState().autoPlace()

    expect(manual(store)).toEqual({ MLP: recommended.position })
    expect(speaker(store, 'L').placement).toBe('auto')
    expect(analysis(store).mlp).toEqual(recommended.position)

    store.getState().undo()
    expect(store.getState().config).toEqual(beforeAutoPlace)
  })

  it('leave the MLP auto on Auto-place when the 38% seed is already the recommended seat', () => {
    // In the 24 x 15 ft 7.2.2 room no seat is meaningfully better than
    // the seed (see the seat score tests).
    const config = { ...V2_LINKS.imperialRoom.config } as Config
    const store = createConfigStore({
      ...config,
      manualPositions: { L: { x: -1, y: 1, z: 1.2 } },
    })

    store.getState().autoPlace()

    expect(manual(store)).toEqual({})
  })

  it('change nothing on a second Auto-place, so undo records no empty step', () => {
    const store = createConfigStore()
    store.getState().autoPlace()
    const placed = store.getState().config

    store.getState().autoPlace()

    expect(store.getState().config).toBe(placed)
    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
  })
})

describe('moving the MLP to the recommended seat', () => {
  it('moves the MLP to the seat on screen, manual, in one undoable step, and auto speakers follow it', () => {
    const store = createConfigStore()
    const { recommended } = recommendSeat(DEFAULT_CONFIG)

    store.getState().moveMlpToRecommendedSeat(recommended.position)

    expect(analysis(store).mlp).toEqual(recommended.position)
    expect(analysis(store).mlpPlacement).toBe('manual')
    expect(recommendSeat(store.getState().config).mlpIsRecommended).toBe(true)
    // The Center is auto, so it moves with the MLP.
    expect(speaker(store, 'C').placement).toBe('auto')
    expect(speaker(store, 'C').position).not.toEqual(
      analyzeRoom(DEFAULT_CONFIG).speakers[1]!.position,
    )

    store.getState().undo()

    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('lands on the seat it is given, not one worked out again', () => {
    const store = createConfigStore()
    // A seat shown for a config from before an edit, say.
    const shown = { x: -1, y: 2, z: 1.2 }

    store.getState().moveMlpToRecommendedSeat(shown)

    expect(analysis(store).mlp).toEqual(shown)
  })

  it('records nothing when the MLP already is there', () => {
    const store = createConfigStore()
    const { recommended } = recommendSeat(DEFAULT_CONFIG)
    store.getState().moveMlpToRecommendedSeat(recommended.position)
    const moved = store.getState().config

    store.getState().moveMlpToRecommendedSeat(recommended.position)

    expect(store.getState().config).toBe(moved)
    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
  })
})

describe('overhead speakers', () => {
  it('become manual on the ceiling when dragged, and are graded from where they are', () => {
    // Default 5.1.2: MLP at (0, 2.28) at 1.2 m, ceiling at 2.6 m.
    const store = createConfigStore()

    store.getState().moveItem('Ltm', { x: -1, y: 2.28 })
    expect(overhead(store, 'Ltm')).toMatchObject({
      position: { x: -1, y: 2.28, z: 2.6 },
      placement: 'manual',
      placementRange: { elevation: { shown: 90 }, grade: 'ideal' },
    })
    expect(overhead(store, 'Rtm').placement).toBe('auto')

    // 1.72 m behind: 180° − atan(1.4 / 1.72) = 140.9°, past 65°–100°.
    store.getState().moveItem('Ltm', { x: -1, y: 4 })
    expect(overhead(store, 'Ltm').placementRange).toMatchObject({
      elevation: { shown: 141, grade: 'outside' },
      grade: 'outside',
    })
  })

  it('keep their height on the ceiling: a height edit changes nothing', () => {
    const store = createConfigStore()

    store.getState().setItemHeight('Rtm', 2)

    expect(manual(store)).toEqual({})
    expect(store.getState().history.canUndo).toBe(false)
  })

  it('stay 0.3 m from the walls when dragged past one, and follow the ceiling when the room height changes', () => {
    const store = createConfigStore()
    store.getState().moveItem('Rtm', { x: 5, y: -2 })
    expect(manual(store).Rtm).toEqual({ x: 1.95, y: 0.3, z: 2.6 })

    store.getState().setRoomDimension('height', 3.1)

    expect(manual(store).Rtm).toEqual({ x: 1.95, y: 0.3, z: 3.1 })
    expect(overhead(store, 'Ltm').position.z).toBe(3.1)
  })

  it('are kept or dropped with the layout like other channels, and Auto-place puts them back to auto', () => {
    const store = createConfigStore(inLayout('5.1.4'))
    store.getState().moveItem('Ltf', { x: -1, y: 1 })

    store.getState().setLayout('7.1.4')
    expect(manual(store)).toEqual({ Ltf: { x: -1, y: 1, z: 2.6 } })

    store.getState().setLayout('7.1.2')
    expect(manual(store)).toEqual({})
    expect(overhead(store, 'Ltm').placement).toBe('auto')

    store.getState().undo()
    store.getState().autoPlace()
    expect(overhead(store, 'Ltf').placement).toBe('auto')
  })
})

describe('switching layout', () => {
  it('keeps the channels both layouts share, auto or manual, and auto-places the new ones', () => {
    const store = createConfigStore(inLayout('5.1'))
    store.getState().moveItem('Ls', { x: -1.9, y: 3 })

    store.getState().setLayout('7.1')

    expect(manual(store)).toEqual({ Ls: { x: -1.9, y: 3, z: 1.2 } })
    expect(speaker(store, 'Lrs').placement).toBe('auto')
    expect(speaker(store, 'C').placement).toBe('auto')
  })

  it('drops removed channels, and undo brings them back where they were', () => {
    const store = createConfigStore(inLayout('7.1'))
    store.getState().moveItem('Lrs', { x: -1.5, y: 5 })
    store.getState().moveItem('L', { x: -1, y: 1 })

    store.getState().setLayout('2.1')
    expect(manual(store)).toEqual({ L: { x: -1, y: 1, z: 1.2 } })

    store.getState().undo()
    expect(store.getState().config.layout.dolbyLayout).toBe('7.1')
    expect(manual(store)).toEqual({
      Lrs: { x: -1.5, y: 5, z: 1.2 },
      L: { x: -1, y: 1, z: 1.2 },
    })
  })

  it('does the same for subwoofers when the count changes', () => {
    const store = createConfigStore()
    store.getState().setSubwooferCount(4)
    store.getState().moveItem('Sub2', { x: 1, y: 5 })
    store.getState().moveItem('Sub4', { x: -1, y: 5 })

    store.getState().setSubwooferCount(2)
    expect(manual(store)).toEqual({ Sub2: { x: 1, y: 5, z: 0.3 } })

    store.getState().undo()
    expect(manual(store)).toEqual({
      Sub2: { x: 1, y: 5, z: 0.3 },
      Sub4: { x: -1, y: 5, z: 0.3 },
    })
  })
})

describe('undo and redo', () => {
  it('step back and forward through edits', () => {
    const store = createConfigStore()
    store.getState().setRoomDimension('length', 7)
    store.getState().setLayout('7.1')

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

  it('say whether there is anything to undo or redo', () => {
    const store = createConfigStore()
    expect(store.getState().history).toEqual({ canUndo: false, canRedo: false })

    store.getState().setLayout('7.1')
    expect(store.getState().history).toEqual({ canUndo: true, canRedo: false })

    store.getState().undo()
    expect(store.getState().history).toEqual({ canUndo: false, canRedo: true })
  })

  it('take a whole drag back in one step, however many moves it made', () => {
    const store = createConfigStore()

    store.getState().beginGesture()
    store.getState().moveItem('R', { x: 1, y: 1 })
    store.getState().moveItem('R', { x: 1.2, y: 1.1 })
    store.getState().moveItem('R', { x: 1.4, y: 1.2 })
    store.getState().endGesture()

    expect(manual(store)).toEqual({ R: { x: 1.4, y: 1.2, z: 1.2 } })
    store.getState().undo()
    expect(store.getState().config).toEqual(DEFAULT_CONFIG)
    store.getState().redo()
    expect(manual(store)).toEqual({ R: { x: 1.4, y: 1.2, z: 1.2 } })
  })

  it('record nothing for a drag that moved nothing', () => {
    const store = createConfigStore()

    store.getState().beginGesture()
    store.getState().endGesture()

    expect(store.getState().history.canUndo).toBe(false)
  })

  it('count a drag started twice (a second finger) as one, ended by its last end', () => {
    const store = createConfigStore()

    store.getState().beginGesture()
    store.getState().moveItem('R', { x: 1, y: 1 })
    store.getState().beginGesture()
    store.getState().moveItem('L', { x: -1, y: 1 })
    store.getState().endGesture()
    // Still dragging: nothing is recorded yet.
    expect(store.getState().history.canUndo).toBe(false)
    store.getState().moveItem('R', { x: 1.5, y: 1 })
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

    store.getState().setItemHeight('C', 1.5)
    store.getState().beginGesture()
    store.getState().moveItem('R', { x: 1, y: 1 })
    store.getState().endGesture()

    store.getState().undo()
    expect(Object.keys(manual(store))).toEqual(['C'])
    expect(manual(store).C?.z).toBe(1.5)
    store.getState().undo()
    expect(manual(store)).toEqual({})
  })

  it('wait while a drag is in progress', () => {
    const store = createConfigStore()
    store.getState().setRoomDimension('length', 7)

    store.getState().beginGesture()
    store.getState().moveItem('R', { x: 1, y: 1 })
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
    store.getState().moveItem('R', { x: 1, y: 1 })
    store.getState().openEncodedConfig(encodeConfig(IMPERIAL_ROOM))
    store.getState().endGesture()
    // The link replaced the room and the drag with it; edits are tracked again.
    store.getState().setTargetCurve('flat')
    store.getState().setRoomDimension('length', 9)

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

    store.getState().setRoomDimension('length', 7)
    store.getState().undo()
    expect(store.getState().config).toMatchObject({
      units: 'imperial',
      targetCurve: 'house',
      room: { length: 6 },
    })
  })

  it('never undo into a share link opened from the address, nor past it', () => {
    const store = createConfigStore()
    store.getState().setRoomDimension('length', 7)

    store.getState().openEncodedConfig(encodeConfig(IMPERIAL_ROOM))

    expect(store.getState().history.canUndo).toBe(false)
    store.getState().undo()
    expect(store.getState().config).toEqual(IMPERIAL_ROOM)
  })
})
