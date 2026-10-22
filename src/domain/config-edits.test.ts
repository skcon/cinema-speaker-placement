import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  withAmplifierWatts,
  withCrossover,
  withLayout,
  withRoomDimension,
  withSpeakerSpecs,
  withSubwooferHasOwnSpecs,
  withSubwooferSpecs,
  type Config,
} from '@/domain'
import { IMPERIAL_ROOM } from '@/test/share-link-fixtures'

const PORTED_15 = {
  enclosure: 'ported',
  driverDiameter: 0.381,
  rmsWatts: 800,
  peakWatts: 1600,
} as const
const SEALED_12 = IMPERIAL_ROOM.speakerGroups.subwoofers.ownSpecs.Sub2

/** The imperial room: 7.1.4 with two subwoofers, Subwoofer 2 with own specs. */
const ROOM: Config = IMPERIAL_ROOM

describe('a room dimension edit', () => {
  it('stores the new dimension in meters', () => {
    const edited = withRoomDimension(
      withRoomDimension(DEFAULT_CONFIG, 'length', 7.25),
      'height',
      3,
    )

    expect(edited).toEqual({
      ...DEFAULT_CONFIG,
      room: { length: 7.25, width: 4.5, height: 3 },
    })
  })

  it('moves manual items in with a wall that moved past them', () => {
    // Subwoofer 2 is near the back wall, at y 7.7 m.
    const edited = withRoomDimension(ROOM, 'length', 6)

    expect(edited.manualPositions.Sub2?.y).toBeLessThan(6)
  })

  it.each([
    ['width', 20],
    ['height', 1.5],
    ['length', Number.NaN],
    ['length', 8],
  ] as const)(
    'changes nothing for a %s of %d m: out of range, or the same',
    (dimension, meters) => {
      expect(withRoomDimension(ROOM, dimension, meters)).toBe(ROOM)
    },
  )
})

describe('a layout edit', () => {
  it('keeps the room, the subwoofers with their specs and positions, and drops removed channels', () => {
    // Subwoofer 2 and the Right Rear Surround are manual.
    const edited = withLayout(ROOM, { dolbyLayout: '5.1', subwoofers: 2 })

    expect(edited).toEqual({
      ...ROOM,
      layout: { dolbyLayout: '5.1', subwoofers: 2 },
      manualPositions: { Sub2: ROOM.manualPositions.Sub2 },
    })
  })

  it('can make 1 to 4 subwoofers, none with own specs when added', () => {
    const edited = withLayout(DEFAULT_CONFIG, {
      ...DEFAULT_CONFIG.layout,
      subwoofers: 3,
    })

    expect(edited.layout).toEqual({ dolbyLayout: '5.1.2', subwoofers: 3 })
    expect(edited.speakerGroups.subwoofers.ownSpecs).toEqual({})
  })

  it('keeps own specs while their subwoofer stays in the layout, and drops them when it goes', () => {
    const four = withLayout(ROOM, { ...ROOM.layout, subwoofers: 4 })
    expect(four.speakerGroups.subwoofers.ownSpecs).toEqual({ Sub2: SEALED_12 })

    const one = withLayout(four, { ...ROOM.layout, subwoofers: 1 })
    expect(one.speakerGroups.subwoofers).toEqual({
      specs: PORTED_15,
      ownSpecs: {},
    })

    const two = withLayout(one, { ...ROOM.layout, subwoofers: 2 })
    expect(two.speakerGroups.subwoofers.ownSpecs).toEqual({})
  })

  it('drops only the removed subwoofer’s own specs when going from 4 to 3', () => {
    const config: Config = {
      ...ROOM,
      layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
      speakerGroups: {
        ...DEFAULT_CONFIG.speakerGroups,
        subwoofers: {
          specs: PORTED_15,
          ownSpecs: { Sub3: SEALED_12, Sub4: SEALED_12 },
        },
      },
    }

    const edited = withLayout(config, { ...config.layout, subwoofers: 3 })

    expect(edited.speakerGroups.subwoofers.ownSpecs).toEqual({
      Sub3: SEALED_12,
    })
  })

  it('changes nothing for the same layout', () => {
    expect(withLayout(ROOM, { ...ROOM.layout })).toBe(ROOM)
  })
})

describe('a speaker group specs edit', () => {
  it('changes one group, one spec at a time, keeping the rest of the config', () => {
    const edited = withSpeakerSpecs(
      withSpeakerSpecs(
        withSpeakerSpecs(ROOM, 'center', { type: 'tower' }),
        'center',
        { sensitivity: 92.5 },
      ),
      'overheads',
      { sensitivity: 80 },
    )

    expect(edited).toEqual({
      ...ROOM,
      speakerGroups: {
        ...ROOM.speakerGroups,
        center: { specs: { type: 'tower', sensitivity: 92.5 } },
        overheads: { specs: { sensitivity: 80 } },
      },
    })
  })

  it.each([69.9, 110.1, Number.NaN])(
    'changes nothing for a sensitivity of %d dB',
    (db) => {
      expect(withSpeakerSpecs(ROOM, 'front', { sensitivity: db })).toBe(ROOM)
    },
  )

  it('changes nothing for the specs the group already has', () => {
    expect(withSpeakerSpecs(ROOM, 'front', { type: 'tower' })).toBe(ROOM)
    expect(withSpeakerSpecs(ROOM, 'overheads', {})).toBe(ROOM)
  })
})

