/**
 * Reference values with their sources, as cited in
 * docs/research/dolby-speaker-placement.md,
 * docs/research/multi-subwoofer-placement.md,
 * docs/research/low-frequency-response.md,
 * docs/research/crossover-enclosure-boundaries.md,
 * docs/research/reference-level-headroom.md,
 * docs/research/screen-and-front-stage.md and
 * docs/research/room-openings-and-furniture.md.
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
  | BassSourceKey
  | HeadroomSourceKey
  | ScreenSourceKey
  | RoomObjectSourceKey

/**
 * docs/research/room-openings-and-furniture.md, section 1 (its KUTTRUFF and
 * MHA are the books LowFrequencySourceKey already names).
 */
type RoomObjectSourceKey =
  | 'TOOLE-SR'
  | 'TOOLE-2006'
  | 'EBU-3276'
  | 'EBU-3276-S1'
  | 'BS1116'
  | 'RP22'
  | 'ODEON-2025'
  | 'MAGALOTTI'
  | 'MALUSKI-2004'
  | 'SCHULTZ-1964'
  | 'COUPLED-ARXIV'
  | 'GEN-8030A'
  | 'GEN-8430A'
  | 'GEN-1237A'
  | 'LINKWITZ-EDN'
  | 'C-AVS-OPEN'
  | 'C-AH-DOOR'
  | 'C-GS-GLASS'
  | 'C-SN-WINDOW'
  | 'C-OHM-REAR'

/** docs/research/screen-and-front-stage.md, section 1. */
type ScreenSourceKey =
  'CEPRO-H' | 'SV-AT' | 'ELITE-AT' | 'AVS-AT' | 'ITU-775' | 'AF-LAYOUT'

/** docs/research/reference-level-headroom.md, section 1. */
type HeadroomSourceKey = 'ATSC-A52' | 'FLORIAN-2000'

/** docs/research/crossover-enclosure-boundaries.md, section 1. */
type BassSourceKey =
  | 'LR-1976'
  | 'RANE-160'
  | 'SV-BASS'
  | 'SMALL-CB'
  | 'SMALL-VB'
  | 'THIELE-VB'
  | 'ALLISON-1974'
  | 'STRUCK-2016'

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

/** A source document's title and where to read it. */
export type Source = { readonly title: string; readonly url: string }

/**
 * The titles and URLs of the sources the app shows with its grades and
 * placement warnings, copied from the sources tables in section 1 of
 * docs/research/dolby-speaker-placement.md,
 * docs/research/multi-subwoofer-placement.md and
 * docs/research/room-openings-and-furniture.md. The Dolby table writes the
 * per-layout sheets' shared title prefix as "..."; it is spelled out here.
 * Only keys that the placement ranges, the subwoofers' "not graded"
 * reason or PLACEMENT_WARNINGS cite are listed.
 */
export const SOURCES = {
  IG: {
    title: 'Dolby Atmos Home Theater Installation Guidelines (60 pp.)',
    url: 'https://www.dolby.com/siteassets/technologies/dolby-atmos/atmos-installation-guidelines-121318_r3.1.pdf',
  },
  WEB101: {
    title: 'Dolby Atmos Speaker Setup 101 (web page)',
    url: 'https://www.dolby.com/about/support/guide/dolby-atmos-speaker-setup/',
  },
  'S-21': {
    title: 'Home Theater Speaker Guide: 2.1 Virtual Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/2.1-virtual-speakers/2_1_virtual_speakers.pdf',
  },
  'S-31': {
    title: 'Home Theater Speaker Guide: 3.1 Virtual Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/3.1-virtual-speakers-setup/3_1_virtual_speaker_setup.pdf',
  },
  'S-51': {
    title: 'Home Theater Speaker Guide: 5.1 Virtual Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1-virtual-speakers-setup/5_1_virtual_speaker_setup.pdf',
  },
  'S-71': {
    title: 'Home Theater Speaker Guide: 7.1 Virtual Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1-virtual-speakers-setup/7_1_virtual_speaker_setup.pdf',
  },
  'S-512-OH': {
    title: 'Home Theater Speaker Guide: 5.1.2 Overhead Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.2-overhead-speaker-placement/5_1_2_overhead_speakers_setup.pdf',
  },
  'S-512-EN': {
    title: 'Home Theater Speaker Guide: 5.1.2 Dolby Atmos Enabled Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.2-dolby-atmos-enabled-speaker-placement/5_1_2_atmos_enabled_speaker_setup.pdf',
  },
  'S-514-OH': {
    title: 'Home Theater Speaker Guide: 5.1.4 Overhead Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.4-overhead-speaker-placement/sell-sheet-5.1.4-mounted.pdf',
  },
  'S-514-EN': {
    title: 'Home Theater Speaker Guide: 5.1.4 Dolby Atmos Enabled Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.4-dolby-atmos-enabled-speaker-placement/5_1_4_atmos_enabled_speaker_setup.pdf',
  },
  'S-514-HY': {
    title:
      'Home Theater Speaker Guide: 5.1.4 Hybrid (front enabled / rear overhead)',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.4-hybrid-dolby-atmos-enabled--overhead-speaker-placement/5_1_4_hybrid_overhead.pdf',
  },
  'S-712-OH': {
    title: 'Home Theater Speaker Guide: 7.1.2 Overhead Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.2-overhead-speaker-placement/7_1_2_overhead_speaker_setup.pdf',
  },
  'S-712-EN': {
    title: 'Home Theater Speaker Guide: 7.1.2 Dolby Atmos Enabled Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.2-dolby-atmos-enabled-speaker-placement/7_1_2_atmos_enabled_speaker_setup.pdf',
  },
  'S-714-OH': {
    title: 'Home Theater Speaker Guide: 7.1.4 Overhead Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.4-overhead-speaker-placement/7_1_4_overhead_speaker_setup.pdf',
  },
  'S-714-EN': {
    title: 'Home Theater Speaker Guide: 7.1.4 Dolby Atmos Enabled Speakers',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.4-dolby-atmos-enabled-speaker-placement/7_1_4_atmos_enabled_speaker_setup.pdf',
  },
  'S-714-HY': {
    title:
      'Home Theater Speaker Guide: 7.1.4 Hybrid (front enabled / rear overhead)',
    url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.4-hybrid-dolby-atmos-enabled--overhead-speaker-placement/7_1_4_hybrid_dolby_atmos_enabled_overhead_speaker_placement.pdf',
  },
  'HW-SUBS': {
    title:
      'T. Welti (Harman International), "Subwoofers: Optimum Number and Locations", Harman white paper (slides with notes, 80 slides on 30 pages)',
    url: 'https://www.harman.com/Documents/multsubs.pdf',
  },
  'EBU-3276': {
    title:
      'EBU Tech 3276, Listening conditions for the assessment of sound programme material: monophonic and two-channel stereophonic (2nd ed., 1998)',
    url: 'https://tech.ebu.ch/docs/tech/tech3276.pdf',
  },
  'GEN-8030A': {
    title: 'Genelec 8030A Quick Setup Guide (third-party copy)',
    url: 'https://tgm-wiki.jade-hs.de/_media/inventar_specs/qs8030a.pdf',
  },
  'GEN-8430A': {
    title: 'Genelec 8430A Operating Manual (third-party copy)',
    url: 'https://www.fullcompass.com/common/files/27953-Genelec8430AOperatingManual.pdf',
  },
  'EBU-3276-S1': {
    title:
      'EBU Tech 3276, Supplement 1: Listening conditions for the assessment of sound programme material: multichannel sound',
    url: 'https://tech.ebu.ch/docs/tech/tech3276s1.pdf',
  },
  'GEN-1237A': {
    title: 'Genelec 1237A manual (third-party copy)',
    url: 'https://www.notice-facile.com/en/manual/813295/genelec+1237a',
  },
  'C-AH-DOOR': {
    title:
      'Audioholics forum, "Building home theater: open entrance to theater or door?" (community practice: a forum thread)',
    url: 'https://forums.audioholics.com/forums/threads/building-home-theater-open-entrance-to-theater-or-door.107437/post-1187651',
  },
  'C-GS-GLASS': {
    title:
      'Gearspace forum, "Glass walls" (community practice: a forum thread)',
    url: 'https://gearspace.com/threads/glass-walls.685260/',
  },
  'C-SN-WINDOW': {
    title:
      'StereoNET forum, "Room with a large window behind the speakers" (community practice: a forum thread)',
    url: 'https://stereonet.com/forums/topic/614116-room-with-a-large-window-behind-the-speakers',
  },
  'C-OHM-REAR': {
    title:
      'Ohm Speakers, "No Cost Sound Improvement – Move Your Seat" (community practice: a manufacturer\'s marketing blog)',
    url: 'https://ohmspeaker.com/news/no-cost-sound-improvement-move-your-seat-get-better-sound/',
  },
} as const satisfies Partial<Record<SourceKey, Source>>

