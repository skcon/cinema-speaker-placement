import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { HistoryButtons } from '@/ui/HistoryButtons'
import { RoomForm } from '@/ui/RoomForm'
import { RoomObjectsForm } from '@/ui/RoomObjectsForm'

function renderRoomObjects() {
  render(
    <ConfigStoreProvider>
      <HistoryButtons />
      <RoomForm />
      <RoomObjectsForm />
    </ConfigStoreProvider>,
  )
  return screen.getByRole('region', { name: 'Room objects' })
}

/** The text box labelled with `unit` inside the length field `label`. */
function input(label: string, unit: 'm' | 'ft' | 'in') {
  const field = screen.getByRole('group', { name: label })
  return within(field).getByRole('textbox', { name: unit })
}

function type(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

describe('room objects in the sidebar', () => {
  it('say they are drawn and warned about, not part of the estimate', () => {
    const section = renderRoomObjects()

    expect(section).toHaveAccessibleDescription(
      /drawn in the room view and used for placement warnings, but they are not part of the estimated response/,
    )
  })

  it('show the seat row as 2 m wide and 0.9 m deep, and resize it as undoable steps', () => {
    renderRoomObjects()
    expect(input('Seat row width', 'm')).toHaveValue('2')
    expect(input('Seat row depth', 'm')).toHaveValue('0.9')

    type(input('Seat row depth', 'm'), '1.2')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(input('Seat row depth', 'm')).toHaveValue('0.9')
  })

  it('explain a seat row size out of range in feet and inches in imperial', () => {
    renderRoomObjects()
    fireEvent.click(screen.getByRole('radio', { name: 'Imperial (ft + in)' }))

    type(input('Seat row depth', 'ft'), '7')

    expect(
      screen.getByText(
        /^Seat row depth must be between 1 ft 7\.\d in and 6 ft 6\.\d in\.$/,
      ),
    ).toBeInTheDocument()
  })

  it('start without a screen, and add a 65 in TV centred on the front wall', () => {
    renderRoomObjects()
    expect(screen.getByText(/^No screen\./)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add a screen' }))

    expect(screen.getByRole('radio', { name: 'TV' })).toBeChecked()
    expect(input('Screen width', 'm')).toHaveValue('1.44')
    expect(input('Screen height', 'm')).toHaveValue('0.81')
    expect(input('Bottom edge above the floor', 'm')).toHaveValue('0.93')
    expect(input('Left edge from the left wall', 'm')).toHaveValue('1.53')
    expect(
      screen.queryByRole('group', { name: 'Standoff from the front wall' }),
    ).not.toBeInTheDocument()
  })

  it('resizes the screen, and explains a size that does not fit in the room', () => {
    renderRoomObjects()
    fireEvent.click(screen.getByRole('button', { name: 'Add a screen' }))

    type(input('Screen width', 'm'), '2')
    expect(input('Left edge from the left wall', 'm')).toHaveValue('1.25')

    type(input('Screen width', 'm'), '5')
    expect(
      screen.getByText('Screen width must be between 0.5 m and 4.5 m.'),
    ).toBeInTheDocument()
    expect(input('Left edge from the left wall', 'm')).toHaveValue('1.25')
  })

  it('gives the ranges in feet and inches in imperial', () => {
    renderRoomObjects()
    fireEvent.click(screen.getByRole('radio', { name: 'Imperial (ft + in)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add a screen' }))

    type(input('Bottom edge above the floor', 'ft'), '9')

    // 2.6 - 0.81 = 1.79 m, rounded down so the limit shown is accepted.
    expect(
      screen.getByText(
        'Bottom edge above the floor must be between 0 ft 0 in and 5 ft 10.4 in.',
      ),
    ).toBeInTheDocument()
  })

  it('makes a projection screen acoustically transparent, with a standoff to edit', () => {
    renderRoomObjects()
    fireEvent.click(screen.getByRole('button', { name: 'Add a screen' }))

    fireEvent.click(screen.getByRole('radio', { name: 'Projection screen' }))
    fireEvent.click(
      screen.getByRole('radio', {
        name: 'Acoustically transparent, speakers behind it',
      }),
    )

    expect(input('Standoff from the front wall', 'm')).toHaveValue('0.75')
  })

  it('removes the screen, and undo brings it back', () => {
    renderRoomObjects()
    fireEvent.click(screen.getByRole('button', { name: 'Add a screen' }))

    fireEvent.click(screen.getByRole('button', { name: 'Remove the screen' }))
    expect(
      screen.getByRole('button', { name: 'Add a screen' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(input('Screen width', 'm')).toHaveValue('1.44')
  })
})
