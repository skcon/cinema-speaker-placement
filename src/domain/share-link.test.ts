import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  DEFAULT_CONFIG,
  decodeConfig,
  encodeConfig,
  DEFAULT_ROOM_OBJECTS,
  TARGET_CURVE_KINDS,
  UNIT_SYSTEM_NAMES,
  V1_DOLBY_LAYOUTS,
  type Config,
  type DolbyLayout,
  type OverheadChannelId,
} from '@/domain'
import { IMPERIAL_ROOM, V1_LINKS, V2_LINKS } from '@/test/share-link-fixtures'
import { configSchema } from './config'
import { WALLS } from './room'
import { configSchemaV1, type ConfigV1 } from './config-v1'
import {
  LINK_MILLIMETER_LENGTHS,
  linkSlack,
  type LinkPart,
} from './link-precision'
import {
  createConfigCodec,
  migrateFrom,
  SHORT_FIELD_NAMES,
  writtenAsVersion2,
} from './share-link'

/**
 * An encoded config holding any JSON, written the way configs are encoded
 * (JSON, then lz-string's URL-safe compression, with the config's field
 * names short from version 2 on), to test what decoding does with links
 * the app would never write.
 */
function encodedHolding(json: unknown): string {
  const envelope = json as { v?: unknown; config?: unknown } | null
  const short =
    typeof envelope?.v === 'number' && envelope.v >= 2 && 'config' in envelope
      ? { ...envelope, config: writtenAsVersion2(envelope.config) }
      : json
  return compressToEncodedURIComponent(JSON.stringify(short))
}

/** What an encoded config holds: its version and config as written. */
function envelopeOf(encoded: string): { v: number; config: unknown } {
  return JSON.parse(decompressFromEncodedURIComponent(encoded)) as {
    v: number
    config: unknown
  }
}

/** Every object key in `value`, through nested objects and arrays. */
function keysIn(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysIn)
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, field]) => [
    key,
    ...keysIn(field),
  ])
}

const FALLBACK = { config: DEFAULT_CONFIG, problem: 'unreadable' }

/**
 * A config in version 1's shape: without room objects, the seat row's
 * width a field of its own.
 */
function inVersion1({ roomObjects, ...config }: Config): ConfigV1 {
  return { ...config, seatRowWidth: roomObjects.seatRow.width }
}

/** The default config as a version 1 link holds it. */
const DEFAULT_V1 = inVersion1(DEFAULT_CONFIG)

/**
 * A config of version 1's shape as a version 2 link would hold it: its
 * seat row width as the default room objects' seat row, 0.9 m deep as
 * version 1 drew it (anything that is not an object stays as it is).
 */
function inVersion2(config: unknown): unknown {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return config
  }
  const { seatRowWidth, ...rest } = config as Record<string, unknown>
  return {
    ...rest,
    roomObjects: {
      ...DEFAULT_ROOM_OBJECTS,
      seatRow: { width: seatRowWidth, depth: 0.9 },
    },
  }
}

/** Two subwoofer models that differ from the defaults in every spec. */
const PORTED_15 = {
  enclosure: 'ported',
  driverDiameter: 15 * 0.0254,
  rmsWatts: 800,
  peakWatts: 1600,
} as const
const SEALED_10 = {
  enclosure: 'sealed',
  driverDiameter: 10 * 0.0254,
  rmsWatts: 150,
  peakWatts: 150,
} as const

/** The default config (6 x 4.5 x 2.6 m, 5.1.2) with these manual positions. */
function withManualPositions(manualPositions: unknown) {
  return { ...DEFAULT_V1, manualPositions }
}

/** The default config with these specs for one other speaker group. */
function withSpeakerGroup(group: string, specs: unknown) {
  return {
    ...DEFAULT_V1,
    speakerGroups: { ...DEFAULT_V1.speakerGroups, [group]: { specs } },
  }
}

/** The default config with this Subwoofers group: specs and own specs. */
function withSubwooferGroup(subwoofers: unknown) {
  return {
    ...DEFAULT_V1,
    speakerGroups: { ...DEFAULT_V1.speakerGroups, subwoofers },
  }
}

/**
 * Configs that break the rules of versions 1 and 2, mostly the default
 * config with one thing wrong, so a link holding one falls back to the
 * default config. In version 1's shape: version 2 links hold them with
 * room objects added (inVersion2).
 */