describe('a subwoofer specs edit', () => {
  it('changes the Subwoofers group specs one spec at a time', () => {
    const edited = (
      [
        { enclosure: 'ported' },
        { driverDiameter: 0.381 },
        { peakWatts: 1600 },
        { rmsWatts: 800 },
      ] as const
    ).reduce<Config>(
      (config, change) => withSubwooferSpecs(config, 'group', change),
      DEFAULT_CONFIG,
    )

    expect(edited.speakerGroups.subwoofers).toEqual({
      specs: PORTED_15,
      ownSpecs: {},
    })
  })

  it.each([
    { driverDiameter: 0.1 },
    { rmsWatts: 5 },
    { peakWatts: Number.NaN },
    // The default peak power is 600 W.
    { rmsWatts: 700 },
  ])(
    'changes nothing for specs out of range or the peak power below the RMS power: %o',
    (change) => {
      expect(withSubwooferSpecs(DEFAULT_CONFIG, 'group', change)).toBe(
        DEFAULT_CONFIG,
      )
    },
  )

  it('changes the own specs of a subwoofer that has them', () => {
    const edited = withSubwooferSpecs(ROOM, 'Sub2', { rmsWatts: 400 })

    expect(edited.speakerGroups.subwoofers).toEqual({
      specs: PORTED_15,
      ownSpecs: { Sub2: { ...SEALED_12, rmsWatts: 400 } },
    })
  })

  it('changes nothing for a subwoofer without own specs, out-of-range own specs, or the same specs', () => {
    // Subwoofer 1 uses the group specs; there are only two subwoofers.
    expect(withSubwooferSpecs(ROOM, 'Sub1', { rmsWatts: 400 })).toBe(ROOM)
    expect(withSubwooferSpecs(ROOM, 'Sub3', { rmsWatts: 400 })).toBe(ROOM)
    expect(withSubwooferSpecs(ROOM, 'Sub2', { rmsWatts: 5000 })).toBe(ROOM)
    expect(withSubwooferSpecs(ROOM, 'Sub2', { enclosure: 'sealed' })).toBe(ROOM)
    expect(withSubwooferSpecs(ROOM, 'group', { rmsWatts: 800 })).toBe(ROOM)
  })
})

describe('giving a subwoofer own specs', () => {
  const config: Config = {
    ...ROOM,
    speakerGroups: {
      ...ROOM.speakerGroups,
      subwoofers: { specs: PORTED_15, ownSpecs: {} },
    },
  }

  it('starts them as a copy of the group specs, and giving them up drops them', () => {
    const own = withSubwooferHasOwnSpecs(config, 'Sub2', true)
    expect(own.speakerGroups.subwoofers.ownSpecs).toEqual({ Sub2: PORTED_15 })

    const back = withSubwooferHasOwnSpecs(own, 'Sub2', false)
    expect(back.speakerGroups.subwoofers).toEqual({
      specs: PORTED_15,
      ownSpecs: {},
    })
  })

  it('changes nothing for a subwoofer not in the layout, or one that already has (or has no) own specs', () => {
    expect(withSubwooferHasOwnSpecs(ROOM, 'Sub3', true)).toBe(ROOM)
    expect(withSubwooferHasOwnSpecs(ROOM, 'Sub2', true)).toBe(ROOM)
    expect(withSubwooferHasOwnSpecs(ROOM, 'Sub1', false)).toBe(ROOM)
  })
})

describe('an amplifier power edit', () => {
  it('takes any power per channel from 1 to 5,000 W', () => {
    expect(withAmplifierWatts(ROOM, 1)).toEqual({ ...ROOM, amplifierWatts: 1 })
    expect(withAmplifierWatts(ROOM, 5000).amplifierWatts).toBe(5000)
  })

  it.each([0.5, 5001, Number.NaN, 150])('changes nothing for %d W', (watts) => {
    expect(withAmplifierWatts(ROOM, watts)).toBe(ROOM)
  })
})

describe('a crossover edit', () => {
  it('takes any frequency from 40 to 200 Hz, keeping the rest of the config', () => {
    expect(withCrossover(ROOM, 60)).toEqual({ ...ROOM, crossoverHz: 60 })
    expect(withCrossover(ROOM, 40).crossoverHz).toBe(40)
    expect(withCrossover(ROOM, 200).crossoverHz).toBe(200)
  })

  it.each([39, 201, Number.NaN, 100])('changes nothing for %d Hz', (hz) => {
    expect(withCrossover(ROOM, hz)).toBe(ROOM)
  })
})
