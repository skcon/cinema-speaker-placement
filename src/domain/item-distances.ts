import type { ChannelId } from './dolby-layouts'
import type { PlacedSpeaker } from './placed-items'
import { isFrontStageChannel } from './placement'
import { distanceBetween, type Room, type RoomPoint, type Wall } from './room'
import { atDistanceFromWall, wallDistances } from './wall-frame'

/** A measured straight line between two room points, in meters. */
export type DimensionLine = {
  readonly from: RoomPoint
  readonly to: RoomPoint
  readonly meters: number
}

/** A Dimension line from an item straight to one wall, in plan. */
export type WallDimensionLine = DimensionLine & { readonly wall: Wall }

/** How far a selected item is from its two nearest walls and the MLP. */
export type ItemDistances = {
  /**
   * To the nearer end wall (front or back), then the nearer side wall
   * (left or right): measured along the floor plan, each line at the
   * item's own height, ending square on the wall.
   */
  readonly walls: readonly [along: WallDimensionLine, across: WallDimensionLine]
  /** Straight to the MLP, in 3D; null for the MLP itself. */
  readonly mlp: DimensionLine | null
}

/**
 * The distances of an item at `item` (a speaker, subwoofer or the MLP) to
 * the Room's two walls nearest to it and, given the MLP (`mlp`), to the
 * MLP. Pass null for `mlp` when the item is the MLP.
 */
export function itemDistances(
  room: Room,
  item: RoomPoint,
  mlp: RoomPoint | null,
): ItemDistances {
  const { along, across } = wallDistances(room, item)
  const toWall = ({ wall, meters }: typeof along): WallDimensionLine => ({
    wall,
    from: item,
    to: atDistanceFromWall(room, item, wall, 0),
    meters,
  })
  return {
    walls: [toWall(along), toWall(across)],
    mlp: mlp && { from: item, to: mlp, meters: distanceBetween(item, mlp) },
  }
}

/** How far one front-stage speaker (L, C or R) is from the MLP. */
export type FrontStageDistance = {
  readonly channel: ChannelId
  /** Dolby's name for the channel, for example "Left". */
  readonly name: string
  /** Straight to the MLP, in 3D, in meters. */
  readonly meters: number
}

/**
 * How far each of the layout's front-stage speakers (L, C and R, in
 * Dolby's channel order; a layout without a Center has none) is from the
 * MLP, in a straight line: a bunched or lopsided front stage shows as
 * short or uneven distances.
 */
export function frontStageDistances({
  mlp,
  speakers,
}: {
  readonly mlp: RoomPoint
  readonly speakers: readonly Pick<
    PlacedSpeaker,
    'channel' | 'name' | 'position'
  >[]
}): readonly FrontStageDistance[] {
  return speakers
    .filter(({ channel }) => isFrontStageChannel(channel))
    .map(({ channel, name, position }) => ({
      channel,
      name,
      meters: distanceBetween(position, mlp),
    }))
}
