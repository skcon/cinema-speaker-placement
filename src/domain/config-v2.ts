/**
 * Config schema version 2, frozen (ADR 0003): the schema that version 2
 * share links are checked against (share-link.ts). Version 2 shipped in
 * v1.1.0, and v1.2.0 writes and reads it too; this copy is the rules as
 * v1.2.0 checks them.
 *
 * Never edit it. It imports nothing but zod: every limit, id list,
 * placement rule and room-object rule it uses is copied here as it was at
 * v1.2.0 (from room.ts, dolby-layouts.ts, layout.ts, speaker-specs.ts,
 * crossover.ts, manual-positions.ts, room-objects.ts, seat-row.ts,
 * screen.ts, furniture.ts, openings.ts, wall-frame.ts, object-lengths.ts,
 * link-precision.ts and reference.ts), so later changes to the live config
 * can't change which links version 2 accepts. The reference values keep
 * their citations in reference.ts; they are only repeated here.
 *
 * The rules are written as the live code computed them, step for step: a
 * limit at a wall or the ceiling is a sum of floating-point values, and the
 * same values in another order can round to a different last bit, which
 * would open or reject a link a micrometer from its edge. (v1.1.0 added
 * them up in another order, so on a few such edges it decided otherwise.)
 */
import { z } from 'zod'

const METERS_PER_INCH = 0.0254

const UNIT_SYSTEM_NAMES = ['metric', 'imperial'] as const

/** An accepted range, inclusive. */
type AcceptedRange = { readonly min: number; readonly max: number }

/** Accepted room dimensions in meters, inclusive. */
const ROOM_DIMENSION_LIMITS = {
  length: { min: 2, max: 15 },
  width: { min: 2, max: 15 },
  height: { min: 2, max: 5 },
} as const

const SUBWOOFER_COUNTS = [1, 2, 3, 4] as const

const SUBWOOFER_IDS = ['Sub1', 'Sub2', 'Sub3', 'Sub4'] as const

const MLP_ID = 'MLP'

/** The layouts, with the listener-level and overhead channels of each. */
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

const WALLS = ['front', 'right', 'back', 'left'] as const

type Wall = (typeof WALLS)[number]

/** The clearances of manual positions, in meters. */
const SPEAKER_WALL_CLEARANCE = 0.3
const SUBWOOFER_WALL_CLEARANCE = 0.3
const SUBWOOFER_HEIGHT = 0.3
const EAR_HEIGHT = 1.2

/**
 * How far a length a link stores to the millimeter may be from the one
 * written, in meters, and the slack that gives each part: half a
 * millimeter for each stored length one of its checks adds up.
 */
const ROUNDING_ERROR = 0.5 / 1000
const MANUAL_POSITION_SLACK = 1 * ROUNDING_ERROR
const SCREEN_SLACK = 1 * ROUNDING_ERROR
const FURNITURE_SLACK = 2 * ROUNDING_ERROR
const OPENING_SLACK = 2 * ROUNDING_ERROR

/** How far past the ceiling a screen's top edge may be: float noise. */
const SCREEN_FIT_TOLERANCE = 1e-9

const SEAT_ROW_LIMITS = {
  width: { min: 0.5, max: 8 },
  depth: { min: 0.5, max: 2 },
} as const

const SCREEN_KINDS = ['tv', 'projection'] as const

const SCREEN_LIMITS = {
  width: { min: 0.5, max: 8 },
  height: { min: 0.3, max: 4 },
  bottomEdge: { min: 0, max: 3 },
  standoff: { min: 0.05, max: 1.5 },
} as const

