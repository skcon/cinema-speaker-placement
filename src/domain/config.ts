import { z } from 'zod'
import { V1_DOLBY_LAYOUTS } from './dolby-layouts'
import { DEFAULT_LAYOUT, type Layout } from './layout'
import {
  checkRoomDimension,
  DEFAULT_ROOM,
  type Room,
  type RoomDimension,
} from './room'
import type { UnitSystem } from './units'

/** A room dimension in meters, inside the accepted range for that dimension. */
function roomDimensionSchema(dimension: RoomDimension) {
  return z
    .number()
    .refine((meters) => checkRoomDimension(dimension, meters) === null)
}

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
export const configSchema = z.strictObject({
  units: z.enum(['metric', 'imperial']) satisfies z.ZodType<UnitSystem>,
  room: z.strictObject({
    length: roomDimensionSchema('length'),
    width: roomDimensionSchema('width'),
    height: roomDimensionSchema('height'),
  }) satisfies z.ZodType<Room>,
  layout: z.strictObject({
    dolbyLayout: z.enum(V1_DOLBY_LAYOUTS),
    subwoofers: z.literal([1, 2, 3, 4]),
  }) satisfies z.ZodType<Layout>,
})

/**
 * The single source of truth for a room plan: only inputs (and, later,
 * manual positions). Everything else is derived by `analyzeRoom`. Lengths
 * are in meters whatever `units` says; `units` only picks how the UI shows
 * and accepts them.
 */
export type Config = z.infer<typeof configSchema>

/** The first-visit config (issue #2, user stories 3 and 6). */
export const DEFAULT_CONFIG: Config = {
  units: 'metric',
  room: DEFAULT_ROOM,
  layout: DEFAULT_LAYOUT,
}
