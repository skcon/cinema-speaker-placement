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
 * The best seat is recommended only when it beats the MLP by SEAT_SCORE's
 * meaningful difference; smaller differences are within the simplified
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

/** The best seat of the grid, and how the current MLP compares. */
export type SeatRecommendation = {
  /**
   * The recommended MLP: the best-scoring seat, or the current MLP when no
   * seat beats it by a meaningful difference.
   */
  readonly recommended: ScoredSeat
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
 * Score a grid of candidate seats across the Room, and recommend the best
 * (see above). Ties go to the MLP, then to the seat nearest the center
 * line, then nearest the front wall. Pure and not memoized: the caller
 * memoizes.
 */
export function recommendSeat(config: Config): SeatRecommendation {
  const { current, scoreAt } = scoringAtMlp(config)
  const candidates = candidateSeats(config).map(scoreAt)
  const best = candidates.reduce(
    (best, candidate) =>
      candidate.score > best.score + SCORE_TIE ? candidate : best,
    current,
  )
  // A seat only a little better than the MLP is no better within the
  // model's precision: the MLP stays the recommended seat.
  const recommended =
    best.score >= current.score + SEAT_SCORE.meaningfulDifference
      ? best
      : current
  return {
    recommended,
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
 * The setup both entry points share: the room heard, the calibration made
 * at the config's MLP, the MLP scored with it, and a way to score any
 * seat with the same calibration.
 */
function scoringAtMlp(config: Config): {
  current: ScoredSeat
  scoreAt: (seat: RoomPoint) => ScoredSeat
} {
  const room = hearRoom(config)
  const mlp = room.hear(placeAll(config).mlp.position)
  const calibration = room.calibrateAt(mlp)
  return {
    current: room.score(mlp, calibration),
    scoreAt: (seat) => room.score(room.hear(seat), calibration),
  }
}

/**
 * The candidate seats: a grid inside the MLP's wall clearance, ordered
 * nearest the center line first, then nearest the front wall (for the
 * tie-break).
 */
function candidateSeats({ room }: Config): RoomPoint[] {
  const clearance = SPEAKER_WALL_CLEARANCE.meters
  const halfWidth = room.width / 2 - clearance
  const across = evenlySpaced(-halfWidth, halfWidth).toSorted(
    (a, b) => Math.abs(a) - Math.abs(b),
  )
  const along = evenlySpaced(clearance, room.length - clearance)
  return across.flatMap((x) =>
    along.map((y) => ({ x, y, z: EAR_HEIGHT.meters })),
  )
}

/** Rounding error allowed when dividing lengths (a float's noise). */
const FLOAT_EPSILON = 1e-9

/**
 * Points from `low` to `high`, both included, at most SEAT_SCORE's grid
 * spacing apart, but no more than its maximum per side.
 */
function evenlySpaced(low: number, high: number): number[] {
  const span = high - low
  const count = Math.min(
    SEAT_SCORE.maxPerSide,
    // A span that is a whole number of spacings needs no extra point.
    Math.ceil(span / SEAT_SCORE.gridSpacing - FLOAT_EPSILON) + 1,
  )
  if (count < 2) return [(low + high) / 2]
  return Array.from({ length: count }, (_, i) => low + (span * i) / (count - 1))
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

  return { hear, calibrateAt, score }
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
