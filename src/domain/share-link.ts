/**
 * The share-link codec: the config as the encoded config a share link
 * carries in its `config` search param, and back (ADRs 0001 and 0003).
 *
 * ## Wire format
 *
 *     lz-string compressToEncodedURIComponent(JSON.stringify({ v, config }))
 *
 * `v` is the config schema version the link was written with, and `config`
 * is a config in that version's shape, checked strictly: every field, and
 * nothing else. Links live for years in chats and bookmarks, so every
 * version ever released must keep opening.
 *
 * From version 2 on, `config` spells its field names short, as
 * SHORT_FIELD_NAMES gives them ("room" is "r", "width" is "w"), which keeps
 * the worst-case link inside the URL budget without dropping a digit
 * (ADR 0003, second 1.1.0 amendment). Version 1 links spell them out.
 * Record keys (channel ids, subwoofer ids, "MLP") and values stay as they
 * are.
 *
 * ## Changing the config schema (ADR 0003)
 *
 * Only `vX.Y.Z` tags deploy, so a schema version reaches users when the
 * release that writes it is tagged. Version 1 shipped in v1.0.0 and is
 * frozen in config-v1.ts. Version 2 is the version of the 1.1.0 release
 * cycle: until v1.1.0 is tagged it is unreleased, and every 1.1.0 change
 * to the config extends it instead of adding a version.
 *
 * Extending the unreleased version (CONFIG_VERSION, not yet tagged):
 *
 * 1. Change `configSchema` (config.ts) and DEFAULT_CONFIG.
 * 2. In the migration to it, CONFIG_MIGRATIONS[CONFIG_VERSION - 1], give
 *    each new field the value an older link means (usually its default),
 *    so links from the version before still open as the same room.
 * 3. Give each new field name a short name in SHORT_FIELD_NAMES.
 * 4. Regenerate its fixtures (V<n>_LINKS in src/test/share-link-fixtures.ts)
 *    and grow the worst-case config of the URL budget test.
 *
 * Once a version is released, every change to `configSchema` is a new
 * version, however small (a new, removed or renamed field, a new meaning,
 * a wider or tighter range), made with the first change of the next
 * release cycle:
 *
 * 1. Copy today's `configSchema`, with everything it uses (the room limits,
 *    the layout list, the channel ids, the placement rules), into a frozen
 *    config-v<n>.ts exporting `configSchemaV<n>`, where n is
 *    CONFIG_VERSION. It imports nothing but zod (ESLint checks), so later
 *    changes to the live code can't reach it.
 * 2. Change `configSchema` and bump CONFIG_VERSION to n + 1.
 * 3. Add `n: migrateFrom(configSchemaV<n>, (old) => ...)` to
 *    CONFIG_MIGRATIONS, returning the config in the version n + 1 shape.
 * 4. Keep the version n fixtures, never edited again, and add version n + 1
 *    ones.
 *
 * Decoding validates an old link against its own version's schema, runs it
 * through each migration up to the latest version, and validates the result
 * against `configSchema`. A build that meets a newer version than its own
 * reports `newer-version` instead of calling the link broken.
 */
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'
import { z } from 'zod'
import { configSchema, DEFAULT_CONFIG, type Config } from './config'
import { configSchemaV1 } from './config-v1'
import { roundToMillimeter } from './manual-positions'
import { DEFAULT_ROOM_OBJECTS, roundRoomObjectsForLink } from './room-objects'

/**
 * Why a share link could not be opened: it is damaged or not a share link
 * at all, or it was made by a newer version of the app than this one.
 */
export type ShareLinkProblem = 'unreadable' | 'newer-version'

/**
 * What decoding an encoded config gives: always a config, plus why it fell
 * back to the default, if it did.
 */
export type DecodedConfig<C = Config> = {
  config: C
  problem: ShareLinkProblem | null
}

/** Turns a config of one schema version into the next version's shape. */
export type Migration = (config: unknown) => unknown

/**
 * A migration from one schema version to the next. The old config is
 * checked against that version's (frozen) schema first, so `up` gets a
 * typed, valid config.
 */
