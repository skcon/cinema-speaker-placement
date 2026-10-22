/**
 * Placed items: every item of the layout (its listener-level and overhead
 * speakers, its subwoofers and the MLP) where placeAll puts it, with the
 * facts the room view, the sidebar and the analysis need about it: its
 * name, its placement, its placement-range grading, its aim and how it
 * relates to the Screen.
 *
 * `placeItems(config)` gives the items as the per-kind lists the acoustic
 * estimates read and, by PlaceableId, in one placed-item shape (`items`):
 * the one by-id lookup the drag targets, the scene, config edits
 * (positionOf) and the Selected item (selectedItem) use. The Room
 * analysis (analyzeRoom) is a PlacedItems, so it offers the same lookup.
 *
 * Nothing here is acoustic: every fact is cheap, so config edits can place
 * the items on every drag frame without analyzing the room.
 */
import type { Config } from './config'
import {
  CHANNELS,
  OVERHEAD_CHANNELS,
  type ChannelId,
  type OverheadChannelId,
} from './dolby-layouts'
import { itemDistances, type ItemDistances } from './item-distances'
import { subwooferSpecsOf, wooferOf } from './listening'
import type { Placement } from './auto-place-policy'
import {
  MLP_ID,
  type PlaceableId,
  type PlaceableKind,
} from './manual-positions'
import { aimAtMlp, type Aim, type ScreenRelation } from './placement'
import {
  checkOverheadPlacementRange,
  type OverheadPlacementRangeCheck,
  type PlacementGrading,
  type PlacementRangeCheck,
} from './placement-range'
import { placeAll } from './placements'
import {
  azimuthFromMlp,
  sideViewElevation,
  type Room,
  type RoomPoint,
  type Wall,
} from './room'
import type { SubwooferSpecs } from './speaker-specs'
import { SUBWOOFERS, type SubwooferId } from './subwoofer-arrangements'

/** A listener-level speaker of the layout, placed and checked. */
export type PlacedSpeaker = {
  readonly channel: ChannelId
  /** Dolby's name for the channel, for example "Left Surround". */
  readonly name: string
  /** Where the speaker is, in room coordinates (its acoustic center). */
  readonly position: RoomPoint
  /**
   * Where its woofer is: below the acoustic center by its speaker group's
   * type (bookshelf or tower). Boundary interference starts from here.
   */
  readonly woofer: RoomPoint
  /** Auto-placed, or left by the user where it is. */
  readonly placement: Placement
  /** Which way it faces: at the MLP. */
  readonly aim: Aim
  /** Its angle from the MLP, graded against Dolby's placement range. */
  readonly placementRange: PlacementRangeCheck
  /**
   * How auto-place fitted it to the Screen (placement.ts, rule 6), or that
   * it is manual: null without a screen, or for a channel other than L, C
   * and R.
   */
  readonly screenRelation: ScreenRelation | null
}

/**
 * An overhead speaker of the layout, on the ceiling. Dolby's placement
 * range grades its elevation and, for the top front and top rear pairs,
 * its azimuth. ADR 0002 models boundary interference for listener-level
 * speakers only, so an overhead is not in the estimated response or the
 * seat score.
 */
export type PlacedOverhead = {
  readonly channel: OverheadChannelId
  /** Dolby's name for the channel, for example "Left Top Front". */
  readonly name: string
  /** Where the speaker is, in room coordinates: on the ceiling. */
  readonly position: RoomPoint
  /** Auto-placed, or left by the user where it is. */
  readonly placement: Placement
  /** Its azimuth and elevation from the MLP, graded against Dolby's placement range. */
  readonly placementRange: OverheadPlacementRangeCheck
}

/**
 * A subwoofer of the layout, auto-placed in the cited multi-subwoofer
 * arrangement or left by the user where it is. Dolby gives subwoofers no placement range, so it is not
 * graded.
 */
export type PlacedSubwoofer = {
  /** Its short id, for example "Sub2". */
  readonly id: SubwooferId
  /** For example "Subwoofer 2". */
  readonly name: string
  /** Where it is, in room coordinates (its acoustic center). */
  readonly position: RoomPoint
  /** Auto-placed, or left by the user where it is. */
  readonly placement: Placement
  /** The wall it stands against (for a manual one, the nearest wall). */
  readonly wall: Wall
  /**
   * The specs it is modelled with: its own specs, or the Subwoofers
   * group's. Resolved here for the acoustic estimates of #11-#13, which
   * need each subwoofer's enclosure, driver size and power.
   */
  readonly specs: SubwooferSpecs
}

/** What every placed item has, whatever its kind. */
type ItemFacts<Kind extends PlaceableKind, Id extends PlaceableId> = {
  /** Which kind of item it is: its placement rules and how it is drawn. */
  readonly kind: Kind
  readonly id: Id
  /** Its name, for example "Left", "Subwoofer 1" or "MLP". */
  readonly name: string
  /** Where it is, in room coordinates. */
  readonly position: RoomPoint
  /** Auto-placed, or left by the user where it is. */
  readonly placement: Placement
}

/**
 * A placed item, by its kind: its kind's own facts (a PlacedSpeaker's, a
 * PlacedOverhead's or a PlacedSubwoofer's) and, for every kind,
 *
 * - `grading`: its placement-range check (a subwoofer's is ungraded), or
 *   null for the MLP;
 * - `aim`: which way it faces, for a listener-level speaker, else null;
 * - `screenRelation`: how it relates to the Screen (L, C and R in a Room
 *   with one), else null.
 */
