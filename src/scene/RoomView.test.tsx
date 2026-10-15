import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { RoomView } from '@/scene/RoomView'
import { HistoryButtons } from '@/ui/HistoryButtons'

// jsdom has no WebGL: pretend it has, and stand in for the Three.js scene,
// which says whether it was given a heatmap to draw, and from which view.
vi.mock('@/scene/webgl', () => ({ canUseWebGL: () => true }))
vi.mock('@/scene/RoomCanvas', () => ({
  RoomCanvas: ({ heatmap, view }: { heatmap: unknown; view: string }) => (
    <>
      <p>{heatmap ? 'heatmap drawn' : 'no heatmap'}</p>
      <p>{`${view} camera`}</p>
    </>
  ),
}))

function renderRoomView() {
  render(
    <ConfigStoreProvider>
      <HistoryButtons />
      <RoomView />
    </ConfigStoreProvider>,
  )
  return screen.getByRole('button', { name: 'Seat-score heatmap' })
}

function scene() {
  return screen.getByRole('img', { name: /^Top-down view of the room/ })
}

describe('seat-score heatmap in the room view', () => {
  it('is off by default, with no legend', async () => {
    const toggle = renderRoomView()

    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(await screen.findByText('no heatmap')).toBeInTheDocument()
    expect(screen.queryByText(/Seat score \(estimate\)/)).toBeNull()
    expect(scene()).not.toHaveAccessibleName(/heatmap/)
  })

  it('turns on with a legend from low to high, says the scores are relative estimates, and describes where the best area is', async () => {
    const toggle = renderRoomView()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('heatmap drawn')).toBeInTheDocument()
    const legend = screen.getByRole('group', { name: 'Seat score (estimate)' })
    expect(legend).toHaveTextContent(/low.*high/)
    expect(screen.getByText(/Relative to the current MLP/)).toHaveTextContent(
      /simplified model/,
    )
    expect(scene()).toHaveAccessibleName(
      /Seat-score heatmap shown \(a relative estimate\): highest around .* from the front wall/,
    )
  })

  it('turns back off, and never enters the undo history', async () => {
    const toggle = renderRoomView()

    fireEvent.click(toggle)
    fireEvent.click(toggle)

    expect(await screen.findByText('no heatmap')).toBeInTheDocument()
    expect(screen.queryByText(/Seat score \(estimate\)/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })
})

describe('camera toggle in the room view', () => {
  it('starts in the top-down view, where items can be dragged', async () => {
    renderRoomView()

    const topDown = screen.getByRole('radio', { name: 'Top-down' })
    expect(topDown).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '3D' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(await screen.findByText('top-down camera')).toBeInTheDocument()
    expect(screen.getByText(/Drag the speakers and the MLP/)).toBeVisible()
  })

  it('switches to a 3D view to look around in, without dragging, and never enters the undo history', async () => {
    renderRoomView()

    fireEvent.click(screen.getByRole('radio', { name: '3D' }))

    expect(screen.getByRole('radio', { name: '3D' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(await screen.findByText('3d camera')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /^3D view of the room/ }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Drag the speakers/)).toBeNull()
    expect(screen.getByText(/view only/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  it('switches back to the top-down view', async () => {
    renderRoomView()

    fireEvent.click(screen.getByRole('radio', { name: '3D' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Top-down' }))

    expect(await screen.findByText('top-down camera')).toBeInTheDocument()
    expect(scene()).toBeInTheDocument()
  })
})

describe('overhead speakers in the room view', () => {
  it('are described for screen readers with their elevation and grade, and named in the legend', () => {
    renderRoomView()

    // The default 5.1.2: two top middle overheads, graded on elevation.
    expect(scene().getAttribute('aria-label')).toContain(
      '2 overhead speakers on the ceiling, angle and elevation from the ' +
        'MLP and Dolby placement-range grade: Left Top Middle elevation ' +
        '83° (ideal), Right Top Middle elevation 83° (ideal).',
    )
    expect(screen.getByText('Overhead speaker (ring)')).toBeInTheDocument()
  })
})

describe('room view size on phones', () => {
  it('gives the drawing itself a usable minimum height below the lg breakpoint, so the legend and controls cannot squeeze it', () => {
    renderRoomView()

    expect(scene()).toHaveClass('max-lg:min-h-96')
    // From lg up the panel's flex layout sizes it, as before.
    expect(scene()).toHaveClass('min-h-0', 'flex-1')
  })
})
