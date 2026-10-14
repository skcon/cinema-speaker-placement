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
 * - **Placement-range fit**: auto speakers are placed around the seat as
 *   auto-place would; manual speakers stay where they are, and every
 *   speaker's angle is graded from the seat.
 *
 * Moving the MLP to a seat calibrates there, which changes every other
 * seat's score. So the recommended seat is one that stays best once the
 * MLP is there: the grid is scored with the calibration at the current
 * MLP, then again at that round's best seat, until the best seat stays
 * the same (or MAX_ROUNDS). "Move MLP here" then lands on a seat that is
 * still the recommended one.
 *
 * The subwoofers' room response is the analysis's own (the same
 * preparation, reused), and each seat is heard once (the costly modal
 * sum); a round only calibrates. The last recommendation is remembered,
 * so a config that changes only in ways the score doesn't depend on (the
 * units, the seat row) reuses it.
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
import { hearSpeaker, isCharted, prepareConfigResponse } from './listening'
import { MLP_ID } from './manual-positions'
import { checkPlacementRange, type PlacementGrade } from './placement-range'
import { placeAll } from './placements'
import { EAR_HEIGHT, SEAT_SCORE, SPEAKER_WALL_CLEARANCE } from './reference'
import { azimuthFromMlp, type RoomPoint } from './room'
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
  /** The listener-level speakers' mean grade from the seat, 0 to 1. */
  readonly placementRangeFit: number
}

/** The best seat of the grid, and how the current MLP compares. */
export type SeatRecommendation = {
  /** The best-scoring seat: the recommended MLP. */
  readonly recommended: ScoredSeat
  /** The current MLP, scored with the calibration at itself. */
  readonly current: ScoredSeat
  /** Whether the MLP already is (within a centimeter) at the recommended seat. */
  readonly mlpIsRecommended: boolean
  /** Every candidate seat of the grid, scored as the recommended one was. */
  readonly candidates: readonly ScoredSeat[]
}

/** Score one seat as the MLP of `config`, with the calibration at its MLP. */
export function scoreSeat(config: Config, seat: RoomPoint): ScoredSeat {
  const room = hearRoom(config)
  const mlp = room.hear(placeAll(config).mlp.position)
  return room.score(room.hear(seat), room.calibrateAt(mlp))
}

/**
 * The last recommendation and what it was made from. A memo of a pure
 * function: the same input always gives the same result.
 */
let lastRecommendation:
  { key: string; recommendation: SeatRecommendation } | undefined

/**
 * Score a grid of candidate seats across the Room, and recommend the best
 * (see above). Ties go to the MLP, then to the seat nearest the center
 * line, then nearest the front wall.
 */
export function recommendSeat(config: Config): SeatRecommendation {
  const key = scoreKey(config)
  if (lastRecommendation?.key !== key) {
    lastRecommendation = { key, recommendation: recommend(config) }
  }
  return lastRecommendation.recommendation
}

/** Everything the score depends on: not the units or the seat row. */
function scoreKey({
  room,
  layout,
  speakerGroups,
  targetCurve,
  crossoverHz,
  manualPositions,
}: Config): string {
  return JSON.stringify({
    room,
    layout,
    speakerGroups,
    targetCurve,
    crossoverHz,
    manualPositions,
  })
}

/** Scores this close count as equal. */
const SCORE_TIE = 1e-9

/** How far apart two seats may be and still be the same seat, in meters. */
const SAME_SEAT = 0.01

/**
 * How many times the grid is scored at most: with the calibration at the
 * current MLP, then at each round's best seat.
 */
const MAX_ROUNDS = 4

function recommend(config: Config): SeatRecommendation {
  const room = hearRoom(config)
  const mlp = room.hear(placeAll(config).mlp.position)
  const seats = candidateSeats(config).map(room.hear)
  const scoreRound = (calibratedAt: HeardSeat) => {
    const calibration = room.calibrateAt(calibratedAt)
    const candidates = seats.map((seat) => room.score(seat, calibration))
    const atCalibration = room.score(calibratedAt, calibration)
    // The seat calibrated at is first, so it wins ties.
    const best = candidates.reduce(
      (best, candidate, i) =>
        candidate.score > best.score.score + SCORE_TIE
          ? { score: candidate, seat: seats[i]! }
          : best,
      { score: atCalibration, seat: calibratedAt },
    )
    return { best, candidates, atCalibration }
  }

  const first = scoreRound(mlp)
  let round = first
  let calibratedAt = mlp
  for (
    let i = 1;
    i < MAX_ROUNDS &&
    !isSameSeat(round.best.seat.position, calibratedAt.position);
    i++
  ) {
    calibratedAt = round.best.seat
    round = scoreRound(calibratedAt)
  }
  const recommended = round.best.score
  return {
    recommended,
    current: first.atCalibration,
    mlpIsRecommended: isSameSeat(recommended.position, mlp.position),
    candidates: round.candidates,
  }
}

function isSameSeat(a: RoomPoint, b: RoomPoint): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < SAME_SEAT
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

/**
 * Points from `low` to `high`, both included, at most SEAT_SCORE's grid
 * spacing apart, but no more than its maximum per side.
 */
function evenlySpaced(low: number, high: number): number[] {
  const span = high - low
  const count = Math.min(
    SEAT_SCORE.maxPerSide,
    Math.ceil(span / SEAT_SCORE.gridSpacing - SCORE_TIE) + 1,
  )
  if (count < 2) return [(low + high) / 2]
  return Array.from({ length: count }, (_, i) => low + (span * i) / (count - 1))
}

/** A seat as heard, before any calibration. */
type HeardSeat = {
  readonly position: RoomPoint
  readonly parts: ResponseParts
  /** The listener-level speakers' grades from the seat. */
  readonly grades: readonly PlacementGrade[]
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
        ({ position }) =>
          hearSpeaker(config, position, seat, frequencies).levels,
      )
    return {
      position: seat,
      parts: responseParts(prepared, { receiver: seat, speakerLevels }),
      grades: speakers.map(
        ({ reference, position }) =>
          checkPlacementRange(reference, azimuthFromMlp(seat, position)).grade,
      ),
    }
  }

  function calibrateAt(seat: HeardSeat): ResponseCalibration {
    return calibrateParts(prepared, seat.parts, target)
  }

  function score(
    { position, parts, grades }: HeardSeat,
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
    const placementRangeFit =
      grades.length === 0
        ? 1
        : grades.reduce((sum, g) => sum + SEAT_SCORE.gradeValues[g], 0) /
          grades.length
    const { weights } = SEAT_SCORE
    return {
      position,
      score:
        weights.bassSmoothness * bassSmoothness +
        weights.placementRangeFit * placementRangeFit,
      responseDeviationDb,
      placementRangeFit,
    }
  }

  return { hear, calibrateAt, score }
}
