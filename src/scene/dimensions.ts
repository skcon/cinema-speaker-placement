import {
  formatLength,
  type DimensionLine,
  type ItemDistances,
  type PlaceableId,
  type Room,
  type RoomPoint,
  type UnitSystem,
  type Wall,
} from '@/domain'

/** One of the Room's measurements, written along a wall in the sketch. */
export type RoomDimension = {
  /** Which measurement: the width runs across the room, the length down it. */
  readonly measures: 'width' | 'length'
  /** The middle of the wall it is written along, on the floor. */
  readonly at: RoomPoint
  /** The measurement in the user's units, for example "4.5 m". */
  readonly text: string
}

/**
 * The Room's width and length as the sketch writes them: the width along
 * the back wall (the front wall carries its own label) and the length
 * along the left wall, each at the middle of its wall, in `units`.
 */
export function roomDimensions(
  room: Room,
  units: UnitSystem,
): readonly [width: RoomDimension, length: RoomDimension] {
  return [
    {
      measures: 'width',
      at: { x: 0, y: room.length, z: 0 },
      text: formatLength(room.width, units),
    },
    {
      measures: 'length',
      at: { x: -room.width / 2, y: room.length / 2, z: 0 },
      text: formatLength(room.length, units),
    },
  ]
}

/** What a Dimension line of the Selected item measures to: a wall or the MLP. */
export type DimensionTarget = Wall | 'MLP'

/** One Dimension line of the Selected item, as the scene draws it. */
export type SelectionDimensionLine = {
  readonly target: DimensionTarget
  readonly from: RoomPoint
  readonly to: RoomPoint
  /**
   * Where its length is written: on the wall, where a wall line ends (in
   * the room's margin, clear of the item and its neighbours' labels), or
   * at the middle of the MLP line.
   */
  readonly labelAt: RoomPoint
  /** Its length in the user's units, for example "1.38 m". */
  readonly text: string
}

/** The Selected item as the scene draws it: highlighted, with its Dimension lines. */
export type SelectionDimensions = {
  readonly id: PlaceableId
  /** Where the highlight goes: the item's position. */
  readonly at: RoomPoint
  /** To the nearer end wall, the nearer side wall, then the MLP (if any). */
  readonly lines: readonly SelectionDimensionLine[]
}

/**
 * The Selected item's Dimension lines to its two nearest walls and the
 * MLP (measured by the domain's `itemDistances`), each with its length in
 * `units`: a wall line's at its wall, the MLP line's at its middle.
 */
export function selectionDimensions(
  {
    id,
    position,
    distances,
  }: { id: PlaceableId; position: RoomPoint; distances: ItemDistances },
  units: UnitSystem,
): SelectionDimensions {
  const line = (
    target: DimensionTarget,
    { from, to, meters }: DimensionLine,
  ): SelectionDimensionLine => ({
    target,
    from,
    to,
    labelAt:
      target === 'MLP'
        ? {
            x: (from.x + to.x) / 2,
            y: (from.y + to.y) / 2,
            z: (from.z + to.z) / 2,
          }
        : to,
    text: formatLength(meters, units),
  })
  return {
    id,
    at: position,
    lines: [
      ...distances.walls.map((wall) => line(wall.wall, wall)),
      ...(distances.mlp ? [line('MLP', distances.mlp)] : []),
    ],
  }
}

/** Where a Dimension line goes, in words: "the front wall" or "the MLP". */
export function dimensionTargetName(target: DimensionTarget): string {
  return target === 'MLP' ? 'the MLP' : `the ${target} wall`
}
