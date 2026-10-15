/**
 * Dolby's placement ranges for every v1 Layout, as typed data with
 * citations. Values and citation keys come from
 * docs/research/dolby-speaker-placement.md: channel names from section 2,
 * listener-level azimuths from section 3, overhead elevations, azimuths and
 * spacing from section 4, conflicts from section 7. Subwoofers have no
 * Dolby placement range (subwoofer-arrangements.ts).
 *
 * Azimuths are degrees from Dolby's center-front reference, on the channel's
 * own side of the room (see src/domain/room.ts for the sign convention).
 * Elevations use Dolby's side-view convention (research section 1, and
 * `sideViewElevation` in room.ts): 0° straight ahead at ear level, 90°
 * overhead, 180° straight behind.
 */
import type { Citation } from './reference'

/**
 * The v1 Dolby layouts: the Layouts as Dolby's placement guides name them,
 * with one subwoofer (GLOSSARY.md). A share link can validate a layout
 * against this list.
 */
export const V1_DOLBY_LAYOUTS = [
  '2.1',
  '3.1',
  '5.1',
  '7.1',
  '5.1.2',
  '5.1.4',
  '7.1.2',
  '7.1.4',
] as const

export type DolbyLayout = (typeof V1_DOLBY_LAYOUTS)[number]

/**
 * The listener-level channels, by Dolby's abbreviation (research section
 * 2), in display order. A share link can validate a channel against it.
 */
export const CHANNEL_IDS = ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs'] as const

/** A listener-level channel, by Dolby's abbreviation (research section 2). */
export type ChannelId = (typeof CHANNEL_IDS)[number]

/**
 * The overhead channels, by Dolby's abbreviation (research section 2), in
 * display order. Ltm/Rtm is our abbreviation: Dolby only spells "top
 * middle" out (IG p.51).
 */
export const OVERHEAD_CHANNEL_IDS = [
  'Ltf',
  'Rtf',
  'Ltm',
  'Rtm',
  'Ltr',
  'Rtr',
] as const

/** An overhead channel, by Dolby's abbreviation (research section 2). */
export type OverheadChannelId = (typeof OVERHEAD_CHANNEL_IDS)[number]

/** Which side of the center-front reference a channel belongs on. */
export type ChannelSide = 'left' | 'center' | 'right'

/**
 * Dolby's spelled-out channel names (IG p.8; research section 2), title-cased
 * for the UI.
 */
export const CHANNELS = {
  L: { name: 'Left', side: 'left' },
  C: { name: 'Center', side: 'center' },
  R: { name: 'Right', side: 'right' },
  Ls: { name: 'Left Surround', side: 'left' },
  Rs: { name: 'Right Surround', side: 'right' },
  Lrs: { name: 'Left Rear Surround', side: 'left' },
  Rrs: { name: 'Right Rear Surround', side: 'right' },
} as const satisfies Record<ChannelId, { name: string; side: ChannelSide }>

/**
 * Dolby's spelled-out overhead channel names (IG p.8 fig.2, IG p.51;
 * research section 2), title-cased like CHANNELS.
 */
export const OVERHEAD_CHANNELS = {
  Ltf: { name: 'Left Top Front', side: 'left' },
  Rtf: { name: 'Right Top Front', side: 'right' },
  Ltm: { name: 'Left Top Middle', side: 'left' },
  Rtm: { name: 'Right Top Middle', side: 'right' },
  Ltr: { name: 'Left Top Rear', side: 'left' },
  Rtr: { name: 'Right Top Rear', side: 'right' },
} as const satisfies Record<
  OverheadChannelId,
  { name: string; side: ChannelSide }
>

/**
 * A signed azimuth (src/domain/room.ts) as an angle on the channel's own
 * side: positive on its side, negative on the other. The Center's is
 * unsigned. Dolby gives ranges per side (±), so this is what they measure.
 */
export function angleOnSide(side: ChannelSide, azimuth: number): number {
  if (side === 'center') return Math.abs(azimuth)
  return side === 'left' ? -azimuth : azimuth
}

