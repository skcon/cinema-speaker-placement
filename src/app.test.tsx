import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { encodeConfig, type Config } from '@/domain'
import { createAppRouter } from '@/router'

function renderApp(path = '/') {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<RouterProvider router={createAppRouter({ history })} />)
  return history
}

/** The address of a share link for `config`. */
function shareLinkPath(config: Config) {
  return `/?${new URLSearchParams({ config: encodeConfig(config) })}`
}

/** The text box labelled with `unit` inside the sidebar field for `dimension`. */
async function findInput(dimension: string, unit: 'm' | 'ft' | 'in') {
  const field = await screen.findByRole('group', { name: dimension })
  return within(field).getByRole('textbox', { name: unit })
}

/** The share link in the address, or null without one. */
function configInAddress(history: ReturnType<typeof renderApp>) {
  return new URLSearchParams(history.location.search).get('config')
}

// 26 ft 3 in x 16 ft 4.9 in x 9 ft 10.1 in
const IMPERIAL_ROOM: Config = {
  units: 'imperial',
  room: { length: 8, width: 5, height: 3 },
}

describe('app shell', () => {
  it('shows the room and layout sidebar, the room view and the estimated response', async () => {
    renderApp()

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Cinema Speaker Placement',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: 'Room and layout' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Room view' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Estimated response' }),
    ).toBeInTheDocument()
  })

  it('starts with the default room in the sidebar', async () => {
    renderApp()

    const sidebar = await screen.findByRole('complementary', {
      name: 'Room and layout',
    })
    const length = within(sidebar).getByRole('group', { name: 'Length' })
    expect(within(length).getByRole('textbox', { name: 'm' })).toHaveValue('6')
  })

  it('describes the room in the room view, in the chosen units', async () => {
    renderApp()

    const roomView = await screen.findByRole('region', { name: 'Room view' })
    // jsdom has no WebGL, so the view falls back to its text description.
    expect(
      within(roomView).getByText(
        'Top-down view of the room, 6 m long and 4.5 m wide, with the front wall at the top and the MLP 2.28 m from the front wall.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'Imperial (ft + in)' }))

    // 6 m = 19 ft 8.2 in, 4.5 m = 14 ft 9.2 in, 2.28 m = 7 ft 5.8 in
    expect(
      within(roomView).getByText(/19 ft 8.2 in long and 14 ft 9.2 in wide/),
    ).toBeInTheDocument()
    expect(
      within(roomView).getByText(/the MLP 7 ft 5.8 in from the front wall/),
    ).toBeInTheDocument()
  })

  it('says the response is an estimate, not a measurement', async () => {
    renderApp()

    const response = await screen.findByRole('region', {
      name: 'Estimated response',
    })
    expect(
      within(response).getByText(/an estimate from a simplified model/i),
    ).toBeInTheDocument()
  })
})

describe('share links', () => {
  it('opens the room a share link holds', async () => {
    renderApp(shareLinkPath(IMPERIAL_ROOM))

    expect(await findInput('Length', 'ft')).toHaveValue('26')
    expect(await findInput('Length', 'in')).toHaveValue('3')
    expect(await findInput('Width', 'ft')).toHaveValue('16')
    expect(
      screen.getByRole('radio', { name: 'Imperial (ft + in)' }),
    ).toBeChecked()
  })

  it('writes the room to the address once typing pauses, without adding history entries', async () => {
    const history = renderApp()
    const length = await findInput('Length', 'm')

    fireEvent.change(length, { target: { value: '7' } })
    fireEvent.change(length, { target: { value: '7.5' } })

    const edited = encodeConfig({
      units: 'metric',
      room: { length: 7.5, width: 4.5, height: 2.6 },
    })
    expect(configInAddress(history)).not.toBe(edited)
    await waitFor(() => expect(configInAddress(history)).toBe(edited))
    expect(history.length).toBe(1)
  })

  it('follows the address back and forward between share links', async () => {
    const history = renderApp(shareLinkPath(IMPERIAL_ROOM))
    expect(await findInput('Length', 'ft')).toHaveValue('26')

    act(() => {
      history.push(
        shareLinkPath({
          units: 'metric',
          room: { length: 10, width: 6, height: 3.2 },
        }),
      )
    })
    expect(await findInput('Length', 'm')).toHaveValue('10')
    expect(await findInput('Height', 'm')).toHaveValue('3.2')

    act(() => history.back())
    expect(await findInput('Length', 'ft')).toHaveValue('26')
  })
})