const MAX_FURNITURE = 8
const FURNITURE_NAME_MAX_LENGTH = 12
const FURNITURE_NAME_CHARACTERS = /^[A-Za-z0-9À-ÖØ-öø-ÿ '&().,/-]*$/
const FURNITURE_ROTATIONS = [0, 90, 180, 270] as const

const FURNITURE_LIMITS = {
  width: { min: 0.1, max: 8 },
  depth: { min: 0.1, max: 8 },
  height: { min: 0.1, max: 5 },
} as const

const MAX_OPENINGS = 6

const OPENING_LIMITS = {
  width: { min: 0.3, max: 8 },
  sill: { min: 0, max: 4.5 },
  height: { min: 0.2, max: 5 },
} as const

/** A number inside [min, max]: finite, as zod numbers are. */
function inRange({ min, max }: AcceptedRange) {
  return z.number().min(min).max(max)
}

/** Whether `value` is a finite number inside `range`. */
function isInRange(value: number, { min, max }: AcceptedRange): boolean {
  return Number.isFinite(value) && value >= min && value <= max
}

/**
 * Whether every length that is there (not null) is inside its range: the
 * room-object lengths and their limits, as the kind computes them.
 */
function areInRange(
  lengths: readonly (readonly [number | null, AcceptedRange])[],
): boolean {
  return lengths.every(
    ([meters, range]) => meters === null || isInRange(meters, range),
  )
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
    (axis) => Math.abs(clamped[axis] - point[axis]) <= MANUAL_POSITION_SLACK,
  )
}

type SeatRow = { width: number; depth: number }

type RoomScreen = {
  kind: (typeof SCREEN_KINDS)[number]
  width: number
  height: number
  bottomEdge: number
  x: number
  standoff: number | null
}

type FurnitureBox = {
  name: string
  width: number
  depth: number
  height: number
  x: number
  y: number
  rotation: (typeof FURNITURE_ROTATIONS)[number]
}

type Opening =
  | { kind: 'door'; wall: Wall; position: number; width: number }
  | {
      kind: 'window'
      wall: Wall
      position: number
      width: number
      sill: number
      height: number
    }

/** Whether the seat row's width and depth are inside their limits. */
function isValidSeatRow({ width, depth }: SeatRow): boolean {
  return areInRange([
    [width, SEAT_ROW_LIMITS.width],
    [depth, SEAT_ROW_LIMITS.depth],
  ])
}

/**
 * Whether the screen fits the Room: its size inside its limits, its top
 * edge under the ceiling, its middle on the front wall (from the left wall
 * to its left edge), and a standoff only on a projection screen.
 */
function isValidScreen(room: RoomSize, screen: RoomScreen): boolean {
  const { width, height, bottomEdge, standoff } = SCREEN_LIMITS
  const ceiling = room.height + SCREEN_FIT_TOLERANCE
  const reach = Math.max(0, (room.width - screen.width) / 2)
  // From the left wall (where the front wall starts) to its left edge.
  const leftWallX = -room.width / 2
  const fromLeftWall = screen.x - screen.width / 2 - leftWallX
  return (
    areInRange([
      [screen.width, { min: width.min, max: Math.min(width.max, room.width) }],
      [
        screen.height,
        {
          min: height.min,
          max: Math.min(height.max, ceiling - screen.bottomEdge),
        },
      ],
      [
        screen.bottomEdge,
        {
          min: bottomEdge.min,
          max: Math.min(bottomEdge.max, ceiling - screen.height),
        },
      ],
      [fromLeftWall, { min: 0 - SCREEN_SLACK, max: 2 * reach + SCREEN_SLACK }],
      [screen.standoff, standoff],
    ]) &&
    (screen.standoff === null || screen.kind === 'projection')
  )
}

/**
 * Whether `name` is a name a box may have: 1 to 12 of the characters
 * above, without spaces around it.
 */
function isValidFurnitureName(name: string): boolean {
  const trimmed = name.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= FURNITURE_NAME_MAX_LENGTH &&
    FURNITURE_NAME_CHARACTERS.test(trimmed) &&
    name === trimmed
  )
}

/**
 * Whether the box fits the Room: an accepted name, and its size and where
 * it is (from the left and front walls to its nearest sides, as it is
 * turned) inside their limits, up to its slack past the walls.
 */
