/**
 * The seat score and the recommended seat (GLOSSARY.md, issue #14): how
 * good a candidate MLP is, and the best one of a grid across the Room.
 *
 * Each candidate seat is scored as if the MLP were there (SEAT_SCORE in
 * reference.ts has the grid, the weights and the scales, all our
 * modelling assumptions):
 *
 * - **Bass smoothness**: the estimated response at the seat against the
 *   target curve, over the reliable rows, as an RMS deviation in dB. The
 *   calibration is a fixed one, made at the MLP (like a receiver
 *   calibrated there), so a seat where the bass is weaker or stronger
 *   than at the MLP counts, not only its shape.
 * - **Placement fit**: auto speakers are placed around the seat as
 *   auto-place would; manual speakers stay where they are. Every
 *   speaker's angle is graded from the seat against its placement range,
 *   and a speaker much nearer than the front speakers (a wall squeezes it
 *   against the seat) counts less, after Dolby's equidistance rule.
 *
 * The best seat on the room's center line is preferred (ADR 0005:
 * published practice puts the reference seat there and fixes the bass
 * with subwoofers, not by moving the seat). An off-center seat is
 * preferred only when it beats every center-line seat by more than
 * SEAT_SCORE's meaningful difference, and then the recommendation says
 * why: by how much, and the width mode the center line sits on when the
 * bass is part of it.
 *
 * The preferred seat is recommended only when it beats the MLP by the
 * meaningful difference too; smaller differences are within the simplified
 * model's precision, and the MLP stays the recommended seat. That also
 * keeps the recommendation where it is once the MLP moves there, though
 * moving the MLP recalibrates at the new seat and so changes every score.
 *
 * The subwoofers' room response is the analysis's own (the same
 * preparation, reused), so only the per-seat part (the costly modal sum
 * at the seat) is worked out per seat. Nothing is remembered here: the
 * caller memoizes (useSeatRecommendation). This is a domain entry point of
 * its own next to `analyzeRoom`, so it can run deferred (ADR 0004).
 */
import type { Config } from './config'
import {
  calibrateParts,
  partsDeviations,
  responseFrequencies,
  responseParts,
  type PreparedRoomResponse,
  type ResponseCalibration,
  type ResponseParts,
} from './estimated-response'
import {
  CHARTED_CHANNELS,
  hearSpeaker,
  isCharted,
  prepareConfigResponse,
} from './listening'
import type { ChannelId } from './dolby-layouts'
import { MLP_ID } from './manual-positions'
import { checkPlacementRange, type PlacementGrade } from './placement-range'
import { placeAll } from './placements'
import { EAR_HEIGHT, SEAT_SCORE, SPEAKER_WALL_CLEARANCE } from './reference'
import { azimuthFromMlp, distanceBetween, type RoomPoint } from './room'
import type { RoomMode } from './room-modes'
import { targetCurve, type TargetPoint } from './target-curve'

/** A candidate MLP and how good it is. */
export type ScoredSeat = {
  /** Where the seat is, at ear height. */
  readonly position: RoomPoint
  /** The seat score, 0 (worst) to 1 (best). */
  readonly score: number
  /**
   * The RMS deviation of the estimated response from the target over the
   * reliable rows, in dB, with the fixed calibration.
   */
  readonly responseDeviationDb: number
  /**
   * The listener-level speakers' mean placement fit from the seat, 0 to 1:
   * their placement-range grades, and how near they are to equidistant.
   */
  readonly placementFit: number
}

/**
 * A width mode the center line sits on: an odd one has a null there, an
 * even one is strongest there.
 */
export type CenterLineWidthMode = {
  /** An axial width mode the subwoofers excite. */
  readonly mode: RoomMode
  readonly atCenterLine: 'null' | 'strongest'
}

/**
 * Why the recommended seat is off the room's center line: it beats the
 * best center-line seat by more than SEAT_SCORE's meaningful difference.
 */
export type OffCenterLine = {
  /** The best center-line seat (the MLP, when it is on the line and best). */
  readonly centerLine: ScoredSeat
  /** How much more the recommended seat scores, on the 0 to 1 scale. */
  readonly margin: number
  /**
   * The width mode that most likely makes the bass smoother off the
   * center line, in the model: one the subwoofers excite, up to the
   * crossover and in the reliable rows, at whose frequency the recommended seat is nearest the target
   * compared with the center-line seat. Undefined when the bass is not
   * smoother off the center line, or no width mode is nearer there.
   */
  readonly widthMode: CenterLineWidthMode | undefined
}

