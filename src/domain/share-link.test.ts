import { compressToEncodedURIComponent } from 'lz-string'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  DEFAULT_CONFIG,
  decodeConfig,
  encodeConfig,
  UNIT_SYSTEM_NAMES,
  V1_DOLBY_LAYOUTS,
  type Config,
} from '@/domain'
import { IMPERIAL_ROOM, V1_LINKS } from '@/test/share-link-fixtures'
import { configSchema } from './config'
import { createConfigCodec, migrateFrom } from './share-link'

/**
 * An encoded config holding any JSON, written the way configs are encoded
 * (JSON, then lz-string's URL-safe compression), to test what decoding does
 * with links the app would never write.
 */
function encodedHolding(json: unknown): string {
  return compressToEncodedURIComponent(JSON.stringify(json))
}

const FALLBACK = { config: DEFAULT_CONFIG, problem: 'unreadable' }

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

/** The default config with this Subwoofers group: specs and own specs. */
function withSubwooferGroup(subwoofers: unknown) {
  return { ...DEFAULT_CONFIG, speakerGroups: { subwoofers } }
}

describe('share link codec', () => {
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

  describe.each(V1_DOLBY_LAYOUTS)('rebuilds a %s layout', (dolbyLayout) => {
    it.each([1, 2, 3, 4] as const)(
      'with %i subwoofer(s), every other one with its own specs',
      (subwoofers) => {
        const config: Config = {
          ...IMPERIAL_ROOM,
          layout: { dolbyLayout, subwoofers },
          speakerGroups: {
            subwoofers: {
              specs: PORTED_15,
              ownSpecs: EVEN_OWN_SPECS[subwoofers],
            },
          },
        }

        expect(decodeConfig(encodeConfig(config))).toEqual({
          config,
          problem: null,
        })
      },
    )
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
      speakerGroups: { subwoofers: { specs, ownSpecs: { Sub1: specs } } },
    }

    expect(decodeConfig(encodeConfig(config))).toEqual({
      config,
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

    it.each([
      [
        'a room too long',
        { ...DEFAULT_CONFIG, room: { length: 50, width: 4.5, height: 2.6 } },
      ],
      [
        'a ceiling too low',
        { ...DEFAULT_CONFIG, room: { length: 6, width: 4.5, height: 1.2 } },
      ],
      [
        'a dimension that is text',
        { ...DEFAULT_CONFIG, room: { length: '6', width: 4.5, height: 2.6 } },
      ],
      [
        'a missing dimension',
        { ...DEFAULT_CONFIG, room: { length: 6, width: 4.5 } },
      ],
      ['a room that is null', { ...DEFAULT_CONFIG, room: null }],
      ['unknown units', { ...DEFAULT_CONFIG, units: 'furlongs' }],
      [
        'a layout outside v1',
        { ...DEFAULT_CONFIG, layout: { dolbyLayout: '9.1.4', subwoofers: 1 } },
      ],
      [
        'no subwoofer',
        { ...DEFAULT_CONFIG, layout: { dolbyLayout: '5.1', subwoofers: 0 } },
      ],
      [
        'five subwoofers',
        { ...DEFAULT_CONFIG, layout: { dolbyLayout: '5.1', subwoofers: 5 } },
      ],
      [
        'a fractional subwoofer count',
        { ...DEFAULT_CONFIG, layout: { dolbyLayout: '5.1', subwoofers: 1.5 } },
      ],
      // A link the app wrote at this version has every field and nothing
      // else, so anything missing or extra means it was changed by hand.
      [
        'no units',
        { room: DEFAULT_CONFIG.room, layout: DEFAULT_CONFIG.layout },
      ],
      ['no layout', { units: 'metric', room: DEFAULT_CONFIG.room }],
      ['an unknown field', { ...DEFAULT_CONFIG, theme: 'dark' }],
      [
        'an unknown room field',
        { ...DEFAULT_CONFIG, room: { ...DEFAULT_CONFIG.room, depth: 3 } },
      ],
      [
        'an unknown layout field',
        {
          ...DEFAULT_CONFIG,
          layout: { ...DEFAULT_CONFIG.layout, overheads: 4 },
        },
      ],
      [
        'no speaker groups',
        {
          units: 'metric',
          room: DEFAULT_CONFIG.room,
          layout: DEFAULT_CONFIG.layout,
        },
      ],
      [
        'an unknown speaker group',
        {
          ...DEFAULT_CONFIG,
          speakerGroups: {
            ...DEFAULT_CONFIG.speakerGroups,
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
    ])('for a version 1 config with %s', (_, config) => {
      expect(decodeConfig(encodedHolding({ v: 1, config }))).toEqual(FALLBACK)
    })

    it('and says so when the link comes from a newer version of the app', () => {
      // A tab running an old build opens a link made by a newer one.
      expect(
        decodeConfig(encodedHolding({ v: 99, config: { future: true } })),
      ).toEqual({ config: DEFAULT_CONFIG, problem: 'newer-version' })
    })
  })
})

describe('released share links', () => {
  // Typed here, so the shared fixtures stay valid configs.
  const links: Record<string, { encoded: string; config: Config }> = V1_LINKS

  it.each(Object.entries(links))(
    'keep opening: %s',
    (_, { encoded, config }) => {
      expect(decodeConfig(encoded)).toEqual({ config, problem: null })
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

/**
 * The largest config a share link has to carry, for the size budget: the
 * largest real config today. Grow it with the config: the compiler asks for
 * every new field, and each one should take its longest value. Planned
 * growth (issue #2): every speaker (overheads and the four subwoofers
 * included) and the MLP manual with full-precision positions, specs for
 * the other speaker groups (#13), amp power, crossover, target curve and
 * seat row width.
 */
const WORST_CASE_CONFIG: Config = {
  units: 'imperial',
  // Near the limits, with all 17 significant digits a converted
  // feet + inches value or a drag can produce (14.987654320987655...).
  room: { length: 15 - 1 / 81, width: 15 - 1 / 7, height: 5 - 1 / 81 },
  // The largest v1 layout: 7.4.4.
  layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
  // Group specs, and different own specs for every subwoofer.
  speakerGroups: {
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
 * A made-up future, to prove the migration hook before a real version 2
 * exists: version 2 adds a required seat row width (in meters), version 3
 * moves it into a seat row object. Version 1 is today's real config schema.
 */
const v2Schema = configSchema.extend({ seatRowWidth: z.number().positive() })
const v3Schema = configSchema.extend({
  seatRow: z.object({ width: z.number().positive() }),
})
type V3Config = z.infer<typeof v3Schema>

const fromV1 = migrateFrom(configSchema, (config) => ({
  ...config,
  seatRowWidth: 1.8,
}))
const fromV2 = migrateFrom(v2Schema, ({ seatRowWidth, ...config }) => ({
  ...config,
  seatRow: { width: seatRowWidth },
}))

const V3_DEFAULT: V3Config = { ...DEFAULT_CONFIG, seatRow: { width: 1.8 } }

const codecV2 = createConfigCodec({
  version: 2,
  schema: v2Schema,
  migrations: { 1: fromV1 },
  fallback: { ...DEFAULT_CONFIG, seatRowWidth: 1.8 },
})
const codecV3 = createConfigCodec({
  version: 3,
  schema: v3Schema,
  migrations: { 1: fromV1, 2: fromV2 },
  fallback: V3_DEFAULT,
})

describe('share links from older versions', () => {
  it('migrate a version 1 link through every later version', () => {
    expect(codecV3.decode(encodeConfig(IMPERIAL_ROOM))).toEqual({
      config: { ...IMPERIAL_ROOM, seatRow: { width: 1.8 } },
      problem: null,
    })
  })

  it('migrate a version 2 link from where it is', () => {
    const v2Link = codecV2.encode({ ...IMPERIAL_ROOM, seatRowWidth: 2.5 })

    expect(codecV3.decode(v2Link)).toEqual({
      config: { ...IMPERIAL_ROOM, seatRow: { width: 2.5 } },
      problem: null,
    })
  })

  it('open a latest-version link without migrating', () => {
    const config: V3Config = { ...IMPERIAL_ROOM, seatRow: { width: 3 } }

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
