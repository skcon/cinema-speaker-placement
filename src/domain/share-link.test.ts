import { compressToEncodedURIComponent } from 'lz-string'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  DEFAULT_CONFIG,
  decodeConfig,
  encodeConfig,
  UNIT_SYSTEMS,
  type Config,
  type UnitSystem,
} from '@/domain'
import { configSchema } from '@/domain/config'
import { createConfigCodec, migrateFrom } from '@/domain/share-link'

/**
 * A share-link value holding any JSON, written the way share links are
 * stored (JSON, then lz-string's URL-safe compression), to test what
 * decoding does with links the app would never write.
 */
function linkHolding(json: unknown): string {
  return compressToEncodedURIComponent(JSON.stringify(json))
}

const FALLBACK = { config: DEFAULT_CONFIG, problem: 'unreadable' }

describe('share link codec', () => {
  it('rebuilds the default config from its share link', () => {
    expect(decodeConfig(encodeConfig(DEFAULT_CONFIG))).toEqual({
      config: DEFAULT_CONFIG,
      problem: null,
    })
  })

  it.each(Object.keys(UNIT_SYSTEMS) as UnitSystem[])(
    'rebuilds a %s config exactly, down to the last digit of each length',
    (units) => {
      // Feet + inches converted to meters give long binary fractions, such
      // as 14.993619999999998 for 49 ft 2.3 in, which must come back as is.
      const config: Config = {
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

  describe('falls back to the default config', () => {
    const valid = encodeConfig({
      units: 'imperial',
      room: { length: 8, width: 5, height: 3 },
    })

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
      expect(decodeConfig(linkHolding(json))).toEqual(FALLBACK)
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
      ['unknown units', { ...DEFAULT_CONFIG, units: 'furlongs' }],
      ['no room', { units: 'metric' }],
    ])('for a version 1 config with %s', (_, config) => {
      expect(decodeConfig(linkHolding({ v: 1, config }))).toEqual(FALLBACK)
    })

    it('and says so when the link comes from a newer version of the app', () => {
      // A tab running an old build opens a link made by a newer one.
      expect(
        decodeConfig(linkHolding({ v: 99, config: { future: true } })),
      ).toEqual({ config: DEFAULT_CONFIG, problem: 'newer-version' })
    })
  })
})

describe('released share links', () => {
  // A version 1 link as the app writes it. Once version 1 is on the live
  // site, never edit this string: if this test fails, links people already
  // shared no longer open, and the schema change needs a migration instead.
  const V1_LINK =
    'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEDAWwAcBTAJwwEMAbEeepJS3EF2lFiIALKAHYAdAGZoAVgBM8AO4YAJiKgAWCbLGKQw2tmFEo8iWM1T5AXztA'

  it('keep opening: a 24 x 15 x 9 ft room in imperial', () => {
    // 24 ft = 7.3152 m, 15 ft = 4.572 m, 9 ft = 2.7432 m
    expect(decodeConfig(V1_LINK)).toEqual({
      config: {
        units: 'imperial',
        room: { length: 7.3152, width: 4.572, height: 2.7432 },
      },
      problem: null,
    })
  })
})

/**
 * The largest config a share link has to carry, for the size budget. Grow
 * it with the config: the compiler asks for every new required field, and
 * each new field should take its longest value. Planned growth (issue #2):
 * a 7.4.4 layout (7.1.4 with four subwoofers), every speaker and the MLP
 * manual with full-precision positions, specs for every speaker group and
 * per-subwoofer specs, amp power, crossover, target curve and seat row width.
 */
const WORST_CASE_CONFIG: Config = {
  units: 'imperial',
  // Near the limits, with all 17 significant digits a converted
  // feet + inches value or a drag can produce (14.987654320987655...).
  room: { length: 15 - 1 / 81, width: 15 - 1 / 7, height: 5 - 1 / 81 },
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
  it(`keeps the worst-case config's link within ${URL_BUDGET} characters`, () => {
    const url = new URL(PRODUCTION_PAGE)
    // As the router writes the search param: percent-encoded where needed.
    url.searchParams.set('config', encodeConfig(WORST_CASE_CONFIG))

    expect(url.href.length).toBeLessThanOrEqual(URL_BUDGET)
  })
})

/**
 * A made-up future, to prove the migration hook before a real version 2
 * exists: version 2 adds a seat row width, version 3 renames `units` to
 * `unitSystem`. Version 1 is today's real config schema.
 */
const v2Schema = configSchema.extend({ seatRowWidth: z.number().positive() })
const v3Schema = z.object({
  unitSystem: configSchema.shape.units,
  room: configSchema.shape.room,
  seatRowWidth: z.number().positive(),
})
type V3Config = z.infer<typeof v3Schema>

const fromV1 = migrateFrom(configSchema, (config) => ({
  ...config,
  seatRowWidth: 1.8,
}))
const fromV2 = migrateFrom(v2Schema, ({ units, ...rest }) => ({
  ...rest,
  unitSystem: units,
}))

const V3_DEFAULT: V3Config = {
  unitSystem: 'metric',
  room: { length: 6, width: 4.5, height: 2.6 },
  seatRowWidth: 1.8,
}

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
    const v1Link = encodeConfig({
      units: 'imperial',
      room: { length: 8, width: 5, height: 3 },
    })

    expect(codecV3.decode(v1Link)).toEqual({
      config: {
        unitSystem: 'imperial',
        room: { length: 8, width: 5, height: 3 },
        seatRowWidth: 1.8,
      },
      problem: null,
    })
  })

  it('migrate a version 2 link from where it is', () => {
    const v2Link = codecV2.encode({
      units: 'metric',
      room: { length: 7, width: 4, height: 2.4 },
      seatRowWidth: 2.5,
    })

    expect(codecV3.decode(v2Link)).toEqual({
      config: {
        unitSystem: 'metric',
        room: { length: 7, width: 4, height: 2.4 },
        seatRowWidth: 2.5,
      },
      problem: null,
    })
  })

  it('open a latest-version link without migrating', () => {
    const config: V3Config = { ...V3_DEFAULT, seatRowWidth: 3 }

    expect(codecV3.decode(codecV3.encode(config))).toEqual({
      config,
      problem: null,
    })
  })

  it('fall back when the link breaks the rules of its own version', () => {
    const brokenV1Link = linkHolding({
      v: 1,
      config: { units: 'metric', room: { length: 50, width: 5, height: 3 } },
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