const BROKEN_CONFIGS: [string, unknown][] = [
  [
    'a room too long',
    { ...DEFAULT_V1, room: { length: 50, width: 4.5, height: 2.6 } },
  ],
  [
    'a ceiling too low',
    { ...DEFAULT_V1, room: { length: 6, width: 4.5, height: 1.2 } },
  ],
  [
    'a dimension that is text',
    { ...DEFAULT_V1, room: { length: '6', width: 4.5, height: 2.6 } },
  ],
  ['a missing dimension', { ...DEFAULT_V1, room: { length: 6, width: 4.5 } }],
  ['a room that is null', { ...DEFAULT_V1, room: null }],
  ['unknown units', { ...DEFAULT_V1, units: 'furlongs' }],
  [
    'a layout outside v1',
    { ...DEFAULT_V1, layout: { dolbyLayout: '9.1.4', subwoofers: 1 } },
  ],
  [
    'no subwoofer',
    { ...DEFAULT_V1, layout: { dolbyLayout: '5.1', subwoofers: 0 } },
  ],
  [
    'five subwoofers',
    { ...DEFAULT_V1, layout: { dolbyLayout: '5.1', subwoofers: 5 } },
  ],
  [
    'a fractional subwoofer count',
    { ...DEFAULT_V1, layout: { dolbyLayout: '5.1', subwoofers: 1.5 } },
  ],
  // A link the app wrote at this version has every field and nothing
  // else, so anything missing or extra means it was changed by hand.
  ['no units', { room: DEFAULT_V1.room, layout: DEFAULT_V1.layout }],
  ['no layout', { units: 'metric', room: DEFAULT_V1.room }],
  ['an unknown field', { ...DEFAULT_V1, theme: 'dark' }],
  [
    'an unknown room field',
    { ...DEFAULT_V1, room: { ...DEFAULT_V1.room, depth: 3 } },
  ],
  [
    'an unknown layout field',
    {
      ...DEFAULT_V1,
      layout: { ...DEFAULT_V1.layout, overheads: 4 },
    },
  ],
  [
    'no speaker groups',
    {
      units: 'metric',
      room: DEFAULT_V1.room,
      layout: DEFAULT_V1.layout,
    },
  ],
  [
    'an unknown speaker group',
    {
      ...DEFAULT_V1,
      speakerGroups: {
        ...DEFAULT_V1.speakerGroups,
        center: { specs: PORTED_15 },
      },
    },
  ],
  [
    'subwoofer specs out of range',
    withSubwooferGroup({
      specs: { ...PORTED_15, rmsWatts: 5 },
      ownSpecs: {},
    }),
  ],
  [
    'a peak power below the RMS power',
    withSubwooferGroup({
      specs: { ...PORTED_15, peakWatts: 700 },
      ownSpecs: {},
    }),
  ],
  ['a crossover below 40 Hz', { ...DEFAULT_V1, crossoverHz: 39 }],
  ['a crossover above 200 Hz', { ...DEFAULT_V1, crossoverHz: 250 }],
  ['a crossover that is text', { ...DEFAULT_V1, crossoverHz: '80' }],
  [
    'no crossover',
    Object.fromEntries(
      Object.entries(DEFAULT_V1).filter(([key]) => key !== 'crossoverHz'),
    ),
  ],
  [
    'an unknown enclosure',
    withSubwooferGroup({
      specs: { ...PORTED_15, enclosure: 'horn' },
      ownSpecs: {},
    }),
  ],
  [
    'a missing subwoofer spec',
    withSubwooferGroup({
      specs: { enclosure: 'sealed', rmsWatts: 300, peakWatts: 600 },
      ownSpecs: {},
    }),
  ],
  [
    'an unknown subwoofer spec',
    withSubwooferGroup({
      specs: { ...PORTED_15, sensitivity: 88 },
      ownSpecs: {},
    }),
  ],
  ['no own specs field', withSubwooferGroup({ specs: PORTED_15 })],
  [
    'an unknown speaker type',
    withSpeakerGroup('front', { type: 'floorstander', sensitivity: 88 }),
  ],
  [
    'a sensitivity below the accepted range',
    withSpeakerGroup('center', { type: 'tower', sensitivity: 69 }),
  ],
  [
    'a sensitivity above the accepted range',
    withSpeakerGroup('surrounds', { type: 'tower', sensitivity: 111 }),
  ],
  [
    'a speaker group without a type',
    withSpeakerGroup('rearSurrounds', { sensitivity: 88 }),
  ],
  [
    'overheads with a type',
    withSpeakerGroup('overheads', { type: 'bookshelf', sensitivity: 88 }),
  ],
  [
    'a missing speaker group',
    {
      ...DEFAULT_V1,
      speakerGroups: Object.fromEntries(
        Object.entries(DEFAULT_V1.speakerGroups).filter(
          ([group]) => group !== 'center',
        ),
      ),
    },
  ],
  [
    'an amplifier power below the accepted range',
    { ...DEFAULT_V1, amplifierWatts: 0.5 },
  ],
  [
    'an amplifier power above the accepted range',
    { ...DEFAULT_V1, amplifierWatts: 5001 },
  ],
  [
    'no amplifier power',
    Object.fromEntries(
      Object.entries(DEFAULT_V1).filter(([key]) => key !== 'amplifierWatts'),
    ),
  ],
  [
    'own specs out of range',
    withSubwooferGroup({
      specs: PORTED_15,
      ownSpecs: { Sub1: { ...SEALED_10, driverDiameter: 2 } },
    }),
  ],
  [
    'own specs that are null',
    withSubwooferGroup({ specs: PORTED_15, ownSpecs: { Sub1: null } }),
  ],
  [
    'own specs for an unknown subwoofer',
    withSubwooferGroup({ specs: PORTED_15, ownSpecs: { Sub5: SEALED_10 } }),
  ],
  // The layout has one subwoofer (Sub1), so Sub2 can't have specs.
  [
    'own specs for a subwoofer beyond the subwoofer count',
    withSubwooferGroup({ specs: PORTED_15, ownSpecs: { Sub2: SEALED_10 } }),
  ],
  ['an unknown target curve', { ...DEFAULT_V1, targetCurve: 'harman' }],
  ['a seat row narrower than one seat', { ...DEFAULT_V1, seatRowWidth: 0.4 }],
  ['a seat row wider than 8 m', { ...DEFAULT_V1, seatRowWidth: 8.1 }],
  ['a seat row width that is text', { ...DEFAULT_V1, seatRowWidth: '2' }],
  [
    'no seat row width',
    Object.fromEntries(
      Object.entries(DEFAULT_V1).filter(([key]) => key !== 'seatRowWidth'),
    ),
  ],
  [
    'no manual positions field',
    {
      units: 'metric',
      room: DEFAULT_V1.room,
      layout: DEFAULT_V1.layout,
      speakerGroups: DEFAULT_V1.speakerGroups,
      amplifierWatts: DEFAULT_V1.amplifierWatts,
      targetCurve: 'flat',
    },
  ],
  [
    'a manual position for an unknown speaker',
    withManualPositions({ Lw: { x: -1, y: 2, z: 1.2 } }),
  ],
  // The default 5.1.2 has top middle overheads, not top front ones.
  [
    'a manual position for an overhead not in the layout',
    withManualPositions({ Ltf: { x: -1, y: 1, z: 2.6 } }),
  ],
  // Overheads are on the 2.6 m ceiling.
  [
    'an overhead below the ceiling',
    withManualPositions({ Ltm: { x: -1, y: 2, z: 2.3 } }),
  ],
  // The default 5.1.2 has no rear surrounds and one subwoofer.
  [
    'a manual position for a channel not in the layout',
    withManualPositions({ Lrs: { x: -1, y: 5, z: 1.2 } }),
  ],
  [
    'a manual position for a subwoofer beyond the subwoofer count',
    withManualPositions({ Sub2: { x: 0, y: 5.7, z: 0.3 } }),
  ],
  [
    'a manual position outside the room',
    withManualPositions({ R: { x: 3, y: 1, z: 1.2 } }),
  ],
  // Speakers keep 0.3 m from every wall (our wall clearance).
  [
    'a speaker closer to a wall than the wall clearance',
    withManualPositions({ R: { x: 2.1, y: 1, z: 1.2 } }),
  ],
  [
    'a speaker above the ceiling clearance',
    withManualPositions({ R: { x: 1, y: 1, z: 2.4 } }),
  ],
  [
    'a subwoofer off the floor',
    withManualPositions({ Sub1: { x: 0, y: 0.3, z: 1 } }),
  ],
  [
    'the MLP away from ear height',
    withManualPositions({ MLP: { x: 0, y: 3, z: 1.5 } }),
  ],
  [
    'a manual position without a height',
    withManualPositions({ R: { x: 1, y: 1 } }),
  ],
  [
    'a manual position with an unknown field',
    withManualPositions({ R: { x: 1, y: 1, z: 1.2, yaw: 30 } }),
  ],
  [
    'a manual position that is text',
    withManualPositions({ R: { x: '1', y: 1, z: 1.2 } }),
  ],
  [
    'no target curve',
    {
      units: 'metric',
      room: DEFAULT_V1.room,
      layout: DEFAULT_V1.layout,
      speakerGroups: DEFAULT_V1.speakerGroups,
      amplifierWatts: DEFAULT_V1.amplifierWatts,
      manualPositions: {},
    },
  ],
]

