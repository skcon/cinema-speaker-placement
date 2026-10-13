import { useId, useState, type ReactNode } from 'react'
import { UNIT_SYSTEMS, type UnitSystem } from '@/domain'
import { Input } from '@/ui/components/input'
import { Label } from '@/ui/components/label'
import {
  draftFromMeters,
  metersFromDraft,
  type LengthDraft,
} from '@/ui/lib/length-input'

/**
 * A length in the chosen units (meters, or feet + inches) that is applied
 * when the field is left or Enter is pressed, so one edit is one undo step
 * and the value isn't moved (by clamping, say) while it is being typed.
 * Until then it shows the stored length, following drags and undo. Text
 * that isn't a number is dropped when the field is left.
 */
export function LengthField({
  label,
  meters,
  units,
  onCommit,
}: {
  label: ReactNode
  meters: number
  units: UnitSystem
  onCommit: (meters: number) => void
}) {
  // What the user is typing, or null while the field shows the stored length.
  const [draft, setDraft] = useState<LengthDraft | null>(null)
  const shown = draft ?? draftFromMeters(meters, units)

  function commit() {
    if (draft) {
      const typed = metersFromDraft(draft, units)
      if (Number.isFinite(typed)) onCommit(typed)
    }
    setDraft(null)
  }

  return (
    <fieldset
      className="flex flex-col gap-1"
      onBlur={(event) => {
        // Moving between the feet and inches boxes isn't leaving the field.
        if (!event.currentTarget.contains(event.relatedTarget)) {
          commit()
        }
      }}
    >
      <legend className="mb-1 text-xs font-medium">{label}</legend>
      <div className="flex items-center gap-3">
        {UNIT_SYSTEMS[units].parts.map((unit, index) => (
          <UnitInput
            key={unit}
            unit={unit}
            value={shown[index] ?? ''}
            onChange={(value) => setDraft(shown.with(index, value))}
            onEnter={commit}
          />
        ))}
      </div>
    </fieldset>
  )
}

function UnitInput({
  unit,
  value,
  onChange,
  onEnter,
}: {
  unit: string
  value: string
  onChange: (value: string) => void
  onEnter: () => void
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
        onKeyDown={(event) => {
          if (event.key === 'Enter') onEnter()
        }}
        className="max-lg:h-11"
      />
      <Label htmlFor={id} className="font-normal text-muted-foreground">
        {unit}
      </Label>
    </div>
  )
}
