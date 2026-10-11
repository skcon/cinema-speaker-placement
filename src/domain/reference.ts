/**
 * Reference values with their sources, as cited in
 * docs/research/dolby-speaker-placement.md.
 */

/** The source keys of docs/research/dolby-speaker-placement.md, section 1. */
export type SourceKey =
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
 * multi-page ones), or, for rules of thumb that are not from Dolby, the
 * numbered entry in section 8 ("General acoustics references") of the
 * research file.
 */
export type Citation =
  | {
      readonly source: SourceKey
      readonly page?: number
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
 * gives no MLP position). Used for the MLP until auto-place exists.
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
