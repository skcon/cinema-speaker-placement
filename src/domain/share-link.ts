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
 * ## Changing the config schema (ADR 0003)
 *
 * Version 1 is whatever ships in the first release with share links; until
 * then `configSchema` can change, and the frozen links in
 * src/test/share-link-fixtures.ts are regenerated. After that, every change
 * to `configSchema` is a new version, however small (a new, removed or
 * renamed field, a new meaning, a wider or tighter range):
 *
 * 1. Copy today's `configSchema`, with everything it uses (the room limits,
 *    the layout list), into a frozen `configSchemaV<n>`, where n is
 *    CONFIG_VERSION.
 * 2. Change `configSchema` and bump CONFIG_VERSION to n + 1.
 * 3. Add `n: migrateFrom(configSchemaV<n>, (old) => ...)` to
 *    CONFIG_MIGRATIONS, returning the config in the version n + 1 shape.
 * 4. Keep the version n fixtures, and add version n + 1 ones.
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

/**
 * Why a share link could not be opened: it is damaged or not a share link
 * at all, or it was made by a newer version of the app than this one.
 */
export type ShareLinkProblem = 'unreadable' | 'newer-version'

/** What a share link holds: always a config, plus why it fell back, if it did. */
export type DecodedShareLink<C = Config> = {
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

/** Encodes and decodes share links for one config schema. */
export type ConfigCodec<C> = {
  encode: (config: C) => string
  decode: (param: string) => DecodedShareLink<C>
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
}: {
  version: number
  schema: z.ZodType<C>
  migrations: Readonly<Record<number, Migration>>
  fallback: C
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

  return {
    encode: (config) =>
      compressToEncodedURIComponent(JSON.stringify({ v: version, config })),
    decode: (param) => {
      try {
        const envelope = envelopeSchema.safeParse(
          JSON.parse(decompressFromEncodedURIComponent(param)),
        )
        if (!envelope.success) return unreadable
        const { v, config } = envelope.data
        if (v > version) return { config: fallback, problem: 'newer-version' }
        const migrated = steps
          .slice(v - 1)
          .reduce((old, migrate) => migrate(old), config)
        const result = schema.safeParse(migrated)
        return result.success
          ? { config: result.data, problem: null }
          : unreadable
      } catch {
        // Not compressed, not JSON, or an old config its migration rejects.
        return unreadable
      }
    },
  }
}

/** The current config schema version: the `v` that new share links get. */
const CONFIG_VERSION = 1

/** Migrations from each earlier schema version to the next (none yet). */
const CONFIG_MIGRATIONS: Readonly<Record<number, Migration>> = {}

const configCodec = createConfigCodec({
  version: CONFIG_VERSION,
  schema: configSchema,
  migrations: CONFIG_MIGRATIONS,
  fallback: DEFAULT_CONFIG,
})

/** The config as a URL-safe share-link value. */
export const encodeConfig: (config: Config) => string = configCodec.encode

/**
 * The config a share-link value holds, or the default config with the
 * problem when the value can't be opened. Never throws.
 */
export const decodeConfig: (param: string) => DecodedShareLink =
  configCodec.decode
