import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CONFIG,
  encodeConfig,
  recommendSeat,
  type SeatRecommendation,
} from '@/domain'
import { SeatRecommendationContext } from '@/state/config-context'
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

/** The room view with `recommendation` in place of the worked-out one. */
function renderRoomViewWith(recommendation: SeatRecommendation | null) {
  const Override = ({ children }: { children: ReactNode }) => (
    <SeatRecommendationContext value={recommendation}>
      {children}
    </SeatRecommendationContext>
  )
  render(
    <ConfigStoreProvider>
      <Override>
        <RoomView />
      </Override>
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

  it('turns on with a legend from low to high, says the scores are relative estimates, and says the MLP stays the recommended seat in the default room', async () => {
    const toggle = renderRoomView()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('heatmap drawn')).toBeInTheDocument()
    const legend = screen.getByRole('group', { name: 'Seat score (estimate)' })
    expect(legend).toHaveTextContent(/low.*high/)
    expect(screen.getByText(/Relative to one calibration/)).toHaveTextContent(
      /simplified model/,
    )
    expect(scene()).toHaveAccessibleName(
      /Seat-score heatmap shown \(a relative estimate\): no seat scores meaningfully better than the MLP, so it stays the recommended seat\./,
    )
  })

  it('shows no legend while the recommendation is still worked out', () => {
    fireEvent.click(renderRoomViewWith(null))

    expect(screen.getByText('no heatmap')).toBeInTheDocument()
    expect(screen.queryByText(/Seat score \(estimate\)/)).toBeNull()
    expect(scene()).not.toHaveAccessibleName(/heatmap/)
  })

  it('notes in the legend when the seats score about the same', () => {
    const recommendation = recommendSeat(DEFAULT_CONFIG)
    const even = {
      ...recommendation,
      candidates: recommendation.candidates.map((seat) => ({
        ...seat,
        score: 0.5,
      })),
    }

    fireEvent.click(renderRoomViewWith(even))

    expect(screen.getByText('heatmap drawn')).toBeInTheDocument()
    expect(screen.getByText('Seats score about the same.')).toBeInTheDocument()
  })

  it('has no such note when the seats score meaningfully apart', async () => {
    fireEvent.click(renderRoomView())

    expect(await screen.findByText('heatmap drawn')).toBeInTheDocument()
    expect(screen.queryByText('Seats score about the same.')).toBeNull()
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

describe('front speakers in the room view', () => {
  it('are described for screen readers with their distances from the MLP', () => {
    renderRoomView()

    expect(scene().getAttribute('aria-label')).toContain(
      'Front speakers from the MLP: Left 2.04 m, Center 1.78 m, Right 2.04 m.',
    )
  })
})

describe('the seat row in the room view', () => {
  it('is described for screen readers as a room object the MLP sits on, and can be dragged', async () => {
    renderRoomView()

    expect(scene()).toHaveAccessibleName(
      /A seat row 2 m wide and 0\.9 m deep, with the MLP 0\.35 m in front of its back; dragging it moves the MLP\. Room objects are drawn and used for placement warnings, not part of the estimated response\./,
    )
    expect(await screen.findByText('top-down camera')).toBeInTheDocument()
    expect(
      screen.getByText(/Drag the seat row to move it with the MLP\./),
    ).toBeVisible()
  })
})

describe('the screen in the room view', () => {
  function renderWithScreen() {
    const config = {
      ...DEFAULT_CONFIG,
      roomObjects: {
        ...DEFAULT_CONFIG.roomObjects,
        screen: {
          kind: 'tv',
          width: 1.44,
          height: 0.81,
          bottomEdge: 0.93,
          x: -0.25,
          standoff: null,
        },
      },
    } as const
    render(
      <ConfigStoreProvider initialEncodedConfig={encodeConfig(config)}>
        <RoomView />
      </ConfigStoreProvider>,
    )
  }

  it('is described for screen readers, as drawn only and not in the estimate', () => {
    renderWithScreen()

    expect(scene()).toHaveAccessibleName(
      /A TV on the front wall, 1\.44 m wide and 0\.81 m high, its bottom edge 0\.93 m above the floor, its middle 0\.25 m left of centre\. Room objects are drawn and used for placement warnings, not part of the estimated response\./,
    )
    expect(
      screen.getByText('Screen (drawn only, not in the estimate)'),
    ).toBeInTheDocument()
  })

  it('is not mentioned in a room without one', () => {
    renderRoomView()

    expect(scene()).not.toHaveAccessibleName(/screen|TV/)
    expect(screen.queryByText(/^Screen \(drawn only/)).toBeNull()
  })
})

describe('furniture boxes in the room view', () => {
  it('are described for screen readers and named in the legend as drawn and warned about, not in the estimate', () => {
    const config = {
      ...DEFAULT_CONFIG,
      roomObjects: {
        ...DEFAULT_CONFIG.roomObjects,
        furniture: [
          {
            name: 'Cabinet',
            width: 1.6,
            depth: 0.45,
            height: 0.5,
            x: 0,
            y: 0.225,
            rotation: 0,
          },
        ],
      },
    } as const
    render(
      <ConfigStoreProvider initialEncodedConfig={encodeConfig(config)}>
        <RoomView />
      </ConfigStoreProvider>,
    )

    expect(scene()).toHaveAccessibleName(
      /Furniture: Cabinet \(box 1\), 1\.6 m wide, 0\.45 m deep and 0\.5 m high\. Room objects are drawn and used for placement warnings, not part of the estimated response\./,
    )
    expect(
      screen.getByText(
        /^Furniture box, front edge darker \(drawn and warned about, not in the estimate\)/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Drag the furniture boxes to move them\./),
    ).toBeInTheDocument()
  })

  it('are not mentioned in a room without any', () => {
    renderRoomView()

    expect(scene()).not.toHaveAccessibleName(/Furniture/)
    expect(screen.queryByText(/^Furniture box/)).toBeNull()
  })
})

describe('doors and windows in the room view', () => {
  it('are described for screen readers and named in the legend as drawn and warned about, not in the estimate', () => {
    const config = {
      ...DEFAULT_CONFIG,
      roomObjects: {
        ...DEFAULT_CONFIG.roomObjects,
        openings: [
          { kind: 'door', wall: 'back', position: 2.25, width: 0.9 },
          {
            kind: 'window',
            wall: 'right',
            position: 3,
            width: 1.2,
            sill: 0.9,
            height: 1.2,
          },
        ],
      },
    } as const
    render(
      <ConfigStoreProvider initialEncodedConfig={encodeConfig(config)}>
        <RoomView />
      </ConfigStoreProvider>,
    )

    expect(scene()).toHaveAccessibleName(
      /Doors and windows: Door \(opening 1\) on the back wall, 0\.9 m wide, 1\.8 m from the left wall; Window \(opening 2\) on the right wall, 1\.2 m wide and 1\.2 m high, its sill 0\.9 m up, 2\.4 m from the front wall\. Room objects are drawn and used for placement warnings, not part of the estimated response\./,
    )
    expect(
      screen.getByText(
        /^Door and where it swings \(drawn and warned about, not in the estimate\)/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /^Window \(drawn and warned about, not in the estimate\)/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Drag doors and windows along their wall\./),
    ).toBeInTheDocument()
  })

  it('are not mentioned in a room without any', () => {
    renderRoomView()

    expect(scene()).not.toHaveAccessibleName(/Doors and windows/)
    expect(screen.queryByText(/^Door and where it swings/)).toBeNull()
    expect(screen.queryByText(/^Window \(/)).toBeNull()
  })
})
