/**
 * Reference values with their sources, as cited in
 * docs/research/dolby-speaker-placement.md,
 * docs/research/multi-subwoofer-placement.md and
 * docs/research/low-frequency-response.md.
 */

/**
 * The source keys of the research files' section 1: Dolby's documents
 * (docs/research/dolby-speaker-placement.md), the multi-subwoofer sources
 * (docs/research/multi-subwoofer-placement.md) and the low-frequency
 * model's sources (docs/research/low-frequency-response.md). Keys are
 * unique across the files.
 */
export type SourceKey =
  | DolbySourceKey
  | SubwooferSourceKey
  | LowFrequencySourceKey

/** docs/research/low-frequency-response.md, section 1. */
type LowFrequencySourceKey = 'MHA' | 'KUTTRUFF' | 'AES-8994'

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

/**
 * The speed of sound in air at about 20 °C, for the room-mode
 * frequencies f = (c/2)·√((nL/L)² + (nW/W)² + (nH/H)²).
 */
export const SPEED_OF_SOUND = {
  metersPerSecond: 343,
  citations: [
    { generalReference: 1 },
    { source: 'MHA', note: 'room-modes chapter; page not checked' },
  ],
} as const satisfies { metersPerSecond: number; citations: readonly Citation[] }

/**
 * The reverberation time the room-mode model assumes at low frequencies,
 * for every mode. It sets each mode's damping (δ = 3·ln 10 / T) and so its
 * half-power bandwidth (B = δ/π ≈ 2.2/T, about 4.4 Hz here): wider modes
 * mean smaller peaks and shallower dips.
 */
export const LOW_FREQUENCY_REVERBERATION_TIME = {
  seconds: 0.5,
  note:
    'Our modelling assumption, not a measured or published value: real ' +
    'rooms differ per room and per mode. Only the relations to damping and ' +
    'bandwidth are textbook results (docs/research/low-frequency-response.md ' +
    'section 2, item 5).',
  citations: [
    { source: 'KUTTRUFF', note: 'ch. 3: δ = 3·ln 10 / T, B = δ/π' },
    { source: 'MHA', note: 'mode bandwidth ≈ 2.2 / T; page not checked' },
  ],
} as const satisfies {
  seconds: number
  note: string
  citations: readonly Citation[]
}

/**
 * The frequencies the estimated response covers, in Hz, and how finely:
 * `steps + 1` points spread evenly on a log axis. The 20-200 Hz band is the
 * room-mode range of ADR 0002; with 160 steps over the decade, every 16th
 * point is a base-10 third-octave frequency (20, 25.2, 31.7 ... 200 Hz).
 */
export const RESPONSE_BAND = {
  lowestHz: 20,
  highestHz: 200,
  steps: 160,
  note: 'Product choice from ADR 0002 and issue #2, not a cited value.',
} as const

/**
 * How far above the highest charted frequency the room-mode model still
 * sums modes: modes above the band only add their tails to it.
 */
export const MODE_SUM_HEADROOM = {
  factor: 1.5,
  note:
    'Our modelling assumption: modes above 1.5 × the band add little ' +
    'inside it (docs/research/low-frequency-response.md section 2).',
} as const

/** The target curve's tolerance band: ± this many dB around the target. */
export const TARGET_TOLERANCE = {
  db: 3,
  note:
    'Product choice from the v1 spec (issue #2, user story 41), not a ' +
    'cited standard.',
} as const

/**
 * The house curve: a smooth bass shelf, level = boost / (1 + (f / corner)²)
 * dB, so close to +6 dB at the lowest frequencies and +3 dB at 100 Hz.
 */
export const HOUSE_CURVE = {
  boostDb: 6,
  cornerHz: 100,
  note:
    'Our assumption, not a published standard: shaped after the v1 spec ' +
    '(issue #2, user story 42, "bass boost below about 100 Hz"). A Harman ' +
    'study found listeners on average preferred more bass than flat, but ' +
    'no curve shape from it could be verified ' +
    '(docs/research/low-frequency-response.md section 3).',
  citations: [
    {
      source: 'AES-8994',
      note: 'listeners preferred more bass than flat; abstract only, via summaries',
    },
  ],
} as const satisfies {
  boostDb: number
  cornerHz: number
  note: string
  citations: readonly Citation[]
}
