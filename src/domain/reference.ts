/**
 * Reference values with their sources, as cited in
 * docs/research/dolby-speaker-placement.md,
 * docs/research/multi-subwoofer-placement.md,
 * docs/research/low-frequency-response.md,
 * docs/research/crossover-enclosure-boundaries.md and
 * docs/research/reference-level-headroom.md.
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
 * The Seat row (GLOSSARY.md): a couch or row of seats drawn centered on
 * the MLP, a visual cue only. Its width is in the config; its depth is
 * fixed. The default (about a three-seat couch), the limits (one seat to
 * a long row) and the depth are product choices, not cited values.
 */
export const SEAT_ROW = {
  defaultWidth: 2,
  limits: { min: 0.5, max: 8 },
  depth: 0.9,
  note: 'Product choices for a visual cue, not cited values.',
} as const satisfies {
  defaultWidth: number
  limits: { min: number; max: number }
  depth: number
  note: string
}

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
