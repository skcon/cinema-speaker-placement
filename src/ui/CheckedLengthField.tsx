import { useId } from 'react'
import {
  UNIT_SYSTEMS,
  type LengthUnit,
  type RangeProblem,
  type UnitSystem,
} from '@/domain'
import { Input } from '@/ui/components/input'
import { Label } from '@/ui/components/label'
import { LENGTH_TEXT } from '@/ui/lib/length-input'
import { useDraftField } from '@/ui/lib/use-draft-field'

/**
 * A length in the chosen units (meters, or feet + inches) checked as it is
 * typed (useDraftField): a length `check` accepts goes to `onChange`, and
 * one it rejects stays in the field with an inline error while the stored
 * length stays as it was. When the stored length or the units change
 * elsewhere (switching units, a share link, undo, a drag), the field
 * starts over from the stored length.
 */
export function CheckedLengthField({
  label,
  meters,
  units,
  check,
  errorMessage,
  onChange,
}: {
  label: string
  meters: number
  units: UnitSystem
  /** Why a length is rejected, or null when it is accepted. */
  check: (meters: number) => RangeProblem | null
  /** The inline error for a rejected length, in the user's units. */
  errorMessage: (problem: RangeProblem) => string
  onChange: (meters: number) => void
}) {
  const {
    text: draft,
    problem,
    edit,
  } = useDraftField({
    value: meters,
    codec: LENGTH_TEXT[units],
    check,
    onCommit: onChange,
  })
  const errorId = useId()
  const error = problem && errorMessage(problem)

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-3">
        {UNIT_SYSTEMS[units].parts.map((unit, index) => (
          <UnitInput
            key={unit}
            unit={unit}
            value={draft[index] ?? ''}
            onChange={(value) => edit(draft.with(index, value))}
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
