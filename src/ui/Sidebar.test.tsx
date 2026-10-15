import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppRouter } from '@/router'

function renderApp() {
  const history = createMemoryHistory({ initialEntries: ['/'] })
  render(<RouterProvider router={createAppRouter({ history })} />)
}

async function findSidebar() {
  return screen.findByRole('complementary', { name: 'Room plan' })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sidebar sections', () => {
  it('groups the sidebar into Room, Layout, Speakers, Seating and Results, in that order, under the Selected item', async () => {
    renderApp()

    const sidebar = await findSidebar()

    const headings = within(sidebar).getAllByRole('heading', { level: 2 })
    const names = [
      'Selected item',
      'Room',
      'Layout',
      'Speakers',
      'Seating',
      'Results',
    ]
    expect(headings).toHaveLength(names.length)
    names.forEach((name, i) => expect(headings[i]).toHaveAccessibleName(name))
    expect(
      within(sidebar).queryByRole('heading', { name: 'Room objects' }),
    ).not.toBeInTheDocument()
  })

  it('explains each section in one line, and what the MLP is the first time it comes up', async () => {
    renderApp()
    await findSidebar()

    for (const [name, text] of [
      ['Room', /^The size of your room/],
      ['Layout', /^Which speakers you have/],
      ['Speakers', /MLP \(main listening position: /],
      ['Seating', /^Where you sit/],
      ['Results', /^How loud/],
    ] as const) {
      expect(screen.getByRole('region', { name })).toHaveAccessibleDescription(
        text,
      )
    }
  })

  it('collapses and expands a section from the button in its heading', async () => {
    renderApp()
    await findSidebar()
    const toggle = sectionToggle('Speakers')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('table', { name: 'Speakers' })).toBeVisible()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('table', { name: 'Speakers' }),
    ).not.toBeInTheDocument()
    // The rest of the sidebar stays open.
    expect(screen.getByRole('group', { name: 'Length' })).toBeVisible()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('table', { name: 'Speakers' })).toBeVisible()
  })

  it('names what each section button controls, and keeps the help line when collapsed', async () => {
    renderApp()
    await findSidebar()
    const toggle = sectionToggle('Results')

    fireEvent.click(toggle)

    const controlled = document.getElementById(
      toggle.getAttribute('aria-controls') ?? '',
    )
    expect(controlled).not.toBeVisible()
    expect(controlled).toHaveTextContent(/Recent rooms/)
    expect(screen.getByText(/^How loud/)).toBeVisible()
  })

  it('keeps a collapsed section collapsed after a reload', async () => {
    renderApp()
    await findSidebar()
    fireEvent.click(sectionToggle('Seating'))

    cleanup()
    renderApp()
    await findSidebar()

    expect(sectionToggle('Seating')).toHaveAttribute('aria-expanded', 'false')
    expect(sectionToggle('Room')).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapses and expands sections when browser storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    renderApp()
    await findSidebar()
    const toggle = sectionToggle('Layout')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('button', { name: 'Auto-place' }),
    ).not.toBeInTheDocument()
  })
})

/** The button in a sidebar section's heading that collapses and expands it. */
function sectionToggle(name: string) {
  return within(screen.getByRole('heading', { level: 2, name })).getByRole(
    'button',
    { name },
  )
}
