import { z } from 'zod'
import { checkCrossover, DEFAULT_CROSSOVER_HZ } from './crossover'
import { V1_DOLBY_LAYOUTS } from './dolby-layouts'
import { DEFAULT_LAYOUT, SUBWOOFER_COUNTS, type Layout } from './layout'
import {
  entries,
  mayBeAt,
  PLACEABLE_IDS,
  placeablesIn,
  type ManualPositions,
} from './manual-positions'
import {
  areValidRoomObjects,
  DEFAULT_ROOM_OBJECTS,
  type RoomObjects,
} from './room-objects'
import { FURNITURE_ROTATIONS, type FurnitureBox } from './furniture'
import { SCREEN_KINDS, type RoomScreen } from './screen'
import type { SeatRow } from './seat-row'
import {
  checkRoomDimension,
  DEFAULT_ROOM,
  type Room,
  type RoomDimension,
  type RoomPoint,
} from './room'
import {
  areValidSpeakerSpecs,
  areValidSubwooferSpecs,
  checkAmplifierWatts,
  DEFAULT_AMPLIFIER_WATTS,
  DEFAULT_SPEAKER_GROUPS,
  ENCLOSURES,
  SPEAKER_TYPES,
  type OverheadSpecs,
  type SpeakerGroups,
  type SpeakerSpecs,
  type SubwooferSpecs,
} from './speaker-specs'
import { SUBWOOFER_IDS, subwooferIds } from './subwoofer-arrangements'
import { TARGET_CURVE_KINDS } from './target-curve'
import { UNIT_SYSTEM_NAMES } from './units'

/** A room dimension in meters, inside the accepted range for that dimension. */
function roomDimensionSchema(dimension: RoomDimension) {
  return z
    .number()
    .refine((meters) => checkRoomDimension(dimension, meters) === null)
}

/** A subwoofer's specs, every number inside its range and the peak power at least the RMS power. */
const subwooferSpecsSchema = z
  .strictObject({
    enclosure: z.enum(ENCLOSURES),
    driverDiameter: z.number(),
    rmsWatts: z.number(),
    peakWatts: z.number(),
  })
  .refine(areValidSubwooferSpecs) satisfies z.ZodType<SubwooferSpecs>

/** A listener-level speaker group's specs, the sensitivity inside its range. */
const speakerSpecsSchema = z
  .strictObject({ type: z.enum(SPEAKER_TYPES), sensitivity: z.number() })
  .refine(areValidSpeakerSpecs) satisfies z.ZodType<SpeakerSpecs>

/** The overheads' specs, the sensitivity inside its range. */
const overheadSpecsSchema = z
  .strictObject({ sensitivity: z.number() })
  .refine(areValidSpeakerSpecs) satisfies z.ZodType<OverheadSpecs>

/** A point in room coordinates, in meters. */
const roomPointSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  z: z.number(),
}) satisfies z.ZodType<RoomPoint>

/**
 * The Screen on the front wall, in meters; whether it fits the Room is
 * checked with the whole config.
 */
const screenSchema = z.strictObject({
  kind: z.enum(SCREEN_KINDS),
  width: z.number(),
  height: z.number(),
  bottomEdge: z.number(),
  x: z.number(),
  standoff: z.number().nullable(),
}) satisfies z.ZodType<RoomScreen>

/**
 * A furniture box, in meters and degrees; whether it fits the Room, its
 * name and how many there are is checked with the whole config.
 */
const furnitureBoxSchema = z.strictObject({
  name: z.string(),
  width: z.number(),
  depth: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
  rotation: z.literal(FURNITURE_ROTATIONS),
}) satisfies z.ZodType<FurnitureBox>

/**
 * The Seat row's size, in meters; its limits are checked with the other
 * room objects. It stores no position: it sits where the MLP is.
 */
const seatRowSchema = z.strictObject({
  width: z.number(),
  depth: z.number(),
}) satisfies z.ZodType<SeatRow>

/**
 * The config's shape and rules: a config that passes it is one the store
 * accepts, and share links store configs in this shape. Strict: every field
 * is required and unknown fields are rejected, so a share link that doesn't
 * match it exactly was changed by hand (ADR 0003).
 *
 * The `Config` type is inferred from it, so a new field is added here and
 * the compiler asks for its value in DEFAULT_CONFIG and the test fixtures.
 * Share links are released, so a change here extends the unreleased schema
 * version or starts a new one, with a migration (see share-link.ts).
 */