/** The signed azimuth of an angle on the channel's own side: the inverse of `angleOnSide`. */
export function azimuthFromSide(side: ChannelSide, angle: number): number {
  return side === 'left' ? -angle : angle
}

/** -1 for a left overhead channel, +1 for a right one (room x grows to the right). */
export function overheadSideSign(channel: OverheadChannelId): -1 | 1 {
  return OVERHEAD_CHANNELS[channel].side === 'left' ? -1 : 1
}

const CHANNEL_NAMES: Record<ChannelId | OverheadChannelId, { name: string }> = {
  ...CHANNELS,
  ...OVERHEAD_CHANNELS,
}

/** Dolby's name for a listener-level or overhead channel, for example "Left Top Front". */
export function channelName(channel: ChannelId | OverheadChannelId): string {
  return CHANNEL_NAMES[channel].name
}

/** Where the channel names come from. */
export const CHANNEL_NAME_CITATIONS = [
  { source: 'IG', page: 8 },
] as const satisfies readonly Citation[]

/** Inclusive range of angles, in degrees. */
export type AngleRange = { readonly min: number; readonly max: number }

/** An angle range with where it comes from. */
export type CitedAngleRange = {
  readonly range: AngleRange
  readonly citations: readonly Citation[]
  /** What the sources say about it, for example where they disagree. */
  readonly note?: string
  /** Where the range is our own modelling assumption rather than Dolby's. */
  readonly assumption?: string
}

/** Recorded where Dolby gives a single range, so nothing grades acceptable. */
export type NoWiderRange = { readonly range: null; readonly note: string }

/** Dolby's ranges for one angle: graded ideal, acceptable or outside. */
export type AngleReference = {
  /** Dolby's recommended range: inside it grades ideal. */
  readonly ideal: CitedAngleRange
  /**
   * A wider range Dolby also allows, containing the ideal one: inside it
   * (but not the ideal range) grades acceptable.
   */
  readonly acceptable: CitedAngleRange | NoWiderRange
}

/** Recorded where Dolby gives no range at all for an angle, so it is not graded. */
export type NoAngleRange = { readonly ideal: null; readonly note: string }

/**
 * A channel's placement range, one part per angle Dolby gives. Listener-level
 * channels have an azimuth only; overheads add an elevation.
 */
export type PlacementRangeReference = {
  /** On the channel's own side of the center-front reference. */
  readonly azimuth: AngleReference
}

export type ChannelReference = PlacementRangeReference & {
  readonly channel: ChannelId
}

/** An overhead channel's placement range: an elevation and, mostly, an azimuth. */
export type OverheadChannelReference = {
  readonly channel: OverheadChannelId
  /** In Dolby's side-view convention (see above). */
  readonly elevation: AngleReference & {
    /** The elevation Dolby draws as the one to aim for, or null when it states none. */
    readonly nominal: number | null
  }
  /** On the channel's own side, or none where Dolby gives none. */
  readonly azimuth: AngleReference | NoAngleRange
}

export type DolbyLayoutReference = {
  /** X: how many listener-level channels. */
  readonly listenerLevel: number
  /** Z: how many overhead channels. */
  readonly overheads: number
  /** The Dolby sheet(s) and IG pages that draw this layout. */
  readonly citations: readonly Citation[]
  /** The listener-level channels, in display order. */
  readonly channels: readonly ChannelReference[]
  /** The overhead channels, in display order: as many as `overheads`. */
  readonly overheadChannels: readonly OverheadChannelReference[]
}

/**
 * Azimuth ranges that appear identically on every sheet with the channel
 * (research section 3, "Shared values").
 */
const AZIMUTH = {
  center: { min: 0, max: 0 },
  leftRight: { min: 22, max: 30 },
  /** Ls/Rs in a 5-channel bed (5.1, 5.1.x): behind the listener. */
  surround5: { min: 110, max: 120 },
  /** Ls/Rs in a 7-channel bed (7.1, 7.1.x): side surrounds. */
  surround7: { min: 90, max: 110 },
  rearSurround: { min: 135, max: 150 },
} as const satisfies Record<string, AngleRange>