export function migrateFrom<S extends z.ZodType>(
  schema: S,
  up: (config: z.output<S>) => unknown,
): Migration {
  return (config) => up(schema.parse(config))
}

/**
 * Short names for a config's field names, keyed by the field name. Every
 * short name is used once, and is never a field name itself, so a link's
 * names can always be spelled out again, and a link that spells one out
 * was not written by the app.
 */
export type FieldNames = Readonly<Record<string, string>>

/**
 * `value` with its object keys renamed by `names` (keys without a name
 * stay as they are), through nested objects and arrays. Throws on a key in
 * `forbidden`.
 */
function renameFields(
  value: unknown,
  names: ReadonlyMap<string, string>,
  forbidden: ReadonlySet<string>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => renameFields(item, names, forbidden))
  }
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => {
      if (forbidden.has(key)) throw new Error(`Unexpected field name ${key}`)
      return [names.get(key) ?? key, renameFields(field, names, forbidden)]
    }),
  )
}

/**
 * Shortens and spells out the field names of configs, by `names` (see
 * FieldNames). Throws when two fields share a short name, or a short name
 * is a field name.
 */
function fieldRenamer(names: FieldNames) {
  const entries = Object.entries(names)
  const shortNames = new Set(entries.map(([, short]) => short))
  if (
    shortNames.size !== entries.length ||
    entries.some(([, short]) => short in names)
  ) {
    throw new Error('Short field names must be unique and not field names')
  }
  const toShort = new Map(entries)
  const toLong = new Map(entries.map(([long, short]) => [short, long]))
  const longNames = new Set(toShort.keys())
  return {
    shorten: (config: unknown) => renameFields(config, toShort, new Set()),
    /** Throws on a field name that is spelled out: the app never writes one. */
    spellOut: (config: unknown) => renameFields(config, toLong, longNames),
  }
}

/** Encodes and decodes configs of one config schema. */
export type ConfigCodec<C> = {
  encode: (config: C) => string
  decode: (encoded: string) => DecodedConfig<C>
}

const envelopeSchema = z.object({
  v: z.int().min(1),
  config: z.unknown(),
})

/**
 * A codec for configs at `version`, which opens links from every earlier
 * version through `migrations` (keyed by the version each one starts from)
 * and falls back to `fallback` for links it can't open.
 */
export function createConfigCodec<C>({
  version,
  schema,
  migrations,
  fallback,
  shortFieldNames,
}: {
  version: number
  schema: z.ZodType<C>
  migrations: Readonly<Record<number, Migration>>
  fallback: C
  /**
   * Links from version `since` on spell the config's field names short,
   * by `names`; older ones spell them out.
   */
  shortFieldNames?: { since: number; names: FieldNames }
}): ConfigCodec<C> {
  const steps = Array.from({ length: version - 1 }, (_, index) => {
    const from = index + 1
    const migration = migrations[from]
    if (!migration) {
      throw new Error(`No share-link migration from config version ${from}`)
    }
    return migration
  })
  const unreadable = { config: fallback, problem: 'unreadable' } as const
  const renamer = shortFieldNames && fieldRenamer(shortFieldNames.names)
  const isShort = (v: number) =>
    shortFieldNames !== undefined && v >= shortFieldNames.since

  return {
    encode: (config) =>
      compressToEncodedURIComponent(
        JSON.stringify({
          v: version,
          config:
            renamer && isShort(version) ? renamer.shorten(config) : config,
        }),
      ),
    decode: (encoded) => {
      try {
        const envelope = envelopeSchema.safeParse(
          JSON.parse(decompressFromEncodedURIComponent(encoded)),
        )
        if (!envelope.success) return unreadable
        const { v, config: written } = envelope.data
        if (v > version) return { config: fallback, problem: 'newer-version' }
        const config =
          renamer && isShort(v) ? renamer.spellOut(written) : written
        const migrated = steps
          .slice(v - 1)
          .reduce((old, migrate) => migrate(old), config)
        const result = schema.safeParse(migrated)
        return result.success
          ? { config: result.data, problem: null }
          : unreadable
      } catch {
        // Not compressed, not JSON, a field name spelled out where the
        // link spells them short, or an old config its migration rejects.
        return unreadable
      }
    },
  }
}

