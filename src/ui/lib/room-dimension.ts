import {
  type RoomDimension,
  type RoomDimensionProblem,
  type UnitSystem,
} from '@/domain'
import { lengthErrorMessage } from '@/ui/lib/length-error'

/** The field label for each room dimension. */
export const ROOM_DIMENSION_LABELS = {
  length: 'Length',
  width: 'Width',
  height: 'Height',
} as const satisfies Record<RoomDimension, string>

/** The inline error for a rejected room dimension. */
export function roomDimensionErrorMessage(
  dimension: RoomDimension,
  problem: RoomDimensionProblem,
  units: UnitSystem,
): string {
  return lengthErrorMessage(
    dimension,
    ROOM_DIMENSION_LABELS[dimension],
    problem,
    units,
  )
}
