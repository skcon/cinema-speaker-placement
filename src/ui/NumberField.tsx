import { useId } from 'react'
import { Input } from '@/ui/components/input'
import { Label } from '@/ui/components/label'
import { DECIMAL_TEXT } from '@/ui/lib/decimal'
import { useDraftField } from '@/ui/lib/use-draft-field'

/**
 * A labelled number field for one stored value (useDraftField): a valid
 * number goes straight to the store, an invalid one stays in the field
 * with an inline error while the store keeps the last valid value, and
 * when the stored value changes elsewhere (a share link, undo) the field
 * starts over from it.
 */
export function NumberField<P>({
  label,
  value,
  check,
  onValid,
  errorMessage,
  note,
}: {
  label: string
  /** The stored value. */
  value: number
  /** `null` when a typed value can be stored. */
  check: (value: number) => P | null
  onValid: (value: number) => void
  errorMessage: (problem: P) => string
  note?: string
}) {
  const { text, problem, edit } = useDraftField({
    value,
    codec: DECIMAL_TEXT,
    check,
    onCommit: onValid,
  })
  const id = useId()
  const errorId = useId()
  const noteId = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(event) => edit(event.target.value)}
        aria-invalid={problem !== null}
        aria-describedby={note ? `${errorId} ${noteId}` : errorId}
        className="max-w-36"
      />
      <p id={errorId} aria-live="polite" className="text-sm text-destructive">
        {problem !== null && errorMessage(problem)}
      </p>
      {note && (
        <p id={noteId} className="text-xs text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  )
}
