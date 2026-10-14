import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useConfig } from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { HeadroomIndicator } from '@/ui/HeadroomIndicator'

/** Stands in for the amplifier power field. */
function SetWatts({ watts }: { watts: number }) {
  const setAmplifierWatts = useConfig((state) => state.setAmplifierWatts)
  return <button onClick={() => setAmplifierWatts(watts)}>Set {watts} W</button>
}

function renderIndicator() {
  render(
    <ConfigStoreProvider>
      <HeadroomIndicator />
      <SetWatts watts={1000} />
    </ConfigStoreProvider>,
  )
}

function item(name: RegExp) {
  return within(screen.getByRole('list', { name: 'Headroom' }))
    .getAllByRole('listitem')
    .find((li) => name.test(li.textContent ?? ''))!
}

describe('headroom indicator', () => {
  it('says what it checks against, and that it is an estimate', () => {
    renderIndicator()

    expect(
      screen.getByText(/102 dB .*reference level, 82 dB, plus 20 dB/),
    ).toBeVisible()
    expect(screen.getByText(/rough estimate, not a measurement/i)).toBeVisible()
  })

  it('gives every speaker group of the layout and the subwoofers a status in plain language', () => {
    renderIndicator()

    // Our 88 dB, 100 W defaults just reach reference peaks.
    expect(item(/^Front L\/R/)).toHaveTextContent(/Tight/)
    expect(item(/^Front L\/R/)).toHaveTextContent(/would leave 3\.0 dB/)
    expect(item(/^Center/)).toBeDefined()
    expect(item(/^Surrounds/)).toBeDefined()
    expect(item(/^Subwoofers/)).toHaveTextContent(/112 dB/)
    expect(item(/^Subwoofers/)).toHaveTextContent(/very rough/i)
    expect(item(/^Subwoofers/)).toHaveTextContent(/RMS power on purpose/)
  })

  it('says overheads are not checked until they are placed', () => {
    renderIndicator()

    expect(item(/^Overheads/)).toHaveTextContent(/not placed yet/i)
  })

  it('updates when the amplifier power changes', () => {
    renderIndicator()

    fireEvent.click(screen.getByRole('button', { name: 'Set 1000 W' }))

    expect(item(/^Front L\/R/)).toHaveTextContent(/Enough/)
    expect(item(/^Front L\/R/)).toHaveTextContent(/to spare at 1,000 W/)
  })
})