/** The best seat of the grid, and how the current MLP compares. */
export type SeatRecommendation = {
  /**
   * The recommended MLP: the best center-line seat, or an off-center seat
   * that beats it by a meaningful difference (`offCenterLine` says why);
   * but the current MLP when that seat doesn't beat it meaningfully.
   */
  readonly recommended: ScoredSeat
  /**
   * Why the recommended seat is off the center line, when an off-center
   * seat beat the center line; undefined otherwise (an MLP kept where it
   * is, on the center line or not, has no such reason).
   */
  readonly offCenterLine: OffCenterLine | undefined
  /** The current MLP, scored the same way. */
  readonly current: ScoredSeat
  /** Whether the MLP already is (within a centimeter) at the recommended seat. */
  readonly mlpIsRecommended: boolean
  /**
   * Every candidate seat of the grid with its score, for a heatmap (#16).
   * The scores are relative: made with the calibration at the current MLP,
   * so they change when the MLP moves, and compare seats in this config
   * only.
   */
  readonly candidates: readonly ScoredSeat[]
}

/** Score one seat as the MLP of `config`, with the calibration at its MLP. */
export function scoreSeat(config: Config, seat: RoomPoint): ScoredSeat {
  return scoringAtMlp(config).scoreAt(seat)
}

/**
 * Score a grid of candidate seats across the Room, and recommend one (see
 * above). Ties go to the MLP, then to the seat nearest the center line,
 * then nearest the front wall. Pure and not memoized: the caller memoizes.
 */
export function recommendSeat(config: Config): SeatRecommendation {
  const { current, scoreAt, widthModeOffCenterLine } = scoringAtMlp(config)
  const candidates = candidateSeats(config).map(scoreAt)
  const best = bestSeat(current, candidates)
  // The MLP counts as a center-line seat when it is on the line.
  const centerLine = bestSeat(
    isOnCenterLine(current.position) ? current : undefined,
    candidates.filter(({ position }) => isOnCenterLine(position)),
  )
  // Off the center line only when meaningfully better than all of it.
  const preferred =
    centerLine &&
    best.score <= centerLine.score + SEAT_SCORE.meaningfulDifference
      ? centerLine
      : best
  // A seat only a little better than the MLP is no better within the
  // model's precision: the MLP stays the recommended seat.
  const recommended =
    preferred.score >= current.score + SEAT_SCORE.meaningfulDifference
      ? preferred
      : current
  const offCenter =
    recommended !== current && !isOnCenterLine(recommended.position)
  return {
    recommended,
    offCenterLine:
      offCenter && centerLine
        ? {
            centerLine,
            margin: recommended.score - centerLine.score,
            widthMode: widthModeOffCenterLine(centerLine, recommended),
          }
        : undefined,
    current,
    mlpIsRecommended:
      recommended === current ||
      distanceBetween(recommended.position, current.position) < SAME_SEAT,
    candidates,
  }
}

/** Scores this close count as equal. */
const SCORE_TIE = 1e-9

/** How far apart two seats may be and still be the same seat, in meters. */
const SAME_SEAT = 0.01

/**
 * The best-scoring of `seats`, starting from `first` (which may be none):
 * a seat must beat the best so far to replace it, so ties go to the
 * earlier seat.
 */
function bestSeat<T extends ScoredSeat | undefined>(
  first: T,
  seats: readonly ScoredSeat[],
): ScoredSeat | T {
  return seats.reduce<ScoredSeat | T>(
    (best, seat) =>
      best === undefined || seat.score > best.score + SCORE_TIE ? seat : best,
    first,
  )
}

/** Whether a seat is on the room's center line (x = 0), within SAME_SEAT. */
function isOnCenterLine({ x }: RoomPoint): boolean {
  return Math.abs(x) < SAME_SEAT
}

/**
 * The setup both entry points share: the room heard, the calibration made
 * at the config's MLP, the MLP scored with it, a way to score any seat
 * with the same calibration, and a way to find the width mode behind an
 * off-center seat's smoother bass.
 */
function scoringAtMlp(config: Config): {
  current: ScoredSeat
  scoreAt: (seat: RoomPoint) => ScoredSeat
  widthModeOffCenterLine: (
    centerLine: ScoredSeat,
    offCenter: ScoredSeat,
  ) => CenterLineWidthMode | undefined
} {
  const room = hearRoom(config)
  const mlp = room.hear(placeAll(config).mlp.position)
  const calibration = room.calibrateAt(mlp)
  return {
    current: room.score(mlp, calibration),
    scoreAt: (seat) => room.score(room.hear(seat), calibration),
    widthModeOffCenterLine: (centerLine, offCenter) =>
      room.widthModeBetween(centerLine, offCenter, calibration),
  }
}

