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
 *   calibration is a fixed one, made at the reference seat: the "38%
 *   rule" seed (defaultMlp, mlp.ts), wherever the MLP is (like a receiver
 *   calibrated there), so a seat where the bass is weaker or stronger
 *   than there counts, not only its shape, and moving the MLP changes no
 *   seat's score (#120, ADR 0004 amendment).
 * - **Placement fit**: the listener-level speakers installed for the
 *   seat's projection onto the center line and heard at the seat
 *   (placeSpeakers with centerLineProjection, placements.ts): installed
 *   symmetric to the room, as in a real install, while the listener moves
 *   along the couch (ADR 0005, amendment). Every speaker's angle is graded
 *   from the seat against its placement range, and a speaker much nearer
 *   than the front speakers (a wall squeezes it against the seat) counts
 *   less, after Dolby's equidistance rule.
 *
 * The recommended seat belongs to the room, the layout and the
 * subwoofers, not to where the MLP and the speakers are now: the grid is
 * scored with the MLP and every speaker auto (recommendationInputs), so
 * moving the MLP or a speaker by hand never moves it (#120). Only manual
 * subwoofers stay where they are, as the bass comes from them. The
 * current MLP is scored separately (compareMlp) with every item where it
 * is, manual ones included, and compared with the recommended seat.
 *
 * Only seats that keep the seating distances (SEATING_DISTANCE in
 * reference.ts, issue #119, ADR 0005 amendment) can be recommended: far
 * enough from every listener-level speaker installed for the seat, every
 * subwoofer and the side and back walls, and far enough behind the
 * front-stage line. That is a hard filter, not a weight: with the auto
 * speakers installed for every seat, a seat right behind a tiny front
 * stage still has ideal angles, and bass alone could win it the
 * recommendation. When no seat of the
 * grid keeps them (a very small room), the seats that come nearest do.
 *
 * The best seat on the room's center line is preferred (ADR 0005:
 * published practice puts the reference seat there and fixes the bass
 * with subwoofers, not by moving the seat). An off-center seat is
 * preferred only when it beats every center-line seat by more than
 * SEAT_SCORE's meaningful difference, and then the recommendation says
 * why: by how much, and the width mode the center line sits on when the
 * bass is part of it.
 *
 * The preferred seat is recommended only when it beats the reference
 * seat by the meaningful difference too; smaller differences are within
 * the simplified model's precision, and the reference seat, where the
 * first visit and the calibration start, stays the recommended seat.
 * Whether the current MLP is within the meaningful difference of the
 * recommended seat is a separate comparison (compareMlp), never part of
 * choosing it.
 *
 * The seats are heard in the analysis's own heard room
 * (estimated-response.ts: the same target curve, reliable rows and
 * preparation, reused), so only the per-seat part (the costly modal sum
 * at the seat) is worked out per seat. Nothing is remembered here: the
 * caller memoizes (useSeatRecommendation), the grid (findRecommendedSeat)
 * on everything but the MLP and the manual speakers, and the cheap
 * comparison of the MLP on every change. This is a domain entry point of
 * its own next to `analyzeRoom`, so it can run deferred (ADR 0004).
 */
import type { Config } from './config'
import {
  hearRoom,
  type HeardSeat,
  type ResponseCalibration,
} from './estimated-response'
import type { ChannelId } from './dolby-layouts'
import { hearSpeaker, isCharted } from './listening'
import { entries, kindOf } from './manual-positions'
import { defaultMlp } from './mlp'
import { FRONT_STAGE_CHANNELS, frontStageLine } from './placement'
import {
  centerLineProjection,
  placeAll,
  placeSpeakers,
  type InstalledSpeaker,
  type Placements,
} from './placements'
import {
  EAR_HEIGHT,
  SEAT_SCORE,
  SEATING_DISTANCE,
  SPEAKER_WALL_CLEARANCE,
} from './reference'
import { distanceBetween, type Room, type RoomPoint } from './room'
import type { RoomMode } from './room-modes'
import type { SubwooferId } from './subwoofer-arrangements'

/** A speaker or subwoofer where it is, and how far it is from a seat. */
export type ItemFromSeat<Id extends string> = {
  readonly id: Id
  readonly position: RoomPoint
  /** From the seat (the listener's head), in meters. */
  readonly distance: number
}

/**
 * Where the speakers are from a seat, as installed for it (the stage the
 * seat score hears there), and whether the seat keeps the seating
 * distances (SEATING_DISTANCE).
 */
export type SeatDistances = {
  /**
   * The listener-level speakers in Dolby's channel order: auto ones
   * installed for the seat's projection onto the center line, manual ones
   * where they are.
   */
  readonly speakers: readonly ItemFromSeat<ChannelId>[]
  /** The subwoofers, Subwoofer 1 first, where the config has them. */
  readonly subwoofers: readonly ItemFromSeat<SubwooferId>[]
  /** From Left to Right as installed, in meters. */
  readonly leftRightSpread: number
  /**
   * How far the seat is behind the front-stage line, in meters (negative
   * in front of it). The line is where auto-place puts the front stage
   * (frontStageLine), or the farthest back of Left, Center and Right as
   * installed, whichever is farther from the front wall.
   */
  readonly behindFrontStage: number
  /** From the nearest side wall or the back wall, in meters. */
  readonly fromWall: number
  /**
   * How far the seat falls short of the seating distances, in meters: the
   * largest shortfall of the nearest speaker or subwoofer, the nearest
   * side or back wall, and the distance behind the front-stage line. 0
   * when it keeps them all.
   */
  readonly shortfall: number
}

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
  /** Where the speakers installed for the seat are from it. */
  readonly distances: SeatDistances
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
  /**
   * The best center-line seat (the reference seat, when it keeps the
   * seating distances and is best).
   */
  readonly centerLine: ScoredSeat
  /** How much more the recommended seat scores, on the 0 to 1 scale. */
  readonly margin: number
  /**
   * The width mode that most likely makes the bass smoother off the
   * center line, in the model: one the subwoofers excite, up to the
   * crossover and in the reliable rows, at whose frequency the recommended
   * seat is nearest the target compared with the center-line seat.
   * Undefined when the bass is not smoother off the center line, or no
   * width mode is nearer the target there.
   */
  readonly widthMode: CenterLineWidthMode | undefined
}

