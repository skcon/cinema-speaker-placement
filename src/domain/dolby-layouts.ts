/**
 * Dolby's listener-level placement ranges for every v1 Layout, as typed data
 * with citations. Values and citation keys come from
 * docs/research/dolby-speaker-placement.md: channel names from section 2,
 * azimuths from section 3, conflicts from section 7. Overhead channels (#8)
 * and subwoofers (#10) are not in this map yet.
 *
 * Azimuths are degrees from Dolby's center-front reference, on the channel's
 * own side of the room (see src/domain/room.ts for the sign convention).
 */
import type { SpeakerFormat } from './layout'
import type { Citation } from './reference'

/** A listener-level channel, by Dolby's abbreviation (research section 2). */
export type ChannelId = 'L' | 'C' | 'R' | 'Ls' | 'Rs' | 'Lrs' | 'Rrs'

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

export const CHANNEL_NAME_CITATIONS = [
  { source: 'IG', page: 8 },
] as const satisfies readonly Citation[]

/** Inclusive range of angles, in degrees. */
export type AngleRange = { readonly min: number; readonly max: number }

/** An angle range with where it comes from. */
export type CitedAngleRange = {
  readonly range: AngleRange
  readonly citations: readonly Citation[]
  readonly note?: string
}

/** Recorded where Dolby gives a single range, so nothing grades acceptable. */
export type NoWiderRange = { readonly range: null; readonly note: string }

/** A channel's placement range: graded ideal, acceptable or outside. */
export type PlacementRangeReference = {
  /** Dolby's recommended azimuth range: inside it grades ideal. */
  readonly ideal: CitedAngleRange
  /**
   * A wider azimuth range Dolby also allows, containing the ideal one:
   * inside it (but not the ideal range) grades acceptable.
   */
  readonly acceptable: CitedAngleRange | NoWiderRange
}

export type ChannelReference = PlacementRangeReference & {
  readonly channel: ChannelId
}

export type DolbyLayoutReference = {
  /** The layout's X and Z (its Y, the subwoofer count, doesn't matter here). */
  readonly format: SpeakerFormat
  /** The Dolby sheet(s) and IG pages that draw this layout. */
  readonly citations: readonly Citation[]
  /** The listener-level channels, in display order. */
  readonly channels: readonly ChannelReference[]
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
 * The sources that draw each layout (research section 3, "Per layout"). The
 * sheets are one page each, so they are cited by key; the listener-level
 * angles are the same on a layout's overhead, enabled and hybrid sheets.
 */
const SHEETS = {
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
    { source: 'IG', page: 36, note: 'pp.36–39' },
  ],
} as const satisfies Record<string, readonly Citation[]>

