/**
 * The Auto-place module's placement policy (GLOSSARY.md, "Auto /
 * manual"): how each item's position is decided, and where the MLP
 * comes from. The config edits that move the MLP and Auto-place itself
 * are the module's other half (auto-place.ts), kept apart only so the
 * placement (placements.ts) and the seat score it calls can read the
 * policy without importing the edits.
 *
 * Every listener-level and overhead channel, every subwoofer and the MLP
 * has one policy:
 *
 * - **auto**: placed by auto-place from the Room, the Layout and, for
 *   speakers, the MLP;
 * - **manual**: where the user left it, its manual position stored in the
 *   config (manual-positions.ts says where it may go).
 *
 * Manual wins over auto here, once: placeItem and placeItemWith place an
 * item by its policy, and never auto-place a manual one.
 *
 * Where the auto speakers (listener-level and overhead) are installed for
 * is the config's one other placement input, **Speakers follow the seat**
 * (GLOSSARY.md, #123): on (the default, `speakersInstalledFor` null) they
 * are installed around the MLP and follow it; off, around the seat stored
 * when it was turned off, and a moved MLP only hears them from elsewhere
 * (autoSpeakersInstalledFor). Subwoofers and the MLP don't depend on it.
 *
 * The auto MLP is the "38% rule" seed (defaultMlp, mlp.ts), never the
 * recommended seat: that would make the analysis wait for the seat score
 * (ADR 0004). Auto-place and "Move MLP here" put the MLP at the
 * recommended seat by making it manual (auto-place.ts).
 */
import type { Config } from './config'
import { entries, MLP_ID, type PlaceableId } from './manual-positions'
import { defaultMlp } from './mlp'
import type { RoomPoint } from './room'

/** Whether an item's position is derived (auto) or stored (manual). */
export type Placement = 'auto' | 'manual'

/** How an item's position is decided, with what that needs. */
export type PlacementPolicy =
  | { readonly placement: 'auto' }
  | { readonly placement: 'manual'; readonly position: RoomPoint }

/** An item's position and whether it is auto or manual. */
export type Placed = {
  readonly position: RoomPoint
  readonly placement: Placement
}

/** The part of the config placement policies are read from. */
type PolicySource = Pick<Config, 'manualPositions'>

/** Item `id`'s policy: manual where it has a manual position, else auto. */
export function placementPolicy(
  { manualPositions }: PolicySource,
  id: PlaceableId,
): PlacementPolicy {
  const position = manualPositions[id]
  return position ? { placement: 'manual', position } : { placement: 'auto' }
}

/** The items that are manual, in PLACEABLE_IDS order. */
export function manualItems({
  manualPositions,
}: PolicySource): readonly PlaceableId[] {
  return entries(manualPositions).map(([id]) => id)
}

/**
 * How to place an item with facts beyond its position: `auto` places it
 * as auto-place would, with its facts; `manual` gives its facts where a
 * manual item is.
 */
export type PlaceWith<Facts> = {
  readonly auto: () => { readonly position: RoomPoint } & Facts
  readonly manual: (position: RoomPoint) => Facts
}

/**
 * Item `id` placed by its policy, with its facts: a manual item where it
 * is (`auto` isn't called), an auto one where `auto` puts it.
 */
export function placeItemWith<Facts extends object>(
  config: PolicySource,
  id: PlaceableId,
  { auto, manual }: PlaceWith<Facts>,
): Placed & Facts {
  const policy = placementPolicy(config, id)
  return policy.placement === 'manual'
    ? {
        ...manual(policy.position),
        position: policy.position,
        placement: 'manual',
      }
    : { ...auto(), placement: 'auto' }
}

/**
 * Item `id` placed by its policy: a manual item where it is (`auto` isn't
 * called), an auto one where `auto` puts it.
 */
export function placeItem(
  config: PolicySource,
  id: PlaceableId,
  auto: () => RoomPoint,
): Placed {
  return placeItemWith(config, id, {
    auto: () => ({ position: auto() }),
    manual: () => ({}),
  })
}

/** Where the MLP is: where it was left when manual, else the auto MLP. */
export function placeMlp(
  config: Pick<Config, 'manualPositions' | 'room'>,
): Placed {
  return placeItem(config, MLP_ID, () => defaultMlp(config.room))
}

/**
 * The point the auto speakers are installed for, with the MLP at `mlp`:
 * the MLP while the speakers follow the seat, else the seat stored when
 * that was turned off (see above).
 */
export function autoSpeakersInstalledFor(
  { speakersInstalledFor }: Pick<Config, 'speakersInstalledFor'>,
  mlp: RoomPoint,
): RoomPoint {
  return speakersInstalledFor ?? mlp
}