/** A 65 in TV in the middle of the default room's front wall. */
const TV = {
  kind: 'tv',
  width: 1.44,
  height: 0.81,
  bottomEdge: 0.93,
  x: 0,
  standoff: null,
} as const

/** The default seat row, as the broken room objects below have it. */
const COUCH = { width: 2, depth: 0.9 } as const

/** The default seat row with no screen, no furniture and no openings. */
const NO_OBJECTS = {
  seatRow: COUCH,
  screen: null,
  furniture: [],
  openings: [],
} as const

/** A 1.6 m TV cabinet against the middle of the default room's front wall. */
const CABINET = {
  name: 'Cabinet',
  width: 1.6,
  depth: 0.45,
  height: 0.5,
  x: 0,
  y: 0.225,
  rotation: 0,
} as const

/** The default room objects with this one furniture box. */
function withBox(box: unknown) {
  return { ...NO_OBJECTS, furniture: [box] }
}

/** A 0.9 m door in the middle of the default room's back wall. */
const DOOR = { kind: 'door', wall: 'back', position: 2.25, width: 0.9 } as const

/** A 1.2 m window 0.9 m up the default room's right wall. */
const WINDOW = {
  kind: 'window',
  wall: 'right',
  position: 3,
  width: 1.2,
  sill: 0.9,
  height: 1.2,
} as const

/**
 * The default room objects with this one opening: an object is packed as
 * a link packs it, when it has an opening's exact shape; a tuple is written
 * as it is.
 */
function withOpening(opening: unknown) {
  return { ...NO_OBJECTS, openings: [opening] }
}

/** Room objects that break the rules of version 2, in the default room. */
const BROKEN_ROOM_OBJECTS: [string, unknown][] = [
  ['room objects that are null', null],
  ['no screen field', { seatRow: COUCH, furniture: [], openings: [] }],
  ['no furniture field', { seatRow: COUCH, screen: null, openings: [] }],
  ['no openings field', { seatRow: COUCH, screen: null, furniture: [] }],
  ['an unknown room object', { ...NO_OBJECTS, piano: true }],
  [
    'an unknown kind of screen',
    { ...NO_OBJECTS, screen: { ...TV, kind: 'laser' } },
  ],
  [
    'a screen narrower than 0.5 m',
    { ...NO_OBJECTS, screen: { ...TV, width: 0.4 } },
  ],
  // The default room is 4.5 m wide.
  [
    'a screen wider than the front wall',
    { ...NO_OBJECTS, screen: { ...TV, width: 4.6 } },
  ],
  ['a screen past a side wall', { ...NO_OBJECTS, screen: { ...TV, x: 1.6 } }],
  // The default room is 2.6 m high.
  [
    'a screen through the ceiling',
    { ...NO_OBJECTS, screen: { ...TV, bottomEdge: 2 } },
  ],
  [
    'a screen below the floor',
    { ...NO_OBJECTS, screen: { ...TV, bottomEdge: -0.1 } },
  ],
  ['a TV with a standoff', { ...NO_OBJECTS, screen: { ...TV, standoff: 0.5 } }],
  [
    'a standoff above 1.5 m',
    { ...NO_OBJECTS, screen: { ...TV, kind: 'projection', standoff: 1.6 } },
  ],
  [
    'a screen width that is text',
    { ...NO_OBJECTS, screen: { ...TV, width: '1.44' } },
  ],
  [
    'a screen without a standoff field',
    {
      ...NO_OBJECTS,
      screen: { kind: 'tv', width: 1.44, height: 0.81, bottomEdge: 0.93, x: 0 },
    },
  ],
  [
    'a screen with an unknown field',
    { ...NO_OBJECTS, screen: { ...TV, diagonal: 65 } },
  ],
  ['furniture that is null', { ...NO_OBJECTS, furniture: null }],
  [
    'nine furniture boxes',
    { ...NO_OBJECTS, furniture: Array.from({ length: 9 }, () => CABINET) },
  ],
  ['a box without a name', withBox({ ...CABINET, name: '' })],
  ['a box named only spaces', withBox({ ...CABINET, name: '   ' })],
  ['a box name with spaces around it', withBox({ ...CABINET, name: ' TV ' })],
  [
    'a box name longer than 12 characters',
    withBox({ ...CABINET, name: 'Coffee tables' }),
  ],
  [
    'a box name with a character a link does not carry cheaply',
    withBox({ ...CABINET, name: 'Bokhylla 書架' }),
  ],
  ['a box turned 45°', withBox({ ...CABINET, rotation: 45 })],
  ['a box thinner than 0.1 m', withBox({ ...CABINET, height: 0.05 })],
  // The default room is 6 m long, 4.5 m wide and 2.6 m high.
  ['a box taller than the room', withBox({ ...CABINET, height: 2.7 })],
  ['a box wider than the room', withBox({ ...CABINET, width: 4.6 })],
  [
    'a box turned so it is longer than the room',
    withBox({ ...CABINET, width: 6.5, rotation: 90, y: 3 }),
  ],
  ['a box through the left wall', withBox({ ...CABINET, x: -1.5, width: 1.6 })],
  ['a box through the front wall', withBox({ ...CABINET, y: 0.2 })],
  ['a box through the back wall', withBox({ ...CABINET, y: 5.9 })],
  ['a box width that is text', withBox({ ...CABINET, width: '1.6' })],
  ['a box without a rotation', withBox({ ...CABINET, rotation: undefined })],
  ['a box with an unknown field', withBox({ ...CABINET, color: 'oak' })],
  ['openings that are null', { ...NO_OBJECTS, openings: null }],
  [
    'seven openings',
    { ...NO_OBJECTS, openings: Array.from({ length: 7 }, () => DOOR) },
  ],
  ['a door past a corner', withOpening({ ...DOOR, position: 0.4 })],
  ['a door wider than its wall', withOpening({ ...DOOR, width: 4.6 })],
  ['a door narrower than 0.3 m', withOpening({ ...DOOR, width: 0.2 })],
  ['a window through the ceiling', withOpening({ ...WINDOW, sill: 1.5 })],
  ['a door with a sill', withOpening({ ...DOOR, sill: 0 })],
  ['a window without a sill', withOpening({ ...WINDOW, sill: undefined })],
  ['an opening on no wall', withOpening({ ...DOOR, wall: 'ceiling' })],
  ['an unknown kind of opening', withOpening({ ...DOOR, kind: 'arch' })],
  ['an opening width that is text', withOpening({ ...DOOR, width: '0.9' })],
  ['a packed opening with an unknown code', withOpening([8, 2250, 900])],
  ['a packed opening with part of a millimeter', withOpening([2, 2250.5, 900])],
  ['a packed door with a sill and height', withOpening([2, 2250, 900, 0, 900])],
  ['a packed window without its height', withOpening([5, 3000, 1200, 900])],
  ['a packed opening with text', withOpening([2, '2250', 900])],
  ['a packed opening that is empty', withOpening([])],
  ['no seat row field', { screen: null, furniture: [], openings: [] }],
  [
    'a seat row that is null',
    { seatRow: null, screen: null, furniture: [], openings: [] },
  ],
  [
    'a seat row narrower than one seat',
    {
      seatRow: { ...COUCH, width: 0.4 },
      screen: null,
      furniture: [],
      openings: [],
    },
  ],
  [
    'a seat row shallower than 0.5 m',
    {
      seatRow: { ...COUCH, depth: 0.4 },
      screen: null,
      furniture: [],
      openings: [],
    },
  ],
  [
    'a seat row deeper than 2 m',
    {
      seatRow: { ...COUCH, depth: 2.1 },
      screen: null,
      furniture: [],
      openings: [],
    },
  ],
  [
    'a seat row depth that is text',
    {
      seatRow: { ...COUCH, depth: '0.9' },
      screen: null,
      furniture: [],
      openings: [],
    },
  ],
  [
    'a seat row without a depth',
    { seatRow: { width: 2 }, screen: null, furniture: [], openings: [] },
  ],
  [
    'a seat row with a position of its own',
    {
      seatRow: { ...COUCH, x: 0, y: 3 },
      screen: null,
      furniture: [],
      openings: [],
    },
  ],
]

