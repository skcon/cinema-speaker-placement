/**
 * Where every item of the layout is, by its placement policy
 * (auto-place-policy.ts: a manual item where it is, an auto one where
 * auto-place puts it). Auto speakers are placed around the MLP where it
 * is, manual or auto, and L, C and R fit the Screen when the Room has one
 * (placement.ts, rule 6).
 *
 * The listener-level speakers can also be placed on their own, installed
 * for one point and heard at another (placeSpeakers): the seat score
 * installs them for each candidate seat's projection onto the center line
 * and grades them from the seat (ADR 0005, amendment).
 */
import type { Config } from './config'
import {
  DOLBY_LAYOUTS,
  type ChannelReference,
  type OverheadChannelReference,
} from './dolby-layouts'
import {
  placeItem,
  placeItemWith,
  placeMlp,
  type Placed,
} from './auto-place-policy'
import { autoPlaceOverhead, layoutWidth } from './overhead-placement'
import {
  autoPlaceSpeakerAtScreen,
  manualScreenRelation,
  type ScreenRelation,
} from './placement'
import {
  checkPlacementRange,
  type PlacementRangeCheck,
} from './placement-range'
import { azimuthFromMlp, type RoomPoint, type Wall } from './room'
import { nearestWall } from './wall-frame'
import type { SubwooferId } from './subwoofer-arrangements'
import { autoPlaceSubwoofers } from './subwoofer-placement'

/**
 * A listener-level speaker installed for one point and heard at another
 * (placeSpeakers).
 */
export type InstalledSpeaker = Placed & {
  readonly reference: ChannelReference
  /**
   * How it relates to the Screen: null without one, or for a channel other
   * than L, C and R.
   */
  readonly screenRelation: ScreenRelation | null
  /** Its angle from the listening point, graded against Dolby's placement range. */
  readonly placementRange: PlacementRangeCheck
}

/** Where the speakers are installed for, and where they are heard. */
export type ListeningPoints = {
  /** The point auto speakers are placed around (auto-place's MLP). */
  readonly installedFor: RoomPoint
  /** The listening position every speaker is graded from. */
  readonly heardAt: RoomPoint
}

export type Placements = {
  readonly mlp: Placed
  /**
   * The listener-level channels, in Dolby's channel order, installed for
   * and heard at the MLP.
   */
  readonly speakers: readonly InstalledSpeaker[]
  /**
   * The overhead channels, in Dolby's channel order. Auto ones are placed
   * around the MLP and spaced by the listener-level speakers as placed.
   */
  readonly overheads: readonly (Placed & {
    readonly reference: OverheadChannelReference
  })[]
  /** The subwoofers, Subwoofer 1 first, with the wall each stands against. */
  readonly subwoofers: readonly (Placed & {
    readonly id: SubwooferId
    readonly wall: Wall
  })[]
}

export function placeAll(config: Config): Placements {
  const { room, layout } = config
  const mlp = placeMlp(config)
  const speakers = placeSpeakers(config, {
    installedFor: mlp.position,
    heardAt: mlp.position,
  })
  const { overheadChannels } = DOLBY_LAYOUTS[layout.dolbyLayout]
  const width = layoutWidth(speakers.map(({ position }) => position))
  const overheads = overheadChannels.map((reference) => ({
    reference,
    ...placeItem(config, reference.channel, () =>
      autoPlaceOverhead(room, mlp.position, reference, width),
    ),
  }))
  const subwoofers = autoPlaceSubwoofers(room, layout.subwoofers).map(
    ({ id, position, wall }) => ({
      id,
      ...placeItemWith(config, id, {
        auto: () => ({ position, wall }),
        // A manual subwoofer stands against the wall it is closest to.
        manual: (where) => ({ wall: nearestWall(room, where) }),
      }),
    }),
  )
  return { mlp, speakers, overheads, subwoofers }
}

/**
 * The layout's listener-level speakers, in Dolby's channel order,
 * installed for `installedFor` and heard at `heardAt`: each auto speaker
 * placed as auto-place would for an MLP at `installedFor` (fitted to the
 * Screen as seen from there), each manual one where it is, and every one
 * graded from `heardAt`. The config's MLP is not read, and nothing else
 * is placed: the seat score calls this once per candidate seat, where
 * the overheads and subwoofers would go unused.
 *
 * The analysis installs for the MLP and hears there (placeAll). The seat
 * score installs for a seat's centerLineProjection and hears at the seat
 * (ADR 0005, amendment).
 */
export function placeSpeakers(
  config: Config,
  { installedFor, heardAt }: ListeningPoints,
): readonly InstalledSpeaker[] {
  const {
    room,
    layout,
    roomObjects: { screen },
  } = config
  return DOLBY_LAYOUTS[layout.dolbyLayout].channels.map(
    (reference): InstalledSpeaker => {
      const { channel } = reference
      const placed = placeItemWith(config, channel, {
        auto: () =>
          autoPlaceSpeakerAtScreen(room, installedFor, reference, screen),
        manual: () => ({
          screenRelation: manualScreenRelation(channel, screen),
        }),
      })
      return {
        reference,
        ...placed,
        placementRange: checkPlacementRange(
          reference,
          azimuthFromMlp(heardAt, placed.position),
        ),
      }
    },
  )
}

/**
 * The point a seat's speakers are installed for (ADR 0005, amendment):
 * the seat moved straight across onto the room's center line (x = 0), the
 * same distance from the front wall. A real install is symmetric to the
 * room, and the listener moves along the couch.
 */
export function centerLineProjection(seat: RoomPoint): RoomPoint {
  return { ...seat, x: 0 }
}