/**
 * The candidate seats: a grid inside the MLP's wall clearance, with a
 * column on the center line, ordered nearest the center line first, then
 * nearest the front wall (for the tie-break).
 */
function candidateSeats({ room }: Config): RoomPoint[] {
  const clearance = SPEAKER_WALL_CLEARANCE.meters
  const across = acrossFromCenterLine(room.width / 2 - clearance)
  const along = evenlySpaced(clearance, room.length - clearance)
  return across.flatMap((x) =>
    along.map((y) => ({ x, y, z: EAR_HEIGHT.meters })),
  )
}

/** Rounding error allowed when dividing lengths (a float's noise). */
const FLOAT_EPSILON = 1e-9

/**
 * How many points SEAT_SCORE's grid spacing needs across `span`, both
 * ends included, but no more than its maximum per side.
 */
function spacedCount(span: number): number {
  return Math.min(
    SEAT_SCORE.maxPerSide,
    // A span that is a whole number of spacings needs no extra point.
    Math.ceil(span / SEAT_SCORE.gridSpacing - FLOAT_EPSILON) + 1,
  )
}

/**
 * Points from `low` to `high`, both included, at most SEAT_SCORE's grid
 * spacing apart, but no more than its maximum per side.
 */
function evenlySpaced(low: number, high: number): number[] {
  const span = high - low
  const count = spacedCount(span)
  if (count < 2) return [(low + high) / 2]
  return Array.from({ length: count }, (_, i) => low + (span * i) / (count - 1))
}

/**
 * Points across the room from `-halfWidth` to `halfWidth` as
 * `evenlySpaced` would place them, but always an odd number, so one is
 * exactly on the center line (x = 0) and the rest are exact mirror
 * images; nearest the center line first. SEAT_SCORE's maximum per side
 * is odd, so the extra point never goes past it.
 */
function acrossFromCenterLine(halfWidth: number): number[] {
  const spaced = spacedCount(2 * halfWidth)
  const count = spaced % 2 === 0 ? spaced + 1 : spaced
  const step = count > 1 ? (2 * halfWidth) / (count - 1) : 0
  // 0, then -1, 1, -2, 2, ... steps.
  return Array.from(
    { length: count },
    (_, i) => (i % 2 === 1 ? -1 : 1) * Math.ceil(i / 2) * step,
  )
}

/** A seat as heard, before any calibration. */
type HeardSeat = {
  readonly position: RoomPoint
  readonly parts: ResponseParts
  /** The listener-level speakers' placement fit from the seat, 0 to 1. */
  readonly placementFit: number
}

/**
 * The config's room response, ready to hear seats in, calibrate at one
 * and score them.
 */