describe('share link codec', () => {
  it('writes new share links as version 2', () => {
    expect(envelopeOf(encodeConfig(DEFAULT_CONFIG))).toMatchObject({ v: 2 })
  })

  it('spells the field names short in version 2 links, keeping every value', () => {
    const { config } = envelopeOf(encodeConfig(IMPERIAL_ROOM))

    expect(config).toMatchObject({
      u: 'imperial',
      r: { l: 8, w: 5, h: 3 },
      ly: { dl: '7.1.4', s: 2 },
      m: { Rrs: { x: 2.2, y: 7.2, z: 1.5 }, Sub2: { x: 2.2, y: 7.7, z: 0.3 } },
      ro: { st: { w: 3.6576, d: 0.9144 } },
    })
    expect(keysIn(config).filter((key) => key in SHORT_FIELD_NAMES)).toEqual([])
  })

  it('falls back for a version 2 link that spells a field name out', () => {
    const { v, config } = envelopeOf(encodeConfig(DEFAULT_CONFIG))
    const spelledOut = { ...(config as object), u: undefined, units: 'metric' }

    expect(
      decodeConfig(
        compressToEncodedURIComponent(
          JSON.stringify({ v, config: spelledOut }),
        ),
      ),
    ).toEqual(FALLBACK)
  })

  it('rebuilds the default config from its share link', () => {
    expect(decodeConfig(encodeConfig(DEFAULT_CONFIG))).toEqual({
      config: DEFAULT_CONFIG,
      problem: null,
    })
  })

  it.each(UNIT_SYSTEM_NAMES)(
    'rebuilds a %s config exactly, down to the last digit of each length',
    (units) => {
      // Feet + inches converted to meters give long binary fractions, such
      // as 14.993619999999998 for 49 ft 2.3 in, which must come back as is.
      const config: Config = {
        ...DEFAULT_CONFIG,
        units,
        room: {
          length: (49 * 12 + 2.3) * 0.0254,
          width: (13 * 12 + 1.7) * 0.0254,
          height: (8 * 12 + 0.1) * 0.0254,
        },
      }

      expect(decodeConfig(encodeConfig(config))).toEqual({
        config,
        problem: null,
      })
    },
  )

  /** Own specs for every even-numbered subwoofer of the layout. */
  const EVEN_OWN_SPECS = {
    1: {},
    2: { Sub2: SEALED_10 },
    3: { Sub2: SEALED_10 },
    4: { Sub2: SEALED_10, Sub4: SEALED_10 },
  } as const

  /** The first overhead channel of each layout that has overheads. */
  const FIRST_OVERHEAD: Partial<Record<DolbyLayout, OverheadChannelId>> = {
    '5.1.2': 'Ltm',
    '7.1.2': 'Ltm',
    '5.1.4': 'Ltf',
    '7.1.4': 'Ltf',
  }

  describe.each(V1_DOLBY_LAYOUTS)('rebuilds a %s layout', (dolbyLayout) => {
    const overhead = FIRST_OVERHEAD[dolbyLayout]
    it.each([1, 2, 3, 4] as const)(
      'with %i subwoofer(s), every other one with its own specs, and Left, its first overhead, the last subwoofer and the MLP moved by hand',
      (subwoofers) => {
        const config: Config = {
          ...IMPERIAL_ROOM,
          layout: { dolbyLayout, subwoofers },
          speakerGroups: {
            ...DEFAULT_CONFIG.speakerGroups,
            subwoofers: {
              specs: PORTED_15,
              ownSpecs: EVEN_OWN_SPECS[subwoofers],
            },
          },
          // In the 8 x 5 x 3 m room, on the wall and ceiling clearances.
          manualPositions: {
            L: { x: -2.2, y: 0.3, z: 2.7 },
            // On the 3 m ceiling.
            ...(overhead && { [overhead]: { x: -2.2, y: 7.7, z: 3 } }),
            [`Sub${subwoofers}`]: { x: 2.2, y: 7.7, z: 0.3 },
            MLP: { x: 0.5, y: 3.25, z: 1.2 },
          },
        }

        expect(decodeConfig(encodeConfig(config))).toEqual({
          config,
          problem: null,
        })
      },
    )
  })

  it.each([40, 80, 117.5, 200])('rebuilds a %d Hz crossover', (crossoverHz) => {
    const config: Config = { ...DEFAULT_CONFIG, crossoverHz }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config,
      problem: null,
    })
  })

  it.each(TARGET_CURVE_KINDS)('rebuilds the %s target curve', (targetCurve) => {
    const config: Config = { ...DEFAULT_CONFIG, targetCurve }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config,
      problem: null,
    })
  })

  it.each([
    [0.5, 0.5],
    [2, 0.9],
    [3.6576, 0.9144],
    [8, 2],
  ])('rebuilds a %d m wide, %d m deep seat row', (width, depth) => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      roomObjects: { ...DEFAULT_ROOM_OBJECTS, seatRow: { width, depth } },
    }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config,
      problem: null,
    })
  })

  it('rebuilds subwoofer specs exactly, down to the last digit', () => {
    // 12.3 in converted to meters: 0.31242000000000003
    const specs = {
      enclosure: 'ported',
      driverDiameter: 12.3 * 0.0254,
      rmsWatts: 333.3,
      peakWatts: 1234.5678901234567,
    } as const
    const config: Config = {
      ...DEFAULT_CONFIG,
      speakerGroups: {
        ...DEFAULT_CONFIG.speakerGroups,
        subwoofers: { specs, ownSpecs: { Sub1: specs } },
      },
    }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config,
      problem: null,
    })
  })

  it('rebuilds manual positions to the nearest millimeter, to keep links short', () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      manualPositions: {
        R: { x: 1.23456789, y: 0.98765, z: 1.5004999 },
        MLP: { x: -0.0001, y: 2.5, z: 1.2 },
        Sub1: { x: 0.0004, y: 0.3, z: 0.3 },
      },
    }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config: {
        ...DEFAULT_CONFIG,
        manualPositions: {
          R: { x: 1.235, y: 0.988, z: 1.5 },
          MLP: { x: 0, y: 2.5, z: 1.2 },
          Sub1: { x: 0, y: 0.3, z: 0.3 },
        },
      },
      problem: null,
    })
  })

  it.each([
    ['no screen', DEFAULT_ROOM_OBJECTS],
    ['a TV on the wall', { ...DEFAULT_ROOM_OBJECTS, screen: TV }],
    [
      'an acoustically transparent projection screen',
      {
        ...DEFAULT_ROOM_OBJECTS,
        screen: {
          ...TV,
          kind: 'projection',
          width: 2.66,
          standoff: 0.75,
          x: -0.5,
        },
      },
    ],
  ] as const)('rebuilds a room with %s', (_, roomObjects) => {
    const config: Config = { ...DEFAULT_CONFIG, roomObjects }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config,
      problem: null,
    })
  })

  it('rebuilds furniture boxes, every length and position to the nearest millimeter', () => {
    const shelf = {
      name: 'Hylla för CD',
      // 4 ft 1.3 in typed in imperial: 1.2522199999999999 m.
      width: (4 * 12 + 1.3) * 0.0254,
      depth: 0.3,
      height: 1.8,
      x: -2.0498765,
      y: 3.00049,
      rotation: 90,
    } as const
    const config: Config = {
      ...DEFAULT_CONFIG,
      roomObjects: { ...DEFAULT_ROOM_OBJECTS, furniture: [CABINET, shelf] },
    }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config: {
        ...config,
        roomObjects: {
          ...DEFAULT_ROOM_OBJECTS,
          furniture: [CABINET, { ...shelf, width: 1.252, x: -2.05, y: 3 }],
        },
      },
      problem: null,
    })
  })

  it('rebuilds doors and windows, every length to the nearest millimeter', () => {
    // 3 ft wide, 3 ft 1.3 in up, dragged along the left wall.
    const window = {
      ...WINDOW,
      wall: 'left',
      position: 2.0498765,
      width: 36 * 0.0254,
      sill: (37 + 0.3) * 0.0254,
    } as const
    const config: Config = {
      ...DEFAULT_CONFIG,
      roomObjects: { ...DEFAULT_ROOM_OBJECTS, openings: [DOOR, window] },
    }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config: {
        ...config,
        roomObjects: {
          ...DEFAULT_ROOM_OBJECTS,
          openings: [
            DOOR,
            { ...window, position: 2.05, width: 0.914, sill: 0.947 },
          ],
        },
      },
      problem: null,
    })
  })

  it.each([
    ['door', 'front', 0],
    ['door', 'right', 1],
    ['door', 'back', 2],
    ['door', 'left', 3],
    ['window', 'front', 4],
    ['window', 'right', 5],
    ['window', 'back', 6],
    ['window', 'left', 7],
  ] as const)(
    'packs a %s on the %s wall as a tuple of millimeters with code %i',
    (kind, wall, code) => {
      const opening = { ...(kind === 'door' ? DOOR : WINDOW), wall }
      const config: Config = {
        ...DEFAULT_CONFIG,
        roomObjects: { ...DEFAULT_ROOM_OBJECTS, openings: [opening] },
      }
      const lengths = kind === 'door' ? [2250, 900] : [3000, 1200, 900, 1200]

      expect(envelopeOf(encodeConfig(config)).config).toMatchObject({
        ro: { op: [[code, ...lengths]] },
      })
      expect(decodeConfig(encodeConfig(config))).toEqual({
        config,
        problem: null,
      })
    },
  )

  it('falls back for a version 2 link with an opening written out instead of packed', () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      roomObjects: { ...DEFAULT_ROOM_OBJECTS, openings: [DOOR] },
    }
    const { v, config: written } = envelopeOf(encodeConfig(config))
    const unpacked = {
      ...(written as { ro: object }),
      ro: { ...(written as { ro: object }).ro, op: [DOOR] },
    }

    expect(
      decodeConfig(
        compressToEncodedURIComponent(JSON.stringify({ v, config: unpacked })),
      ),
    ).toEqual(FALLBACK)
  })

  it('rebuilds where a screen was dragged to the nearest millimeter', () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      roomObjects: { ...DEFAULT_ROOM_OBJECTS, screen: { ...TV, x: -0.98765 } },
    }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config: {
        ...config,
        roomObjects: { ...DEFAULT_ROOM_OBJECTS, screen: { ...TV, x: -0.988 } },
      },
      problem: null,
    })
  })

  it('rebuilds a screen dragged against a side wall, rounded half a millimeter past it', () => {
    // 4.5 m wall, 1.4428 m screen: its middle stops 1.5286 m off centre.
    const screen = { ...TV, width: 1.4428, x: (4.5 - 1.4428) / 2 }
    const config: Config = {
      ...DEFAULT_CONFIG,
      roomObjects: { ...DEFAULT_ROOM_OBJECTS, screen },
    }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config: {
        ...config,
        roomObjects: {
          ...DEFAULT_ROOM_OBJECTS,
          screen: { ...screen, x: 1.529 },
        },
      },
      problem: null,
    })
  })

  describe('falls back to the default config', () => {
    const valid = encodeConfig(IMPERIAL_ROOM)

    it.each([
      ['an empty value', ''],
      ['plain text', 'hello there'],
      ['characters outside the URL-safe alphabet', '%%%***'],
      ['a truncated link', valid.slice(0, valid.length / 2)],
      [
        'a link with a character changed',
        `${valid.slice(0, 10)}Q${valid.slice(11)}`,
      ],
      [
        'compressed text that is not JSON',
        compressToEncodedURIComponent('{"v":1,'),
      ],
    ])('for %s', (_, param) => {
      expect(decodeConfig(param)).toEqual(FALLBACK)
    })

    it.each([
      ['null', null],
      ['an array', [1, { units: 'metric' }]],
      ['a config without a version', DEFAULT_CONFIG],
      ['a version that is not a number', { v: '1', config: DEFAULT_CONFIG }],
      ['version 0', { v: 0, config: DEFAULT_CONFIG }],
      ['a fractional version', { v: 1.5, config: DEFAULT_CONFIG }],
      ['a version without a config', { v: 1 }],
    ])('for a link holding %s', (_, json) => {
      expect(decodeConfig(encodedHolding(json))).toEqual(FALLBACK)
    })

    // Version 2 is version 1 with room objects, so both break the same rules.
    describe.each([
      [1, DEFAULT_V1, (config: unknown) => config],
      [2, DEFAULT_CONFIG, inVersion2],
    ])('for a version %i config', (v, defaultConfig, inVersion) => {
      it('but opens the config these cases start from', () => {
        expect(
          decodeConfig(encodedHolding({ v, config: defaultConfig })),
        ).toEqual({ config: DEFAULT_CONFIG, problem: null })
      })

      it.each(BROKEN_CONFIGS)('with %s', (_, config) => {
        expect(
          decodeConfig(encodedHolding({ v, config: inVersion(config) })),
        ).toEqual(FALLBACK)
      })
    })

    describe('for a version 2 config', () => {
      it.each(BROKEN_ROOM_OBJECTS)('with %s', (_, roomObjects) => {
        const config = { ...DEFAULT_CONFIG, roomObjects }

        expect(decodeConfig(encodedHolding({ v: 2, config }))).toEqual(FALLBACK)
      })

      it('without room objects', () => {
        expect(
          decodeConfig(encodedHolding({ v: 2, config: DEFAULT_V1 })),
        ).toEqual(FALLBACK)
      })
    })

    it('for a version 1 config with room objects', () => {
      expect(
        decodeConfig(encodedHolding({ v: 1, config: DEFAULT_CONFIG })),
      ).toEqual(FALLBACK)
    })

    it('and says so when the link comes from a newer version of the app', () => {
      // A tab running an old build opens a link made by a newer one.
      expect(
        decodeConfig(encodedHolding({ v: 99, config: { future: true } })),
      ).toEqual({ config: DEFAULT_CONFIG, problem: 'newer-version' })
    })
  })
})

