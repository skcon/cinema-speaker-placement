import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, encodeConfig, type Config } from '@/domain'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { ROOM_WITH_A_BETTER_SEAT } from '@/test/seat-fixtures'
import { PositionsForm } from '@/ui/PositionsForm'
import { Seating } from '@/ui/Seating'

function renderSeating(config?: Config) {
  render(
    <ConfigStoreProvider initialEncodedConfig={config && encodeConfig(config)}>
      <Seating />
      <PositionsForm />
    </ConfigStoreProvider>,
  )
  return screen.getByRole('region', { name: 'Seating' })
}

describe('seating in the sidebar', () => {
  it('recommends a seat, says it is an estimate, and moves the MLP there on request', async () => {
    const seating = renderSeating(ROOM_WITH_A_BETTER_SEAT)

    const move = within(seating).getByRole('button', { name: 'Move MLP here' })
    await waitFor(() => expect(move).toBeEnabled())
    expect(seating).toHaveTextContent(/estimate from a simplified model/)
    expect(
      screen.getByRole('group', { name: 'MLP position' }),
    ).toHaveTextContent('auto')

    fireEvent.click(move)

    expect(
      await within(seating).findByText(/Your MLP is at the recommended seat/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'MLP position' }),
    ).toHaveTextContent('manual')
    expect(
      within(seating).getByRole('button', { name: 'Move MLP here' }),
    ).toBeDisabled()
  })

  it('recommends the MLP itself in the default room, on the center line', async () => {
    const seating = renderSeating()

    expect(
      await within(seating).findByText(/Your MLP is at the recommended seat/),
    ).toBeInTheDocument()
    expect(seating).toHaveTextContent(
      /Recommended seat: 2\.28 m from the front wall/,
    )
    expect(seating).not.toHaveTextContent(/It is off the center line/)
  })

  it('keeps the recommended seat when the MLP moves, and says the MLP is about as good within the model’s precision (#120)', async () => {
    const seating = renderSeating({
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0, y: 2.38, z: 1.2 } },
    })

    expect(
      await within(seating).findByText(/Your MLP scores/),
    ).toHaveTextContent(/about as good as the recommended seat/)
    expect(seating).toHaveTextContent(
      /Recommended seat: 2\.28 m from the front wall/,
    )
  })

  it('says when the MLP is too close to the speakers to stay the recommended seat (#119)', async () => {
    const seating = renderSeating({
      ...DEFAULT_CONFIG,
      manualPositions: { MLP: { x: 0, y: 1, z: 1.2 } },
    })

    expect(
      await within(seating).findByText(/Your MLP scores/),
    ).toHaveTextContent(/too close to a speaker, a wall or the front stage/)
    expect(seating).toHaveTextContent(
      /at least 0\.5 m from every speaker and subwoofer, 0\.5 m from the side and back walls, and 1\.5 m behind the front speakers/,
    )
  })

  it('says why the recommended seat is off the center line', async () => {
    // A 2.1 room 5 m wide: the best seat beats the center line by about 4
    // points, on the bass.
    const seating = renderSeating({
      ...DEFAULT_CONFIG,
      room: { length: 6, width: 5, height: 2.6 },
      layout: { dolbyLayout: '2.1', subwoofers: 1 },
    })

    expect(
      await within(seating).findByText(/off the center line/),
    ).toHaveTextContent(
      /scores 4\.3 points more than the best seat on the center line \(2\.28 m from the front wall, 81\/100\), more than the 2 points.*second width mode \(68\.6 Hz\) is strongest on the center line/,
    )
  })

  it('shows the 38% rule of thumb as a reference only', () => {
    const seating = renderSeating()

    expect(seating).toHaveTextContent(/38% rule/)
    expect(seating).toHaveTextContent(/2\.28 m from the front wall/)
    expect(seating).toHaveTextContent(
      /Reference only.*not a standard.*not part of the recommendation/,
    )
  })
})
