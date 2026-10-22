import { checkCrossover, withCrossover, type CrossoverProblem } from '@/domain'
import { useConfig } from '@/state/config-context'
import { NumberField } from '@/ui/NumberField'

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
  const applyEdit = useConfig((state) => state.applyEdit)
  return (
    <NumberField
      label="Crossover (Hz)"
      value={hz}
      check={checkCrossover}
      onValid={(valid) => applyEdit((config) => withCrossover(config, valid))}
      errorMessage={crossoverErrorMessage}
      note="Where your receiver hands the bass from the speakers to the subwoofers. 80 Hz is a common setting."
    />
  )
}
