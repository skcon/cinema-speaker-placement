import { useId, useState } from 'react'
import { checkCrossover, type CrossoverProblem } from '@/domain'
import { useConfig } from '@/state/config-context'
import { Input } from '@/ui/components/input'
import { Label } from '@/ui/components/label'
import { parseDecimal } from '@/ui/lib/decimal'

/** The inline error for a rejected crossover frequency. */
function crossoverErrorMessage(problem: CrossoverProblem): string {
  return problem.problem === 'not-a-number'
    ? 'Enter the crossover as a number.'
    : `Crossover must be between ${problem.min} Hz and ${problem.max} Hz.`
}

/**
 * The crossover between the Speakers and the Subwoofers (user story 20),
 * in Hz. A valid frequency goes straight to the store; an invalid one stays
 * in the field with an inline error while the store keeps the last valid
 * one. When the stored value changes elsewhere (a share link), the field
 * starts over from it.
 */
export function CrossoverField() {
  const hz = useConfig((state) => state.config.crossoverHz)
  const setCrossover = useConfig((state) => state.setCrossover)
  const [draft, setDraft] = useState(() => String(hz))
  const [seenInStore, setSeenInStore] = useState(hz)
  const id = useId()
  const errorId = useId()
  const noteId = useId()

  // Adjust state while rendering, as RoomDimensionField does.
  if (seenInStore !== hz) {
    setSeenInStore(hz)
    if (parseDecimal(draft) !== hz) setDraft(String(hz))
  }

  const problem = checkCrossover(parseDecimal(draft))

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Crossover (Hz)</Label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          setCrossover(parseDecimal(event.target.value))
        }}
        aria-invalid={problem !== null}
        aria-describedby={`${errorId} ${noteId}`}
        className="max-w-36"
      />
      <p id={errorId} aria-live="polite" className="text-sm text-destructive">
        {problem && crossoverErrorMessage(problem)}
      </p>
      <p id={noteId} className="text-xs text-muted-foreground">
        Where your receiver hands the bass from the speakers to the subwoofers.
        80 Hz is a common setting.
      </p>
    </div>
  )
}