/**
 * The sources that draw each layout (research section 3, "Per layout"): its
 * per-layout sheets, cited by key as they are one page each, and the IG
 * pages that reproduce them. The listener-level angles are the same on a
 * layout's overhead, enabled and hybrid sheets.
 */
const LAYOUT_CITATIONS = {
  '2.1': [{ source: 'S-21' }, { source: 'IG', page: 18 }],
  '3.1': [{ source: 'S-31' }],
  '5.1': [{ source: 'S-51' }],
  '7.1': [{ source: 'S-71' }],
  '5.1.2': [
    { source: 'S-512-OH' },
    { source: 'S-512-EN' },
    { source: 'IG', page: 27, note: 'pp.27–28' },
  ],
  '5.1.4': [
    { source: 'S-514-OH' },
    { source: 'S-514-EN' },
    { source: 'S-514-HY' },
    { source: 'IG', page: 29, note: 'pp.29–32' },
  ],
  '7.1.2': [
    { source: 'S-712-OH' },
    { source: 'S-712-EN' },
    { source: 'IG', page: 34, note: 'pp.34–35' },
  ],
  '7.1.4': [
    { source: 'S-714-OH' },
    { source: 'S-714-EN' },
    { source: 'S-714-HY' },
    { source: 'IG', page: 8 },
    { source: 'IG', page: 36, note: 'pp.36–39' },
  ],
} as const satisfies Record<DolbyLayout, readonly Citation[]>

/**
 * Of the v1 listener-level channels only L/R has a second, wider range in
 * Dolby's documents, and the documents disagree about it (research
 * section 7, item 1).
 */
const LEFT_RIGHT_ACCEPTABLE = {
  range: { min: 22, max: 40 },
  citations: [
    {
      source: 'IG',
      page: 8,
      note: 'fig.3, the 7.1.4 reference: 30° nominal, range 22°–40°',
    },
  ],
  note:
    'Conflict in the Dolby data: every per-layout sheet shows L/R at ' +
    '22°–30°, while IG fig.3 shows 30° nominal with a 22°–40° range (and ' +
    'IG p.7 uses ±30° as the L/R reference).',
  assumption:
    "Our modelling assumption, not Dolby's: the sheets set the ideal " +
    'range, and IG fig.3 widens it to acceptable for every layout.',
} as const satisfies CitedAngleRange

const NO_WIDER_RANGE = {
  range: null,
  note: 'Dolby gives no wider range',
} as const satisfies NoWiderRange

/** One channel's placement range, its ideal azimuth cited to its layout's sources. */
function channelRange<
  const Channel extends ChannelId,
  const Ideal extends AngleRange,
  const Acceptable extends CitedAngleRange | NoWiderRange,
  const Citations extends readonly Citation[],
>(
  channel: Channel,
  ideal: Ideal,
  acceptable: Acceptable,
  citations: Citations,
) {
  return {
    channel,
    azimuth: { ideal: { range: ideal, citations }, acceptable },
  }
}

/** L and R, as in 2.1. */
function leftRight<const Citations extends readonly Citation[]>(
  citations: Citations,
) {
  return [
    channelRange('L', AZIMUTH.leftRight, LEFT_RIGHT_ACCEPTABLE, citations),
    channelRange('R', AZIMUTH.leftRight, LEFT_RIGHT_ACCEPTABLE, citations),
  ] as const
}

/** L, C and R, as in 3.1 and every bed. */
function leftCenterRight<const Citations extends readonly Citation[]>(
  citations: Citations,
) {
  const [left, right] = leftRight(citations)
  return [
    left,
    channelRange('C', AZIMUTH.center, NO_WIDER_RANGE, citations),
    right,
  ] as const
}

/** The 5-channel bed of 5.1 and 5.1.x. */
function bed5<const Citations extends readonly Citation[]>(
  citations: Citations,
) {
  return [
    ...leftCenterRight(citations),
    channelRange('Ls', AZIMUTH.surround5, NO_WIDER_RANGE, citations),
    channelRange('Rs', AZIMUTH.surround5, NO_WIDER_RANGE, citations),
  ] as const
}

