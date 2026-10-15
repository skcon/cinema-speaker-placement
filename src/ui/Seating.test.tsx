import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { PositionsForm } from '@/ui/PositionsForm'
import { Seating } from '@/ui/Seating'

function renderSeating() {
  render(
    <ConfigStoreProvider>
      <Seating />
      <PositionsForm />
    </ConfigStoreProvider>,
  )
  return screen.getByRole('region', { name: 'Seating' })
}

describe('seating in the sidebar', () => {
  it('recommends a seat, says it is an estimate, and moves the MLP there on request', async () => {
    const seating = renderSeating()

    const move = await within(seating).findByRole('button', {
      name: 'Move MLP here',
    })
    expect(seating).toHaveTextContent(/estimate from a simplified model/)
    expect(
      screen.getByRole('group', { name: 'MLP position' }),
    ).toHaveTextContent('auto')

    fireEvent.click(move)

    expect(
      await within(seating).findByText(/Your MLP is at the recommended seat/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'MLP position' }),
    ).toHaveTextContent('manual')
    expect(
      within(seating).getByRole('button', { name: 'Move MLP here' }),
    ).toBeDisabled()
  })

  it('shows the 38% rule of thumb as a reference only', () => {
    const seating = renderSeating()

    expect(seating).toHaveTextContent(/38% rule/)
    expect(seating).toHaveTextContent(/2\.28 m from the front wall/)
    expect(seating).toHaveTextContent(
      /Reference only.*not a standard.*not part of the recommendation/,
    )
  })

  it('takes a seat row width', () => {
    const seating = renderSeating()
    const width = within(
      within(seating).getByRole('group', { name: /^Seat row width/ }),
    ).getByRole('textbox', { name: 'm' })

    fireEvent.focus(width)
    fireEvent.change(width, { target: { value: '3.5' } })
    fireEvent.blur(width)

    expect(width).toHaveValue('3.5')
  })
})
