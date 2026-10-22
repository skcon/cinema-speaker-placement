import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { withCrossover } from '@/domain'
import { useConfig } from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { CrossoverField } from '@/ui/CrossoverField'

function StoredCrossover() {
  const hz = useConfig((state) => state.config.crossoverHz)
  return <output aria-label="stored">{hz}</output>
}

function SetElsewhere() {
  const applyEdit = useConfig((state) => state.applyEdit)
  return (
    <button onClick={() => applyEdit((config) => withCrossover(config, 120))}>
      Set 120 Hz elsewhere
    </button>
  )
}

function renderField() {
  render(
    <ConfigStoreProvider>
      <CrossoverField />
      <StoredCrossover />
      <SetElsewhere />
    </ConfigStoreProvider>,
  )
  return screen.getByRole('textbox', { name: 'Crossover (Hz)' })
}

describe('crossover field', () => {
  it('starts at 80 Hz and stores a valid frequency as typed', () => {
    const field = renderField()
    expect(field).toHaveValue('80')

    fireEvent.change(field, { target: { value: '100' } })

    expect(screen.getByLabelText('stored')).toHaveTextContent('100')
    expect(field).toHaveAttribute('aria-invalid', 'false')
  })

  it('says inline when the frequency is out of range, and keeps the last valid one', () => {
    const field = renderField()

    fireEvent.change(field, { target: { value: '250' } })

    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(
      /^Crossover must be between 40 Hz and 200 Hz\./,
    )
    expect(screen.getByLabelText('stored')).toHaveTextContent('80')
  })

  it('asks for a number', () => {
    const field = renderField()

    fireEvent.change(field, { target: { value: 'abc' } })

    expect(field).toHaveAccessibleDescription(
      /^Enter the crossover as a number\./,
    )
  })

  it('follows the store when the crossover changes elsewhere', () => {
    const field = renderField()

    fireEvent.click(
      screen.getByRole('button', { name: 'Set 120 Hz elsewhere' }),
    )

    expect(field).toHaveValue('120')
  })
})
