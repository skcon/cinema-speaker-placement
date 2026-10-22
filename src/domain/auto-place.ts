/**
 * Auto-place (GLOSSARY.md): each item's placement policy, where the MLP
 * comes from (both in auto-place-policy.ts, the module's lower half), and
 * the config edits that move the MLP. Every edit that puts the MLP
 * somewhere goes through withMlpAt:
 *
 * - dragging the MLP or the Seat row (drag-targets.ts);
 * - "Move MLP here", to the recommended seat on screen;
 * - Auto-place, which puts every item back to auto and then the MLP at
 *   the recommended seat.
 *
 * It also owns the one edit of where the auto speakers are installed for,
 * Speakers follow the seat (GLOSSARY.md, #123; withSpeakersFollowSeat):
 * on, they are installed around the MLP and follow it through every edit
 * above; off, they stay installed for the seat the MLP was at when it was
 * turned off, and moving the MLP only hears them from somewhere else.
 * Auto-place installs them around the recommended seat either way.
 *
 * Each gives the same config back when it changes nothing, so the store
 * records no empty undo step.
 */
import { manualItems, placeMlp } from './auto-place-policy'
import type { Config } from './config'
import { placeManually } from './config-edits'
import { MLP_ID } from './manual-positions'
import { MILLIMETERS_PER_METER } from './link-precision'
import type { FloorPoint, RoomPoint } from './room'
import { recommendSeat, type MlpComparison } from './seat-score'

/**
 * The MLP made manual at `seat` on the floor plan, at ear height, inside
 * its wall clearance (placeManually): a drag of the MLP or the Seat row,
 * or "Move MLP here" (the recommended seat the user is looking at, not one
 * worked out again). The config comes back as it was when the MLP already
 * is there.
 */
export function withMlpAt(config: Config, seat: FloorPoint): Config {
  const moved = placeManually(config, MLP_ID, { x: seat.x, y: seat.y })
  return samePositions(moved, config) ? config : moved
}

/**
 * What Auto-place does: every item back to auto, then the MLP at the
 * recommended seat for that (manual there, unless the auto MLP already is
 * the recommended seat). With Speakers follow the seat off, the auto
 * speakers are installed around that seat and stay there: it stays off.
 * The config comes back as it was when that changes nothing.
 */
export function withAutoPlacement(config: Config): Config {
  const reset: Config = { ...config, manualPositions: {} }
  const { recommended, mlpIsRecommended } = recommendSeat(reset)
  const moved = mlpIsRecommended
    ? reset
    : withMlpAt(reset, recommended.position)
  const placed = speakersFollowSeat(moved)
    ? moved
    : { ...moved, speakersInstalledFor: placeMlp(moved).position }
  return samePositions(placed, config) ? config : placed
}

/**
 * Whether the auto speakers follow the seat (on, the default): installed
 * around the MLP wherever it goes. Off, they stay installed for the seat
 * the config stores.
 */
export function speakersFollowSeat(config: Config): boolean {
  return config.speakersInstalledFor === null
}

/**
 * Speakers follow the seat turned on or off. On, the auto speakers are
 * installed around the MLP where it is now, and follow it. Off, they stay
 * installed for that seat, where they are now: nothing moves. The config
 * comes back as it was when it already is so.
 */
export function withSpeakersFollowSeat(config: Config, on: boolean): Config {
  if (speakersFollowSeat(config) === on) return config
  return {
    ...config,
    speakersInstalledFor: on ? null : placeMlp(config).position,
  }
}

/**
 * Whether Auto-place has something to do: an item other than the MLP is
 * manual, the MLP isn't at the recommended seat, or the auto speakers
 * stay installed for another seat than the MLP's (Speakers follow the
 * seat off). Until the recommendation is ready (null), whether anything
 * is manual, or the speakers are installed for another seat.
 */
export function canAutoPlace(
  config: Config,
  recommendation: Pick<MlpComparison, 'mlpIsRecommended'> | null,
): boolean {
  const manual = manualItems(config)
  const elsewhere = !installedForMlp(config)
  if (!recommendation) return manual.length > 0 || elsewhere
  return (
    manual.some((id) => id !== MLP_ID) ||
    !recommendation.mlpIsRecommended ||
    elsewhere
  )
}

/**
 * How far apart, along each axis, the seat the speakers are installed for
 * and the MLP may be and still be the same seat: a millimeter, as a share
 * link stores both to the millimeter (an auto MLP isn't stored at all).
 */
const SAME_SEAT_PER_AXIS = 1 / MILLIMETERS_PER_METER

/**
 * Whether the auto speakers are installed for the MLP: they follow the
 * seat, or stay installed where the MLP is (see SAME_SEAT_PER_AXIS).
 */
function installedForMlp(config: Config): boolean {
  const installedFor = config.speakersInstalledFor
  if (installedFor === null) return true
  const mlp = placeMlp(config).position
  return (Object.keys(mlp) as (keyof RoomPoint)[]).every(
    (axis) => Math.abs(mlp[axis] - installedFor[axis]) <= SAME_SEAT_PER_AXIS,
  )
}

/**
 * Whether two configs have the same manual positions and install the auto
 * speakers for the same seat.
 */
function samePositions(a: Config, b: Config): boolean {
  return (
    JSON.stringify([a.manualPositions, a.speakersInstalledFor]) ===
    JSON.stringify([b.manualPositions, b.speakersInstalledFor])
  )
}
