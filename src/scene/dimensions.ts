import {
  formatLength,
  type Room,
  type RoomPoint,
  type UnitSystem,
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
