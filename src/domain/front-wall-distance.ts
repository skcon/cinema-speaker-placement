/**
 * How far from the front wall auto-place puts the front stage (Left,
 * Center and Right) for a seat (placement.ts, rule 2; #158, ADR 0005
 * amendment).
 *
 * The wall behind a speaker returns a delayed copy of its sound, and where
 * that copy arrives half a period late it cancels part of the direct sound:
 * a notch whose frequency follows the speaker's distance from the wall
 * (boundary-interference.ts, ADR 0002). So the distance is chosen, not
 * fixed (FRONT_STAGE_WALL_DISTANCE_RANGE in reference.ts):
 *
 * 1. **The range**: every whole centimeter from the 0.3 m wall clearance
 *    to 0.6 m, but no farther out than leaves the seat
 *    SEATING_DISTANCE.behindFrontStage (1.5 m) behind the front stage.
 *    Along it the speakers keep their angles from the seat (rule 1), so
 *    every grade stays ideal. A seat too near the front wall to keep that
 *    distance from FRONT_STAGE_WALL_DISTANCE (0.5 m) keeps 0.5 m, as
 *    before: the choice never lets in a seat the seating distances keep
 *    out.
 * 2. **The criterion**: the auto front stage at that distance, heard at the
 *    seat it is installed for, with only its boundary interference (the
 *    chart's Speakers' part, estimated-response.ts: power averaged),
 *    against the config's target curve, over the Speakers' pass band (from
 *    the crossover up to the response band's top). The level is set to the
 *    band's mean, as the calibration sets it, and what counts is the share
 *    of the band outside the target's tolerance: how the Response score
 *    counts. Closed form, no modal sum.
 * 3. **The choice**: the distance with the least of the band outside; ties
 *    go to the one nearest 0.5 m, then the one nearer the wall. 0.5 m
 *    stays unless that distance leaves at least `meaningfulShare` (5
 *    points) less of the band outside than 0.5 m does.
 *
 * All three front speakers get the same distance (KEF asks for both front
 * speakers the same distance from the wall, docs/research/real-room-
 * placement.md section 6), and it depends only on the room, the layout,
 * the speakers' types, the crossover, the target curve and the seat, never
 * on manual speakers, so the drawn stage and the seat score's candidate
 * stage for the same install point are the same (no new mismatch of the
 * kind #147 describes). With a Screen the screen rule wins and nothing is
 * tuned (frontStageLine).
 */
import type { Config } from './config'
import { DOLBY_LAYOUTS } from './dolby-layouts'
import { responseFrequencies } from './estimated-response'
import { interferencePowers } from './boundary-interference'
import { speakerReflections } from './listening'
import {
  autoPlaceSpeakerAtScreen,
  frontStageLine,
  isFrontStageChannel,
} from './placement'
import {
  FRONT_STAGE_WALL_DISTANCE,
  FRONT_STAGE_WALL_DISTANCE_RANGE,
  SEATING_DISTANCE,
  TARGET_TOLERANCE,
} from './reference'
import type { RoomPoint } from './room'
import { targetCurve } from './target-curve'

/**
 * How far from the front wall auto-place puts the front stage installed for
 * `installedFor`, in meters (see above): the screen's line with a Screen,
 * else the distance in the range whose boundary interference strays least
 * from the target at that seat.
 */
export function frontStageDistance(
  config: Config,
  installedFor: RoomPoint,
): number {
  const { screen } = config.roomObjects
  if (screen !== null) return frontStageLine(screen)
  const key = memoKey(config, installedFor)
  const known = memo.get(key)
  if (known !== undefined) return known
  const chosen = chooseDistance(config, installedFor)
  if (memo.size >= MEMO_SIZE) memo.clear()
  memo.set(key, chosen)
  return chosen
}

/**
 * The front-wall distances tried for a seat, in meters, nearest the wall
 * first: whole steps of the range up to where the seat would fall short of
 * the seating distance behind the front stage. Empty when the seat is too
 * near the front wall for any of them.
 */
export function frontStageDistances(installedFor: RoomPoint): number[] {
  const { fromMeters, toMeters, stepMeters } = FRONT_STAGE_WALL_DISTANCE_RANGE
  const farthest = Math.min(
    toMeters,
    installedFor.y - SEATING_DISTANCE.behindFrontStage,
  )
  // A seat too near the front wall to keep the seating distance from the
  // usual line keeps that line: the choice never lets a seat in that the
  // seating distances keep out (see above).
  if (farthest < FRONT_STAGE_WALL_DISTANCE.meters - STEP_EPSILON) return []
  const first = Math.ceil(fromMeters / stepMeters - STEP_EPSILON)
  const last = Math.floor(farthest / stepMeters + STEP_EPSILON)
  return Array.from(
    { length: Math.max(0, last - first + 1) },
    // Rounded to the step, so 0.3 is 0.3, not 0.30000000000000004.
    (_, i) => roundToStep((first + i) * stepMeters),
  )
}

