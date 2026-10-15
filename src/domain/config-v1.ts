/**
 * Config schema version 1, frozen as v1.0.0 released it (ADR 0003): the
 * schema that share links written by v1.0.0 are checked against before
 * they are migrated to today's version (share-link.ts).
 *
 * Never edit it. It imports nothing but zod: every limit, id list and
 * placement rule it uses is copied here as it was at v1.0.0 (from room.ts,
 * dolby-layouts.ts, layout.ts, speaker-specs.ts, crossover.ts, seat-row.ts,
 * manual-positions.ts and reference.ts), so later changes to the live
 * config can't change which links version 1 accepts. The reference values
 * keep their citations in reference.ts; they are only repeated here.
 */
import { z } from 'zod'

const METERS_PER_INCH = 0.0254

const UNIT_SYSTEM_NAMES = ['metric', 'imperial'] as const

/** Accepted room dimensions in meters, inclusive. */
const ROOM_DIMENSION_LIMITS = {
  length: { min: 2, max: 15 },
  width: { min: 2, max: 15 },
  height: { min: 2, max: 5 },
} as const

const SUBWOOFER_COUNTS = [1, 2, 3, 4] as const

const SUBWOOFER_IDS = ['Sub1', 'Sub2', 'Sub3', 'Sub4'] as const

const MLP_ID = 'MLP'

/** The v1 layouts, with the listener-level and overhead channels of each. */
const LAYOUT_CHANNELS = {
  '2.1': ['L', 'R'],
  '3.1': ['L', 'C', 'R'],
  '5.1': ['L', 'C', 'R', 'Ls', 'Rs'],
  '7.1': ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs'],
  '5.1.2': ['L', 'C', 'R', 'Ls', 'Rs', 'Ltm', 'Rtm'],
  '5.1.4': ['L', 'C', 'R', 'Ls', 'Rs', 'Ltf', 'Rtf', 'Ltr', 'Rtr'],
  '7.1.2': ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltm', 'Rtm'],
  '7.1.4': [
    ...['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs'],
    ...['Ltf', 'Rtf', 'Ltr', 'Rtr'],
  ],
} as const

const DOLBY_LAYOUTS = [
  '2.1',
  '3.1',
  '5.1',
  '7.1',
  '5.1.2',
  '5.1.4',
  '7.1.2',
  '7.1.4',
] as const satisfies readonly (keyof typeof LAYOUT_CHANNELS)[]

const LISTENER_LEVEL_IDS = ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs'] as const
const OVERHEAD_IDS = ['Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'] as const

/** Every id a manual position may be stored under. */
const PLACEABLE_IDS = [
  ...LISTENER_LEVEL_IDS,
  ...OVERHEAD_IDS,
  ...SUBWOOFER_IDS,
  MLP_ID,
] as const

type PlaceableId = (typeof PLACEABLE_IDS)[number]
type Point = { x: number; y: number; z: number }
type RoomSize = { length: number; width: number; height: number }

/** The clearances of manual positions, in meters. */
const SPEAKER_WALL_CLEARANCE = 0.3
const SUBWOOFER_WALL_CLEARANCE = 0.3
const SUBWOOFER_HEIGHT = 0.3
const EAR_HEIGHT = 1.2

/** How far a stored coordinate may be past its clearance line (rounding). */
const ROUNDING_SLACK = 0.0005

/** A number inside [min, max]: finite, as zod numbers are. */
function inRange({ min, max }: { min: number; max: number }) {
  return z.number().min(min).max(max)
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}

/** Where item `id` may go: its wall clearance and its height rule. */
function placementRule(id: PlaceableId): {
  wallClearance: number
  height: { fixed: number | 'ceiling' } | { surfaceClearance: number }
} {
  if ((LISTENER_LEVEL_IDS as readonly string[]).includes(id)) {
    return {
      wallClearance: SPEAKER_WALL_CLEARANCE,
      height: { surfaceClearance: SPEAKER_WALL_CLEARANCE },
    }
  }
  if ((OVERHEAD_IDS as readonly string[]).includes(id)) {
    return {
      wallClearance: SPEAKER_WALL_CLEARANCE,
      height: { fixed: 'ceiling' },
    }
  }
  if ((SUBWOOFER_IDS as readonly string[]).includes(id)) {
    return {
      wallClearance: SUBWOOFER_WALL_CLEARANCE,
      height: { fixed: SUBWOOFER_HEIGHT },
    }
  }
  return {
    wallClearance: SPEAKER_WALL_CLEARANCE,
    height: { fixed: EAR_HEIGHT },
  }
}

