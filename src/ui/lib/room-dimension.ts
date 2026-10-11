import {
  formatLength,
  type RoomDimension,
  type RoomDimensionProblem,
  type UnitSystem,
} from '@/domain'

/** The field label for each room dimension. */
export const ROOM_DIMENSION_LABELS = {
  length: 'Length',
  width: 'Width',
  height: 'Height',
} as const satisfies Record<RoomDimension, string>

/** The inline error for a rejected room dimension. */
export function roomDimensionErrorMessage(
  dimension: RoomDimension,
  { problem, min, max }: RoomDimensionProblem,
  units: UnitSystem,
): string {
  if (problem === 'not-a-number') {
    return `Enter the ${dimension} as a number.`
  }
  // Round the limits inward so the numbers shown are themselves accepted.
  return `${ROOM_DIMENSION_LABELS[dimension]} must be between ${formatLength(min, units, 'up')} and ${formatLength(max, units, 'down')}.`
}