/**
 * The best seat of the grid, with the MLP and every speaker auto
 * (recommendationInputs): the same wherever the MLP and the manual
 * speakers are (#120).
 */
export type RecommendedSeat = {
  /**
   * The recommended MLP: the best center-line seat, or an off-center seat
   * that beats it by a meaningful difference (`offCenterLine` says why);
   * but the reference seat (the "38% rule" seed) when that seat doesn't
   * beat it meaningfully.
   */
  readonly recommended: ScoredSeat
  /**
   * Why the recommended seat is off the center line, when an off-center
   * seat beat the center line; undefined otherwise.
   */
  readonly offCenterLine: OffCenterLine | undefined
  /**
   * Every candidate seat of the grid that keeps the seating distances
   * (or, when none does, every one that comes nearest), with its score,
   * for a heatmap (#16). The scores are relative: made with the
   * calibration at the reference seat, they compare seats in this room
   * and layout only.
   */
  readonly candidates: readonly ScoredSeat[]
}

/**
 * How the current MLP compares with the recommended seat: scored where it
 * is, with the speakers and subwoofers where they are, manual ones
 * included, so it changes as they move while the recommended seat
 * doesn't.
 */
export type MlpComparison = {
  /** The current MLP, scored with the items where they are. */
  readonly current: ScoredSeat
  /** Whether the MLP already is (within a centimeter) at the recommended seat. */
  readonly mlpIsRecommended: boolean
  /**
   * Whether the MLP keeps the seating distances as well as the candidates
   * do (SEATING_DISTANCE).
   */
  readonly mlpKeepsSeatingDistances: boolean
  /**
   * Whether the MLP keeps the seating distances and scores no more than
   * SEAT_SCORE's meaningful difference below the recommended seat: as
   * good a seat within the simplified model's precision. It never moves
   * the recommended seat.
   */
  readonly mlpWithinMeaningfulDifference: boolean
}

/** The best seat of the grid, and how the current MLP compares. */
export type SeatRecommendation = RecommendedSeat & MlpComparison

