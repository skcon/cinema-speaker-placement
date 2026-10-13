import { z } from 'zod'
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
  checkRoomDimension,
  DEFAULT_ROOM,
  type Room,
  type RoomDimension,
  type RoomPoint,
} from './room'
import {
  areValidSubwooferSpecs,
  DEFAULT_SPEAKER_GROUPS,
  ENCLOSURES,
  type SpeakerGroups,
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

/** A point in room coordinates, in meters. */
const roomPointSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  z: z.number(),
}) satisfies z.ZodType<RoomPoint>

/**
 * The config's shape and rules: a config that passes it is one the store
 * accepts, and share links store configs in this shape. Strict: every field
 * is required and unknown fields are rejected, so a share link that doesn't
 * match it exactly was changed by hand (ADR 0003).
 *
 * The `Config` type is inferred from it, so a new field is added here and
 * the compiler asks for its value in DEFAULT_CONFIG and the test fixtures.
 * Once share links are released, any change here needs a new schema
 * version and a migration (see share-link.ts).
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
    speakerGroups: z.strictObject({
      subwoofers: z.strictObject({
        specs: subwooferSpecsSchema,
        // Keyed by subwoofer id; a subwoofer without an entry uses `specs`.
        ownSpecs: z.partialRecord(z.enum(SUBWOOFER_IDS), subwooferSpecsSchema),
      }),
    }) satisfies z.ZodType<SpeakerGroups>,
    // What the estimated response is compared against on the chart.
    targetCurve: z.enum(TARGET_CURVE_KINDS),
    // Keyed by channel, subwoofer id or MLP; an item without one is auto.
    manualPositions: z.partialRecord(
      z.enum(PLACEABLE_IDS),
      roomPointSchema,
    ) satisfies z.ZodType<ManualPositions>,
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

/**
 * The single source of truth for a room plan: only inputs and manual
 * positions. Everything else is derived by `analyzeRoom`. Lengths
 * are in meters whatever `units` says; `units` only picks how the UI shows
 * and accepts them.
 */
export type Config = z.infer<typeof configSchema>

/** The first-visit config (issue #2, user stories 3 and 6). */
export const DEFAULT_CONFIG: Config = {
  units: 'metric',
  room: DEFAULT_ROOM,
  layout: DEFAULT_LAYOUT,
  speakerGroups: DEFAULT_SPEAKER_GROUPS,
  targetCurve: 'flat',
  manualPositions: {},
}
