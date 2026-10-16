import { checkRoomDimension, type RoomDimension } from '@/domain'
import { useConfig } from '@/state/config-context'
import { CheckedLengthField } from '@/ui/CheckedLengthField'
import {
  ROOM_DIMENSION_LABELS,
  roomDimensionErrorMessage,
} from '@/ui/lib/room-dimension'

/**
 * One room dimension in the chosen units: meters, or feet + inches. Valid
 * input goes straight to the store; invalid input stays in the field with an
 * inline error, and the store keeps the last valid size. When the stored size
 * or the units change elsewhere (switching units, a share link, undo), the
 * field starts over from the stored size.
 */
export function RoomDimensionField({
  dimension,
}: {
  dimension: RoomDimension
}) {
  const meters = useConfig((state) => state.config.room[dimension])
  const units = useConfig((state) => state.config.units)
  const setRoomDimension = useConfig((state) => state.setRoomDimension)

  return (
    <CheckedLengthField
      label={ROOM_DIMENSION_LABELS[dimension]}
      meters={meters}
      units={units}
      check={(value) => checkRoomDimension(dimension, value)}
      errorMessage={(problem) =>
        roomDimensionErrorMessage(dimension, problem, units)
      }
      onChange={(value) => setRoomDimension(dimension, value)}
    />
  )
}