function hearRoom(config: Config) {
  const frequencies = responseFrequencies()
  const prepared: PreparedRoomResponse = prepareConfigResponse(
    config,
    placeAll(config),
    frequencies,
  )
  const target: readonly TargetPoint[] = targetCurve(
    config.targetCurve,
    frequencies,
  )
  const isReliable = frequencies.map(
    (f) => prepared.reliableFrom === undefined || f >= prepared.reliableFrom,
  )

  /**
   * The seat as the MLP: auto speakers placed around it, manual ones
   * where they are, each graded from the seat.
   */
  function hear(seat: RoomPoint): HeardSeat {
    const { speakers } = placeAll({
      ...config,
      manualPositions: { ...config.manualPositions, [MLP_ID]: seat },
    })
    const speakerLevels = speakers
      .filter(({ reference }) => isCharted(reference.channel))
      .map(
        ({ reference, position }) =>
          hearSpeaker(
            config,
            { channel: reference.channel, position },
            seat,
            frequencies,
          ).levels,
      )
    return {
      position: seat,
      parts: responseParts(prepared, { receiver: seat, speakerLevels }),
      placementFit: placementFit(
        seat,
        speakers.map(({ reference, position }): GradedSpeaker => ({
          channel: reference.channel,
          position,
          grade: checkPlacementRange(reference, azimuthFromMlp(seat, position))
            .grade,
        })),
      ),
    }
  }

  function calibrateAt(seat: HeardSeat): ResponseCalibration {
    return calibrateParts(prepared, seat.parts, target)
  }

  function score(
    { position, parts, placementFit }: HeardSeat,
    calibration: ResponseCalibration,
  ): ScoredSeat {
    const reliable = partsDeviations(
      prepared,
      parts,
      target,
      calibration,
    ).filter((_, i) => isReliable[i])
    const responseDeviationDb = Math.sqrt(
      reliable.reduce((sum, d) => sum + d * d, 0) / reliable.length,
    )
    const bassSmoothness = Number.isFinite(responseDeviationDb)
      ? Math.max(0, 1 - responseDeviationDb / SEAT_SCORE.deviationAtZeroDb)
      : 0
    const { weights } = SEAT_SCORE
    return {
      position,
      score:
        weights.bassSmoothness * bassSmoothness +
        weights.placementFit * placementFit,
      responseDeviationDb,
      placementFit,
    }
  }

  /**
   * The width mode that most likely makes the bass smoother at
   * `offCenter` than at `centerLine` (OffCenterLine.widthMode): of the
   * axial width modes the subwoofers excite up to the crossover, at a
   * reliable row of the modal sum, the one at whose frequency `offCenter`
   * comes nearest the target compared with `centerLine`.
   */
  function widthModeBetween(
    centerLine: ScoredSeat,
    offCenter: ScoredSeat,
    calibration: ResponseCalibration,
  ): CenterLineWidthMode | undefined {
    if (!(offCenter.responseDeviationDb < centerLine.responseDeviationDb)) {
      return undefined
    }
    const deviationsAt = ({ position }: ScoredSeat) =>
      partsDeviations(prepared, hear(position).parts, target, calibration)
    const onLine = deviationsAt(centerLine)
    const offLine = deviationsAt(offCenter)
    const modalRows = frequencies.slice(0, prepared.modalFrequencyCount)
    const { modes, excited } = prepared.modal
    const nearer = modes.flatMap((mode, n) => {
      if (
        mode.kind !== 'axial' ||
        mode.indices.width === 0 ||
        !excited[n] ||
        // Above the crossover the subwoofers hardly play.
        mode.frequency > config.crossoverHz
      ) {
        return []
      }
      const row = nearestRow(modalRows, mode.frequency)
      if (row === undefined || !isReliable[row]) return []
      const by = Math.abs(onLine[row]!) - Math.abs(offLine[row]!)
      return by > 0 ? [{ mode, by }] : []
    })
    const most = nearer.reduce<(typeof nearer)[number] | undefined>(
      (most, entry) =>
        most === undefined || entry.by > most.by ? entry : most,
      undefined,
    )
    return (
      most && {
        mode: most.mode,
        atCenterLine: most.mode.indices.width % 2 === 1 ? 'null' : 'strongest',
      }
    )
  }

  return { hear, calibrateAt, score, widthModeBetween }
}

/**
 * The index of the row nearest `frequency` (on a log scale), or undefined
 * when it lies outside the rows.
 */
function nearestRow(
  rows: readonly number[],
  frequency: number,
): number | undefined {
  const first = rows[0]
  const last = rows.at(-1)
  if (first === undefined || last === undefined) return undefined
  if (frequency < first || frequency > last) return undefined
  const distance = (i: number) => Math.abs(Math.log(rows[i]! / frequency))
  return rows.reduce(
    (nearest, _, i) => (distance(i) < distance(nearest) ? i : nearest),
    0,
  )
}

/** A listener-level speaker, where it is and its grade from a seat. */
type GradedSpeaker = {
  readonly channel: ChannelId
  readonly position: RoomPoint
  readonly grade: PlacementGrade
}

/**
 * The speakers' mean placement fit from `seat` (SEAT_SCORE): each one's
 * grade value times its equidistance against the farthest front speaker
 * (CHARTED_CHANNELS: Left, Center and Right set Dolby's reference
 * distance, IG p.6).
 */
function placementFit(
  seat: RoomPoint,
  speakers: readonly GradedSpeaker[],
): number {
  if (speakers.length === 0) return 1
  const distanceOf = ({ position }: GradedSpeaker) =>
    distanceBetween(position, seat)
  const reference = Math.max(
    0,
    ...speakers
      .filter(({ channel }) => CHARTED_CHANNELS.some((c) => c === channel))
      .map(distanceOf),
  )
  const counted = SEAT_SCORE.equidistanceShare * reference
  return (
    speakers.reduce((sum, speaker) => {
      const equidistance =
        counted > 0 ? Math.min(1, distanceOf(speaker) / counted) : 1
      return sum + SEAT_SCORE.gradeValues[speaker.grade] * equidistance
    }, 0) / speakers.length
  )
}
