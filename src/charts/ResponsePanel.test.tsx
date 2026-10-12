import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResponsePanel } from '@/charts/ResponsePanel'
import { useConfig } from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'

/** Stands in for the layout form: switches to four subwoofers. */
function FourSubwoofersButton() {
  const setSubwooferCount = useConfig((state) => state.setSubwooferCount)
  return <button onClick={() => setSubwooferCount(4)}>Four subwoofers</button>
}

function renderPanel() {
  render(
    <ConfigStoreProvider>
      <ResponsePanel />
      <FourSubwoofersButton />
    </ConfigStoreProvider>,
  )
}

function summary() {
  return screen.getByText(/^Within ±3 dB of the/).textContent
}

describe('response panel', () => {
  it('sums up the estimate against the flat target in words', () => {
    renderPanel()

    expect(summary()).toMatch(
      /^Within ±3 dB of the flat target over \d+% of 20–200 Hz\. Largest peak: \+\d+\.\d dB at \d+(\.\d)? Hz\. Deepest dip: −\d+\.\d dB at \d+(\.\d)? Hz\.$/,
    )
  })

  it('updates when the subwoofers change', () => {
    renderPanel()
    const before = summary()

    fireEvent.click(screen.getByRole('button', { name: 'Four subwoofers' }))

    expect(summary()).not.toBe(before)
  })

  it('switches to the house curve, labelled as our assumption', () => {
    renderPanel()
    const picker = screen.getByRole('radiogroup', { name: 'Target curve' })

    expect(within(picker).getByRole('radio', { name: 'Flat' })).toBeChecked()
    fireEvent.click(within(picker).getByRole('radio', { name: /House curve/ }))

    expect(summary()).toMatch(/^Within ±3 dB of the house curve/)
    expect(screen.getByText(/house curve is our own assumption/i)).toBeVisible()
  })

  it('lists the estimate and the target at third-octave frequencies in a table', () => {
    renderPanel()

    const table = screen.getByRole('table', {
      name: 'Estimated response and target by frequency',
    })
    const rows = within(table).getAllByRole('row')
    // A header row and 20, 25.2 ... 200 Hz.
    expect(rows).toHaveLength(12)
    expect(within(rows[1]!).getAllByRole('cell')[0]).toHaveTextContent(
      '20.0 Hz',
    )
    expect(within(rows[11]!).getAllByRole('cell')[0]).toHaveTextContent(
      '200 Hz',
    )
  })

  it('names the model and its assumptions', () => {
    renderPanel()

    expect(
      screen.getByText(/room modes only.*0\.5 s reverberation time/i),
    ).toBeVisible()
  })
})
