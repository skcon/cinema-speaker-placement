import { useId, useState } from 'react'
import { checkRoomDimension, UNIT_SYSTEMS, type RoomDimension } from '@/domain'
import { useConfig } from '@/state/config-context'
import { Input } from '@/ui/components/input'
import { Label } from '@/ui/components/label'
import {
  draftFromMeters,
  metersFromDraft,
  roomDimensionErrorMessage,
  type LengthDraft,
} from '@/ui/lib/length-input'

/**
 * One room dimension in the chosen units: meters, or feet + inches. Valid
 * input goes straight to the store; invalid input stays in the field with an
 * inline error, and the store keeps the last valid size. Mount it with a key
 * per unit system so switching units starts from the converted value.
 */
export function RoomDimensionField({
  dimension,
  label,
}: {
  dimension: RoomDimension
  label: string
}) {
  const meters = useConfig((state) => state.config.room[dimension])
  const units = useConfig((state) => state.config.units)
  const setRoomDimension = useConfig((state) => state.setRoomDimension)
  const [draft, setDraft] = useState(() => draftFromMeters(meters, units))
  const errorId = useId()

  const problem = checkRoomDimension(dimension, metersFromDraft(draft, units))
  const error = problem && roomDimensionErrorMessage(label, problem, units)

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
  unit: string
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
