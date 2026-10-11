/**
 * Reference values with their sources. Source keys (IG, WEB101, ...) are the
 * ones in docs/research/dolby-speaker-placement.md section 1; `section`
 * points into that file for rules of thumb that are not from Dolby.
 */

export type Citation = {
  readonly source: string
  readonly page?: number
  readonly section?: string
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
      source: 'research',
      section: '8.3',
      note: 'heuristic attributed to Wes Lachot, who calls it a starting point',
    },
  ],
} as const satisfies { fraction: number; citations: readonly Citation[] }