/**
 * Score one seat as the MLP of `config`, with the items where `config`
 * has them and the calibration at the reference seat (the "38% rule"
 * seed), so the config's own MLP changes nothing.
 */
export function scoreSeat(config: Config, seat: RoomPoint): ScoredSeat {
  const { install, scoreInstalled } = scoringFor(config)
  return scoreInstalled(install(seat))
}

/**
 * The recommended seat (findRecommendedSeat) and how the current MLP
 * compares with it (compareMlp), worked out together. Pure and not
 * memoized: the caller memoizes.
 */
export function recommendSeat(config: Config): SeatRecommendation {
  const seat = findRecommendedSeat(config)
  return { ...seat, ...compareMlp(config, seat) }
}

/**
 * Score a grid of candidate seats across the Room, with the MLP and every
 * speaker auto (recommendationInputs), and recommend one (see above).
 * Ties go to the reference seat, then to the seat nearest the center
 * line, then nearest the front wall. Reads neither the MLP nor the manual
 * speakers, only manual subwoofers. Pure and not memoized: the
 * caller memoizes.
 */
export function findRecommendedSeat(config: Config): RecommendedSeat {
  const auto = recommendationInputs(config)
  const { reference, install, scoreInstalled, widthModeOffCenterLine } =
    scoringFor(auto)
  const installed = candidateSeats(auto).map(install)
  // Only the seats that keep the seating distances, or come nearest.
  const allowedShortfall =
    Math.min(...installed.map(({ distances }) => distances.shortfall)) +
    SHORTFALL_TIE
  const candidates = installed
    .filter(({ distances }) => distances.shortfall <= allowedShortfall)
    .map(scoreInstalled)
  // The reference seat competes only when it keeps the distances as well
  // as they do.
  const seed =
    reference.distances.shortfall <= allowedShortfall ? reference : undefined
  // At least one candidate always keeps the allowed shortfall.
  const best = bestSeat(seed, candidates)!
  // The reference seat is on the center line.
  const centerLine = bestSeat(
    seed,
    candidates.filter(({ position }) => isOnCenterLine(position)),
  )
  // Off the center line only when meaningfully better than all of it.
  const preferred =
    centerLine &&
    best.score <= centerLine.score + SEAT_SCORE.meaningfulDifference
      ? centerLine
      : best
  // A seat only a little better than the reference seat is no better
  // within the model's precision: the reference seat stays recommended.
  const recommended =
    seed === undefined ||
    preferred.score >= seed.score + SEAT_SCORE.meaningfulDifference
      ? preferred
      : seed
  return {
    recommended,
    offCenterLine:
      !isOnCenterLine(recommended.position) && centerLine
        ? {
            centerLine,
            margin: recommended.score - centerLine.score,
            widthMode: widthModeOffCenterLine(centerLine, recommended),
          }
        : undefined,
    candidates,
  }
}

/**
 * The current MLP of `config` scored where it is, with the items where
 * they are (scoreSeat), and compared with `seat`, the recommended seat
 * found for the same room and layout (findRecommendedSeat). Cheap: one
 * seat, not the grid.
 */
export function compareMlp(
  config: Config,
  { recommended, candidates }: RecommendedSeat,
): MlpComparison {
  const current = scoreSeat(config, placeAll(config).mlp.position)
  // The candidates are the seats that keep the distances, or come nearest.
  const allowedShortfall =
    Math.min(...candidates.map(({ distances }) => distances.shortfall)) +
    SHORTFALL_TIE
  const mlpKeepsSeatingDistances =
    current.distances.shortfall <= allowedShortfall
  return {
    current,
    mlpIsRecommended:
      distanceBetween(recommended.position, current.position) < SAME_SEAT,
    mlpKeepsSeatingDistances,
    mlpWithinMeaningfulDifference:
      mlpKeepsSeatingDistances &&
      current.score >
        recommended.score - SEAT_SCORE.meaningfulDifference - SCORE_TIE,
  }
}

/**
 * The config as the recommended seat reads it (findRecommendedSeat): the
 * MLP and every listener-level and overhead speaker back to auto, so
 * neither moving the MLP nor moving a speaker changes the recommendation
 * (#120); manual subwoofers stay where they are, as the bass at every seat
 * comes from them and they don't depend on the MLP. The caller's memo key
 * (seatScoreKey) is made from this too, so the two can't drift apart.
 */