describe('version 2 share links', () => {
  // Typed here, so the shared fixtures stay valid configs.
  const links: Record<string, { encoded: string; config: Config }> = V2_LINKS

  it.each(Object.entries(links))('open: %s', (_, { encoded, config }) => {
    expect(decodeConfig(encoded)).toEqual({ config, problem: null })
  })

  // Until v1.1.0 is tagged, a change to version 2 regenerates these.
  it.each(Object.entries(links))(
    'are what the app writes today: %s',
    (_, { encoded, config }) => {
      expect(encodeConfig(config)).toBe(encoded)
    },
  )
})

/**
 * Version 1 as v1.0.0 read it: its frozen schema alone, without the
 * migration to today's version.
 */
const codecV1 = createConfigCodec({
  version: 1,
  schema: configSchemaV1,
  migrations: {},
  fallback: DEFAULT_V1,
})

describe('released share links', () => {
  // Typed here, so the shared fixtures stay valid configs.
  const links: Record<string, { encoded: string; config: ConfigV1 }> = V1_LINKS

  it.each(Object.entries(links))(
    'keep opening as the same room, their seat row width a 0.9 m deep seat row and no other room objects: %s',
    (_, { encoded, config }) => {
      const { seatRowWidth, ...rest } = config
      expect(decodeConfig(encoded)).toEqual({
        config: {
          ...rest,
          roomObjects: {
            seatRow: { width: seatRowWidth, depth: 0.9 },
            screen: null,
            furniture: [],
            openings: [],
          },
        },
        problem: null,
      })
    },
  )

  it.each(Object.entries(links))(
    'open with the frozen version 1 schema alone: %s',
    (_, { encoded, config }) => {
      expect(codecV1.decode(encoded)).toEqual({ config, problem: null })
    },
  )

  // Pins what version 1 rejects, whatever later versions change.
  it.each(BROKEN_CONFIGS)(
    'fall back with the frozen version 1 schema alone, for a config with %s',
    (_, config) => {
      expect(codecV1.decode(encodedHolding({ v: 1, config }))).toEqual({
        config: DEFAULT_V1,
        problem: 'unreadable',
      })
    },
  )
})

