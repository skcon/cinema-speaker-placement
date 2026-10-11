import { z } from 'zod'
import { V1_DOLBY_LAYOUTS } from './dolby-layouts'
import { DEFAULT_LAYOUT, type Layout } from './layout'
import { checkRoomDimension, DEFAULT_ROOM, type Room } from './room'
import type { UnitSystem } from './units'

/** A room dimension in meters, inside the accepted range for that dimension. */
function roomDimensionSchema(dimension: keyof Room) {
  return z
    .number()
    .refine((meters) => checkRoomDimension(dimension, meters) === null)
}

/**
 * The config's shape, rules and defaults: a config that passes it is one
 * the store accepts, and share links store configs in this shape.
 *
 * Each field is one entry here, with its default: the `Config` type is
 * inferred and DEFAULT_CONFIG is built from the defaults, so adding a
 * field is a change in this one place. A share link that leaves a field
 * out (because it predates it) gets the field's default, so a new field
 * with a default needs no new schema version. Changing an existing field
 * does; see share-link.ts.
 */
export const configSchema = z.object({
  /** Metric unless chosen otherwise (issue #2, user story 3). */
  units: z
    .enum(['metric', 'imperial'])
    .default('metric') satisfies z.ZodType<UnitSystem>,
  room: z
    .object({
      length: roomDimensionSchema('length'),
      width: roomDimensionSchema('width'),
      height: roomDimensionSchema('height'),
    })
    .default(DEFAULT_ROOM) satisfies z.ZodType<Room>,
  layout: z
    .object({
      dolbyLayout: z.enum(V1_DOLBY_LAYOUTS),
      subwoofers: z.literal([1, 2, 3, 4]),
    })
    .default(DEFAULT_LAYOUT) satisfies z.ZodType<Layout>,
})

/**
 * The single source of truth for a room plan: only inputs (and, later,
 * manual positions). Everything else is derived by `analyzeRoom`. Lengths
 * are in meters whatever `units` says; `units` only picks how the UI shows
 * and accepts them.
 */
export type Config = z.infer<typeof configSchema>

/** The first-visit config: every field at its default. */
export const DEFAULT_CONFIG: Config = configSchema.parse({})
