import { z } from 'zod'
import { checkRoomDimension, DEFAULT_ROOM, type Room } from './room'
import type { UnitSystem } from './units'

/** A room dimension in meters, inside the accepted range for that dimension. */
function roomDimensionSchema(dimension: keyof Room) {
  return z
    .number()
    .refine((meters) => checkRoomDimension(dimension, meters) === null)
}

/**
 * The config's shape and rules. The `Config` type is inferred from it, so a
 * new config field is added here, once; the compiler then asks for its
 * value in DEFAULT_CONFIG and in the share-link test fixtures. A config that
 * passes this schema is one the store accepts.
 *
 * Share links store configs in this shape, so changing an existing field
 * breaks old links unless the share-link codec gets a migration (see
 * share-link.ts).
 */
export const configSchema = z.object({
  units: z.enum(['metric', 'imperial']) satisfies z.ZodType<UnitSystem>,
  room: z.object({
    length: roomDimensionSchema('length'),
    width: roomDimensionSchema('width'),
    height: roomDimensionSchema('height'),
  }) satisfies z.ZodType<Room>,
})

/**
 * The single source of truth for a room plan: only inputs (and, later,
 * manual positions). Everything else is derived by `analyzeRoom`. Lengths
 * are in meters whatever `units` says; `units` only picks how the UI shows
 * and accepts them.
 */
export type Config = z.infer<typeof configSchema>

export const DEFAULT_CONFIG: Config = {
  units: 'metric',
  room: DEFAULT_ROOM,
}