/** The 7-channel bed of 7.1 and 7.1.x. */
function bed7<const Citations extends readonly Citation[]>(
  citations: Citations,
) {
  return [
    ...leftCenterRight(citations),
    channelRange('Ls', AZIMUTH.surround7, NO_WIDER_RANGE, citations),
    channelRange('Rs', AZIMUTH.surround7, NO_WIDER_RANGE, citations),
    channelRange('Lrs', AZIMUTH.rearSurround, NO_WIDER_RANGE, citations),
    channelRange('Rrs', AZIMUTH.rearSurround, NO_WIDER_RANGE, citations),
  ] as const
}

/**
 * How far apart each overhead pair is, as a share of the overall layout
 * width: about the L/R spacing at ±30° (IG p.7; IG p.8 fig.3; research
 * section 4). Our interpretation, not Dolby's: the "layout width" is the
 * lateral distance between the outermost listener-level speakers as placed.
 */
export const OVERHEAD_SPACING = {
  range: { min: 0.5, max: 0.7 },
  citations: [
    { source: 'IG', page: 7 },
    { source: 'IG', page: 8, figure: 'fig.3' },
  ],
  note:
    'Our interpretation: the layout width is the lateral distance between ' +
    'the outermost listener-level speakers as placed.',
} as const satisfies {
  range: { min: number; max: number }
  citations: readonly Citation[]
  note: string
}

/** The overhead elevation ranges (research section 4, side-view convention). */
const ELEVATION = {
  topFront: {
    ideal: {
      range: { min: 30, max: 55 },
      citations: [
        {
          source: 'IG',
          page: 7,
          note: 'should be 45° in the 7.1.4 reference, adjustable 30°–55°',
        },
        { source: 'IG', page: 8, figure: 'fig.2' },
        { source: 'S-514-OH' },
        { source: 'S-714-OH' },
      ],
    },
    acceptable: NO_WIDER_RANGE,
    nominal: 45,
  },
  topRear: {
    ideal: {
      range: { min: 125, max: 150 },
      citations: [
        { source: 'IG', page: 8, figure: 'fig.2' },
        { source: 'S-514-OH' },
        { source: 'S-714-OH' },
      ],
    },
    acceptable: NO_WIDER_RANGE,
    nominal: 135,
  },
  topMiddle: {
    ideal: {
      range: { min: 65, max: 100 },
      citations: [{ source: 'S-512-OH' }, { source: 'S-712-OH' }],
      note: 'Dolby states no ideal angle inside the range.',
    },
    acceptable: NO_WIDER_RANGE,
    nominal: null,
  },
} as const satisfies Record<string, OverheadChannelReference['elevation']>

/** The overhead azimuth ranges, top view (IG p.9 fig.4; research section 4). */
const OVERHEAD_AZIMUTH = {
  front: {
    ideal: {
      range: { min: 30, max: 60 },
      citations: [{ source: 'IG', page: 9, figure: 'fig.4' }],
    },
    acceptable: NO_WIDER_RANGE,
  },
  rear: {
    ideal: {
      range: { min: 120, max: 150 },
      citations: [{ source: 'IG', page: 9, figure: 'fig.4' }],
    },
    acceptable: NO_WIDER_RANGE,
  },
  middle: {
    ideal: null,
    note:
      'Dolby gives top middle speakers (x.1.2 layouts) no angle range from ' +
      'straight ahead: S-512-OH and S-712-OH draw them ahead of the seat, ' +
      'in line with L/R. So only their elevation is graded.',
  },
} as const satisfies Record<string, AngleReference | NoAngleRange>

/**
 * Why a subwoofer has no placement range, and where auto-place puts it
 * instead (docs/research/dolby-speaker-placement.md section 6;
 * docs/research/multi-subwoofer-placement.md).
 */
