import { useId, useState } from 'react'
import {
  checkRoomDimension,
  UNIT_SYSTEMS,
  type LengthUnit,
  type RoomDimension,
} from '@/domain'
import { useConfig } from '@/state/config-context'
import { Input } from '@/ui/components/input'
import { Label } from '@/ui/components/label'
import {
  draftFromMeters,
  metersFromDraft,
  type LengthDraft,
} from '@/ui/lib/length-input'
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
  const label = ROOM_DIMENSION_LABELS[dimension]
  const meters = useConfig((state) => state.config.room[dimension])
  const units = useConfig((state) => state.config.units)
  const setRoomDimension = useConfig((state) => state.setRoomDimension)
  const [draft, setDraft] = useState(() => draftFromMeters(meters, units))
  const [seenInStore, setSeenInStore] = useState({ meters, units })
  const errorId = useId()

  // Adjust state while rendering (react.dev "You Might Not Need an Effect"):
  // re-seed the text when the store moved away from what it describes. A
  // valid edit from this field updates the store to exactly its own text,
  // so what the user typed ("7.250") is kept.
  if (seenInStore.meters !== meters || seenInStore.units !== units) {
    setSeenInStore({ meters, units })
    if (
      seenInStore.units !== units ||
      metersFromDraft(draft, units) !== meters
    ) {
      setDraft(draftFromMeters(meters, units))
    }
  }

  const problem = checkRoomDimension(dimension, metersFromDraft(draft, units))
  const error = problem && roomDimensionErrorMessage(dimension, problem, units)

  function update(next: LengthDraft) {
    setDraft(next)
    setRoomDimension(dimension, metersFromDraft(next, units))
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-3">
        {UNIT_SYSTEMS[units].parts.map((unit, index) => (
          <UnitInput
            key={unit}
            unit={unit}
            value={draft[index] ?? ''}
            onChange={(value) => update(draft.with(index, value))}
            invalid={problem !== null}
            errorId={errorId}
          />
        ))}
      </div>
      <p id={errorId} aria-live="polite" className="text-sm text-destructive">
        {error}
      </p>
    </fieldset>
  )
}

function UnitInput({
  unit,
  value,
  onChange,
  invalid,
  errorId,
}: {
  unit: LengthUnit
  value: string
  onChange: (value: string) => void
  invalid: boolean
  errorId: string
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        aria-describedby={errorId}
      />
      <Label htmlFor={id} className="font-normal text-muted-foreground">
        {unit}
      </Label>
    </div>
  )
}