/** A source's title and URL, or null when SOURCES does not list it. */
export function sourceOf(key: SourceKey): Source | null {
  const sources: Partial<Record<SourceKey, Source>> = SOURCES
  return sources[key] ?? null
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
 * The ceiling height at or below which Dolby says overhead speakers end up
 * too close to the listeners and suggests Atmos-enabled speakers instead.
 * Dolby states 8 ft (about 2.44 m); the project spec (issue #2, user story
 * 24, and the CLAUDE.md v1 scope) uses 2.4 m, which is what we apply.
 */
export const LOW_CEILING_FOR_OVERHEADS = {
  meters: 2.4,
  citations: [
    {
      source: 'WP',
      page: 7,
      note: 'ceilings of 8 ft or lower put overheads too close; use enabled speakers',
    },
    { source: 'IG', page: 12 },
  ],
} as const satisfies { meters: number; citations: readonly Citation[] }

/**
 * The informal "38% rule": seat the listener about 38% of the room length
 * from the front wall, off the 50% length null. A heuristic and soft
 * default, not a published standard and not a Dolby recommendation (Dolby
 * gives no MLP position). Used for the auto MLP, and shown as a reference
 * line beside the recommended seat (seat score, seat-score.ts).
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
 * How far from the front wall auto-place puts the front stage (Left,
 * Center and Right, at their acoustic centers): close to the wall, where
 * the manufacturers want monitors, and far enough that the first
 * front-wall cancellation stays above the crossover (ADR 0005).
 */
export const FRONT_STAGE_WALL_DISTANCE = {
  meters: 0.5,
  note:
    'Our choice, not Dolby: Dolby gives no distance from the front wall. ' +
    'The sources disagree on one number (Genelec under about 0.6 m, ADAM ' +
    'under 0.5 m, KEF 0.3-1 m), read from search extracts ' +
    '(docs/research/real-room-placement.md section 2.1; ADR 0005).',
} as const satisfies { meters: number; note: string }

/**
 * Where auto-place aims Left and Right without a Screen (#121, ADR 0005
 * amendment): at Dolby's 30° reference, less `edgeMargin` when that
 * reference sits on the ideal range's edge. With every per-layout sheet's
 * ideal 22°–30° (dolby-layouts.ts) that is 29°, so L–R spacing ÷ MLP→L is
 * 2 sin 29° ≈ 0.97: a near-equilateral triangle with the MLP.
 */
export const LEFT_RIGHT_AIM = {
  /** Dolby's L/R reference angle, on each side. */
  nominal: 30,
  /** Degrees kept inside the ideal range's edge. */
  edgeMargin: 1,
  citations: [
    { source: 'IG', page: 7, note: 'uses ±30° as the L/R reference' },
    {
      source: 'IG',
      page: 8,
      figure: 'fig.3',
      note: 'the 7.1.4 reference: L/R 30° nominal, range 22°–40°',
    },
  ],
  note:
    'ITU-R BS.775 also puts L/R at ±30° (docs/research/screen-and-front-' +
    'stage.md section 3.1, from an excerpt). Dolby lists the 30° reference ' +
    'in docs/research/dolby-speaker-placement.md section 3.',
  assumption:
    "Our choice, not Dolby's: 30° is the edge of the sheets' ideal " +
    '22°–30°, and grades round to whole degrees, so a seat about 2% of the ' +
    'way forward would already read 31°, acceptable. 1° inside the edge ' +
    'keeps L/R ideal from a seat up to about 6% of the way forward and ' +
    'still gives a near-equilateral triangle.',
} as const satisfies {
  nominal: number
  edgeMargin: number
  citations: readonly Citation[]
  note: string
  assumption: string
}

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
    {
      source: 'KUTTRUFF',
      note: 'ch. 3: δ = 3·ln 10 / T, B = δ/π; page not checked',
    },
    { source: 'MHA', note: 'mode bandwidth ≈ 2.2 / T; page not checked' },
  ],
} as const satisfies {
  seconds: number
  note: string
  citations: readonly Citation[]
}

