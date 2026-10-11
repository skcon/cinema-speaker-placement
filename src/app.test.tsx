import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createAppRouter } from '@/router'

function renderApp() {
  const history = createMemoryHistory({ initialEntries: ['/'] })
  render(<RouterProvider router={createAppRouter({ history })} />)
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
