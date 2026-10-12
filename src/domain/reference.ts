/**
 * Reference values with their sources, as cited in
 * docs/research/dolby-speaker-placement.md and
 * docs/research/multi-subwoofer-placement.md.
 */

/**
 * The source keys of the research files' section 1: Dolby's documents
 * (docs/research/dolby-speaker-placement.md) and the multi-subwoofer
 * sources (docs/research/multi-subwoofer-placement.md). Keys are unique
 * across both files.
 */
export type SourceKey = DolbySourceKey | SubwooferSourceKey

/** docs/research/multi-subwoofer-placement.md, section 1. */
type SubwooferSourceKey = 'HW-SUBS' | 'AES-5602' | 'JAES-2006'

/** docs/research/dolby-speaker-placement.md, section 1. */
type DolbySourceKey =
  | 'IG'
  | 'WP'
  | 'SB'
  | 'QSG'
  | 'WEB101'
  | 'IDX'
  | 'S-21'
  | 'S-31'
  | 'S-41'
  | 'S-51'
  | 'S-71'
  | 'S-91'
  | 'S-512-OH'
  | 'S-512-EN'
  | 'S-514-OH'
  | 'S-514-EN'
  | 'S-514-HY'
  | 'S-712-OH'
  | 'S-712-EN'
  | 'S-714-OH'
  | 'S-714-EN'
  | 'S-714-HY'
  | 'S-912-OH'
  | 'S-914-OH'
  | 'S-916-OH'
  | 'S-1118-OH'

/**
 * Where a reference value comes from: a keyed source (with a page for the
 * multi-page ones, and the figure or slide when the value is read off
 * one), or, for rules of thumb that are not from Dolby, the numbered entry
 * in section 8 ("General acoustics references") of the Dolby research
 * file.
 */
export type Citation =
  | {
      readonly source: SourceKey
      readonly page?: number
      readonly figure?: string
      readonly note?: string
    }
  | {
      readonly generalReference: number
      readonly note?: string
    }

/** Seated ear height: listener-level speakers and the MLP sit here. */
export const EAR_HEIGHT = {
  meters: 1.2,
  citations: [
    { source: 'IG', page: 6, note: 'seated ear height per ITU-R BS.1116-1' },
    { source: 'WEB101' },
  ],
} as const satisfies { meters: number; citations: readonly Citation[] }

/**
 * The informal "38% rule": seat the listener about 38% of the room length
 * from the front wall, off the 50% length null. A heuristic and soft
 * default, not a published standard and not a Dolby recommendation (Dolby
 * gives no MLP position). Used for the MLP until the recommended seat (seat score) exists.
 */
export const MLP_FRONT_WALL_FRACTION = {
  fraction: 0.38,
  citations: [
    {
      generalReference: 3,
      note: 'heuristic attributed to Wes Lachot, who calls it a starting point',
    },
  ],
} as const satisfies { fraction: number; citations: readonly Citation[] }

/**
 * How close a listener-level speaker's position (its acoustic center) may
 * come to any wall: room for the cabinet behind it. Auto-place keeps every
 * listener-level speaker at least this far from every wall.
 */
export const SPEAKER_WALL_CLEARANCE = {
  meters: 0.3,
  note:
    'Our modelling assumption, not Dolby: Dolby gives no distance from ' +
    'the walls (docs/research/dolby-speaker-placement.md section 7).',
} as const satisfies { meters: number; note: string }

/**
 * How far a subwoofer's acoustic center stands off the wall it is placed
 * against. Auto-place keeps every subwoofer at least this far from every
 * wall.
 */
export const SUBWOOFER_WALL_CLEARANCE = {
  meters: 0.3,
  note:
    "Our modelling assumption, not Welti's: his white paper places the " +
    'subwoofers along the walls without giving a distance ' +
    '(docs/research/multi-subwoofer-placement.md section 4, item 7).',
} as const satisfies { meters: number; note: string }

/** The height of a subwoofer's acoustic center above the floor. */
export const SUBWOOFER_HEIGHT = {
  meters: 0.3,
  note:
    'Our modelling assumption: a floor-standing subwoofer with its driver ' +
    "low in the cabinet. Welti's white paper gives no subwoofer height " +
    '(docs/research/multi-subwoofer-placement.md section 4, item 7).',
} as const satisfies { meters: number; note: string }
