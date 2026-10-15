/**
 * Where every item of the layout is: its manual position when it has one,
 * else its auto-placed one. Auto speakers are placed around the MLP where
 * it is, manual or auto.
 */
import type { Config } from './config'
import {
  DOLBY_LAYOUTS,
  type ChannelReference,
  type OverheadChannelReference,
} from './dolby-layouts'
import { MLP_ID, type PlaceableId, type Placement } from './manual-positions'
import { defaultMlp } from './mlp'
import { autoPlaceOverhead, layoutWidth } from './overhead-placement'
import { autoPlaceSpeaker } from './placement'
import { nearestWall, type RoomPoint, type Wall } from './room'
import type { SubwooferId } from './subwoofer-arrangements'
import { autoPlaceSubwoofers } from './subwoofer-placement'

/** An item's position and whether it is auto or manual. */
export type Placed = {
  readonly position: RoomPoint
  readonly placement: Placement
}

export type Placements = {
  readonly mlp: Placed
  /** The listener-level channels, in Dolby's channel order. */
  readonly speakers: readonly (Placed & {
    readonly reference: ChannelReference
  })[]
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

export function placeAll({
  room,
  layout,
  manualPositions,
}: Config): Placements {
  const placed = (id: PlaceableId, auto: () => RoomPoint): Placed => {
    const manual = manualPositions[id]
    return manual
      ? { position: manual, placement: 'manual' }
      : { position: auto(), placement: 'auto' }
  }
  const mlp = placed(MLP_ID, () => defaultMlp(room))
  const speakers = DOLBY_LAYOUTS[layout.dolbyLayout].channels.map(
    (reference) => ({
      reference,
      ...placed(reference.channel, () =>
        autoPlaceSpeaker(room, mlp.position, reference),
      ),
    }),
  )
  const { overheadChannels } = DOLBY_LAYOUTS[layout.dolbyLayout]
  const width = layoutWidth(speakers.map(({ position }) => position))
  const overheads = overheadChannels.map((reference) => ({
    reference,
    ...placed(reference.channel, () =>
      autoPlaceOverhead(room, mlp.position, reference, width),
    ),
  }))
  const subwoofers = autoPlaceSubwoofers(room, layout.subwoofers).map(
    ({ id, position, wall }) => {
      const where = placed(id, () => position)
      return {
        id,
        ...where,
        // A manual subwoofer stands against the wall it is closest to.
        wall:
          where.placement === 'manual'
            ? nearestWall(room, where.position)
            : wall,
      }
    },
  )
  return { mlp, speakers, overheads, subwoofers }
}

/** Where item `id` is now, or null when the layout has no such item. */
export function positionOf(config: Config, id: PlaceableId): RoomPoint | null {
  const { mlp, speakers, overheads, subwoofers } = placeAll(config)
  if (id === MLP_ID) return mlp.position
  const item =
    speakers.find(({ reference }) => reference.channel === id) ??
    overheads.find(({ reference }) => reference.channel === id) ??
    subwoofers.find((subwoofer) => subwoofer.id === id)
  return item?.position ?? null
}
