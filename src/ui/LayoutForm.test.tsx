import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { withRoomDimension } from '@/domain'
import { useConfig } from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { LayoutForm } from '@/ui/LayoutForm'

/** Shows the stored layout, as the room view and the share link will read it. */
function StoredLayout() {
  const { dolbyLayout, subwoofers } = useConfig((state) => state.config.layout)
  return <output>{`${dolbyLayout} with ${subwoofers} subwoofer`}</output>
}

/** Sets the room height and the units, as the room form would. */
function RoomControls() {
  const applyEdit = useConfig((state) => state.applyEdit)
  const setUnits = useConfig((state) => state.setUnits)
  return (
    <>
      <button
        onClick={() =>
          applyEdit((config) => withRoomDimension(config, 'height', 2.4))
        }
      >
        Ceiling 2.4 m
      </button>
      <button onClick={() => setUnits('imperial')}>Imperial</button>
    </>
  )
}

function renderLayoutForm() {
  render(
    <ConfigStoreProvider>
      <LayoutForm />
      <StoredLayout />
      <RoomControls />
    </ConfigStoreProvider>,
  )
}

function layoutPicker() {
  return screen.getByRole('radiogroup', { name: 'Layout' })
}

function chooseSubwooferCount(count: string) {
  fireEvent.click(
    within(screen.getByRole('radiogroup', { name: 'Subwoofers' })).getByRole(
      'radio',
      { name: count },
    ),
  )
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

  it('suggests Atmos-enabled speakers when the ceiling is 2.4 m or lower and the layout has overheads', () => {
    renderLayoutForm()
    const hint = /Dolby suggests Atmos-enabled speakers/i
    // The default room's 2.6 m ceiling is high enough.
    expect(screen.queryByText(hint)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ceiling 2.4 m' }))

    expect(
      screen.getByText(
        'With a ceiling of 2.4 m or lower, overhead speakers end up too close to the listeners. Dolby suggests Atmos-enabled speakers instead: they fire upward and reflect sound off the ceiling.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '7.1' }))
    expect(screen.queryByText(hint)).not.toBeInTheDocument()
  })

  it('writes the ceiling threshold in the chosen units', () => {
    renderLayoutForm()

    fireEvent.click(screen.getByRole('button', { name: 'Ceiling 2.4 m' }))
    fireEvent.click(screen.getByRole('button', { name: 'Imperial' }))

    expect(
      screen.getByText(/With a ceiling of 7 ft 10.5 in or lower/),
    ).toBeInTheDocument()
  })

  it('offers 1 to 4 subwoofers, with 1 chosen', () => {
    renderLayoutForm()

    const picker = screen.getByRole('radiogroup', { name: 'Subwoofers' })
    expect(
      within(picker)
        .getAllByRole('radio')
        .map((option) => option.textContent),
    ).toEqual(['1', '2', '3', '4'])
    expect(within(picker).getByRole('radio', { name: '1' })).toBeChecked()
  })

  it('stores the subwoofer count the user picks and writes it as the Y of every layout', () => {
    renderLayoutForm()

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Subwoofers' })).getByRole(
        'radio',
        { name: '2' },
      ),
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      '5.1.2 with 2 subwoofer',
    )
    expect(
      within(layoutPicker())
        .getAllByRole('radio')
        .map((option) => option.textContent),
    ).toEqual(['2.2', '3.2', '5.2', '7.2', '5.2.2', '5.2.4', '7.2.2', '7.2.4'])

    fireEvent.click(screen.getByRole('radio', { name: '7.2.4' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      '7.1.4 with 2 subwoofer',
    )
  })

  it('keeps the subwoofer count when the chosen count is clicked again', () => {
    renderLayoutForm()
    const picker = screen.getByRole('radiogroup', { name: 'Subwoofers' })

    fireEvent.click(within(picker).getByRole('radio', { name: '1' }))

    expect(within(picker).getByRole('radio', { name: '1' })).toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent(
      '5.1.2 with 1 subwoofer',
    )
  })

  it('notes, with its source, that 2 or 4 subwoofers usually even out the bass better than 3', () => {
    renderLayoutForm()
    const note = /2 or 4 subwoofers usually even out the bass better/i

    chooseSubwooferCount('3')

    expect(
      screen.getByText(
        '2 or 4 subwoofers usually even out the bass better: in Welti’s study the best layout for 3 varied 2.7 dB from seat to seat, against 1.3 dB for 2 and 0.9 dB for 4 (Harman white paper “Subwoofers: Optimum Number and Locations”, slides 48, 49 and 50).',
      ),
    ).toBeInTheDocument()

    chooseSubwooferCount('2')
    expect(screen.queryByText(note)).not.toBeInTheDocument()
    chooseSubwooferCount('4')
    expect(screen.queryByText(note)).not.toBeInTheDocument()
  })

  it('has an Auto-place button that keeps the layout', () => {
    renderLayoutForm()
    fireEvent.click(screen.getByRole('radio', { name: '3.1' }))

    fireEvent.click(screen.getByRole('button', { name: 'Auto-place' }))

    expect(screen.getByRole('status')).toHaveTextContent('3.1 with 1 subwoofer')
  })

  it('has Speakers follow the seat, on by default, which holds the speakers for the seat when turned off (#123)', () => {
    render(
      <ConfigStoreProvider>
        <LayoutForm />
        <StoredSeat />
      </ConfigStoreProvider>,
    )
    const toggle = screen.getByRole('checkbox', {
      name: 'Speakers follow the seat',
    })
    expect(toggle).toBeChecked()
    expect(screen.getByTestId('seat')).toHaveTextContent('following')

    fireEvent.click(toggle)

    expect(toggle).not.toBeChecked()
    expect(screen.getByTestId('seat')).toHaveTextContent('held at 0, 2.28')
    expect(
      screen.getByText(/auto speakers stay where they are/i),
    ).toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toBeChecked()
    expect(screen.getByTestId('seat')).toHaveTextContent('following')
  })
})

/** Shows the seat the speakers are installed for, as the share link holds it. */
function StoredSeat() {
  const seat = useConfig((state) => state.config.speakersInstalledFor)
  return (
    <p data-testid="seat">
      {seat ? `held at ${seat.x}, ${seat.y.toFixed(2)}` : 'following'}
    </p>
  )
}