/**
 * The frequencies the estimated response covers by default, in Hz, and
 * how finely: `steps + 1` points spread evenly on a log axis. About
 * 20-500 Hz: the room-mode range and the boundary-interference range of
 * ADR 0002 together (issue #2, user story 40). At 160 steps per decade,
 * every 16th point is a base-10 third-octave frequency, so the band ends
 * on one: 20·10^1.4 ≈ 502 Hz, 224 steps.
 */
export const RESPONSE_BAND = {
  lowestHz: 20,
  highestHz: 20 * 10 ** 1.4,
  steps: 224,
  note: 'Product choice from ADR 0002 and issue #2, not a cited value.',
} as const satisfies {
  lowestHz: number
  highestHz: number
  steps: number
  note: string
}

/**
 * The highest frequency the room-mode model is worked out at, in Hz: the
 * room-mode range of ADR 0002. Above it the subwoofers' sound is taken as
 * flat at their level (they are mostly crossed out there), and only the
 * Speakers' boundary interference shapes the estimate. It also keeps the
 * modal sum to a few thousand modes in the largest room, so the seat score
 * (#14) stays fast.
 */
export const ROOM_MODE_BAND = {
  highestHz: 200,
  note:
    'Our modelling choice after ADR 0002: modes become too dense to ' +
    'model one by one well above 200 Hz in a home theater.',
} as const satisfies { highestHz: number; note: string }

/**
 * How the subwoofers' and the speakers' parts are added up at the MLP.
 * Each part's level is set so its average over its own pass band (the
 * subwoofers' reliable rows up to the crossover, the speakers' rows from
 * it) is 0 dB, like a receiver's level calibration. Then the parts are
 * added with the crossover's LR4 filters, in phase, as if the receiver's
 * distance (delay) setting had time-aligned them: only each part's
 * magnitude comes from the room. The room's own phase difference between
 * the two parts is not modelled, so the crossover region is smoother than
 * in a real room.
 */
export const SUBWOOFER_SPEAKER_SUM = {
  note:
    'Our modelling assumption, not a cited method ' +
    '(docs/research/crossover-enclosure-boundaries.md section 5).',
} as const satisfies { note: string }

/**
 * How far above the highest frequency asked for the room-mode model still
 * sums modes: modes above it only add their tails.
 */
export const MODE_SUM_HEADROOM = {
  factor: 1.5,
  note:
    'Our modelling assumption: modes above 1.5 × the highest frequency ' +
    'add little below it (docs/research/low-frequency-response.md section 2).',
} as const satisfies { factor: number; note: string }

/**
 * The crossover between the Speakers and the Subwoofers: its default, the
 * frequencies a config accepts, and the filter it is modelled with.
 *
 * The filter is an acoustic 4th-order Linkwitz-Riley (LR4) crossover: the
 * Subwoofers' low-pass and the Speakers' high-pass are each a 2nd-order
 * Butterworth filter twice, −6 dB at the crossover, 24 dB per octave, in
 * phase, summing flat (LR-1976; RANE-160). THX's bass management, as a
 * magazine article describes it (SV-BASS, read only through search
 * summaries, UNVERIFIED), sends a 24 dB/octave low-pass to the subwoofer
 * and a 12 dB/octave high-pass to the speakers, whose own 12 dB/octave
 * roll-off makes the acoustic sum LR4-like. Modelling every receiver's
 * acoustic result as LR4 is our assumption.
 */
export const CROSSOVER = {
  defaultHz: 80,
  limits: { min: 40, max: 200 },
  note:
    'The 80 Hz default is the v1 spec (issue #2, user story 20). The ' +
    '40-200 Hz range is our product limit, catching typos while covering ' +
    'the settings AV receivers commonly offer; it is not a cited value. ' +
    'The LR4 model is ours, after the sources cited ' +
    '(docs/research/crossover-enclosure-boundaries.md section 2).',
  citations: [
    {
      source: 'LR-1976',
      note: 'origin of the Linkwitz-Riley alignment; abstract only',
    },
    { source: 'RANE-160', note: 'LR4: −6 dB at fc, in phase, flat sum' },
    {
      source: 'SV-BASS',
      note: 'THX slopes, via search summaries only (UNVERIFIED)',
    },
  ],
} as const satisfies {
  defaultHz: number
  limits: { min: number; max: number }
  note: string
  citations: readonly Citation[]
}

/**
 * How each Enclosure rolls a subwoofer off below its pass band, modelled
 * as a Butterworth high-pass: a sealed (closed) box is a 2nd-order
 * (12 dB/octave) high-pass (SMALL-CB), a ported (vented) box a 4th-order
 * (24 dB/octave) one (THIELE-VB; SMALL-VB). The orders come from those
 * papers (read as abstracts only). The Butterworth shape and the corner
 * (−3 dB) frequencies are ours: real subwoofers differ per model, and the
 * specs don't hold a corner frequency. The ported corner is lower, as a
 * port typically extends the bass before its steeper fall.
 */
export const ENCLOSURE_ROLL_OFF = {
  sealed: { order: 2, cornerHz: 30 },
  ported: { order: 4, cornerHz: 20 },
  note:
    'Orders from the cited papers; Butterworth alignment and corner ' +
    'frequencies (30 Hz sealed, 20 Hz ported) are our modelling ' +
    'assumptions, not measured or published values ' +
    '(docs/research/crossover-enclosure-boundaries.md section 3).',
  citations: [
    { source: 'SMALL-CB', note: 'closed box: 2nd-order high-pass; abstract' },
    { source: 'THIELE-VB', note: 'vented box: 4th-order; abstract' },
    { source: 'SMALL-VB', note: 'vented box: 4th-order high-pass; abstract' },
  ],
} as const satisfies Record<
  'sealed' | 'ported',
  { order: 2 | 4; cornerHz: number }
> & { note: string; citations: readonly Citation[] }