/**
 * How much of the Speakers' pass band the front stage's boundary
 * interference leaves outside the target's tolerance at `installedFor`,
 * with the stage `distance` from the front wall: the share of the band's
 * frequencies, 0 to 1, after the level is set to the band's mean as the
 * calibration sets it (see above).
 */
export function frontStageOutsideTolerance(
  config: Config,
  installedFor: RoomPoint,
  distance: number,
): number {
  return outsideToleranceAt(config, installedFor)(distance)
}

/**
 * frontStageOutsideTolerance for one seat, as a function of the distance:
 * what doesn't depend on the distance is worked out once.
 */
function outsideToleranceAt(
  config: Config,
  installedFor: RoomPoint,
): (distance: number) => number {
  const band = responseFrequencies().filter((f) => f >= config.crossoverHz)
  const target = targetCurve(config.targetCurve, band)
  const stage = DOLBY_LAYOUTS[config.layout.dolbyLayout].channels.filter(
    ({ channel }) => isFrontStageChannel(channel),
  )
  if (stage.length === 0 || band.length === 0) return () => 0
  return (distance) => {
    const powers = stage.map((reference) => {
      const { position } = autoPlaceSpeakerAtScreen(
        config.room,
        installedFor,
        reference,
        null,
        distance,
      )
      const { reflections } = speakerReflections(
        config,
        { channel: reference.channel, position },
        installedFor,
      )
      return interferencePowers(reflections, band)
    })
    // Power averaged, as the chart's Speakers' part (estimated-response.ts).
    const deviations = band.map((_, i) => {
      const power =
        powers.reduce((sum, speaker) => sum + speaker[i]!, 0) / powers.length
      return 10 * Math.log10(power) - target[i]!.level
    })
    const mean = deviations.reduce((sum, d) => sum + d, 0) / deviations.length
    const outside = deviations.filter(
      (d) => Math.abs(d - mean) > TARGET_TOLERANCE.db,
    )
    return outside.length / deviations.length
  }
}

/**
 * The distance with the least of the band outside the tolerance (see
 * above), or FRONT_STAGE_WALL_DISTANCE when the seat leaves no choice or
 * none is better by FRONT_STAGE_WALL_DISTANCE_RANGE.meaningfulShare.
 */
function chooseDistance(config: Config, installedFor: RoomPoint): number {
  const nominal = FRONT_STAGE_WALL_DISTANCE.meters
  const distances = frontStageDistances(installedFor)
  // The range always holds the nominal distance when it isn't empty.
  if (distances.length === 0) return nominal
  const outsideAt = outsideToleranceAt(config, installedFor)
  const fromNominal = (distance: number) => Math.abs(distance - nominal)
  const best = distances
    .map((distance) => ({ distance, outside: outsideAt(distance) }))
    // Least outside first; on a tie nearest the nominal distance, then
    // nearer the wall (the sort keeps the distances' order).
    .sort(
      (a, b) =>
        tied(a.outside, b.outside, SHARE_TIE) ||
        tied(fromNominal(a.distance), fromNominal(b.distance), STEP_EPSILON),
    )[0]!
  const { meaningfulShare } = FRONT_STAGE_WALL_DISTANCE_RANGE
  return best.outside <= outsideAt(nominal) - meaningfulShare + SHARE_TIE
    ? best.distance
    : nominal
}

/** a − b, or 0 when they are within `tie` of each other. */
function tied(a: number, b: number, tie: number): number {
  return Math.abs(a - b) <= tie ? 0 : a - b
}

/** `meters` rounded to the micrometer: float noise only. */
function roundToStep(meters: number): number {
  return Math.round(meters * MICROMETERS_PER_METER) / MICROMETERS_PER_METER
}

const MICROMETERS_PER_METER = 1e6

/** Float noise, in steps or in meters: values this close count as equal. */
const STEP_EPSILON = 1e-9

/** Shares this close count as equal (the same number of frequencies). */
const SHARE_TIE = 1e-9

/**
 * The choices made so far, by input. A memo of a pure function, like the
 * heard room's (estimated-response.ts): the seat score asks for the same
 * few seats' distances again and again (every candidate seat's projection
 * onto the center line), and the analysis asks for the MLP's. Cleared
 * when full, so it never grows without bound.
 */
const memo = new Map<string, number>()

/** How many choices the memo keeps before it starts afresh. */
const MEMO_SIZE = 256

/** The memo key: exactly what the choice reads. */
function memoKey(
  { room, layout, speakerGroups, crossoverHz, targetCurve }: Config,
  { x, y, z }: RoomPoint,
): string {
  return JSON.stringify([
    room,
    layout.dolbyLayout,
    speakerGroups,
    crossoverHz,
    targetCurve,
    x,
    y,
    z,
  ])
}