/**
 * Subwoofer specs with the longest values a user can enter: every number
 * with all 17 significant digits (a converted inch value, or a typed
 * decimal such as 9999.9999999999982).
 */
function longestSubwooferSpecs(offset: number) {
  return {
    enclosure: 'ported',
    driverDiameter: (23 + 1 / 7 - offset / 81) * 0.0254,
    rmsWatts: 9999 - 1 / 7 - offset / 81,
    peakWatts: 19999 - 1 / 7 - offset / 81,
  } as const
}

/** Listener-level speaker specs with the longest values: 17 significant digits. */
function longestSpeakerSpecs(offset: number) {
  return { type: 'bookshelf', sensitivity: 109 - 1 / 7 - offset / 81 } as const
}

/**
 * A manual position with the longest coordinates a share link stores:
 * negative across, two digits before the point along, every one to the
 * millimeter, and no two alike (so compression gains nothing). `n` picks
 * the digits; heights stay below the 5 m room's ceiling clearance.
 */
function longestPosition(n: number, z?: number) {
  const mm = (meters: number) => Math.round(meters * 1000) / 1000
  return {
    x: mm(-6.123 - n * 0.0537),
    y: mm(14.219 - n * 0.0713),
    z: z ?? mm(4.687 - n * 0.0919),
  }
}

/**
 * Every character a furniture box's name may have but the space (which
 * can't start or end one): A–Z, a–z, digits, the accented letters of
 * Latin-1 and - ' & ( ) . , /.
 */
const NAME_CHARACTERS = [
  ...Array.from({ length: 64 }, (_, i) => String.fromCharCode(0xc0 + i)),
  ..."'&().,/-",
  ...'0123456789',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
]
  .filter((character) => character !== '×' && character !== '÷')
  .join('')

/**
 * Furniture box `n` (from 0) as long as a share link stores one: the
 * longest name (12 characters, none of them shared with another box, so
 * compression gains nothing), the largest lengths to the millimeter, the
 * position negative across and to the millimeter, and the longest
 * rotation, in the worst-case room.
 */
function longestFurniture(n: number) {
  const mm = (meters: number) => Math.round(meters * 1000) / 1000
  return {
    name: NAME_CHARACTERS.slice(12 * n, 12 * n + 12),
    width: mm(7.999 - n * 0.0537),
    depth: mm(7.989 - n * 0.0613),
    height: mm(4.987 - n * 0.0719),
    x: mm(-3.419 + n * 0.0127),
    y: mm(10.987 - n * 0.0371),
    rotation: 270,
  } as const
}

/**
 * Opening `n` (from 0) as long as a share link stores one: a window (the
 * longer tuple), every length to the millimeter with as many digits as it
 * can have (its position over 10 m, so five), none alike, on the walls in
 * turn, in the worst-case room (about 15 m square and 5 m high).
 */
function longestOpening(n: number) {
  const mm = (meters: number) => Math.round(meters * 1000) / 1000
  const width = mm(7.987 - n * 0.0537)
  return {
    kind: 'window',
    wall: WALLS[n % WALLS.length] ?? 'front',
    position: mm(14.8 - width / 2 - n * 0.0913),
    width,
    sill: mm(1.093 + n * 0.0371),
    height: mm(3.789 - n * 0.0419),
  } as const
}

