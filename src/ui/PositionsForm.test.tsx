import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { LayoutForm } from '@/ui/LayoutForm'
import { PositionsForm } from '@/ui/PositionsForm'
import { RoomForm } from '@/ui/RoomForm'

function renderPositions() {
  render(
    <ConfigStoreProvider>
      <RoomForm />
      <LayoutForm />
      <PositionsForm />
    </ConfigStoreProvider>,
  )
}

/** The editor of one item, by its name ("Right", "Subwoofer 1", "MLP"), opened. */
function item(name: string) {
  const group = screen.getByRole('group', { name: `${name} position` })
  const details = group.querySelector('details')
  if (details && !details.open) fireEvent.click(within(group).getByText(name))
  return group
}

function field(itemName: string, label: RegExp, unit = 'm') {
  const group = within(item(itemName)).getByRole('group', { name: label })
  return within(group).getByRole('textbox', { name: unit })
}

/** Type into a field and leave it, as an edit is applied when the field is left. */
function enter(input: HTMLElement, value: string) {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('positions in the sidebar', () => {
  it("show each speaker's height and distances to its nearest walls, all auto at first", () => {
    renderPositions()

    // The default Center: on the center line, 0.3 m from the front wall,
    // at ear height, in the 4.5 m wide room.
    expect(field('Center', /^Height/)).toHaveValue('1.2')
    expect(field('Center', /^From the front wall/)).toHaveValue('0.3')
    expect(field('Center', /^From the left wall/)).toHaveValue('2.25')
    expect(item('Center')).toHaveTextContent('auto')
  })

  it('move a speaker when a distance or its height is edited, which makes it manual', () => {
    renderPositions()

    enter(field('Center', /^From the front wall/), '0.8')
    enter(field('Center', /^Height/), '1.5')

    expect(field('Center', /^From the front wall/)).toHaveValue('0.8')
    expect(field('Center', /^Height/)).toHaveValue('1.5')
    expect(item('Center')).toHaveTextContent('manual')
    expect(item('Left')).toHaveTextContent('auto')
  })

  it('keep an edit inside the wall clearance, and show where it went', () => {
    renderPositions()

    enter(field('Center', /^From the front wall/), '0')

    expect(field('Center', /^From the front wall/)).toHaveValue('0.3')
  })

  it('leave the item alone when an entry is not a number', () => {
    renderPositions()

    enter(field('Center', /^Height/), 'tall')

    expect(field('Center', /^Height/)).toHaveValue('1.2')
    expect(item('Center')).toHaveTextContent('auto')
  })

  it('show subwoofers and the MLP at their fixed heights, with editable wall distances', () => {
    renderPositions()

    expect(
      within(item('Subwoofer 1')).queryByRole('group', { name: /^Height/ }),
    ).toBeNull()
    expect(item('Subwoofer 1')).toHaveTextContent(/height 0\.3 m/i)
    expect(item('MLP')).toHaveTextContent(/ear height 1\.2 m/i)

    enter(field('MLP', /^From the front wall/), '3')
    expect(item('MLP')).toHaveTextContent('manual')
  })

  it('show overheads on the ceiling, height not editable, with their elevation and its grade', () => {
    renderPositions()

    expect(
      within(item('Left Top Middle')).queryByRole('group', {
        name: /^Height/,
      }),
    ).toBeNull()
    expect(item('Left Top Middle')).toHaveTextContent(/ceiling 2\.6 m/i)
    expect(item('Left Top Middle')).toHaveTextContent(
      /elevation 83° \(ideal\)/i,
    )

    // 0.3 m from the front wall: atan(1.4 / 1.98) = 35°, outside 65°–100°.
    enter(field('Left Top Middle', /^From the front wall/), '0.3')
    expect(item('Left Top Middle')).toHaveTextContent('manual')
    expect(item('Left Top Middle')).toHaveTextContent(
      /elevation 35° \(outside\)/i,
    )
  })

  it('are in the chosen units', () => {
    renderPositions()

    fireEvent.click(screen.getByRole('radio', { name: 'Imperial (ft + in)' }))

    // 1.2 m is 3 ft 11.2 in.
    expect(field('Center', /^Height/, 'ft')).toHaveValue('3')
    expect(field('Center', /^Height/, 'in')).toHaveValue('11.2')
  })

  it('all go back to auto on Auto-place, the MLP to the recommended seat, and Auto-place is off once that changes nothing', async () => {
    renderPositions()
    const autoPlace = screen.getByRole('button', { name: 'Auto-place' })

    enter(field('Center', /^Height/), '1.5')
    expect(autoPlace).toBeEnabled()
    fireEvent.click(autoPlace)

    expect(field('Center', /^Height/)).toHaveValue('1.2')
    expect(item('Center')).toHaveTextContent('auto')
    // In the default room the recommended seat beats the 38% seed.
    expect(item('MLP')).toHaveTextContent('manual')
    await waitFor(() => expect(autoPlace).toBeDisabled())
  })
})