export const SUBWOOFER_NO_RANGE = {
  note:
    'Dolby gives subwoofers no position or angle: bass is hard to place by ' +
    'ear, so a subwoofer can go almost anywhere. Auto-place puts the ' +
    'subwoofers where a Harman study of one test room found the bass most ' +
    'even across the seats, scaled to your room.',
  citations: [{ source: 'WEB101' }, { source: 'HW-SUBS' }],
} as const satisfies { note: string; citations: readonly Citation[] }

/** Ltm/Rtm, as in 5.1.2 and 7.1.2 (S-512-OH, S-712-OH). */
const TOP_MIDDLE = [
  {
    channel: 'Ltm',
    elevation: ELEVATION.topMiddle,
    azimuth: OVERHEAD_AZIMUTH.middle,
  },
  {
    channel: 'Rtm',
    elevation: ELEVATION.topMiddle,
    azimuth: OVERHEAD_AZIMUTH.middle,
  },
] as const satisfies readonly OverheadChannelReference[]

/** Ltf/Rtf and Ltr/Rtr, as in 5.1.4 and 7.1.4 (S-514-OH, S-714-OH; IG p.8 fig.2). */
const TOP_FRONT_AND_REAR = [
  {
    channel: 'Ltf',
    elevation: ELEVATION.topFront,
    azimuth: OVERHEAD_AZIMUTH.front,
  },
  {
    channel: 'Rtf',
    elevation: ELEVATION.topFront,
    azimuth: OVERHEAD_AZIMUTH.front,
  },
  {
    channel: 'Ltr',
    elevation: ELEVATION.topRear,
    azimuth: OVERHEAD_AZIMUTH.rear,
  },
  {
    channel: 'Rtr',
    elevation: ELEVATION.topRear,
    azimuth: OVERHEAD_AZIMUTH.rear,
  },
] as const satisfies readonly OverheadChannelReference[]

/** The placement ranges of every v1 Dolby layout. */
export const DOLBY_LAYOUTS = {
  '2.1': {
    listenerLevel: 2,
    overheads: 0,
    citations: LAYOUT_CITATIONS['2.1'],
    channels: leftRight(LAYOUT_CITATIONS['2.1']),
    overheadChannels: [],
  },
  '3.1': {
    listenerLevel: 3,
    overheads: 0,
    citations: LAYOUT_CITATIONS['3.1'],
    channels: leftCenterRight(LAYOUT_CITATIONS['3.1']),
    overheadChannels: [],
  },
  '5.1': {
    listenerLevel: 5,
    overheads: 0,
    citations: LAYOUT_CITATIONS['5.1'],
    channels: bed5(LAYOUT_CITATIONS['5.1']),
    overheadChannels: [],
  },
  '7.1': {
    listenerLevel: 7,
    overheads: 0,
    citations: LAYOUT_CITATIONS['7.1'],
    channels: bed7(LAYOUT_CITATIONS['7.1']),
    overheadChannels: [],
  },
  '5.1.2': {
    listenerLevel: 5,
    overheads: 2,
    citations: LAYOUT_CITATIONS['5.1.2'],
    channels: bed5(LAYOUT_CITATIONS['5.1.2']),
    overheadChannels: TOP_MIDDLE,
  },
  '5.1.4': {
    listenerLevel: 5,
    overheads: 4,
    citations: LAYOUT_CITATIONS['5.1.4'],
    channels: bed5(LAYOUT_CITATIONS['5.1.4']),
    overheadChannels: TOP_FRONT_AND_REAR,
  },
  '7.1.2': {
    listenerLevel: 7,
    overheads: 2,
    citations: LAYOUT_CITATIONS['7.1.2'],
    channels: bed7(LAYOUT_CITATIONS['7.1.2']),
    overheadChannels: TOP_MIDDLE,
  },
  '7.1.4': {
    listenerLevel: 7,
    overheads: 4,
    citations: LAYOUT_CITATIONS['7.1.4'],
    channels: bed7(LAYOUT_CITATIONS['7.1.4']),
    overheadChannels: TOP_FRONT_AND_REAR,
  },
} as const satisfies Record<DolbyLayout, DolbyLayoutReference>
