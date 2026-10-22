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
 * ## Config versions
 *
 * What a version means lives in one place: its entry in CONFIG_VERSIONS
 * (a ConfigVersion), which holds
 *
 * - its frozen schema (config-v<n>.ts), which a link of that version must
 *   pass;
 * - its wire form (WireForm): the lengths its links store to the
 *   millimeter (link-precision.ts), whether they spell the field names
 *   short and which part of the config they pack;
 * - its migration up: the config in the next version's shape.
 *
 * The codec walks the table: it reads a link by its version's wire form,
 * checks it against that version's schema and migrates it up, checking it
 * against each later version's schema on the way, and last against the
 * live `configSchema` (config.ts), which the store holds every config to.
 * New links are written with the last entry, the current version.
 *
 * Version 1 (v1.0.0) spells its field names out. Version 2 (v1.1.0 to
 * v1.3.0) spells them short, as SHORT_FIELD_NAMES gives them ("room" is
 * "r", "width" is "w"), which keeps the worst-case link inside the URL
 * budget without dropping a digit (ADR 0003, second 1.1.0 amendment).
 * Version 3 (#123) adds one field, the seat the auto speakers stay
 * installed for while Speakers follow the seat is off, with a short name
 * of its own (V3_SHORT_FIELD_NAMES) and stored to the millimeter; its
 * links are otherwise written as version 2's.
 * Record keys (channel ids, subwoofer ids, "MLP") and values stay as they
 * are, but for one: a version 2 link writes each opening (a door or
 * window, `roomObjects.openings`) as a tuple of whole numbers, packed by
 * OPENING_WIRE_CODES (ADR 0003, third 1.1.0 amendment):
 *
 *     door:   [code, position, width]
 *     window: [code, position, width, sill, height]
 *
 * `code` folds the kind and the wall into one digit, and every length is
 * in millimeters, which is how a link stores them anyway. Decoding unpacks
 * them after spelling the names out; anything else in their place makes
 * the link unreadable.
 *
 * ## Changing the config schema (ADR 0003)
 *
 * Only `vX.Y.Z` tags deploy, so a schema version reaches users when the
 * release that writes it is tagged. Every version in CONFIG_VERSIONS is
 * released and frozen. The first change to `configSchema` (config.ts) in a
 * release cycle, however small (a new, removed or renamed field, a new
 * meaning, a wider or tighter range, including a limit in reference.ts the
 * schema reads), adds version n + 1, where n is the current version:
 *
 * 1. Change `configSchema` and DEFAULT_CONFIG.
 * 2. Copy the new schema, with everything it uses (the room limits, the
 *    layout list, the channel ids, the placement and room-object rules),
 *    into config-v<n + 1>.ts exporting `configSchemaV<n + 1>`. It imports
 *    nothing but zod (ESLint checks), so later changes to the live code
 *    can't reach it.
 * 3. Give version n its migration up: `up` in its entry, returning the
 *    config in the version n + 1 shape, each new field with the value an
 *    older link means (usually its default).
 * 4. Add the version n + 1 entry: its frozen schema, its wire form (a
 *    short name for each new field, a millimeter table of its own if it
 *    stores other lengths to the millimeter) and no migration up.
 * 5. Keep the version n fixtures, never edited again, and add version
 *    n + 1 ones (V<n + 1>_LINKS in src/test/share-link-fixtures.ts); grow
 *    the worst-case config of the URL budget test.
 *
 * Later changes in the same release cycle extend version n + 1 in place,
 * its frozen copy and fixtures too, until its release is tagged (ADR 0003,
 * first 1.1.0 amendment). A build that meets a newer version than its own
 * reports `newer-version` instead of calling the link broken.
 */
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'
import { z } from 'zod'
import { configSchema, DEFAULT_CONFIG, type Config } from './config'
import { configSchemaV1 } from './config-v1'
import { configSchemaV2 } from './config-v2'
import { configSchemaV3 } from './config-v3'
import {
  LINK_MILLIMETER_LENGTHS,
  MILLIMETERS_PER_METER,
  toMillimeter,
  V2_MILLIMETER_LENGTHS,
  type MillimeterLengths,
} from './link-precision'
import { entries, type ManualPositions } from './manual-positions'
import {
  OPENING_KINDS,
  type Door,
  type Opening,
  type OpeningKind,
  type WindowOpening,
} from './openings'
import { DEFAULT_ROOM_OBJECTS } from './room-objects'
import { WALLS, type Wall } from './room'

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

/**
 * Short names for a config's field names, keyed by the field name. Every
 * short name is used once, and is never a field name itself, so a link's
 * names can always be spelled out again, and a link that spells one out
 * was not written by the app.
 */
export type FieldNames = Readonly<Record<string, string>>

/**
 * A part of the config that a version's links write in a packed form:
 * `pack` turns a config (its field names spelled out) into that form, and
 * `unpack` turns it back, throwing on anything `pack` never writes.
 */
export type Packing = {
  readonly pack: (config: unknown) => unknown
  readonly unpack: (config: unknown) => unknown
}

/** How the links of one config version write a config, inside the JSON. */
export type WireForm = {
  /**
   * The lengths its links store to the millimeter: rounded before a link
   * is written, and the source of validity's slack for them.
   */
  readonly millimeterLengths: MillimeterLengths
  /** The short names its links spell field names with, or null for none. */
  readonly fieldNames: FieldNames | null
  /** The part of the config its links pack, or null for none. */
  readonly packing: Packing | null
}

/**
 * Turns a config of one schema version, which that version's schema has
 * accepted, into the next version's shape.
 */
export type Migration = (config: unknown) => unknown

/** Everything one config schema version means (see the top of this file). */
export type ConfigVersion = {
  /** The schema its links must pass: frozen once it is released. */
  readonly schema: z.ZodType
  /** How its links write the config. */
  readonly wire: WireForm
  /** Its migration up, or null for the current version. */
  readonly up: Migration | null
}

/**
 * A config version: its schema, its wire form and its migration up, which
 * gets a config the schema accepted, so a typed, valid one.
 */
export function configVersion<S extends z.ZodType>({
  schema,
  wire,
  up,
}: {
  schema: S
  wire: WireForm
  up: ((config: z.output<S>) => unknown) | null
}): ConfigVersion {
  return { schema, wire, up: up && ((config) => up(config as z.output<S>)) }
}

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

/**
 * How a wire form writes a config (its lengths already rounded) into a
 * link, packed and then with its field names short, and reads it back.
 * Reading throws on anything writing never gives.
 */
function wireCoder({ fieldNames, packing }: WireForm) {
  const renamer = fieldNames && fieldRenamer(fieldNames)
  return {
    write: (config: unknown): unknown => {
      const packed = packing ? packing.pack(config) : config
      return renamer ? renamer.shorten(packed) : packed
    },
    read: (written: unknown): unknown => {
      const spelledOut = renamer ? renamer.spellOut(written) : written
      return packing ? packing.unpack(spelledOut) : spelledOut
    },
  }
}

/** Encodes and decodes configs of one config schema. */
export type ConfigCodec<C> = {
  /** The version it writes links with: the last it knows. */
  current: ConfigVersion
  encode: (config: C) => string
  decode: (encoded: string) => DecodedConfig<C>
}

const envelopeSchema = z.object({
  v: z.int().min(1),
  config: z.unknown(),
})

/**
 * A codec that writes links with the last of `versions` (version n is
 * `versions[n - 1]`), opens links of every version through their
 * migrations up, holds the result to `schema` and falls back to `fallback`
 * for links it can't open. Throws when a version but the last has no
 * migration up, or the last has one.
 */
export function createConfigCodec<C>({
  versions,
  schema,
  fallback,
}: {
  versions: readonly ConfigVersion[]
  schema: z.ZodType<C>
  fallback: C
}): ConfigCodec<C> {
  const current = versions.length
  const currentVersion = versions[current - 1]
  if (!currentVersion) throw new Error('No config version')
  versions.forEach(({ up }, index) => {
    const version = index + 1
    if (version < current && !up) {
      throw new Error(`No share-link migration from config version ${version}`)
    }
    if (version === current && up) {
      throw new Error(`The current config version ${version} has a migration`)
    }
  })
  const coders = versions.map(({ wire }) => wireCoder(wire))
  const unreadable = { config: fallback, problem: 'unreadable' } as const

  /** The config a version `v` link holds, at the current version. */
  const migrated = (v: number, written: unknown): unknown =>
    versions.slice(v - 1).reduce<unknown>(
      (config, { schema: frozen, up }) => {
        const valid = frozen.parse(config)
        return up ? up(valid) : valid
      },
      coders[v - 1]?.read(written),
    )

  return {
    current: currentVersion,
    encode: (config) =>
      compressToEncodedURIComponent(
        JSON.stringify({
          v: current,
          config: coders[current - 1]?.write(config),
        }),
      ),
    decode: (encoded) => {
      try {
        const envelope = envelopeSchema.safeParse(
          JSON.parse(decompressFromEncodedURIComponent(encoded)),
        )
        if (!envelope.success) return unreadable
        const { v, config: written } = envelope.data
        if (v > current) return { config: fallback, problem: 'newer-version' }
        const result = schema.safeParse(migrated(v, written))
        return result.success
          ? { config: result.data, problem: null }
          : unreadable
      } catch {
        // Not compressed, not JSON, a field name spelled out where the
        // link spells them short, a packed value that was not packed by
        // the app, or a config its version's schema rejects.
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

// Version 1: v1.0.0.

/**
 * How deep v1.0.0 drew every Seat row, in meters: version 1 stored only
 * its width. A fact about that release, so not SEAT_ROW's (changeable)
 * default.
 */
const V1_SEAT_ROW_DEPTH = 0.9

/** Version 1's links stored the manual positions to the millimeter. */
const V1_MILLIMETER_LENGTHS = {
  manualPositions: { lengths: ['x', 'y', 'z'], perEdge: 1 },
} as const satisfies MillimeterLengths

const VERSION_1 = configVersion({
  schema: configSchemaV1,
  wire: {
    millimeterLengths: V1_MILLIMETER_LENGTHS,
    fieldNames: null,
    packing: null,
  },
  // Version 1 had no room objects except the seat row, whose width was a
  // field of its own and whose position (then as now) follows the MLP.
  up: ({ seatRowWidth, ...config }) => ({
    ...config,
    roomObjects: {
      ...DEFAULT_ROOM_OBJECTS,
      seatRow: { width: seatRowWidth, depth: V1_SEAT_ROW_DEPTH },
    },
  }),
})

// Version 2: v1.1.0 to v1.3.0.

/**
 * The short field names of version 2 links (see the wire format above),
 * keyed by the config's field names. Released links depend on them: never
 * change or reuse a short name. A later version that adds a field gives it
 * a short name in a table of its own (a test checks that every field of
 * the worst-case config has one).
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
  openings: 'op',
} as const satisfies FieldNames

/**
 * The first digit of an opening's tuple in a version 2 link (see the wire
 * format above): its kind and its wall in one. Released links depend on
 * them: never change or reuse a code.
 */
const OPENING_WIRE_CODES = {
  door: { front: 0, right: 1, back: 2, left: 3 },
  window: { front: 4, right: 5, back: 6, left: 7 },
} as const satisfies Record<OpeningKind, Record<Wall, number>>

/** Each opening's fields after its code, in their order in its tuple. */
const OPENING_WIRE_FIELDS = {
  door: ['position', 'width'],
  window: ['position', 'width', 'sill', 'height'],
} as const satisfies {
  door: readonly (keyof Door)[]
  window: readonly (keyof WindowOpening)[]
}

/** The kind and wall that `code` stands for, or null for no code. */
function fromWireCode(code: unknown): { kind: OpeningKind; wall: Wall } | null {
  for (const kind of OPENING_KINDS) {
    for (const wall of WALLS) {
      if (OPENING_WIRE_CODES[kind][wall] === code) return { kind, wall }
    }
  }
  return null
}

/**
 * An opening as a version 2 link writes it: a tuple (see above). Anything
 * that is not an opening of the config's exact shape stays as it is, for
 * the decoder to reject.
 */
function packOpening(opening: unknown): unknown {
  if (typeof opening !== 'object' || opening === null) return opening
  const { kind, wall } = opening as { kind?: unknown; wall?: unknown }
  if (kind !== 'door' && kind !== 'window') return opening
  const codes: Readonly<Record<string, number>> = OPENING_WIRE_CODES[kind]
  const code = typeof wall === 'string' ? codes[wall] : undefined
  const fields: readonly string[] = OPENING_WIRE_FIELDS[kind]
  const keys = Object.keys(opening)
  if (
    code === undefined ||
    keys.length !== fields.length + 2 ||
    !fields.every((field) => keys.includes(field))
  ) {
    return opening
  }
  const values = opening as Readonly<Record<string, unknown>>
  return [
    code,
    ...fields.map((field) => {
      const meters = values[field]
      return typeof meters === 'number'
        ? Math.round(meters * MILLIMETERS_PER_METER)
        : meters
    }),
  ]
}

/** An opening's tuple back as the opening. Throws on anything else. */
function unpackOpening(packed: unknown): Opening {
  const [code, ...millimeters] = Array.isArray(packed)
    ? (packed as unknown[])
    : []
  const opening = fromWireCode(code)
  const fields: readonly string[] = opening
    ? OPENING_WIRE_FIELDS[opening.kind]
    : []
  if (
    !opening ||
    millimeters.length !== fields.length ||
    !millimeters.every((value) => Number.isSafeInteger(value))
  ) {
    throw new Error('Not a packed opening')
  }
  return {
    ...opening,
    ...Object.fromEntries(
      fields.map((field, at) => [
        field,
        (millimeters[at] as number) / MILLIMETERS_PER_METER,
      ]),
    ),
  } as Opening
}

/**
 * `config` (its field names spelled out) with its openings changed by
 * `change`; anything without a list of openings stays as it is.
 */
function withWireOpenings(
  config: unknown,
  change: (opening: unknown) => unknown,
): unknown {
  if (typeof config !== 'object' || config === null) return config
  const { roomObjects } = config as { roomObjects?: unknown }
  if (typeof roomObjects !== 'object' || roomObjects === null) return config
  const { openings } = roomObjects as { openings?: unknown }
  if (!Array.isArray(openings)) return config
  return {
    ...config,
    roomObjects: { ...roomObjects, openings: openings.map(change) },
  }
}

/** Openings packed as tuples in version 2 links (see above). */
const PACKED_OPENINGS: Packing = {
  pack: (config) => withWireOpenings(config, packOpening),
  unpack: (config) => withWireOpenings(config, unpackOpening),
}

const VERSION_2 = configVersion({
  schema: configSchemaV2,
  wire: {
    millimeterLengths: V2_MILLIMETER_LENGTHS,
    fieldNames: SHORT_FIELD_NAMES,
    packing: PACKED_OPENINGS,
  },
  // Version 2 had no Speakers follow the seat: its auto speakers always
  // followed the MLP, as they do with it on.
  up: (config) => ({ ...config, speakersInstalledFor: null }),
})

// Version 3: the 1.3.1 release cycle (#123).

/**
 * The short field names version 3 adds to version 2's (SHORT_FIELD_NAMES),
 * keyed by the config's field names. Released links will depend on them:
 * never change or reuse a short name, and give a later version's new
 * fields a table of their own.
 */
export const V3_SHORT_FIELD_NAMES = {
  speakersInstalledFor: 'si',
} as const satisfies FieldNames

const VERSION_3 = configVersion({
  schema: configSchemaV3,
  wire: {
    millimeterLengths: LINK_MILLIMETER_LENGTHS,
    fieldNames: { ...SHORT_FIELD_NAMES, ...V3_SHORT_FIELD_NAMES },
    packing: PACKED_OPENINGS,
  },
  up: null,
})

/**
 * Every config schema version, version n at index n - 1: what each one
 * means (see ConfigVersion). The last is the current version, which new
 * links are written with.
 */
export const CONFIG_VERSIONS: readonly ConfigVersion[] = [
  VERSION_1,
  VERSION_2,
  VERSION_3,
]

/**
 * A config as a link of version `v` (2 or later) writes it, its openings
 * packed and its field names short (see the wire format above), for tests
 * that write links by hand. Its lengths are not rounded, and an opening
 * that is not of the config's exact shape stays as it is.
 */
export function writtenAsVersion(v: number, config: unknown): unknown {
  const version = CONFIG_VERSIONS[v - 1]
  if (!version) throw new Error(`No config version ${v}`)
  return wireCoder(version.wire).write(config)
}

const configCodec = createConfigCodec({
  versions: CONFIG_VERSIONS,
  schema: configSchema,
  fallback: DEFAULT_CONFIG,
})

/** `item` with its `lengths` (those it has) to the nearest millimeter. */
function withLengthsRounded<T extends object>(
  item: T,
  lengths: readonly string[],
): T {
  const values = item as Readonly<Record<string, unknown>>
  return {
    ...item,
    ...Object.fromEntries(
      lengths
        .filter((length) => typeof values[length] === 'number')
        .map((length) => [length, toMillimeter(values[length] as number)]),
    ),
  }
}

/** `item` with the lengths `part` lists rounded, if it lists any. */
function roundedBy<T extends object>(
  item: T,
  part: { readonly lengths: readonly string[] } | undefined,
): T {
  return part ? withLengthsRounded(item, part.lengths) : item
}

/**
 * The manual positions as a link stores them: in PLACEABLE_IDS order, each
 * point's `lengths` coordinates (all three) to the millimeter.
 */
function manualPositionsForLink(
  positions: ManualPositions,
  lengths: readonly ('x' | 'y' | 'z')[],
): ManualPositions {
  return Object.fromEntries(
    entries(positions).map(([id, point]) => [
      id,
      Object.fromEntries(
        lengths.map((axis) => [axis, toMillimeter(point[axis])]),
      ),
    ]),
  )
}

/**
 * The config with the lengths `table` lists to the nearest millimeter, as
 * a link of its version stores it.
 */
function roundedForLink(config: Config, table: MillimeterLengths): Config {
  const { seatRow, screen, furniture, openings } = config.roomObjects
  const { speakersInstalledFor } = config
  return {
    ...config,
    manualPositions: table.manualPositions
      ? manualPositionsForLink(
          config.manualPositions,
          table.manualPositions.lengths,
        )
      : config.manualPositions,
    speakersInstalledFor:
      speakersInstalledFor &&
      roundedBy(speakersInstalledFor, table.speakersInstalledFor),
    roomObjects: {
      seatRow,
      screen: screen && roundedBy(screen, table.screen),
      furniture: furniture.map((box) => roundedBy(box, table.furniture)),
      // Packed as whole millimeters after this (PACKED_OPENINGS).
      openings: openings.map((opening) => roundedBy(opening, table.openings)),
    },
  }
}

/**
 * The config as an encoded config: the URL-safe text a share link carries
 * in its `config` search param, written with the current config version,
 * the lengths its millimeter table lists to the nearest millimeter, which
 * keeps links short.
 */
export function encodeConfig(config: Config): EncodedConfig {
  const { millimeterLengths } = configCodec.current.wire
  return configCodec.encode(
    roundedForLink(config, millimeterLengths),
  ) as EncodedConfig
}

/**
 * The config an encoded config holds, or the default config with the
 * problem when it can't be opened. Never throws.
 */
export const decodeConfig: (encoded: string) => DecodedConfig =
  configCodec.decode
