import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { compressToEncodedURIComponent } from 'lz-string'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, encodeConfig, type Config } from '@/domain'
import { createAppRouter } from '@/router'
import { mockClipboard } from '@/test/clipboard'
import { IMPERIAL_ROOM } from '@/test/share-link-fixtures'

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

/** The encoded config in the address's `config` param, or null without one. */
function configParamInAddress(history: ReturnType<typeof renderApp>) {
  return new URLSearchParams(history.location.search).get('config')
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

  it('lists the speakers by Dolby name in the sidebar', async () => {
    renderApp()

    const sidebar = await screen.findByRole('complementary', {
      name: 'Room and layout',
    })
    const speakers = within(sidebar).getByRole('table', { name: 'Speakers' })
    expect(within(speakers).getByText('Left Surround')).toBeInTheDocument()
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

  it('lists the default 5.1.2 listener-level speakers in the room view with their angle and grade', async () => {
    renderApp()

    const roomView = await screen.findByRole('region', { name: 'Room view' })
    expect(
      within(roomView).getByText(
        '5.1.2 listener-level speakers, angle from the MLP and Dolby placement-range grade: Left 26° (ideal), Center 0° (ideal), Right 26° (ideal), Left Surround 115° (ideal), Right Surround 115° (ideal).',
      ),
    ).toBeInTheDocument()
  })

  it('shows the speakers of the layout picked in the sidebar', async () => {
    renderApp()
    const sidebar = await screen.findByRole('complementary', {
      name: 'Room and layout',
    })

    fireEvent.click(within(sidebar).getByRole('radio', { name: '7.1' }))

    const roomView = screen.getByRole('region', { name: 'Room view' })
    expect(
      within(roomView).getByText(
        /^7\.1 listener-level speakers.*Left Surround 100° \(ideal\).*Left Rear Surround 143° \(ideal\), Right Rear Surround 143° \(ideal\)\.$/,
      ),
    ).toBeInTheDocument()
  })

  it('shows the subwoofers in the room view, ungraded, following the subwoofer count', async () => {
    renderApp()
    const roomView = await screen.findByRole('region', { name: 'Room view' })
    expect(
      within(roomView).getByText(
        '1 subwoofer, not graded as Dolby gives subwoofers no placement range: Subwoofer 1 at the front wall.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Subwoofers' })).getByRole(
        'radio',
        { name: '3' },
      ),
    )

    expect(
      within(roomView).getByText(
        '3 subwoofers, not graded as Dolby gives subwoofers no placement range: Subwoofer 1 at the front wall, Subwoofer 2 at the left wall, Subwoofer 3 at the right wall.',
      ),
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

/** An encoded config from a later schema version than this app knows. */
const FROM_THE_FUTURE = compressToEncodedURIComponent(
  JSON.stringify({ v: 99, config: {} }),
)

/** Waits well past the pause after which the address follows an edit. */
async function waitLongerThanTheAddress() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 700)))
}

