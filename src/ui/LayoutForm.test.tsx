import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useConfig } from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { LayoutForm } from '@/ui/LayoutForm'

/** Shows the stored layout, as the room view and the share link will read it. */
function StoredLayout() {
  const { dolbyLayout, subwoofers } = useConfig((state) => state.config.layout)
  return <output>{`${dolbyLayout} with ${subwoofers} subwoofer`}</output>
}

function renderLayoutForm() {
  render(
    <ConfigStoreProvider>
      <LayoutForm />
      <StoredLayout />
    </ConfigStoreProvider>,
  )
}

function layoutPicker() {
  return screen.getByRole('radiogroup', { name: 'Layout' })
}

describe('layout form', () => {
  it('offers the eight v1 layouts in X.Y.Z notation, with 5.1.2 chosen', () => {
    renderLayoutForm()

    const options = within(layoutPicker()).getAllByRole('radio')
    expect(options.map((option) => option.textContent)).toEqual([
      '2.1',
      '3.1',
      '5.1',
      '7.1',
      '5.1.2',
      '5.1.4',
      '7.1.2',
      '7.1.4',
    ])
    expect(screen.getByRole('radio', { name: '5.1.2' })).toBeChecked()
  })

  it('stores the layout the user picks', () => {
    renderLayoutForm()

    fireEvent.click(screen.getByRole('radio', { name: '7.1.4' }))

    expect(screen.getByRole('radio', { name: '7.1.4' })).toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent(
      '7.1.4 with 1 subwoofer',
    )
  })

  it('keeps the layout when the chosen option is clicked again', () => {
    renderLayoutForm()

    fireEvent.click(screen.getByRole('radio', { name: '5.1.2' }))

    expect(screen.getByRole('radio', { name: '5.1.2' })).toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent(
      '5.1.2 with 1 subwoofer',
    )
  })

  it('says only the listener-level speakers are placed for a layout with overheads', () => {
    renderLayoutForm()

    expect(
      screen.getByText(/overhead speakers aren.t placed yet/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '7.1' }))

    expect(
      screen.queryByText(/overhead speakers aren.t placed yet/i),
    ).not.toBeInTheDocument()
  })

  it('has an Auto-place button that keeps the layout', () => {
    renderLayoutForm()
    fireEvent.click(screen.getByRole('radio', { name: '3.1' }))

    fireEvent.click(screen.getByRole('button', { name: 'Auto-place' }))

    expect(screen.getByRole('status')).toHaveTextContent('3.1 with 1 subwoofer')
  })
})