/**
 * An encoded config (see GLOSSARY.md): the text a share link carries in its
 * `config` search param, as encodeConfig writes it. Only part of a share
 * link, never the whole address.
 */
export type EncodedConfig = string & { readonly __brand: 'EncodedConfig' }

/** The current config schema version: the `v` that new share links get. */
const CONFIG_VERSION = 2

/**
 * How deep v1.0.0 drew every Seat row, in meters: version 1 stored only
 * its width. A fact about that release, so not SEAT_ROW's (changeable)
 * default.
 */
const V1_SEAT_ROW_DEPTH = 0.9

/**
 * The short field names of version 2 links on (see the wire format above),
 * keyed by the config's field names. Released links depend on them: never
 * change or reuse a short name, only add one for a new field (a test checks
 * that every field of the worst-case config has one).
 */
export const SHORT_FIELD_NAMES = {
  units: 'u',
  room: 'r',
  length: 'l',
  width: 'w',
  height: 'h',
  layout: 'ly',
  dolbyLayout: 'dl',
  subwoofers: 's',
  speakerGroups: 'g',
  front: 'f',
  center: 'c',
  surrounds: 'sr',
  rearSurrounds: 'rs',
  overheads: 'o',
  specs: 'sp',
  ownSpecs: 'os',
  type: 't',
  sensitivity: 'se',
  enclosure: 'e',
  driverDiameter: 'dd',
  rmsWatts: 'rw',
  peakWatts: 'pw',
  amplifierWatts: 'aw',
  targetCurve: 'tc',
  crossoverHz: 'xo',
  manualPositions: 'm',
  roomObjects: 'ro',
  seatRow: 'st',
  depth: 'd',
  screen: 'sc',
  kind: 'k',
  bottomEdge: 'be',
  standoff: 'so',
  furniture: 'fu',
  name: 'n',
  rotation: 'rt',
} as const satisfies FieldNames

/** The first config schema version whose links use SHORT_FIELD_NAMES. */
const SHORT_FIELD_NAMES_SINCE = 2

/** Migrations from each earlier schema version to the next. */
const CONFIG_MIGRATIONS: Readonly<Record<number, Migration>> = {
  // The 1.1.0 tickets that extend version 2 give their new fields the
  // value a version 1 link means here. Version 1 had no room objects
  // except the seat row, whose width was a field of its own and whose
  // position (then as now) follows the MLP.
  1: migrateFrom(configSchemaV1, ({ seatRowWidth, ...config }) => ({
    ...config,
    roomObjects: {
      ...DEFAULT_ROOM_OBJECTS,
      seatRow: { width: seatRowWidth, depth: V1_SEAT_ROW_DEPTH },
    },
  })),
}

/**
 * A config with its field names as a version 2 link spells them (see
 * SHORT_FIELD_NAMES), for tests that write links by hand.
 */
export function shortenFieldNames(config: unknown): unknown {
  return fieldRenamer(SHORT_FIELD_NAMES).shorten(config)
}

const configCodec = createConfigCodec({
  version: CONFIG_VERSION,
  schema: configSchema,
  migrations: CONFIG_MIGRATIONS,
  fallback: DEFAULT_CONFIG,
  shortFieldNames: { since: SHORT_FIELD_NAMES_SINCE, names: SHORT_FIELD_NAMES },
})

/**
 * The config as an encoded config: the URL-safe text a share link carries
 * in its `config` search param. Manual positions, and where a room object
 * was dragged to, are written to the nearest millimeter, which keeps links
 * short: a drag gives 17 significant digits, and nobody mounts a speaker
 * more precisely than that.
 */
export function encodeConfig(config: Config): EncodedConfig {
  return configCodec.encode({
    ...config,
    manualPositions: roundToMillimeter(config.manualPositions),
    roomObjects: roundRoomObjectsForLink(config.roomObjects),
  }) as EncodedConfig
}

/**
 * The config an encoded config holds, or the default config with the
 * problem when it can't be opened. Never throws.
 */
export const decodeConfig: (encoded: string) => DecodedConfig =
  configCodec.decode