export function recommendationInputs(config: Config): Config {
  return {
    ...config,
    manualPositions: Object.fromEntries(
      entries(config.manualPositions).filter(
        ([id]) => kindOf(id) === 'subwoofer',
      ),
    ),
  }
}

/** Scores this close count as equal. */
const SCORE_TIE = 1e-9

/** Shortfalls this close, in meters, count as equal. */
const SHORTFALL_TIE = 1e-9

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
 * The setup the entry points share: the room heard, the calibration made
 * at the reference seat (the "38% rule" seed, defaultMlp: never the
 * config's MLP), the reference seat scored with it, a way to install the
 * speakers for any seat (cheap: enough for the seating distances), a way
 * to score an installed seat with the same calibration (the costly modal
 * sum), and a way to find the width mode behind an off-center seat's
 * smoother bass.
 */
function scoringFor(config: Config): {
  reference: ScoredSeat
  install: (seat: RoomPoint) => InstalledSeat
  scoreInstalled: (seat: InstalledSeat) => ScoredSeat
  widthModeOffCenterLine: (
    centerLine: ScoredSeat,
    offCenter: ScoredSeat,
  ) => CenterLineWidthMode | undefined
} {
  const seats = seatScoring(config, placeAll(config))
  const seed = seats.hear(seats.install(defaultMlp(config.room)))
  const calibration = seats.calibrateAt(seed)
  return {
    reference: seats.score(seed, calibration),
    install: seats.install,
    scoreInstalled: (seat) => seats.score(seats.hear(seat), calibration),
    widthModeOffCenterLine: (centerLine, offCenter) =>
      seats.widthModeBetween(centerLine, offCenter, calibration),
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

/** A candidate seat with the listener-level speakers installed for it. */
type InstalledSeat = {
  readonly position: RoomPoint
  readonly speakers: readonly InstalledSpeaker[]
  readonly distances: SeatDistances
}

/** A candidate seat as heard, before any calibration. */
type HeardCandidate = {
  readonly position: RoomPoint
  readonly heard: HeardSeat
  /** The listener-level speakers' placement fit from the seat, 0 to 1. */
  readonly placementFit: number
  readonly distances: SeatDistances
}

/**
 * The config's heard room, with its subwoofers where `placements` has
 * them, ready to hear seats in, calibrate at one and score them.
 */
function seatScoring(
  config: Config,
  placements: Pick<Placements, 'subwoofers'>,
) {
  const room = hearRoom(config, placements)
  const { frequencies, reliable } = room

  const stageLine = frontStageLine(config.roomObjects.screen)

  /**
   * The seat as the MLP: the listener-level speakers installed for it,
   * auto ones placed and manual ones where they are, each graded from the
   * seat, and the seat's distances from them and the subwoofers.
   */
  function install(seat: RoomPoint): InstalledSeat {
    // Auto speakers are installed symmetric to the room: around the seat's
    // projection onto the center line, not around the seat (ADR 0005,
    // amendment), so an off-center seat hears them at its skewed angles.
    const speakers = placeSpeakers(config, {
      installedFor: centerLineProjection(seat),
      heardAt: seat,
    })
    return {
      position: seat,
      speakers,
      distances: seatDistances(seat, {
        room: config.room,
        speakers,
        subwoofers: placements.subwoofers,
        stageLine,
      }),
    }
  }

  /** The installed seat heard: the costly modal sum at the seat. */
  function hear({
    position: seat,
    speakers,
    distances,
  }: InstalledSeat): HeardCandidate {
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
      heard: room.hear({ receiver: seat, speakerLevels }),
      placementFit: placementFit(seat, speakers),
      distances,
    }
  }

  function calibrateAt({ heard }: HeardCandidate): ResponseCalibration {
    return room.calibrateAt(heard)
  }

  function score(
    { position, heard, placementFit, distances }: HeardCandidate,
    calibration: ResponseCalibration,
  ): ScoredSeat {
    const reliableDeviations = room
      .deviationsAt(heard, calibration)
      .filter((_, i) => reliable[i])
    const responseDeviationDb = Math.sqrt(
      reliableDeviations.reduce((sum, d) => sum + d * d, 0) /
        reliableDeviations.length,
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
      distances,
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
      room.deviationsAt(hear(install(position)).heard, calibration)
    const onLine = deviationsAt(centerLine)
    const offLine = deviationsAt(offCenter)
    const nearer = room.modes.flatMap(({ mode, excited }) => {
      if (
        mode.kind !== 'axial' ||
        mode.indices.width === 0 ||
        !excited ||
        // Above the crossover the subwoofers hardly play.
        mode.frequency > config.crossoverHz
      ) {
        return []
      }
      const row = room.modeBandRowNearest(mode.frequency)
      if (row === undefined || !reliable[row]) return []
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

  return { install, hear, calibrateAt, score, widthModeBetween }
}

/** What a seat's distances are measured to (seatDistances). */
type SeatSurroundings = {
  readonly room: Room
  /** The listener-level speakers installed for the seat. */
  readonly speakers: readonly InstalledSpeaker[]
  readonly subwoofers: Placements['subwoofers']
  /** The auto front stage's distance from the front wall (frontStageLine). */
  readonly stageLine: number
}

/**
 * Where the installed speakers, the subwoofers and the walls are from
 * `seat`, and how far it falls short of the seating distances
 * (SeatDistances, SEATING_DISTANCE).
 */
function seatDistances(
  seat: RoomPoint,
  { room, speakers, subwoofers, stageLine }: SeatSurroundings,
): SeatDistances {
  const fromSeat = <Id extends string>(
    id: Id,
    position: RoomPoint,
  ): ItemFromSeat<Id> => ({
    id,
    position,
    distance: distanceBetween(position, seat),
  })
  const speakersFromSeat = speakers.map(({ reference, position }) =>
    fromSeat(reference.channel, position),
  )
  const subwoofersFromSeat = subwoofers.map(({ id, position }) =>
    fromSeat(id, position),
  )
  const at = (channel: ChannelId) =>
    speakers.find(({ reference }) => reference.channel === channel)?.position
  const left = at('L')
  const right = at('R')
  const frontStage = Math.max(
    stageLine,
    ...speakers
      .filter(({ reference }) => FRONT_STAGE_CHANNELS.has(reference.channel))
      .map(({ position }) => position.y),
  )
  const behindFrontStage = seat.y - frontStage
  // The front wall is behind the front stage, so it is never the nearest.
  const fromWall = Math.min(
    room.width / 2 - Math.abs(seat.x),
    room.length - seat.y,
  )
  const nearest = Math.min(
    ...[...speakersFromSeat, ...subwoofersFromSeat].map(
      ({ distance }) => distance,
    ),
  )
  return {
    speakers: speakersFromSeat,
    subwoofers: subwoofersFromSeat,
    leftRightSpread: left && right ? distanceBetween(left, right) : 0,
    behindFrontStage,
    fromWall,
    shortfall: Math.max(
      0,
      SEATING_DISTANCE.fromSpeaker - nearest,
      SEATING_DISTANCE.fromWall - fromWall,
      SEATING_DISTANCE.behindFrontStage - behindFrontStage,
    ),
  }
}

/**
 * The speakers' mean placement fit from `seat`, where they are heard
 * (SEAT_SCORE): each one's grade value times its equidistance against the
 * farthest front speaker (CHARTED_CHANNELS: Left, Center and Right set
 * Dolby's reference distance, IG p.6).
 */
function placementFit(
  seat: RoomPoint,
  speakers: readonly InstalledSpeaker[],
): number {
  if (speakers.length === 0) return 1
  const distanceOf = ({ position }: InstalledSpeaker) =>
    distanceBetween(position, seat)
  const reference = Math.max(
    0,
    ...speakers
      .filter(({ reference }) => isCharted(reference.channel))
      .map(distanceOf),
  )
  const counted = SEAT_SCORE.equidistanceShare * reference
  return (
    speakers.reduce((sum, speaker) => {
      const equidistance =
        counted > 0 ? Math.min(1, distanceOf(speaker) / counted) : 1
      return (
        sum +
        SEAT_SCORE.gradeValues[speaker.placementRange.grade] * equidistance
      )
    }, 0) / speakers.length
  )
}