export type PlacedItem =
  | (PlacedSpeaker &
      ItemFacts<'listenerLevel', ChannelId> & {
        readonly grading: Extract<PlacementGrading, { kind: 'speaker' }>
      })
  | (PlacedOverhead &
      ItemFacts<'overhead', OverheadChannelId> & {
        readonly grading: Extract<PlacementGrading, { kind: 'overhead' }>
        readonly aim: null
        readonly screenRelation: null
      })
  | (PlacedSubwoofer &
      ItemFacts<'subwoofer', SubwooferId> & {
        readonly grading: Extract<PlacementGrading, { kind: 'subwoofer' }>
        readonly aim: null
        readonly screenRelation: null
      })
  | (ItemFacts<'mlp', typeof MLP_ID> & {
      readonly grading: null
      readonly aim: null
      readonly screenRelation: null
    })

/** Every item of the layout, placed: by kind, and by id. */
export type PlacedItems = {
  /** The MLP in room coordinates. */
  readonly mlp: RoomPoint
  /** Whether the MLP is auto-placed or left by the user where it is. */
  readonly mlpPlacement: Placement
  /** The layout's listener-level speakers, in Dolby's channel order. */
  readonly speakers: readonly PlacedSpeaker[]
  /** The layout's overhead speakers, in Dolby's channel order. */
  readonly overheads: readonly PlacedOverhead[]
  /** The layout's subwoofers, Subwoofer 1 first. */
  readonly subwoofers: readonly PlacedSubwoofer[]
  /**
   * Every item by id, in one placed-item shape. In order: the
   * listener-level channels, the overhead channels, the subwoofers, then
   * the MLP. An id the layout doesn't have isn't in it.
   */
  readonly items: ReadonlyMap<PlaceableId, PlacedItem>
}

/**
 * Every item of `config`'s layout, where placeAll puts it: each speaker
 * aims at the MLP and is graded from it.
 */
export function placeItems(config: Config): PlacedItems {
  const placements = placeAll(config)
  const mlp = placements.mlp.position
  const speakers = placements.speakers.map(
    ({
      reference: { channel },
      position,
      placement,
      screenRelation,
      placementRange,
    }): PlacedSpeaker => ({
      channel,
      name: CHANNELS[channel].name,
      position,
      woofer: wooferOf(config, channel, position),
      placement,
      aim: aimAtMlp(position, mlp),
      placementRange,
      screenRelation,
    }),
  )
  const overheads = placements.overheads.map(
    ({ reference, position, placement }): PlacedOverhead => ({
      channel: reference.channel,
      name: OVERHEAD_CHANNELS[reference.channel].name,
      position,
      placement,
      placementRange: checkOverheadPlacementRange(
        reference,
        azimuthFromMlp(mlp, position),
        sideViewElevation(mlp, position),
      ),
    }),
  )
  const subwoofers = placements.subwoofers.map(
    ({ id, position, placement, wall }): PlacedSubwoofer => ({
      id,
      name: SUBWOOFERS[id].name,
      position,
      placement,
      wall,
      specs: subwooferSpecsOf(config, id),
    }),
  )
  const mlpPlacement = placements.mlp.placement
  const items: readonly PlacedItem[] = [
    ...speakers.map((speaker): PlacedItem => ({
      ...speaker,
      kind: 'listenerLevel',
      id: speaker.channel,
      grading: { kind: 'speaker', check: speaker.placementRange },
    })),
    ...overheads.map((overhead): PlacedItem => ({
      ...overhead,
      kind: 'overhead',
      id: overhead.channel,
      grading: { kind: 'overhead', check: overhead.placementRange },
      aim: null,
      screenRelation: null,
    })),
    ...subwoofers.map((subwoofer): PlacedItem => ({
      ...subwoofer,
      kind: 'subwoofer',
      grading: { kind: 'subwoofer' },
      aim: null,
      screenRelation: null,
    })),
    {
      kind: 'mlp',
      id: MLP_ID,
      name: 'MLP',
      position: mlp,
      placement: mlpPlacement,
      grading: null,
      aim: null,
      screenRelation: null,
    },
  ]
  return {
    mlp,
    mlpPlacement,
    speakers,
    overheads,
    subwoofers,
    items: new Map(items.map((item) => [item.id, item])),
  }
}

/** Where item `id` is now, or null when the layout has no such item. */
export function positionOf(config: Config, id: PlaceableId): RoomPoint | null {
  return placeItems(config).items.get(id)?.position ?? null
}

/**
 * The Selected item: a placed item with its distances to its two nearest
 * walls and (unless it is the MLP) the MLP.
 */
export type SelectedItem = PlacedItem & {
  /** To its two nearest walls and (unless it is the MLP) the MLP. */
  readonly distances: ItemDistances
}

/**
 * Item `selected` as the details panel and the room view show it, placed
 * where `placed` (the config's Room analysis) has it, or null when nothing
 * is selected or the layout has no such item (it has left the layout).
 */
export function selectedItem(
  room: Room,
  { mlp, items }: Pick<PlacedItems, 'mlp' | 'items'>,
  selected: PlaceableId | null,
): SelectedItem | null {
  const item = selected && items.get(selected)
  if (!item) return null
  return {
    ...item,
    distances: itemDistances(
      room,
      item.position,
      item.kind === 'mlp' ? null : mlp,
    ),
  }
}