/**
 * L/R is the only channel with a wider range in Dolby's documents, and the
 * documents disagree about it (research section 7, item 1).
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
    'IG p.7 uses ±30° as the L/R reference). The sheets set the ideal ' +
    'range; IG fig.3 widens it to acceptable for every layout.',
} as const satisfies CitedAngleRange

const NO_WIDER_RANGE = {
  range: null,
  note: 'Dolby gives no wider range',
} as const satisfies NoWiderRange

/** The listener-level placement ranges of every v1 layout. */
export const DOLBY_LAYOUTS = {
  '2.1': {
    format: { listenerLevel: 2, overheads: 0 },
    citations: SHEETS['2.1'],
    channels: [
      {
        channel: 'L',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['2.1'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'R',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['2.1'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
    ],
  },
  '3.1': {
    format: { listenerLevel: 3, overheads: 0 },
    citations: SHEETS['3.1'],
    channels: [
      {
        channel: 'L',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['3.1'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'C',
        ideal: { range: AZIMUTH.center, citations: SHEETS['3.1'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'R',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['3.1'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
    ],
  },
  '5.1': {
    format: { listenerLevel: 5, overheads: 0 },
    citations: SHEETS['5.1'],
    channels: [
      {
        channel: 'L',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['5.1'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'C',
        ideal: { range: AZIMUTH.center, citations: SHEETS['5.1'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'R',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['5.1'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'Ls',
        ideal: { range: AZIMUTH.surround5, citations: SHEETS['5.1'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Rs',
        ideal: { range: AZIMUTH.surround5, citations: SHEETS['5.1'] },
        acceptable: NO_WIDER_RANGE,
      },
    ],
  },
  '7.1': {
    format: { listenerLevel: 7, overheads: 0 },
    citations: SHEETS['7.1'],
    channels: [
      {
        channel: 'L',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['7.1'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'C',
        ideal: { range: AZIMUTH.center, citations: SHEETS['7.1'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'R',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['7.1'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'Ls',
        ideal: { range: AZIMUTH.surround7, citations: SHEETS['7.1'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Rs',
        ideal: { range: AZIMUTH.surround7, citations: SHEETS['7.1'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Lrs',
        ideal: { range: AZIMUTH.rearSurround, citations: SHEETS['7.1'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Rrs',
        ideal: { range: AZIMUTH.rearSurround, citations: SHEETS['7.1'] },
        acceptable: NO_WIDER_RANGE,
      },
    ],
  },
  '5.1.2': {
    format: { listenerLevel: 5, overheads: 2 },
    citations: SHEETS['5.1.2'],
    channels: [
      {
        channel: 'L',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['5.1.2'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'C',
        ideal: { range: AZIMUTH.center, citations: SHEETS['5.1.2'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'R',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['5.1.2'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'Ls',
        ideal: { range: AZIMUTH.surround5, citations: SHEETS['5.1.2'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Rs',
        ideal: { range: AZIMUTH.surround5, citations: SHEETS['5.1.2'] },
        acceptable: NO_WIDER_RANGE,
      },
    ],
  },
  '5.1.4': {
    format: { listenerLevel: 5, overheads: 4 },
    citations: SHEETS['5.1.4'],
    channels: [
      {
        channel: 'L',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['5.1.4'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'C',
        ideal: { range: AZIMUTH.center, citations: SHEETS['5.1.4'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'R',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['5.1.4'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'Ls',
        ideal: { range: AZIMUTH.surround5, citations: SHEETS['5.1.4'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Rs',
        ideal: { range: AZIMUTH.surround5, citations: SHEETS['5.1.4'] },
        acceptable: NO_WIDER_RANGE,
      },
    ],
  },
  '7.1.2': {
    format: { listenerLevel: 7, overheads: 2 },
    citations: SHEETS['7.1.2'],
    channels: [
      {
        channel: 'L',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['7.1.2'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'C',
        ideal: { range: AZIMUTH.center, citations: SHEETS['7.1.2'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'R',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['7.1.2'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'Ls',
        ideal: { range: AZIMUTH.surround7, citations: SHEETS['7.1.2'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Rs',
        ideal: { range: AZIMUTH.surround7, citations: SHEETS['7.1.2'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Lrs',
        ideal: { range: AZIMUTH.rearSurround, citations: SHEETS['7.1.2'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Rrs',
        ideal: { range: AZIMUTH.rearSurround, citations: SHEETS['7.1.2'] },
        acceptable: NO_WIDER_RANGE,
      },
    ],
  },
  '7.1.4': {
    format: { listenerLevel: 7, overheads: 4 },
    citations: SHEETS['7.1.4'],
    channels: [
      {
        channel: 'L',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['7.1.4'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'C',
        ideal: { range: AZIMUTH.center, citations: SHEETS['7.1.4'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'R',
        ideal: { range: AZIMUTH.leftRight, citations: SHEETS['7.1.4'] },
        acceptable: LEFT_RIGHT_ACCEPTABLE,
      },
      {
        channel: 'Ls',
        ideal: { range: AZIMUTH.surround7, citations: SHEETS['7.1.4'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Rs',
        ideal: { range: AZIMUTH.surround7, citations: SHEETS['7.1.4'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Lrs',
        ideal: { range: AZIMUTH.rearSurround, citations: SHEETS['7.1.4'] },
        acceptable: NO_WIDER_RANGE,
      },
      {
        channel: 'Rrs',
        ideal: { range: AZIMUTH.rearSurround, citations: SHEETS['7.1.4'] },
        acceptable: NO_WIDER_RANGE,
      },
    ],
  },
} as const satisfies Record<string, DolbyLayoutReference>

/** A v1 layout's name on its Dolby sheet, for example "5.1.2". */
export type DolbyLayoutKey = keyof typeof DOLBY_LAYOUTS

/** The v1 speaker formats (X and Z), in the order of the reference map. */
export const V1_SPEAKER_FORMATS: readonly SpeakerFormat[] =
  Object.values<DolbyLayoutReference>(DOLBY_LAYOUTS).map(({ format }) => format)

/** The Dolby reference for a layout's speaker format, whatever its subwoofer count. */
export function dolbyLayoutFor({
  listenerLevel,
  overheads,
}: SpeakerFormat): DolbyLayoutReference {
  const reference = Object.values<DolbyLayoutReference>(DOLBY_LAYOUTS).find(
    ({ format }) =>
      format.listenerLevel === listenerLevel && format.overheads === overheads,
  )
  if (!reference) {
    throw new Error(
      `No Dolby reference for ${listenerLevel} listener-level and ${overheads} overhead channels`,
    )
  }
  return reference
}
