import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { RoomForm } from '@/ui/RoomForm'

function renderRoomForm() {
  render(
    <ConfigStoreProvider>
      <RoomForm />
    </ConfigStoreProvider>,
  )
}

/** The text box labelled with `unit` inside the field for `dimension`. */
function input(dimension: string, unit: 'm' | 'ft' | 'in') {
  const field = screen.getByRole('group', { name: dimension })
  return within(field).getByRole('textbox', { name: unit })
}

function chooseUnits(name: 'Metric (m)' | 'Imperial (ft + in)') {
  fireEvent.click(screen.getByRole('radio', { name }))
}

function type(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

describe('room form', () => {
  it('shows the default room in meters', () => {
    renderRoomForm()

    expect(screen.getByRole('radio', { name: 'Metric (m)' })).toBeChecked()
    expect(input('Length', 'm')).toHaveValue('6')
    expect(input('Width', 'm')).toHaveValue('4.5')
    expect(input('Height', 'm')).toHaveValue('2.6')
  })

  it('converts the room to feet and inches when switching to imperial', () => {
    renderRoomForm()

    chooseUnits('Imperial (ft + in)')

    // 6 m = 19 ft 8.2 in, 4.5 m = 14 ft 9.2 in, 2.6 m = 8 ft 6.4 in
    expect(input('Length', 'ft')).toHaveValue('19')
    expect(input('Length', 'in')).toHaveValue('8.2')
    expect(input('Width', 'ft')).toHaveValue('14')
    expect(input('Width', 'in')).toHaveValue('9.2')
    expect(input('Height', 'ft')).toHaveValue('8')
    expect(input('Height', 'in')).toHaveValue('6.4')
  })

  it('converts imperial input back to meters when switching to metric', () => {
    renderRoomForm()
    chooseUnits('Imperial (ft + in)')

    type(input('Length', 'ft'), '20')
    type(input('Length', 'in'), '0')
    chooseUnits('Metric (m)')

    // 20 ft = 6.096 m
    expect(input('Length', 'm')).toHaveValue('6.1')
    expect(input('Width', 'm')).toHaveValue('4.5')
  })

  it('shows an inline error for a room size out of range', () => {
    renderRoomForm()

    type(input('Length', 'm'), '20')

    expect(input('Length', 'm')).toHaveAccessibleDescription(
      'Length must be between 2 m and 15 m.',
    )
    expect(input('Length', 'm')).toBeInvalid()
  })

  it('shows the range in feet and inches in imperial mode', () => {
    renderRoomForm()
    chooseUnits('Imperial (ft + in)')

    type(input('Height', 'ft'), '17')

    // 2 m and 5 m, rounded inward to the 0.1 in display step
    expect(input('Height', 'ft')).toHaveAccessibleDescription(
      'Height must be between 6 ft 6.8 in and 16 ft 4.8 in.',
    )
  })

  it('asks for a number when the field is not one', () => {
    renderRoomForm()

    type(input('Width', 'm'), 'abc')

    expect(input('Width', 'm')).toHaveAccessibleDescription(
      'Enter the width as a number.',
    )
  })

  it('keeps the last valid size while a field is in error', () => {
    renderRoomForm()

    type(input('Width', 'm'), '5')
    type(input('Width', 'm'), '50')
    chooseUnits('Imperial (ft + in)')

    // 5 m = 16 ft 4.9 in
    expect(input('Width', 'ft')).toHaveValue('16')
    expect(input('Width', 'in')).toHaveValue('4.9')
  })

  it('accepts a decimal comma', () => {
    renderRoomForm()

    type(input('Height', 'm'), '2,75')
    chooseUnits('Imperial (ft + in)')

    // 2.75 m = 108.27 in = 9 ft 0.3 in
    expect(input('Height', 'ft')).toHaveValue('9')
    expect(input('Height', 'in')).toHaveValue('0.3')
  })
})