/**
 * The largest config a share link has to carry, for the size budget: the
 * largest real config today. Grow it with the config: the compiler asks for
 * every new field, and each one should take its longest value.
 */
const WORST_CASE_CONFIG: Config = {
  units: 'imperial',
  // Near the limits, with all 17 significant digits a converted
  // feet + inches value can produce (14.987654320987655...).
  room: { length: 15 - 1 / 81, width: 15 - 1 / 7, height: 5 - 1 / 81 },
  // The largest v1 layout: 7.4.4.
  layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
  // Every group's specs, the longer speaker type, every number with all 17
  // significant digits and no two alike; different own specs for every
  // subwoofer.
  speakerGroups: {
    front: { specs: longestSpeakerSpecs(0) },
    center: { specs: longestSpeakerSpecs(1) },
    surrounds: { specs: longestSpeakerSpecs(2) },
    rearSurrounds: { specs: longestSpeakerSpecs(3) },
    overheads: { specs: { sensitivity: longestSpeakerSpecs(4).sensitivity } },
    subwoofers: {
      specs: longestSubwooferSpecs(0),
      ownSpecs: {
        Sub1: longestSubwooferSpecs(1),
        Sub2: longestSubwooferSpecs(2),
        Sub3: longestSubwooferSpecs(3),
        Sub4: longestSubwooferSpecs(4),
      },
    },
  },
  // All 17 significant digits.
  amplifierWatts: 4999 - 1 / 7,
  // The longer of the two names.
  targetCurve: 'house',
  // All 17 significant digits.
  crossoverHz: 199 - 1 / 7,
  // Every listener-level speaker, every overhead (on the ceiling, stored to
  // the millimeter as the link writes it), every
  // subwoofer (at subwoofer height) and the MLP (at ear height) moved by
  // hand.
  manualPositions: {
    L: longestPosition(0),
    C: longestPosition(1),
    R: longestPosition(2),
    Ls: longestPosition(3),
    Rs: longestPosition(4),
    Lrs: longestPosition(5),
    Rrs: longestPosition(6),
    Ltf: longestPosition(12, 4.988),
    Rtf: longestPosition(13, 4.988),
    Ltr: longestPosition(14, 4.988),
    Rtr: longestPosition(15, 4.988),
    Sub1: longestPosition(7, 0.3),
    Sub2: longestPosition(8, 0.3),
    Sub3: longestPosition(9, 0.3),
    Sub4: longestPosition(10, 0.3),
    MLP: longestPosition(11, 1.2),
  },
  // The seat row's lengths with all 17 significant digits a converted
  // feet + inches value can have. The screen of the longer kind with a
  // standoff, every length with all 17 significant digits, and the
  // position negative and to the millimeter, as a dragged screen is stored.
  // The most furniture boxes and the most openings, each as long as a
  // link stores it.
  roomObjects: {
    seatRow: { width: 8 - 1 / 7, depth: 2 - 1 / 7 },
    screen: {
      kind: 'projection',
      width: 8 - 1 / 7,
      height: 4 - 1 / 7,
      bottomEdge: 1 - 1 / 81,
      x: -3.499,
      standoff: 1.5 - 1 / 7,
    },
    furniture: Array.from({ length: 8 }, (_, n) => longestFurniture(n)),
    openings: Array.from({ length: 6 }, (_, n) => longestOpening(n)),
  },
}

/** Where the app is published (GitHub Pages, see pages.config.ts). */
const PRODUCTION_PAGE = 'https://skcon.github.io/cinema-speaker-placement/'

/**
 * The longest share link we allow, as a whole URL. About 2,000 characters
 * is the length that every browser, chat app, mail client and link
 * preview handles without truncating (the old IE limit was 2,083 and the
 * sitemaps protocol caps URLs at 2,048), well under the 8 KB that servers
 * such as GitHub Pages accept.
 */
const URL_BUDGET = 2000

describe('link precision', () => {
  /** A config with one item of every part LINK_MILLIMETER_LENGTHS lists. */
  const EVERY_PART: Config = {
    ...DEFAULT_CONFIG,
    manualPositions: { R: { x: 1.5, y: 1, z: 1.2 } },
    roomObjects: {
      ...DEFAULT_ROOM_OBJECTS,
      screen: TV,
      furniture: [CABINET],
      openings: [DOOR, WINDOW],
    },
  }

  /** Where each part's lengths are in a config, to nudge one by hand. */
  const ITEMS_OF: Record<LinkPart, (config: Config) => readonly object[]> = {
    manualPositions: (config) => Object.values(config.manualPositions),
    screen: ({ roomObjects: { screen } }) => (screen ? [screen] : []),
    furniture: ({ roomObjects }) => roomObjects.furniture,
    openings: ({ roomObjects }) => roomObjects.openings,
  }

  const listed = Object.entries(LINK_MILLIMETER_LENGTHS).flatMap(
    ([part, { lengths }]) =>
      lengths.map((length) => [part as LinkPart, length] as const),
  )

  it('is a frozen part of the wire format: these lengths, to the millimeter', () => {
    expect(LINK_MILLIMETER_LENGTHS).toEqual({
      manualPositions: { lengths: ['x', 'y', 'z'], perEdge: 1 },
      screen: { lengths: ['x'], perEdge: 1 },
      furniture: {
        lengths: ['width', 'depth', 'height', 'x', 'y'],
        perEdge: 2,
      },
      openings: {
        lengths: ['position', 'width', 'sill', 'height'],
        perEdge: 2,
      },
    })
  })

  it.each(listed)('stores the %s %s to the millimeter', (part, length) => {
    const nudged = structuredClone(EVERY_PART)
    const items = ITEMS_OF[part](nudged).filter((item) => length in item)
    for (const item of items) {
      const lengths = item as Record<string, number>
      lengths[length] = (lengths[length] ?? 0) + 0.0003
    }

    expect(items).not.toEqual([])
    expect(decodeConfig(encodeConfig(nudged))).toEqual({
      config: EVERY_PART,
      problem: null,
    })
  })

  it('keeps every other length as typed, to the last digit', () => {
    const config: Config = {
      ...DEFAULT_CONFIG,
      roomObjects: {
        ...DEFAULT_ROOM_OBJECTS,
        seatRow: { width: 3.6576, depth: 0.9144 },
        screen: {
          kind: 'projection',
          width: 2.6543219,
          height: 1.2345678,
          bottomEdge: 0.6543219,
          x: 0,
          standoff: 0.7512345,
        },
      },
    }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config,
      problem: null,
    })
  })

  it.each([
    ['manualPositions', 0.0005],
    ['screen', 0.0005],
    ['furniture', 0.001],
    ['openings', 0.001],
  ] as const)(
    'lets a version 2 link put the %s up to %f m past where it may be, as v1.1.0 did',
    (part, slack) => {
      expect(linkSlack(part)).toBe(slack)
    },
  )

  // Version 2 is released (v1.1.0): which links it opens never changes.
  describe.each([
    [
      'a speaker',
      (x: number) => ({
        ...EVERY_PART,
        manualPositions: { R: { x, y: 1, z: 1.2 } },
      }),
      // 0.3 m from the 4.5 m wide room's right wall.
      1.95,
      0.0005,
    ],
    [
      'a screen',
      (x: number) => ({
        ...EVERY_PART,
        roomObjects: { ...EVERY_PART.roomObjects, screen: { ...TV, x } },
      }),
      // Its 1.44 m image against the 4.5 m wide room's right wall.
      1.53,
      0.0005,
    ],
    [
      'a furniture box',
      (x: number) => ({
        ...EVERY_PART,
        roomObjects: {
          ...EVERY_PART.roomObjects,
          furniture: [{ ...CABINET, x }],
        },
      }),
      // Its 1.6 m width against the 4.5 m wide room's right wall.
      1.45,
      0.001,
    ],
  ] as const)('a version 2 link with %s', (_, at, edge, slack) => {
    it('opens up to its slack past the wall', () => {
      const config = at(edge + slack - 0.000001)
      expect(decodeConfig(encodedHolding({ v: 2, config }))).toEqual({
        config,
        problem: null,
      })
    })

    it('falls back a micrometer past that', () => {
      const config = at(edge + slack + 0.000001)
      expect(decodeConfig(encodedHolding({ v: 2, config }))).toEqual(FALLBACK)
    })
  })

  it.each([
    ['a millimeter past its wall end, which it opens', 4.051, null],
    [
      'two millimeters past its wall end, which it falls back for',
      4.052,
      'unreadable',
    ],
  ] as const)(
    'reads a version 2 link with a door %s',
    (_, position, problem) => {
      const config: Config = {
        ...EVERY_PART,
        roomObjects: {
          ...EVERY_PART.roomObjects,
          openings: [{ ...DOOR, position }],
        },
      }

      expect(decodeConfig(encodedHolding({ v: 2, config })).problem).toBe(
        problem,
      )
    },
  )
})

