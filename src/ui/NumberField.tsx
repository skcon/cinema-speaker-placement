import { useId, useState } from 'react'
import type { RangeProblem } from '@/domain'
import { Input } from '@/ui/components/input'
import { Label } from '@/ui/components/label'
import { parseDecimal } from '@/ui/lib/decimal'

/**
 * A labelled number field for one stored value, as CrossoverField works: a
 * valid number goes straight to the store, an invalid one stays in the
 * field with an inline error while the store keeps the last valid value,
 * and when the stored value changes elsewhere (a share link, undo) the
 * field starts over from it.
 */
export function NumberField({
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
  check: (value: number) => RangeProblem | null
  onValid: (value: number) => void
  errorMessage: (problem: RangeProblem) => string
  note?: string
}) {
  const [draft, setDraft] = useState(() => String(value))
  const [seenInStore, setSeenInStore] = useState(value)
  const id = useId()
  const errorId = useId()
  const noteId = useId()

  // Adjust state while rendering, as RoomDimensionField does.
  if (seenInStore !== value) {
    setSeenInStore(value)
    if (parseDecimal(draft) !== value) setDraft(String(value))
  }

  const problem = check(parseDecimal(draft))

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          const typed = parseDecimal(event.target.value)
          if (check(typed) === null) onValid(typed)
        }}
        aria-invalid={problem !== null}
        aria-describedby={note ? `${errorId} ${noteId}` : errorId}
        className="max-w-36"
      />
      <p id={errorId} aria-live="polite" className="text-sm text-destructive">
        {problem && errorMessage(problem)}
      </p>
      {note && (
        <p id={noteId} className="text-xs text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  )
}
