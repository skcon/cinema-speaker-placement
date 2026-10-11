import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
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
