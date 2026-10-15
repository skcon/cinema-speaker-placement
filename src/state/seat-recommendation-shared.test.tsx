import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { recommendSeat } from '@/domain'
import {
  ConfigStoreContext,
  useSeatRecommendation,
} from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'

// Count the grid scorings, still scoring for real.
vi.mock('@/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain')>()
  return { ...actual, recommendSeat: vi.fn(actual.recommendSeat) }
})

function Consumer({ name }: { name: string }) {
  const recommendation = useSeatRecommendation()
  return (
    <p>
      {name}: {recommendation ? 'ready' : 'pending'}
    </p>
  )
}

function Width() {
  const store = useContext(ConfigStoreContext)!
  return (
    <button onClick={() => store.getState().setRoomDimension('width', 5)}>
      wider
    </button>
  )
}

describe('the shared seat recommendation', () => {
  it('scores the grid once per change, however many components read it', async () => {
    vi.mocked(recommendSeat).mockClear()
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
    expect(recommendSeat).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('wider'))

    await waitFor(() => expect(recommendSeat).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(recommendSeat).toHaveBeenCalledTimes(2)
  })
})
