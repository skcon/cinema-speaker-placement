import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { HistoryButtons } from '@/ui/HistoryButtons'
import { RoomObjectsForm } from '@/ui/RoomObjectsForm'
import { SpeakerList } from '@/ui/SpeakerList'

function renderFurniture() {
  render(
    <ConfigStoreProvider>
      <HistoryButtons />
      <SpeakerList />
      <RoomObjectsForm />
    </ConfigStoreProvider>,
  )
}

function box(name: string) {
  return screen.getByRole('region', { name })
}

/** The metre text box of length field `label` in `region`. */
function meters(region: HTMLElement, label: string) {
  const field = within(region).getByRole('group', { name: label })
  return within(field).getByRole('textbox', { name: 'm' })
}

function type(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

describe('furniture in the sidebar', () => {
  it('starts with none, says boxes are not part of the estimate, and adds a cabinet', () => {
    renderFurniture()
    expect(
      screen.getByText(
        /used for placement warnings, but not part of the estimated response/,
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add a cabinet' }))

    const cabinet = box('Cabinet (box 1)')
    expect(within(cabinet).getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Cabinet',
    )
    expect(meters(cabinet, 'Box width')).toHaveValue('1.6')
    expect(meters(cabinet, 'Box height')).toHaveValue('0.5')
    expect(
      within(cabinet).getByText(/its front faces the back wall/),
    ).toBeInTheDocument()
  })

  it('renames a box, and explains a name it cannot take', () => {
    renderFurniture()
    fireEvent.click(screen.getByRole('button', { name: 'Add a table' }))
    const name = within(box('Table (box 1)')).getByRole('textbox', {
      name: 'Name',
    })

    type(name, 'Soffbord')
    expect(box('Soffbord (box 1)')).toBeInTheDocument()

    type(name, 'Soffbord 書')
    expect(
      screen.getByText(/^Use letters \(also with accents such as é or ö\)/),
    ).toBeInTheDocument()
    expect(box('Soffbord (box 1)')).toBeInTheDocument()
  })

  it('resizes, turns and removes a box, and undo brings it back', () => {
    renderFurniture()
    fireEvent.click(screen.getByRole('button', { name: 'Add a shelf' }))

    type(meters(box('Shelf (box 1)'), 'Box height'), '2')
    fireEvent.click(
      screen.getByRole('button', { name: 'Turn Shelf (box 1) 90°' }),
    )
    expect(
      within(box('Shelf (box 1)')).getByText(/its front faces the left wall/),
    ).toBeInTheDocument()
    expect(meters(box('Shelf (box 1)'), 'Box height')).toHaveValue('2')

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Shelf (box 1)' }),
    )
    expect(screen.queryByRole('region', { name: 'Shelf (box 1)' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(box('Shelf (box 1)')).toBeInTheDocument()
  })

  it('stops adding at eight boxes', () => {
    renderFurniture()
    const add = screen.getByRole('button', { name: 'Add a table' })
    for (let n = 0; n < 8; n += 1) fireEvent.click(add)

    expect(add).toBeDisabled()
    expect(
      screen.getByText(/holds up to 8 furniture boxes/),
    ).toBeInTheDocument()
  })

  it('shows placement warnings with their source, by the box, in the list and by the speaker', () => {
    renderFurniture()
    expect(screen.getByText('No placement warnings.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add a shelf' }))

    // 1.8 m high, moved 1 m out from the front wall: between Center and the MLP.
    type(meters(box('Shelf (box 1)'), 'Box from the front wall'), '1')

    const message =
      'Shelf (box 1) blocks the direct sound from Center to the MLP.'
    const all = screen.getByRole('list', { name: 'Placement warnings' })
    expect(within(all).getByText(message)).toBeInTheDocument()
    expect(within(all).getByText(/W4, Standard:/)).toBeInTheDocument()
    expect(
      within(all).getByRole('link', { name: /EBU Tech 3276/ }),
    ).toHaveAttribute('href', 'https://tech.ebu.ch/docs/tech/tech3276.pdf')
    expect(
      within(
        screen.getByRole('list', {
          name: 'Placement warnings for Shelf (box 1)',
        }),
      ).getByText(message),
    ).toBeInTheDocument()
    const speakers = screen.getByRole('table', { name: 'Speakers' })
    expect(within(speakers).getByText(message)).toBeInTheDocument()
  })
})
