import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FloorPoint, PlaceableId } from '@/domain'
import type { SelectionDimensions } from '@/scene/dimensions'
import { RoomView } from '@/scene/RoomView'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { HistoryButtons } from '@/ui/HistoryButtons'
import { PositionsForm } from '@/ui/PositionsForm'
import { RoomObjectsForm } from '@/ui/RoomObjectsForm'
import { SelectedItemPanel } from '@/ui/SelectedItemPanel'

// jsdom has no WebGL: pretend it has, and stand in for the Three.js scene
// with what a pointer can do there (press Left, drag it, click the empty
// floor), and the dimension lines it is given to draw.
vi.mock('@/scene/webgl', () => ({ canUseWebGL: () => true }))
vi.mock('@/scene/RoomCanvas', () => ({
  RoomCanvas: ({
    selection,
    onSelect,
    onDeselect,
    onDragStart,
    onDragMove,
    onDragEnd,
  }: {
    selection: SelectionDimensions | null
    onSelect: (id: PlaceableId) => void
    onDeselect: () => void
    onDragStart: () => void
    onDragMove: (id: PlaceableId, to: FloorPoint) => void
    onDragEnd: () => void
  }) => (
    <>
      <button onClick={() => onSelect('L')}>press Left</button>
      <button
        onClick={() => {
          onSelect('L')
          onDragStart()
          onDragMove('L', { x: -1, y: 1 })
        }}
      >
        drag Left
      </button>
      <button onClick={onDragEnd}>release</button>
      <button onClick={onDeselect}>click empty floor</button>
      <ul aria-label="dimension lines">
        {selection?.lines.map(({ text }) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </>
  ),
}))

function renderApp() {
  render(
    <ConfigStoreProvider>
      <HistoryButtons />
      <SelectedItemPanel />
      <PositionsForm />
      <RoomView />
    </ConfigStoreProvider>,
  )
}

function panel() {
  return screen.getByRole('region', { name: 'Selected item' })
}

async function dimensionLines() {
  const list = await screen.findByRole('list', { name: 'dimension lines' })
  return within(list)
    .queryAllByRole('listitem')
    .map((item) => item.textContent)
}

/** Open an item's row under Positions, as a keyboard user would. */
function openPositionRow(name: string) {
  const group = screen.getByRole('group', { name: `${name} position` })
  fireEvent.click(within(group).getByText(name))
}

describe('the Selected item', () => {
  it('says how to select an item while none is', () => {
    renderApp()

    expect(panel()).toHaveTextContent(/Nothing selected/)
  })

  it('is selected by opening its row under Positions, and the panel shows its name, position, height, distance to the MLP and placement', async () => {
    renderApp()

    openPositionRow('Left')

    // Hand-computed in src/domain/item-distances.test.ts: 0.5 m from the
    // front wall, 1.38184 m from the left wall, 1.98043 m from the MLP.
    expect(
      await within(panel()).findByRole('heading', { name: 'Left' }),
    ).toBeInTheDocument()
    expect(panel()).toHaveTextContent(
      /Position\s*0\.5 m from the front wall, 1\.38 m from the left wall/,
    )
    expect(panel()).toHaveTextContent(/Height\s*1\.2 m/)
    expect(panel()).toHaveTextContent(/To the MLP\s*1\.98 m/)
    expect(panel()).toHaveTextContent(/Placement\s*auto/)
    expect(await dimensionLines()).toEqual(['0.5 m', '1.38 m', '1.98 m'])
  })

  it('is selected by pressing it in the room view, which also reads out its distances', async () => {
    renderApp()

    fireEvent.click(await screen.findByText('press Left'))

    expect(within(panel()).getByRole('heading', { name: 'Left' })).toBeVisible()
    expect(
      screen.getByRole('status', { name: 'Selected in the room view' }),
    ).toHaveTextContent(
      'Left: 0.5 m to the front wall, 1.38 m to the left wall, 1.98 m to the MLP',
    )
  })

  it('updates its numbers live while it is dragged, and becomes manual', async () => {
    renderApp()

    fireEvent.click(await screen.findByText('drag Left'))

    // At (−1, 1): 1 m from the front wall, 2.25 − 1 = 1.25 m from the left
    // wall, √(1² + 1.28²) = √2.6384 = 1.62 m from the MLP at (0, 2.28).
    expect(panel()).toHaveTextContent(
      /Position\s*1 m from the front wall, 1\.25 m from the left wall/,
    )
    expect(panel()).toHaveTextContent(/To the MLP\s*1\.62 m/)
    expect(panel()).toHaveTextContent(/Placement\s*manual/)
    expect(await dimensionLines()).toEqual(['1 m', '1.25 m', '1.62 m'])
  })

  it('has no distance to the MLP when it is the MLP', async () => {
    renderApp()

    openPositionRow('MLP')

    expect(
      await within(panel()).findByRole('heading', { name: 'MLP' }),
    ).toBeVisible()
    expect(panel()).toHaveTextContent(/Height\s*1\.2 m/)
    expect(panel()).not.toHaveTextContent(/To the MLP/)
  })

  it('is cleared by Escape', async () => {
    renderApp()
    fireEvent.click(await screen.findByText('press Left'))

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(panel()).toHaveTextContent(/Nothing selected/)
    expect(await dimensionLines()).toEqual([])
  })

  it('is cleared by a click on the empty floor', async () => {
    renderApp()
    fireEvent.click(await screen.findByText('press Left'))

    fireEvent.click(screen.getByText('click empty floor'))

    expect(panel()).toHaveTextContent(/Nothing selected/)
    expect(
      screen.queryByRole('status', { name: 'Selected in the room view' }),
    ).toBeNull()
  })

  it('is cleared by the panel’s Clear button', async () => {
    renderApp()
    openPositionRow('Subwoofer 1')

    fireEvent.click(
      await within(panel()).findByRole('button', { name: 'Clear selection' }),
    )

    expect(panel()).toHaveTextContent(/Nothing selected/)
  })

  it('explains Left’s grade: its angle, both ranges with the conflict note, what the grades mean, and the sources with links', async () => {
    renderApp()

    openPositionRow('Left')

    const grade = await within(panel()).findByRole('region', {
      name: 'Grade',
    })
    expect(grade).toHaveTextContent(/Angle\s*26°, ideal/)
    expect(grade).toHaveTextContent(/Ideal range\s*22–30°/)
    expect(grade).toHaveTextContent(/Acceptable range\s*22–40°/)
    expect(grade).toHaveTextContent(
      /Conflict in the Dolby data: every per-layout sheet shows L\/R at 22°–30°, while IG fig\.3 shows 30° nominal with a 22°–40° range/,
    )
    expect(grade).toHaveTextContent(
      /Our modelling assumption, not Dolby's: the sheets set the ideal range/,
    )
    expect(grade).toHaveTextContent(
      /Ideal: inside the range Dolby recommends for this speaker\./,
    )
    expect(grade).toHaveTextContent(/Acceptable: /)
    expect(grade).toHaveTextContent(/Outside: /)

    const sheet = within(grade).getByRole('link', {
      name: 'Home Theater Speaker Guide: 5.1.2 Overhead Speakers',
    })
    expect(sheet).toHaveAttribute(
      'href',
      'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.2-overhead-speaker-placement/5_1_2_overhead_speakers_setup.pdf',
    )
    expect(sheet).toHaveAttribute('target', '_blank')
    expect(sheet).toHaveAttribute('rel', 'noreferrer')
    const guide = within(grade).getAllByRole('link', {
      name: 'Dolby Atmos Home Theater Installation Guidelines (60 pp.)',
    })
    expect(guide.map((link) => link.getAttribute('href'))).toEqual([
      'https://www.dolby.com/siteassets/technologies/dolby-atmos/atmos-installation-guidelines-121318_r3.1.pdf',
      'https://www.dolby.com/siteassets/technologies/dolby-atmos/atmos-installation-guidelines-121318_r3.1.pdf',
    ])
    expect(grade).toHaveTextContent(
      /p\.8: fig\.3, the 7\.1\.4 reference: 30° nominal, range 22°–40°/,
    )
  })

  it('explains a top middle speaker’s elevation range, and says its angle has no Dolby range', async () => {
    renderApp()

    openPositionRow('Left Top Middle')

    const grade = await within(panel()).findByRole('region', {
      name: 'Grade',
    })
    expect(grade).toHaveTextContent(/Angle\s*\d+°, not graded/)
    expect(grade).toHaveTextContent(
      /Dolby gives top middle speakers \(x\.1\.2 layouts\) no angle range from straight ahead/,
    )
    expect(grade).toHaveTextContent(/Elevation\s*\d+°, ideal/)
    expect(grade).toHaveTextContent(/Ideal range\s*65–100°/)
    expect(
      within(grade).getByRole('link', {
        name: 'Home Theater Speaker Guide: 7.1.2 Overhead Speakers',
      }),
    ).toHaveAttribute(
      'href',
      'https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.2-overhead-speaker-placement/7_1_2_overhead_speaker_setup.pdf',
    )
  })

  it('says a subwoofer is not graded, and why', async () => {
    renderApp()

    openPositionRow('Subwoofer 1')

    const grade = await within(panel()).findByRole('region', {
      name: 'Grade',
    })
    expect(grade).toHaveTextContent(
      /Not graded\. Dolby gives subwoofers no position or angle/,
    )
    expect(
      within(grade).getByRole('link', {
        name: 'Dolby Atmos Speaker Setup 101 (web page)',
      }),
    ).toHaveAttribute(
      'href',
      'https://www.dolby.com/about/support/guide/dolby-atmos-speaker-setup/',
    )
  })

  it('has no grade for the MLP', async () => {
    renderApp()

    openPositionRow('MLP')

    expect(
      await within(panel()).findByRole('heading', { name: 'MLP' }),
    ).toBeVisible()
    expect(within(panel()).queryByRole('region', { name: 'Grade' })).toBeNull()
  })

  it('never enters the undo history', async () => {
    renderApp()

    openPositionRow('Left')
    expect(
      await within(panel()).findByRole('heading', { name: 'Left' }),
    ).toBeInTheDocument()
    fireEvent.click(await screen.findByText('press Left'))
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  it('says how Left relates to the screen, live as the screen is resized', async () => {
    render(
      <ConfigStoreProvider>
        <SelectedItemPanel />
        <PositionsForm />
        <RoomObjectsForm />
      </ConfigStoreProvider>,
    )
    openPositionRow('Left')
    await within(panel()).findByRole('heading', { name: 'Left' })
    expect(panel()).not.toHaveTextContent(/Screen/)

    // The default 65 in TV is narrower than Dolby's 22°: Left is kept at 22°.
    fireEvent.click(screen.getByRole('button', { name: 'Add a screen' }))
    expect(panel()).toHaveTextContent(
      /Screen\s*Kept inside Dolby's range: .* so Left sits at 22°, beside the screen\./,
    )

    const width = within(
      screen.getByRole('group', { name: 'Screen width' }),
    ).getByRole('textbox', { name: 'm' })
    fireEvent.change(width, { target: { value: '2' } })
    expect(panel()).toHaveTextContent(
      /Screen\s*Left sits just outside the screen's edge, as seen from the MLP\./,
    )
  })
})