/**
 * The speaker-boundary interference model for listener-level Speakers
 * (ADR 0002, about 80-500 Hz): first-order reflections off three (or four) nearby
 * surfaces, each an image source with the extra delay and spreading loss
 * of its longer path, summed with the direct sound.
 *
 * - **Surfaces**: Allison measured and modelled the effect of the three
 *   room boundaries nearest a loudspeaker: the floor, the wall behind it
 *   and a side wall (ALLISON-1974, abstract and secondary summaries only;
 *   STRUCK-2016). Here: the wall behind the speaker (found from its aim),
 *   the nearest other wall (both, when equally near), and the nearer of
 *   the floor and the ceiling.
 *   Taking the ceiling when it is nearer, both side walls when equally
 *   near, and only these surfaces, is ours.
 * - **Reflection coefficient 1** (rigid surfaces, no absorption), as in
 *   the room-mode model's rigid walls: ours. Real walls absorb some bass,
 *   so real notches are shallower.
 * - **Omnidirectional speakers**: ours. Below about 500 Hz a home theater
 *   speaker's woofer radiates broadly, but real cabinets send less sound
 *   backwards as frequency rises, so notches from the wall behind are
 *   overstated toward 500 Hz. The aim picks the wall behind; it doesn't
 *   weight the reflections.
 * - **Only first-order reflections** and no room modes for the Speakers:
 *   ours.
 */
export const BOUNDARY_INTERFERENCE = {
  reflectionCoefficient: 1,
  note:
    'Simplified model; every parameter here is our assumption except the ' +
    "choice of three nearby boundaries, after Allison's study " +
    '(docs/research/crossover-enclosure-boundaries.md section 4).',
  citations: [
    {
      source: 'ALLISON-1974',
      note: 'three nearest boundaries; abstract and summaries only',
    },
    {
      source: 'STRUCK-2016',
      note: "reproduces Allison's figure 8 (numbering per STRUCK-2016)",
    },
  ],
} as const satisfies {
  reflectionCoefficient: number
  note: string
  citations: readonly Citation[]
}

/**
 * How the weaknesses and strengths list matches a peak or dip to its
 * likely cause (response-notes.ts). Every value is our own rule of thumb,
 * not a cited one:
 *
 * - `matchWithin`: a room mode explains a peak or dip within this share
 *   of its frequency, or within one modal bandwidth if that is wider.
 * - `nodeBelow`: the MLP is "near a mode's node" where the mode's
 *   relative pressure there is below this (and "hears" it from it up).
 * - `reflectionWithin`: a reflection's notch or boost explains a dip or
 *   peak within this share of its frequency.
 * - `mergeWithin`: notches of different speakers this close are one entry.
 * - `rollOffUpTo`: a dip up to this multiple of the enclosure's corner
 *   frequency, with no mode to explain it, is put down to the roll-off.
 * - `smoothFrom`: the response counts as smooth when at least this share
 *   of the reliable range is inside the tolerance band.
 */
export const RESPONSE_NOTES = {
  matchWithin: 0.05,
  nodeBelow: 0.3,
  reflectionWithin: 0.1,
  mergeWithin: 0.03,
  rollOffUpTo: 1.25,
  smoothFrom: 0.7,
  note: 'Our matching rules, not cited values.',
} as const satisfies Record<string, number | string>

/**
 * The seat score (GLOSSARY.md): how good a candidate MLP is, from 0 to 1.
 * Every value here is our modelling assumption, not a cited one (only the
 * equidistance rule it follows is Dolby's); the score is an estimate from
 * the simplified model, for comparing seats in one room, never a
 * measurement.
 *
 * - **Grid**: candidate seats lie on a grid inside the MLP's wall
 *   clearance, at most `gridSpacing` meters apart, with at most
 *   `maxPerSide` seats along each side, so the largest room stays fast.
 * - **Bass smoothness**: the RMS deviation of the estimated response
 *   from the target over the reliable rows, at the seat, with the
 *   calibration made at the current MLP (so a seat with weaker or
 *   stronger bass than the MLP counts too). A deviation of
 *   `deviationAtZeroDb` or more scores 0, none scores 1, linear between.
 * - **Placement fit**: per listener-level speaker, its placement-range
 *   grade from the seat (ideal 1, acceptable 0.5, outside 0), times its
 *   equidistance: Dolby wants every listener-level speaker as far from the
 *   listener as the front speakers, which set the reference distance (the
 *   farthest of Left, Center and Right here), with delay compensation for
 *   the rest (IG p.6, p.15). A speaker at least `equidistanceShare` of the
 *   reference distance away counts in full, nearer ones in proportion (a
 *   speaker a wall squeezes against the seat). The mean over the speakers.
 *   Auto speakers are re-placed around each seat; manual ones stay put.
 * - **Score**: the two weighted by `weights` (they add up to 1).
 * - **Recommendation**: the best seat, if it beats the MLP by at least
 *   `meaningfulDifference` (two points on a 100-point scale); smaller
 *   differences are within the simplified model's precision.
 */
export const SEAT_SCORE = {
  gridSpacing: 0.25,
  maxPerSide: 15,
  deviationAtZeroDb: 12,
  gradeValues: { ideal: 1, acceptable: 0.5, outside: 0 },
  equidistanceShare: 0.5,
  weights: { bassSmoothness: 0.6, placementFit: 0.4 },
  meaningfulDifference: 0.02,
  note:
    'Our modelling assumptions, not cited values: the grid, the scale of ' +
    'the bass smoothness, the grade values, the equidistance share, the ' +
    'weights and the meaningful difference.',
  citations: [
    {
      source: 'IG',
      page: 6,
      note: 'equidistance: the front speakers set the reference distance',
    },
    { source: 'IG', page: 15, note: 'delay compensation for the rest' },
  ],
} as const satisfies {
  gridSpacing: number
  maxPerSide: number
  deviationAtZeroDb: number
  gradeValues: Record<'ideal' | 'acceptable' | 'outside', number>
  equidistanceShare: number
  weights: { bassSmoothness: number; placementFit: number }
  meaningfulDifference: number
  note: string
  citations: readonly Citation[]
}

