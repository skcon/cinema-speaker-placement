import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONFIG, encodeConfig, type Config } from '@/domain'
import { createAppRouter } from '@/router'
import { IMPERIAL_ROOM } from '@/test/share-link-fixtures'

function renderApp(path = '/') {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<RouterProvider router={createAppRouter({ history })} />)
  return history
}

function shareLinkPath(config: Config) {
  return `/?${new URLSearchParams({ config: encodeConfig(config) })}`
}

/** The Recent rooms list, once it has the given number of rooms. */
async function findRecentRooms(count: number) {
  const section = await screen.findByRole('region', { name: 'Recent rooms' })
  await waitFor(
    () =>
      expect(within(section).queryAllByRole('listitem')).toHaveLength(count),
    { timeout: 2000 },
  )
  return section
}

async function editLength(value: string) {
  const length = await screen.findByRole('group', { name: 'Length' })
  fireEvent.change(within(length).getByRole('textbox', { name: 'm' }), {
    target: { value },
  })
}

const TEN_BY_SIX = {
  ...DEFAULT_CONFIG,
  room: { length: 10, width: 6, height: 3.2 },
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('recent rooms', () => {
  it('says how rooms get there before there are any', async () => {
    renderApp()

    const section = await screen.findByRole('region', { name: 'Recent rooms' })
    expect(section).toHaveTextContent(
      'Rooms you work on in this browser show up here.',
    )
  })

  it('lists an opened room by size and layout, and keeps one entry while it is edited', async () => {
    renderApp(shareLinkPath(TEN_BY_SIX))

    let section = await findRecentRooms(1)
    expect(
      within(section).getByRole('link', { name: /^10 × 6 × 3\.2 m · 5\.1\.2/ }),
    ).toBeInTheDocument()

    await editLength('11')

    section = await findRecentRooms(1)
    expect(
      await within(section).findByRole('link', {
        name: /^11 × 6 × 3\.2 m · 5\.1\.2/,
      }),
    ).toBeInTheDocument()
  })

  it('opens a recent room like a share link, with a history entry and a fresh undo history', async () => {
    renderApp(shareLinkPath(IMPERIAL_ROOM))
    await findRecentRooms(1)
    const history = renderAppAgain(shareLinkPath(TEN_BY_SIX))
    const section = await findRecentRooms(2)
    await editLength('11')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled(),
    )

    fireEvent.click(within(section).getByRole('link', { name: /^26 ft 3 in/ }))

    const length = await screen.findByRole('group', { name: 'Length' })
    await waitFor(() =>
      expect(within(length).getByRole('textbox', { name: 'ft' })).toHaveValue(
        '26',
      ),
    )
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(history.length).toBe(2)
  })

  it('removes a room, and clears them all', async () => {
    renderApp(shareLinkPath(IMPERIAL_ROOM))
    await findRecentRooms(1)
    renderAppAgain(shareLinkPath(TEN_BY_SIX))
    const section = await findRecentRooms(2)

    fireEvent.click(
      within(section).getByRole('button', {
        name: /^Remove 26 ft 3 in .* from recent rooms$/,
      }),
    )
    await findRecentRooms(1)

    fireEvent.click(within(section).getByRole('button', { name: 'Clear all' }))
    await findRecentRooms(0)
    expect(localStorage.length).toBe(0)
  })

  it('does not list a link that could not be opened', async () => {
    renderApp('/?config=this-is-not-a-room')
    await screen.findByRole('alert')

    await act(() => new Promise((resolve) => setTimeout(resolve, 700)))

    await findRecentRooms(0)
  })

  it('works without browser storage, keeping rooms for this visit', async () => {
    const blocked = () => {
      throw new DOMException('Blocked', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked)

    renderApp(shareLinkPath(TEN_BY_SIX))

    const section = await findRecentRooms(1)
    expect(
      within(section).getByRole('link', { name: /^10 × 6 × 3\.2 m/ }),
    ).toBeInTheDocument()
  })
})

/** Renders the app again in the same browser, as a later visit does. */
function renderAppAgain(path: string) {
  cleanup()
  return renderApp(path)
}
