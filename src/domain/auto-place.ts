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
 * Each gives the same config back when it changes nothing, so the store
 * records no empty undo step.
 */
import { manualItems } from './auto-place-policy'
import type { Config } from './config'
import { placeManually } from './config-edits'
import { MLP_ID } from './manual-positions'
import type { FloorPoint } from './room'
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
 * the recommended seat). The config comes back as it was when that changes
 * nothing.
 */
export function withAutoPlacement(config: Config): Config {
  const reset: Config = { ...config, manualPositions: {} }
  const { recommended, mlpIsRecommended } = recommendSeat(reset)
  const placed = mlpIsRecommended
    ? reset
    : withMlpAt(reset, recommended.position)
  return samePositions(placed, config) ? config : placed
}

/**
 * Whether Auto-place has something to do: an item other than the MLP is
 * manual, or the MLP isn't at the recommended seat. Until the
 * recommendation is ready (null), whether anything is manual.
 */
export function canAutoPlace(
  config: Config,
  recommendation: Pick<MlpComparison, 'mlpIsRecommended'> | null,
): boolean {
  const manual = manualItems(config)
  if (!recommendation) return manual.length > 0
  return manual.some((id) => id !== MLP_ID) || !recommendation.mlpIsRecommended
}

/** Whether two configs have the same manual positions. */
function samePositions(a: Config, b: Config): boolean {
  return JSON.stringify(a.manualPositions) === JSON.stringify(b.manualPositions)
}
