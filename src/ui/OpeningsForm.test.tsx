import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { HistoryButtons } from '@/ui/HistoryButtons'
import { PositionsForm } from '@/ui/PositionsForm'
import { RoomObjectsForm } from '@/ui/RoomObjectsForm'
import { SpeakerList } from '@/ui/SpeakerList'

function renderOpenings() {
  render(
    <ConfigStoreProvider>
      <HistoryButtons />
      <SpeakerList />
      <PositionsForm />
      <RoomObjectsForm />
    </ConfigStoreProvider>,
  )
}

function opening(name: string) {
  return screen.getByRole('region', { name })
}

/** The metre text box of length field `label` in `region`. */
function meters(region: HTMLElement, label: string | RegExp) {
  const field = within(region).getByRole('group', { name: label })
  return within(field).getByRole('textbox', { name: 'm' })
}

function type(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

/** Type into a field and leave it, as a position edit is applied on leaving. */
function enter(input: HTMLElement, value: string) {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

/** The position editor of speaker `name`, opened. */
function position(name: string) {
  const group = screen.getByRole('group', { name: `${name} position` })
  const details = group.querySelector('details')
  if (details && !details.open) fireEvent.click(within(group).getByText(name))
  return group
}

describe('doors and windows in the sidebar', () => {
  it('start with none, say they are not modelled, and add a door on the back wall', () => {
    renderOpenings()
    expect(
      screen.getByText(
        /used for placement warnings, but not modelled: the estimated response still assumes closed, solid walls/,
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add a door' }))

    const door = opening('Door (opening 1)')
    expect(within(door).getByRole('radio', { name: 'Back wall' })).toBeChecked()
    expect(meters(door, 'Opening width')).toHaveValue('0.9')
    expect(meters(door, 'From the left wall')).toHaveValue('1.8')
    expect(
      within(door).queryByRole('group', { name: 'Sill height' }),
    ).toBeNull()
  })

  it('add a window with a sill and height, move it to another wall and resize it', () => {
    renderOpenings()
    fireEvent.click(screen.getByRole('button', { name: 'Add a window' }))
    const window = () => opening('Window (opening 1)')
    expect(meters(window(), 'Sill height')).toHaveValue('0.9')
    expect(meters(window(), 'From the front wall')).toHaveValue('2.4')

    fireEvent.click(within(window()).getByRole('radio', { name: 'Left wall' }))
    type(meters(window(), 'Window height'), '1.5')
    type(meters(window(), 'From the front wall'), '1')

    expect(
      within(window()).getByRole('radio', { name: 'Left wall' }),
    ).toBeChecked()
    expect(meters(window(), 'Window height')).toHaveValue('1.5')
    expect(meters(window(), 'From the front wall')).toHaveValue('1')
  })

  it('remove one, and undo brings it back', () => {
    renderOpenings()
    fireEvent.click(screen.getByRole('button', { name: 'Add a door' }))

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Door (opening 1)' }),
    )
    expect(
      screen.queryByRole('region', { name: 'Door (opening 1)' }),
    ).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(opening('Door (opening 1)')).toBeInTheDocument()
  })

  it('stop adding at six', () => {
    renderOpenings()
    const add = screen.getByRole('button', { name: 'Add a window' })
    for (let n = 0; n < 6; n += 1) fireEvent.click(add)

    expect(add).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add a door' })).toBeDisabled()
    expect(
      screen.getByText(/holds up to 6 doors and windows/),
    ).toBeInTheDocument()
  })

  it('warn about a speaker moved in front of a door, by the speaker and the door, and stop when it moves away', () => {
    renderOpenings()
    fireEvent.click(screen.getByRole('button', { name: 'Add a door' }))
    const message =
      'Center is in front of Door (opening 1), where the door swings.'
    expect(screen.queryByText(message)).toBeNull()

    // The door is in the middle of the 6 m long room's back wall: Center
    // moved 5.6 m out from the front wall is 0.4 m in front of it.
    enter(meters(position('Center'), /^From the front wall/), '5.6')

    const speakers = screen.getByRole('table', { name: 'Speakers' })
    expect(within(speakers).getByText(message)).toBeInTheDocument()
    const byDoor = screen.getByRole('list', {
      name: 'Placement warnings for Door (opening 1)',
    })
    expect(within(byDoor).getByText(message)).toBeInTheDocument()
    expect(
      within(byDoor).getByText(/W1, Our own assumption\. Not acoustic/),
    ).toBeInTheDocument()

    enter(meters(position('Center'), /^From the back wall/), '1.5')

    expect(screen.queryByText(message)).toBeNull()
    expect(
      screen.queryByRole('list', {
        name: 'Placement warnings for Door (opening 1)',
      }),
    ).toBeNull()
  })
})
