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
  it('sums up the reliable part of the estimate against the flat target in words', () => {
    renderPanel()

    // One front-wall subwoofer: reliable from the first length mode, 28.6 Hz.
    expect(summary()).toMatch(
      /^Within ±3 dB of the flat target over \d+% of 28\.6–502 Hz\. Largest peak: \+\d+\.\d dB at \d+(\.\d)? Hz\. Deepest dip: −\d+\.\d dB at \d+(\.\d)? Hz\.$/,
    )
  })

  it('says below which frequency the estimate is unreliable, and why', () => {
    renderPanel()

    expect(
      screen.getByText(
        /^Below 28\.6 Hz, the lowest room mode the subwoofers excite, the estimate isn’t reliable/,
      ),
    ).toBeVisible()
    expect(
      screen.getByText(/room gain below the lowest mode isn’t modelled/i),
    ).toBeVisible()
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
    // A header row and 20, 25.2 ... 502 Hz.
    expect(rows).toHaveLength(16)
    const [frequency, estimate] = within(rows[1]!).getAllByRole('cell')
    expect(frequency).toHaveTextContent('20 Hz')
    // Below 28.6 Hz.
    expect(estimate).toHaveTextContent('(unreliable)')
    expect(within(rows[15]!).getAllByRole('cell')[0]).toHaveTextContent(
      '502 Hz',
    )
  })

  it('names the model and its assumptions', () => {
    renderPanel()

    expect(
      screen.getByText(/room modes up to 200 Hz.*0\.5 s reverberation time/i),
    ).toBeVisible()
    expect(screen.getByText(/80 Hz crossover/)).toHaveTextContent(
      /the Left, Center and Right speakers/,
    )
  })

  it('lists weaknesses with their likely cause, labelled as coming from the estimate', () => {
    renderPanel()

    const weaknesses = screen.getByRole('list', { name: 'Weaknesses' })
    expect(
      within(weaknesses).getByText(
        // The front stage shares one distance from the front wall, so Left,
        // Center and Right share one notch.
        /^Dip at 1\d\d Hz \(−\d+\.\d dB\): likely a floor, front-wall and side-wall reflection notch \(Left, Center and Right\)\.$/,
      ),
    ).toBeVisible()
    expect(
      screen.getByText(/likely causes in this simplified model/i),
    ).toBeVisible()
  })

  it('lists strengths', () => {
    renderPanel()

    const strengths = screen.getByRole('list', { name: 'Strengths' })
    // One subwoofer in the middle of the front wall: on the first width mode's node.
    expect(
      within(strengths).getByText(
        'The subwoofers cancel the first width mode (38.1 Hz).',
      ),
    ).toBeVisible()
  })
})
