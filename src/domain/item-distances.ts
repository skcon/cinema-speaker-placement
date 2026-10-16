import {
  atDistanceFromWall,
  distanceBetween,
  wallDistances,
  type Room,
  type RoomPoint,
  type Wall,
} from './room'

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