export const configSchema = z
  .strictObject({
    units: z.enum(UNIT_SYSTEM_NAMES),
    room: z.strictObject({
      length: roomDimensionSchema('length'),
      width: roomDimensionSchema('width'),
      height: roomDimensionSchema('height'),
    }) satisfies z.ZodType<Room>,
    layout: z.strictObject({
      dolbyLayout: z.enum(V1_DOLBY_LAYOUTS),
      subwoofers: z.literal(SUBWOOFER_COUNTS),
    }) satisfies z.ZodType<Layout>,
    // Every group, used by the layout or not, so switching layouts keeps them.
    speakerGroups: z.strictObject({
      front: z.strictObject({ specs: speakerSpecsSchema }),
      center: z.strictObject({ specs: speakerSpecsSchema }),
      surrounds: z.strictObject({ specs: speakerSpecsSchema }),
      rearSurrounds: z.strictObject({ specs: speakerSpecsSchema }),
      overheads: z.strictObject({ specs: overheadSpecsSchema }),
      subwoofers: z.strictObject({
        specs: subwooferSpecsSchema,
        // Keyed by subwoofer id; a subwoofer without an entry uses `specs`.
        ownSpecs: z.partialRecord(z.enum(SUBWOOFER_IDS), subwooferSpecsSchema),
      }),
    }) satisfies z.ZodType<SpeakerGroups>,
    // One amplifier power per channel for every Speaker, in W.
    amplifierWatts: z.number().refine((w) => checkAmplifierWatts(w) === null),
    // What the estimated response is compared against on the chart.
    targetCurve: z.enum(TARGET_CURVE_KINDS),
    // The crossover between the Speakers and the Subwoofers, in Hz.
    crossoverHz: z.number().refine((hz) => checkCrossover(hz) === null),
    // Keyed by channel, subwoofer id or MLP; an item without one is auto.
    manualPositions: z.partialRecord(
      z.enum(PLACEABLE_IDS),
      roomPointSchema,
    ) satisfies z.ZodType<ManualPositions>,
    // Room objects (ADR 0006): drawn and warned about, never part of the
    // estimate. A Room starts with DEFAULT_ROOM_OBJECTS; a version 1 link
    // with those and its seat row width.
    roomObjects: z.strictObject({
      seatRow: seatRowSchema,
      screen: screenSchema.nullable(),
      furniture: z.array(furnitureBoxSchema).readonly(),
    }) satisfies z.ZodType<RoomObjects>,
  })
  // The subwoofer count lives in the layout: own specs only for its subwoofers.
  .refine(({ layout, speakerGroups }) => {
    const inLayout = subwooferIds(layout.subwoofers)
    return Object.keys(speakerGroups.subwoofers.ownSpecs).every((id) =>
      inLayout.some((layoutId) => layoutId === id),
    )
  })
  // Manual positions only for items of the layout, each where it may go.
  .refine(({ room, layout, manualPositions }) => {
    const inLayout = placeablesIn(layout)
    return entries(manualPositions).every(
      ([id, point]) => inLayout.includes(id) && mayBeAt(room, id, point),
    )
  })
  // Every room object inside the Room, each within its own limits.
  .refine(({ room, roomObjects }) => areValidRoomObjects(room, roomObjects))

/**
 * The single source of truth for a room plan: only inputs and manual
 * positions. Everything else is derived by `analyzeRoom`. Lengths
 * are in meters whatever `units` says; `units` only picks how the UI shows
 * and accepts them.
 */
export type Config = z.infer<typeof configSchema>

/** The first-visit config (issue #2, user stories 3, 6 and 20). */
export const DEFAULT_CONFIG: Config = {
  units: 'metric',
  room: DEFAULT_ROOM,
  layout: DEFAULT_LAYOUT,
  speakerGroups: DEFAULT_SPEAKER_GROUPS,
  amplifierWatts: DEFAULT_AMPLIFIER_WATTS,
  targetCurve: 'flat',
  crossoverHz: DEFAULT_CROSSOVER_HZ,
  manualPositions: {},
  roomObjects: DEFAULT_ROOM_OBJECTS,
}