/**
 * The seating distances (GLOSSARY.md, issue #119, ADR 0005 amendment):
 * how far a seat must be from the speakers and the walls to be
 * recommended. They are a hard filter on the recommended seat's
 * candidates, not part of the seat score, so a seat right next to a
 * speaker can't win on bass.
 *
 * - **fromSpeaker** and **fromWall**: from the centre of the listener's
 *   head to every listener-level speaker and every subwoofer, and to the
 *   nearest side wall or the back wall. RP22's Level 1 minimum: "> 0.5 m"
 *   from the head to the nearest side wall, back wall or protruding
 *   speaker baffle (docs/research/seating-and-mlp.md section 3; read from
 *   an extract, confirm against RP22's table). Level 1 is RP22's lowest
 *   level; its higher levels ask for 0.8, 1.2 and 1.5 m. We measure to the
 *   speaker's position (its acoustic centre), not its baffle, and count
 *   subwoofers as speakers: our simplifications. The Seat row's head
 *   offset (0.35 m) also needs more than the 0.3 m wall clearance behind
 *   the MLP.
 * - **behindFrontStage**: how far the head must be behind the front-stage
 *   line (Left, Center and Right). **Ours**: no source we have gives a
 *   minimum distance from the front stage. 1.5 m is the distance Dolby
 *   calls ideal between listeners and Atmos enabled speakers (IG p.13),
 *   borrowed as a round, plausible number, not Dolby's rule for the front
 *   stage. The default room's 38% MLP is 1.78 m behind the line.
 */
export const SEATING_DISTANCE = {
  fromSpeaker: 0.5,
  fromWall: 0.5,
  behindFrontStage: 1.5,
  note:
    'fromSpeaker and fromWall are RP22 Level 1 (head > 0.5 m from the ' +
    'nearest side wall, back wall or protruding speaker baffle; from an ' +
    'extract). Measuring to the acoustic centre and counting subwoofers as ' +
    'speakers are ours. behindFrontStage is ours: no source gives a minimum ' +
    'distance from the front stage; 1.5 m borrows the number Dolby calls ' +
    "ideal for enabled speakers' distance from listeners (IG p.13), not a " +
    'Dolby rule for the front stage (docs/research/seating-and-mlp.md ' +
    'section 3; ADR 0005).',
  citations: [
    {
      source: 'RP22',
      note:
        'Level 1: head centre > 0.5 m from the nearest side wall, back wall ' +
        'or protruding speaker baffle (extract)',
    },
    {
      source: 'IG',
      page: 13,
      note:
        'enabled speakers at least 0.9 m, ideally 1.5 m from listeners; ' +
        'borrowed for behindFrontStage, which is ours',
    },
  ],
} as const satisfies {
  fromSpeaker: number
  fromWall: number
  behindFrontStage: number
  note: string
  citations: readonly Citation[]
}

/**
 * The Seat row (GLOSSARY.md): the couch or row of seats the MLP sits on,
 * a room object that is drawn but never part of the estimated response
 * (ADR 0006). Its width and depth are in the config; where it is follows
 * the MLP. The defaults, the limits and the head offset are product
 * choices, not cited values (docs/research/seating-and-mlp.md section 2):
 *
 * - **defaultWidth**: about a three-seat couch (retail 1.83-2.44 m).
 * - **widthLimits**: one seat to a long row; kept from v1.0.0.
 * - **defaultDepth**: inside the retail overall depth of 0.81-1.02 m.
 * - **depthLimits**: ours, to catch typos. The retail 0.81-1.02 m sits well
 *   inside; the minimum keeps the MLP on the couch (deeper than
 *   headOffset), the maximum leaves room for a chaise or a reclined seat.
 * - **headOffset**: how far the couch's back edge is behind the MLP.
 */
export const SEAT_ROW = {
  defaultWidth: 2,
  widthLimits: { min: 0.5, max: 8 },
  defaultDepth: 0.9,
  depthLimits: { min: 0.5, max: 2 },
  headOffset: 0.35,
  note:
    'Product choices for a room object, not cited values. headOffset is how ' +
    "far the couch's back edge is behind the MLP (the listener's head): our " +
    'estimate, UNVERIFIED, from couch back thickness (0.25–0.45 m) plus about ' +
    '0.1 m from the back of the head to the ears; no source gives it ' +
    '(docs/research/seating-and-mlp.md, section 2 and its table; range 0.3–0.5 m). ' +
    'The depth limits are ours; the retail overall depth (0.81–1.02 m, ' +
    'UNVERIFIED) sits inside them.',
} as const satisfies {
  defaultWidth: number
  widthLimits: { min: number; max: number }
  defaultDepth: number
  depthLimits: { min: number; max: number }
  headOffset: number
  note: string
}

/**
 * The Screen (GLOSSARY.md): a TV or projection screen on the front wall, a
 * room object that is drawn but never part of the estimated response
 * (ADR 0006). Its accepted sizes, and the screen a Room gets when one is
 * added.
 *
 * - **limits**: our product limits that catch typos, not cited values; no
 *   source gives a range of screen sizes (docs/research/screen-and-front-stage.md
 *   section 2.3 and gap 8). Each is also kept inside the Room: the screen
 *   fits on the front wall, between the floor and the ceiling.
 * - **standoff**: how far an acoustically transparent screen stands in
 *   front of the front wall, with the speakers behind it. The sources'
 *   gaps between speaker and screen run from about 1 in to 12 in
 *   (ELITE-AT, SV-AT, AVS-AT), which are product-specific; the limits and
 *   the default are ours. The default puts the screen about 0.1 m (SV-AT's
 *   4 in for a woven screen) in front of a cabinet about 0.3 m deep whose
 *   front stage sits FRONT_STAGE_WALL_DISTANCE (0.5 m) from the wall.
 * - **defaultTv**: a 65 in 16:9 TV (1.44 x 0.81 m), our pick from the
 *   55-85 in range of section 2.3, itself ours (market observation).
 * - **eyeLineFraction**: where seated eye height crosses the image,
 *   measured up from its bottom edge: the line between its bottom third and
 *   its top two-thirds (CEPRO-H, trade press by a screen manufacturer). The
 *   default bottom edge puts EAR_HEIGHT there: 0.93 m for the default TV,
 *   as in section 5 of the research note.
 */