/** Whether item `id` may be at `point`, to the millimeter. */
function mayBeAt(room: RoomSize, id: PlaceableId, point: Point): boolean {
  const { wallClearance, height } = placementRule(id)
  const xLimit = room.width / 2 - wallClearance
  const clamped = {
    x: clamp(point.x, -xLimit, xLimit),
    y: clamp(point.y, wallClearance, room.length - wallClearance),
    z:
      'fixed' in height
        ? height.fixed === 'ceiling'
          ? room.height
          : height.fixed
        : clamp(
            point.z,
            height.surfaceClearance,
            room.height - height.surfaceClearance,
          ),
  }
  return (['x', 'y', 'z'] as const).every(
    (axis) => Math.abs(clamped[axis] - point[axis]) <= ROUNDING_SLACK,
  )
}

/** Accepted sensitivity in dB SPL (1 W, 1 m). */
const sensitivitySchema = inRange({ min: 70, max: 110 })

/** A subwoofer's specs, each number in range and the peak power at least the RMS power. */
const subwooferSpecsSchema = z
  .strictObject({
    enclosure: z.enum(['sealed', 'ported']),
    driverDiameter: inRange({
      min: 6 * METERS_PER_INCH,
      max: 24 * METERS_PER_INCH,
    }),
    rmsWatts: inRange({ min: 10, max: 10_000 }),
    peakWatts: inRange({ min: 10, max: 20_000 }),
  })
  .refine(({ rmsWatts, peakWatts }) => peakWatts >= rmsWatts)

const speakerSpecsSchema = z.strictObject({
  type: z.enum(['bookshelf', 'tower']),
  sensitivity: sensitivitySchema,
})

const overheadSpecsSchema = z.strictObject({ sensitivity: sensitivitySchema })

/** Config schema version 1, as v1.0.0 released it (see above). */
export const configSchemaV1 = z
  .strictObject({
    units: z.enum(UNIT_SYSTEM_NAMES),
    room: z.strictObject({
      length: inRange(ROOM_DIMENSION_LIMITS.length),
      width: inRange(ROOM_DIMENSION_LIMITS.width),
      height: inRange(ROOM_DIMENSION_LIMITS.height),
    }),
    layout: z.strictObject({
      dolbyLayout: z.enum(DOLBY_LAYOUTS),
      subwoofers: z.literal(SUBWOOFER_COUNTS),
    }),
    speakerGroups: z.strictObject({
      front: z.strictObject({ specs: speakerSpecsSchema }),
      center: z.strictObject({ specs: speakerSpecsSchema }),
      surrounds: z.strictObject({ specs: speakerSpecsSchema }),
      rearSurrounds: z.strictObject({ specs: speakerSpecsSchema }),
      overheads: z.strictObject({ specs: overheadSpecsSchema }),
      subwoofers: z.strictObject({
        specs: subwooferSpecsSchema,
        ownSpecs: z.partialRecord(z.enum(SUBWOOFER_IDS), subwooferSpecsSchema),
      }),
    }),
    amplifierWatts: inRange({ min: 1, max: 5000 }),
    targetCurve: z.enum(['flat', 'house']),
    crossoverHz: inRange({ min: 40, max: 200 }),
    seatRowWidth: inRange({ min: 0.5, max: 8 }),
    manualPositions: z.partialRecord(
      z.enum(PLACEABLE_IDS),
      z.strictObject({ x: z.number(), y: z.number(), z: z.number() }),
    ),
  })
  // Own specs only for the layout's subwoofers.
  .refine(({ layout, speakerGroups }) => {
    const inLayout: readonly string[] = SUBWOOFER_IDS.slice(
      0,
      layout.subwoofers,
    )
    return Object.keys(speakerGroups.subwoofers.ownSpecs).every((id) =>
      inLayout.includes(id),
    )
  })
  // Manual positions only for items of the layout, each where it may go.
  .refine(({ room, layout, manualPositions }) => {
    const inLayout: readonly string[] = [
      ...LAYOUT_CHANNELS[layout.dolbyLayout],
      ...SUBWOOFER_IDS.slice(0, layout.subwoofers),
      MLP_ID,
    ]
    return PLACEABLE_IDS.every((id) => {
      const point = manualPositions[id]
      return !point || (inLayout.includes(id) && mayBeAt(room, id, point))
    })
  })

/** A config in the version 1 shape. */
export type ConfigV1 = z.infer<typeof configSchemaV1>
