import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { findRecommendedSeat, withMlpAt, withRoomDimension } from '@/domain'
import {
  ConfigStoreContext,
  useSeatRecommendation,
} from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'

// Count the grid scorings, still scoring for real.
vi.mock('@/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain')>()
  return { ...actual, findRecommendedSeat: vi.fn(actual.findRecommendedSeat) }
})

function Consumer({ name }: { name: string }) {
  const recommendation = useSeatRecommendation()
  return (
    <p>
      {name}: {recommendation ? 'ready' : 'pending'}
    </p>
  )
}

/** The recommended seat and the current MLP, from front to back. */
function Seats() {
  const recommendation = useSeatRecommendation()
  return recommendation ? (
    <p>
      recommended {recommendation.recommended.position.y.toFixed(2)}, MLP{' '}
      {recommendation.current.position.y.toFixed(2)}
    </p>
  ) : null
}

function Width() {
  const store = useContext(ConfigStoreContext)!
  return (
    <button
      onClick={() =>
        store
          .getState()
          .applyEdit((config) => withRoomDimension(config, 'width', 5))
      }
    >
      wider
    </button>
  )
}

function MoveMlp() {
  const store = useContext(ConfigStoreContext)!
  return (
    <button
      onClick={() =>
        store
          .getState()
          .applyEdit((config) => withMlpAt(config, { x: 0, y: 3 }))
      }
    >
      move MLP
    </button>
  )
}

describe('the shared seat recommendation', () => {
  it('scores the grid once per change, however many components read it', async () => {
    vi.mocked(findRecommendedSeat).mockClear()
    render(
      <ConfigStoreProvider>
        <Consumer name="a" />
        <Consumer name="b" />
        <Consumer name="c" />
        <Width />
      </ConfigStoreProvider>,
    )

    expect(await screen.findByText('c: ready')).toBeInTheDocument()
    expect(screen.getByText('a: ready')).toBeInTheDocument()
    expect(findRecommendedSeat).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('wider'))

    await waitFor(() => expect(findRecommendedSeat).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(findRecommendedSeat).toHaveBeenCalledTimes(2)
  })

  it('keeps the grid when the MLP moves, and compares the MLP where it now is (#120)', async () => {
    vi.mocked(findRecommendedSeat).mockClear()
    render(
      <ConfigStoreProvider>
        <Seats />
        <MoveMlp />
      </ConfigStoreProvider>,
    )

    expect(
      await screen.findByText('recommended 2.28, MLP 2.28'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('move MLP'))

    expect(
      await screen.findByText('recommended 2.28, MLP 3.00'),
    ).toBeInTheDocument()
    expect(findRecommendedSeat).toHaveBeenCalledTimes(1)
  })
})