export const SCREEN = {
  limits: {
    width: { min: 0.5, max: 8 },
    height: { min: 0.3, max: 4 },
    bottomEdge: { min: 0, max: 3 },
    standoff: { min: 0.05, max: 1.5 },
  },
  defaultTv: { width: 1.44, height: 0.81 },
  defaultStandoff: 0.75,
  eyeLineFraction: 1 / 3,
  note:
    'Limits, the default TV and the default standoff are ours, not cited ' +
    '(docs/research/screen-and-front-stage.md sections 2.3 and 5).',
  citations: [
    {
      source: 'CEPRO-H',
      note: 'seated eye level at the bottom third of the image (excerpt)',
    },
    {
      source: 'SV-AT',
      note: 'about 4 in (woven) to 12 in (microperf) behind an AT screen (excerpt)',
    },
    { source: 'ELITE-AT', note: 'about 1 in for its own materials (excerpt)' },
    { source: 'AVS-AT', note: 'community practice (excerpt)' },
  ],
} as const satisfies {
  limits: Record<
    'width' | 'height' | 'bottomEdge' | 'standoff',
    { min: number; max: number }
  >
  defaultTv: { width: number; height: number }
  defaultStandoff: number
  eyeLineFraction: number
  note: string
  citations: readonly Citation[]
}

/**
 * How auto-place fits the front stage (Left, Center and Right) to the
 * Screen (#58, ADR 0005 amendment). Dolby's azimuth ranges always win over
 * these: they only choose a point inside the ranges, and the Center's
 * height.
 *
 * - **edgeClearance**: how far outside a TV's or solid screen's edge
 *   (inside an acoustically transparent screen's edge) L and R stand, as
 *   seen from the MLP: from the image edge to the speaker's acoustic
 *   center, about half a 0.2-0.25 m wide cabinet plus a small gap, so the
 *   cabinet clears the image. The sources say "just outside" or "just
 *   inside" without a number (AF-LAYOUT; research section 3.1).
 * - **centerClearance**: how far below or above a TV's or solid screen's
 *   image the Center's acoustic center sits, as seen from the MLP: about
 *   half a 0.2 m tall center cabinet plus a small gap. ITU-R BS.775 and
 *   Dolby say "just above or below" without a number (research section 4).
 *   It is also how far the Center stays above the floor and below the
 *   ceiling.
 * - **behindScreenGap**: the gap between a speaker's acoustic center and
 *   an acoustically transparent screen in front of it. SV-AT measured
 *   about 4 in (0.1 m) for a woven screen; the sources run from 1 in to
 *   12 in and are product-specific (research section 5).
 */
export const SCREEN_FRONT_STAGE = {
  edgeClearance: 0.15,
  centerClearance: 0.15,
  behindScreenGap: 0.1,
  note:
    'All three distances are ours, not Dolby: Dolby relates no speaker to ' +
    'a screen edge. The sources give the rules (L/R just outside a screen, ' +
    'just inside an acoustically transparent one; C just above or below a ' +
    'solid screen, behind a transparent one) but no distances ' +
    '(docs/research/screen-and-front-stage.md sections 3-5; ADR 0005 ' +
    'amendment).',
  citations: [
    {
      source: 'AF-LAYOUT',
      note: 'L/R just inside the edges of an acoustically transparent screen (excerpt, practitioner)',
    },
    {
      source: 'ITU-775',
      note: 'C immediately above or below a picture that is not acoustically transparent (excerpt)',
    },
    { source: 'WEB101', note: 'C just above or below the TV' },
    {
      source: 'SV-AT',
      note: 'about 4 in (woven) behind an acoustically transparent screen (excerpt)',
    },
  ],
} as const satisfies {
  edgeClearance: number
  centerClearance: number
  behindScreenGap: number
  note: string
  citations: readonly Citation[]
}

/**
 * Furniture boxes (GLOSSARY.md): cabinets, tables, shelves and the like as
 * boxes on the floor plan, room objects that are drawn and warned about but
 * never part of the estimated response (ADR 0006). Everything here is our
 * product choice, not a cited value
 * (docs/research/room-openings-and-furniture.md section 4 gives no sizes):
 *
 * - **maxCount**: ADR 0006's limit, so the worst-case share link stays
 *   within the URL budget (the codec tests check it).
 * - **nameMaxLength** and the name's characters (furniture.ts): short
 *   names in Western European letters, which a share link carries cheaply;
 *   the worst-case link has eight of them.
 * - **limits**: catch typos, as the screen's do; each box also stays
 *   inside the Room.
 * - **presets**: the boxes the sidebar adds, typical sizes of a TV cabinet,
 *   a coffee table and a bookshelf.
 */
export const FURNITURE = {
  maxCount: 8,
  nameMaxLength: 12,
  limits: {
    width: { min: 0.1, max: 8 },
    depth: { min: 0.1, max: 8 },
    height: { min: 0.1, max: 5 },
  },
  presets: {
    cabinet: { name: 'Cabinet', width: 1.6, depth: 0.45, height: 0.5 },
    table: { name: 'Table', width: 1.2, depth: 0.6, height: 0.45 },
    shelf: { name: 'Shelf', width: 0.8, depth: 0.3, height: 1.8 },
  },
  note:
    'Product choices for a room object, not cited values (ADR 0006; ' +
    'docs/research/room-openings-and-furniture.md section 4).',
} as const satisfies {
  maxCount: number
  nameMaxLength: number
  limits: Record<'width' | 'depth' | 'height', { min: number; max: number }>
  presets: Record<
    string,
    { name: string; width: number; depth: number; height: number }
  >
  note: string
}

/**
 * Openings (GLOSSARY.md): doors and windows on the walls, room objects that
 * are drawn and warned about but never part of the estimated response
 * (ADR 0006). Everything here is our product choice, not a cited value
 * (docs/research/room-openings-and-furniture.md gives no sizes):
 *
 * - **maxCount**: ADR 0006's limit, so the worst-case share link stays
 *   within the URL budget (the codec tests check it).
 * - **doorHeight**: a door has only a width (ADR 0006); it is drawn, and
 *   checked for W5, this high (a typical interior door), or up to the
 *   ceiling in a lower room.
 * - **limits**: catch typos, as the furniture's do; each opening also
 *   stays on its wall, between the floor and the ceiling.
 * - **presets**: what "Add a door" and "Add a window" give: a typical
 *   interior door and a typical window.
 */
export const OPENINGS = {
  maxCount: 6,
  doorHeight: 2,
  limits: {
    width: { min: 0.3, max: 8 },
    sill: { min: 0, max: 4.5 },
    height: { min: 0.2, max: 5 },
  },
  presets: {
    door: { width: 0.9 },
    window: { width: 1.2, sill: 0.9, height: 1.2 },
  },
  note:
    'Product choices for a room object, not cited values (ADR 0006; ' +
    'docs/research/room-openings-and-furniture.md section 2).',
} as const satisfies {
  maxCount: number
  doorHeight: number
  limits: Record<'width' | 'sill' | 'height', { min: number; max: number }>
  presets: {
    door: { width: number }
    window: { width: number; sill: number; height: number }
  }
  note: string
}