function isValidFurnitureBox(room: RoomSize, box: FurnitureBox): boolean {
  const { width, depth, height } = FURNITURE_LIMITS
  const slack = FURNITURE_SLACK
  const turned = box.rotation === 90 || box.rotation === 270
  const [acrossFor, alongFor] = turned
    ? [room.length, room.width]
    : [room.width, room.length]
  const [alongX, alongY] = turned
    ? [box.depth, box.width]
    : [box.width, box.depth]
  const fromWall = (wall: number, along: number): AcceptedRange => ({
    min: 0 - slack,
    max: Math.max(-slack, wall - along) + slack,
  })
  const left = box.x - alongX / 2
  const front = box.y - alongY / 2
  return (
    isValidFurnitureName(box.name) &&
    FURNITURE_ROTATIONS.includes(box.rotation) &&
    areInRange([
      [
        box.width,
        { min: width.min, max: Math.min(width.max, acrossFor) + slack },
      ],
      [
        box.depth,
        { min: depth.min, max: Math.min(depth.max, alongFor) + slack },
      ],
      [
        box.height,
        { min: height.min, max: Math.min(height.max, room.height) + slack },
      ],
      [left + room.width / 2, fromWall(room.width, alongX)],
      [front, fromWall(room.length, alongY)],
    ])
  )
}

/**
 * Whether the opening fits the Room: its width inside its limits and on
 * its wall (from the wall's start to its nearest edge), and a window's
 * sill and height under the ceiling, each up to its slack.
 */
function isValidOpening(room: RoomSize, opening: Opening): boolean {
  const { width, sill, height } = OPENING_LIMITS
  const slack = OPENING_SLACK
  const wall =
    opening.wall === 'front' || opening.wall === 'back'
      ? room.width
      : room.length
  const fromCorner = opening.position - opening.width / 2
  // A door has no sill or height to check: it reaches from the floor to a
  // fixed height.
  const lengths: (readonly [number | null, AcceptedRange])[] = [
    [opening.width, { min: width.min, max: Math.min(width.max, wall) + slack }],
    [
      fromCorner,
      {
        min: 0 - slack,
        max: Math.max(-slack, wall - opening.width) + slack,
      },
    ],
  ]
  if (opening.kind === 'window') {
    const tall = opening.sill + opening.height - opening.sill
    lengths.push(
      [
        opening.sill,
        { min: sill.min, max: Math.min(sill.max, room.height - tall) + slack },
      ],
      [
        opening.height,
        {
          min: height.min,
          max: Math.min(height.max, room.height - opening.sill) + slack,
        },
      ],
    )
  }
  return WALLS.includes(opening.wall) && areInRange(lengths)
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

const screenSchema = z.strictObject({
  kind: z.enum(SCREEN_KINDS),
  width: z.number(),
  height: z.number(),
  bottomEdge: z.number(),
  x: z.number(),
  standoff: z.number().nullable(),
})

const furnitureBoxSchema = z.strictObject({
  name: z.string(),
  width: z.number(),
  depth: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
  rotation: z.literal(FURNITURE_ROTATIONS),
})

const openingSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('door'),
    wall: z.enum(WALLS),
    position: z.number(),
    width: z.number(),
  }),
  z.strictObject({
    kind: z.literal('window'),
    wall: z.enum(WALLS),
    position: z.number(),
    width: z.number(),
    sill: z.number(),
    height: z.number(),
  }),
])

/** Config schema version 2, as v1.1.0 released it (see above). */
export const configSchemaV2 = z
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
    manualPositions: z.partialRecord(
      z.enum(PLACEABLE_IDS),
      z.strictObject({ x: z.number(), y: z.number(), z: z.number() }),
    ),
    roomObjects: z.strictObject({
      seatRow: z.strictObject({ width: z.number(), depth: z.number() }),
      screen: screenSchema.nullable(),
      furniture: z.array(furnitureBoxSchema).readonly(),
      openings: z.array(openingSchema).readonly(),
    }),
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
  // Every room object inside the Room, each within its own limits: one
  // seat row, at most one screen, MAX_FURNITURE boxes and MAX_OPENINGS
  // doors and windows.
  .refine(({ room, roomObjects }) => {
    const { seatRow, screen, furniture, openings } = roomObjects
    return (
      isValidSeatRow(seatRow) &&
      (screen === null || isValidScreen(room, screen)) &&
      furniture.length <= MAX_FURNITURE &&
      furniture.every((box) => isValidFurnitureBox(room, box)) &&
      openings.length <= MAX_OPENINGS &&
      openings.every((opening) => isValidOpening(room, opening))
    )
  })

/** A config in the version 2 shape. */
export type ConfigV2 = z.infer<typeof configSchemaV2>