describe('short field names', () => {
  it('cover every field the worst-case config is written with', () => {
    // Record keys (channel and subwoofer ids, MLP) are not field names.
    const recordKeys = new Set([
      ...Object.keys(WORST_CASE_CONFIG.manualPositions),
      ...Object.keys(WORST_CASE_CONFIG.speakerGroups.subwoofers.ownSpecs),
    ])
    const short = new Set(['x', 'y', 'z'])
    const shortNames = new Set<string>(Object.values(SHORT_FIELD_NAMES))
    const written = keysIn(envelopeOf(encodeConfig(WORST_CASE_CONFIG)).config)

    expect(
      written.filter(
        (key) =>
          !recordKeys.has(key) && !short.has(key) && !shortNames.has(key),
      ),
    ).toEqual([])
  })

  it('are not record keys, so a link can always be spelled out again', () => {
    const shortNames: string[] = Object.values(SHORT_FIELD_NAMES)
    const recordKeys = keysIn(WORST_CASE_CONFIG.manualPositions)

    expect(shortNames.filter((name) => recordKeys.includes(name))).toEqual([])
  })

  it('must be unique', () => {
    expect(() =>
      createConfigCodec({
        version: 1,
        schema: configSchema,
        migrations: {},
        fallback: DEFAULT_CONFIG,
        shortFieldNames: { since: 1, names: { width: 'w', weight: 'w' } },
      }),
    ).toThrow('Short field names must be unique and not field names')
  })
})

describe('share link size', () => {
  it('is measured with a worst-case config the app accepts', () => {
    expect(decodeConfig(encodeConfig(WORST_CASE_CONFIG))).toEqual({
      config: WORST_CASE_CONFIG,
      problem: null,
    })
  })

  it(`keeps the worst-case config's link within ${URL_BUDGET} characters`, () => {
    const url = new URL(PRODUCTION_PAGE)
    // As the router writes the search param: percent-encoded where needed.
    url.searchParams.set('config', encodeConfig(WORST_CASE_CONFIG))

    expect(url.href.length).toBeLessThanOrEqual(URL_BUDGET)
  })
})

/**
 * A made-up history, to prove the migration hook on its own: version 1 is
 * today's real config schema, version 2 adds a required screen width (in
 * meters) and version 3 moves it into a screen object.
 */
const v2Schema = configSchema.extend({ screenWidth: z.number().positive() })
const v3Schema = configSchema.extend({
  screen: z.object({ width: z.number().positive() }),
})
type V3Config = z.infer<typeof v3Schema>

const fromV1 = migrateFrom(configSchema, (config) => ({
  ...config,
  screenWidth: 1.8,
}))
const fromV2 = migrateFrom(v2Schema, ({ screenWidth, ...config }) => ({
  ...config,
  screen: { width: screenWidth },
}))

const V3_DEFAULT: V3Config = { ...DEFAULT_CONFIG, screen: { width: 1.8 } }

const codecV2 = createConfigCodec({
  version: 2,
  schema: v2Schema,
  migrations: { 1: fromV1 },
  fallback: { ...DEFAULT_CONFIG, screenWidth: 1.8 },
})
const codecV3 = createConfigCodec({
  version: 3,
  schema: v3Schema,
  migrations: { 1: fromV1, 2: fromV2 },
  fallback: V3_DEFAULT,
})

describe('share links from older versions', () => {
  it('migrate a version 1 link through every later version', () => {
    const v1Link = encodedHolding({ v: 1, config: IMPERIAL_ROOM })

    expect(codecV3.decode(v1Link)).toEqual({
      config: { ...IMPERIAL_ROOM, screen: { width: 1.8 } },
      problem: null,
    })
  })

  it('migrate a version 2 link from where it is', () => {
    const v2Link = codecV2.encode({ ...IMPERIAL_ROOM, screenWidth: 2.5 })

    expect(codecV3.decode(v2Link)).toEqual({
      config: { ...IMPERIAL_ROOM, screen: { width: 2.5 } },
      problem: null,
    })
  })

  it('open a latest-version link without migrating', () => {
    const config: V3Config = { ...IMPERIAL_ROOM, screen: { width: 3 } }

    expect(codecV3.decode(codecV3.encode(config))).toEqual({
      config,
      problem: null,
    })
  })

  it('fall back when the link breaks the rules of its own version', () => {
    const brokenV1Link = encodedHolding({
      v: 1,
      config: { ...IMPERIAL_ROOM, room: { length: 50, width: 5, height: 3 } },
    })

    expect(codecV3.decode(brokenV1Link)).toEqual({
      config: V3_DEFAULT,
      problem: 'unreadable',
    })
  })

  it('need a migration from every older version', () => {
    expect(() =>
      createConfigCodec({
        version: 3,
        schema: v3Schema,
        migrations: { 1: fromV1 },
        fallback: V3_DEFAULT,
      }),
    ).toThrow('No share-link migration from config version 2')
  })
})