/**
 * Where a placement warning's rule comes from (GLOSSARY.md, "Placement
 * warning"; CLAUDE.md principle 7): a standard, a manufacturer's own
 * documents, community practice (forums and blogs, labelled as such) or
 * our own assumption.
 */
export type SourceClass = 'standard' | 'manufacturer' | 'community' | 'ours'

/**
 * The placement warnings' rules, by their number in section 6 of
 * docs/research/room-openings-and-furniture.md (ADR 0006): where each
 * comes from, and the distances that are ours. Every source there was read
 * through search summaries only (UNVERIFIED against the full text).
 *
 * - **W1**: a speaker or subwoofer in front of a door, where the door
 *   swings. Not acoustic: the door has to open (ours). The swing zone is
 *   ours too: as wide as the door and as deep as it is wide (the leaf's
 *   reach), assuming it opens into the Room.
 * - **W2**: a listener-level speaker in front of a window: the glass
 *   reflects mids and treble and passes or absorbs bass unevenly, unlike
 *   the wall beside it. Community practice only (C-SN-WINDOW, C-GS-GLASS),
 *   labelled as such; no primary source. "In front of" (within the
 *   window's width, at its height and within 1 m of its wall) is ours.
 * - **W3**: a subwoofer in or near a doorway: bass may leak into the next
 *   room (community practice, C-AH-DOOR), and the estimated response
 *   assumes a closed, rigid wall there (the model's own assumption,
 *   KUTTRUFF ch. 3, ADR 0002). The 0.5 m is ours.
 * - **W5**: a door or window at one of a left/right pair's first side-wall
 *   reflection points but not at the mirror one: the main loudspeakers
 *   should be symmetrical about the listening axis (EBU-3276-S1), and so
 *   should reflective objects near them (GEN-1237A). The reflection point
 *   is the image-source one (speaker, wall, MLP's ears).
 * - **W4**: furniture between a speaker and the MLP blocks its direct
 *   sound (EBU-3276; GEN-8030A "do not place the monitors ... behind
 *   objects"). Subwoofers are exempt: EBU-3276 says obstacles matter little
 *   below 150 Hz. Checked from the speaker's acoustic centre to the MLP's
 *   ear point; that straight line is ours.
 * - **W6**: a speaker just above a cabinet or desk top, with the box
 *   between it and the MLP: the top reflects into the listening position
 *   (GEN-8430A, GEN-8030A). The 0.3 m is ours.
 * - **W7**: the MLP close to the back wall. The bass part (every
 *   length mode at full strength there; KUTTRUFF ch. 3) is already in the
 *   estimated response; the reflection right behind the head is community
 *   practice (C-OHM-REAR), which gives no number we use. The 0.6 m is ours.
 */
export const PLACEMENT_WARNINGS = {
  W1: {
    sourceClass: 'ours',
    note:
      'Not acoustic: the door has to open. The rule, and its swing zone ' +
      '(as deep as the door is wide, opening into the room), are our ' +
      'assumption.',
    citations: [],
  },
  W2: {
    sourceClass: 'community',
    meters: 1,
    note:
      'Common advice, not a rule: no standard or manufacturer source was ' +
      'found. Within 1 m of the window is our assumption.',
    citations: [
      {
        source: 'C-SN-WINDOW',
        note: 'glass behind the speakers reflects mids and treble, unlike a wall',
      },
      {
        source: 'C-GS-GLASS',
        note: 'glass reflects mids and highs and lets more bass through',
      },
    ],
  },
  W3: {
    sourceClass: 'community',
    meters: 0.5,
    note:
      'Bass leaking through a doorway is community practice; the estimated ' +
      "response assumes a closed wall there (the model's own " +
      'assumption), and the 0.5 m is our assumption.',
    citations: [
      {
        source: 'C-AH-DOOR',
        note: 'less bass, and poor results with a subwoofer near an opening',
      },
    ],
  },
  W4: {
    sourceClass: 'standard',
    note:
      'Subwoofers are exempt: obstacles matter little below 150 Hz. ' +
      'Read from search summaries of the sources only.',
    citations: [
      {
        source: 'EBU-3276',
        note: 'no obstacles in the direct sound; not so important below 150 Hz',
      },
      {
        source: 'GEN-8030A',
        note: 'do not place the monitors behind objects',
      },
    ],
  },
  W5: {
    sourceClass: 'standard',
    note:
      'Informational: it asks for matching sides, not for removing ' +
      'reflections. Read from search summaries of the sources only.',
    citations: [
      {
        source: 'EBU-3276-S1',
        note: 'main loudspeakers symmetrical about the listening axis',
      },
      {
        source: 'GEN-1237A',
        note: 'reflective objects near the monitors placed symmetrically',
      },
    ],
  },
  W6: {
    sourceClass: 'manufacturer',
    meters: 0.3,
    note:
      'Genelec warns about reflections off desks and cabinets; the 0.3 m ' +
      'is our assumption. Read from search summaries of the sources only.',
    citations: [
      { source: 'GEN-8430A', note: 'reflections off desks and cabinets' },
      { source: 'GEN-8030A', note: 'reflections off nearby surfaces' },
    ],
  },
  W7: {
    sourceClass: 'community',
    meters: 0.6,
    note:
      'The extra bass near the back wall is already in the estimated ' +
      'response; the reflection behind your head is community practice, ' +
      'and the 0.6 m is our assumption.',
    citations: [
      {
        source: 'C-OHM-REAR',
        note: 'a strong, early reflection from behind the seat',
      },
    ],
  },
} as const satisfies Record<
  string,
  {
    sourceClass: SourceClass
    meters?: number
    note: string
    citations: readonly Citation[]
  }
>

/** The target curve's tolerance band: ± this many dB around the target. */
export const TARGET_TOLERANCE = {
  db: 3,
  note:
    'Product choice from the v1 spec (issue #2, user story 41), not a ' +
    'cited standard.',
} as const satisfies { db: number; note: string }