describe('share links', () => {
  it('opens the room and layout a share link holds', async () => {
    renderApp(shareLinkPath(IMPERIAL_ROOM))

    expect(await findInput('Length', 'ft')).toHaveValue('26')
    expect(await findInput('Length', 'in')).toHaveValue('3')
    expect(await findInput('Width', 'ft')).toHaveValue('16')
    expect(
      screen.getByRole('radio', { name: 'Imperial (ft + in)' }),
    ).toBeChecked()
    // 7.1.4 with two subwoofers
    expect(screen.getByRole('radio', { name: '7.2.4' })).toBeChecked()
  })

  it('opens the subwoofer specs a share link holds, group and per subwoofer', async () => {
    renderApp(shareLinkPath(IMPERIAL_ROOM))

    // Ported 15 in for the group; Subwoofer 2 has own specs: a sealed 12 in.
    const group = await screen.findByRole('group', { name: 'Subwoofers' })
    expect(within(group).getByRole('radio', { name: 'Ported' })).toBeChecked()
    expect(
      within(group).getByRole('textbox', { name: 'Driver size (in)' }),
    ).toHaveValue('15')
    expect(
      screen.getByRole('checkbox', { name: 'Subwoofer 1 has its own specs' }),
    ).not.toBeChecked()
    const second = screen.getByRole('group', { name: 'Subwoofer 2' })
    expect(within(second).getByRole('radio', { name: 'Sealed' })).toBeChecked()
    expect(
      within(second).getByRole('textbox', { name: 'RMS power (W)' }),
    ).toHaveValue('500')
  })

  it('writes the room to the address once typing pauses, without adding history entries', async () => {
    const history = renderApp()
    const length = await findInput('Length', 'm')

    fireEvent.change(length, { target: { value: '7' } })
    fireEvent.change(length, { target: { value: '7.5' } })

    const edited = encodeConfig({
      ...DEFAULT_CONFIG,
      room: { ...DEFAULT_CONFIG.room, length: 7.5 },
    })
    expect(configParamInAddress(history)).not.toBe(edited)
    await waitFor(() => expect(configParamInAddress(history)).toBe(edited))
    expect(history.length).toBe(1)
  })

  it('follows the address back and forward between share links', async () => {
    const history = renderApp(shareLinkPath(IMPERIAL_ROOM))
    expect(await findInput('Length', 'ft')).toHaveValue('26')

    act(() => {
      history.push(
        shareLinkPath({
          ...DEFAULT_CONFIG,
          room: { length: 10, width: 6, height: 3.2 },
        }),
      )
    })
    expect(await findInput('Length', 'm')).toHaveValue('10')
    expect(await findInput('Height', 'm')).toHaveValue('3.2')

    act(() => history.back())
    expect(await findInput('Length', 'ft')).toHaveValue('26')
  })

  it('shows the default room and a message that can be dismissed when the link is broken', async () => {
    renderApp('/?config=this-is-not-a-room')

    const message = await screen.findByRole('alert')
    expect(message).toHaveTextContent('This link couldn’t be opened')
    expect(message).toHaveTextContent(/showing the default room/i)
    expect(await findInput('Length', 'm')).toHaveValue('6')

    fireEvent.click(within(message).getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps a broken link in the address until the room is edited', async () => {
    const history = renderApp('/?config=this-is-not-a-room')
    await screen.findByRole('alert')

    await waitLongerThanTheAddress()

    expect(configParamInAddress(history)).toBe('this-is-not-a-room')
  })

  it('says so when a link was made by a newer version of the app', async () => {
    renderApp(`/?${new URLSearchParams({ config: FROM_THE_FUTURE })}`)

    const message = await screen.findByRole('alert')
    expect(message).toHaveTextContent('This link needs a newer version')
    expect(message).toHaveTextContent(/reload the page/i)
  })

  it('keeps a link from a newer version in the address for the reload, even after Dismiss, until the room is edited', async () => {
    const history = renderApp(
      `/?${new URLSearchParams({ config: FROM_THE_FUTURE })}`,
    )
    const message = await screen.findByRole('alert')

    fireEvent.click(within(message).getByRole('button', { name: 'Dismiss' }))
    await waitLongerThanTheAddress()

    expect(configParamInAddress(history)).toBe(FROM_THE_FUTURE)

    fireEvent.change(await findInput('Length', 'm'), {
      target: { value: '7' },
    })

    const edited = encodeConfig({
      ...DEFAULT_CONFIG,
      room: { ...DEFAULT_CONFIG.room, length: 7 },
    })
    await waitFor(() => expect(configParamInAddress(history)).toBe(edited))
  })

  it('copies the full link of the room being edited, before the address catches up', async () => {
    const writeText = mockClipboard()
    renderApp(shareLinkPath(IMPERIAL_ROOM))

    fireEvent.change(await findInput('Length', 'ft'), {
      target: { value: '30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))

    // 30 ft 3 in = 9.2202 m
    const edited: Config = {
      ...IMPERIAL_ROOM,
      room: { ...IMPERIAL_ROOM.room, length: (30 * 12 + 3) * 0.0254 },
    }
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(
      new URL(shareLinkPath(edited), window.location.origin).href,
    )
  })

  it('shows no message for a good link', async () => {
    renderApp(shareLinkPath(IMPERIAL_ROOM))

    await findInput('Length', 'ft')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