/**
 * The house curve: a smooth bass shelf, level = boost / (1 + (f / corner)²)
 * dB, so close to +6 dB at the lowest frequencies and +3 dB at 100 Hz.
 */
export const HOUSE_CURVE = {
  boostDb: 6,
  cornerHz: 100,
  note:
    'Our assumption, not a published standard: shaped after the v1 spec ' +
    '(issue #2, user story 42, "bass boost below about 100 Hz"). Background ' +
    'only, not its source: a Harman study (AES-8994, abstract read via ' +
    'search summaries only) found listeners on average preferred more bass ' +
    'than flat, but no curve shape from it could be verified ' +
    '(docs/research/low-frequency-response.md section 3).',
} as const satisfies { boostDb: number; cornerHz: number; note: string }

/**
 * Reference level (GLOSSARY.md): the level each channel is calibrated to
 * at the MLP. Dolby's home calibration sets every full-range channel to
 * 79-82 dB SPL(C) at the MLP with pink noise at −20 dBFS RMS, "depending
 * on the room size" (IG p.15). A full-scale signal is 20 dB above that
 * test signal, so the reference peak, the loudest a channel is asked for,
 * is the reference level plus 20 dB. The app uses the top of Dolby's
 * range, 82 dB, so 102 dB reference peaks per channel: rooms that
 * calibrate lower need less. The cinema reference (85 dB at −20 dBFS, so
 * 105 dB peaks, FLORIAN-2000) is 3 dB louder still.
 *
 * The LFE channel is reproduced 10 dB above a full-range channel
 * (ATSC-A52), so the subwoofers are checked against 112 dB peaks.
 */
export const REFERENCE_LEVEL = {
  calibrationDb: 82,
  testSignalDbfs: -20,
  lfeGainDb: 10,
  note:
    'Calibration level and test signal from Dolby (IG p.15); the 20 dB ' +
    'from the test signal to full scale follows from dBFS. Taking the top ' +
    'of the 79-82 dB range is our choice, and bass redirected from the ' +
    "speakers is not added to the subwoofers' target " +
    '(docs/research/reference-level-headroom.md section 2).',
  citations: [
    {
      source: 'IG',
      page: 15,
      note: '79-82 dB SPL(C) per channel at −20 dBFS RMS pink noise',
    },
    {
      source: 'ATSC-A52',
      note: 'LFE reproduced +10 dB relative to the full-bandwidth channels',
    },
    {
      source: 'FLORIAN-2000',
      note: 'cinema reference: 85 dB at −20 dB, 105 dB peaks, 115 dB LFE',
    },
  ],
} as const satisfies {
  calibrationDb: number
  testSignalDbfs: number
  lfeGainDb: number
  note: string
  citations: readonly Citation[]
}

/**
 * How the headroom estimate treats distance and power. SPL = sensitivity +
 * 10·log10(P) − 20·log10(d) is the textbook free-field (inverse-square)
 * estimate. Nearer than `minDistance` the formula is not used (near
 * field), and the amplifier power is taken as continuous power into the
 * speaker's rated load. Room gain and reflections, which make a real room
 * louder than free field, and power compression, which makes it quieter,
 * are not modelled.
 */
export const HEADROOM_MODEL = {
  minDistance: 0.5,
  note:
    'Our modelling assumptions: free field, the 0.5 m near-field floor, ' +
    'and no room gain or power compression ' +
    '(docs/research/reference-level-headroom.md section 3).',
} as const satisfies { minDistance: number; note: string }

/**
 * When a headroom counts as enough, tight or short, in dB above the
 * reference peak level. 3 dB is a doubling of power: our margin for what
 * the free-field estimate leaves out.
 */
export const HEADROOM_STATUS = {
  enoughFromDb: 3,
  tightFromDb: 0,
  note: 'Our thresholds, not cited values.',
} as const satisfies { enoughFromDb: number; tightFromDb: number; note: string }

/**
 * A very rough 1 W / 1 m sensitivity for a subwoofer from its specs, as
 * the specs hold no sensitivity: 88 dB for a sealed 12 in driver, plus
 * 20·log10(diameter / 12 in) for the cone area (10·log10 of the area
 * ratio), plus 3 dB for a ported enclosure. Several subwoofers are added
 * as a power sum (+3 dB per doubling), the conservative case: in-phase
 * subwoofers close together can add up to 3 dB more at the lowest
 * frequencies. Each subwoofer is driven at its RMS power on purpose, the
 * conservative choice: the peak power is not used (yet).
 */
export const SUBWOOFER_SENSITIVITY = {
  referenceDiameterInches: 12,
  sealedDb: 88,
  portedGainDb: 3,
  note:
    'Entirely our modelling assumption, not a cited or measured value: ' +
    'no verifiable source relating driver size and enclosure to ' +
    'sensitivity was found (docs/research/reference-level-headroom.md ' +
    'section 4).',
} as const satisfies {
  referenceDiameterInches: number
  sealedDb: number
  portedGainDb: number
  note: string
}

/**
 * How a bookshelf or tower speaker is modelled. Both have their acoustic
 * center (the tweeter) at seated ear height, as Dolby asks for every
 * listener-level speaker (EAR_HEIGHT, IG p.6): a bookshelf on a stand, a
 * tower on the floor. What differs is the woofer, which is what radiates
 * in the boundary-interference range (below about 500 Hz): just below the
 * tweeter in a bookshelf, low in the cabinet in a tower.
 * `wooferBelowTweeter` is how far below the speaker's height its woofer
 * sits, kept at least `minWooferHeight` above the floor.
 */
export const SPEAKER_TYPE_GEOMETRY = {
  bookshelf: { wooferBelowTweeter: 0.15 },
  tower: { wooferBelowTweeter: 0.8 },
  minWooferHeight: 0.1,
  note:
    'Tweeter at ear height from Dolby (IG p.6); the woofer offsets ' +
    '(0.15 m bookshelf, 0.8 m tower, so a tower woofer at 0.4 m) and the ' +
    '0.1 m floor are our modelling assumptions for typical cabinets, not ' +
    'cited values (docs/research/reference-level-headroom.md section 5).',
  citations: [
    { source: 'IG', page: 6, note: 'listener-level speakers at 1.2 m' },
  ],
} as const satisfies Record<
  'bookshelf' | 'tower',
  { wooferBelowTweeter: number }
> & { minWooferHeight: number; note: string; citations: readonly Citation[] }
