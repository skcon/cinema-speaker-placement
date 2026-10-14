import { describe, expect, it } from 'vitest'
import type { FloorPoint, PlaceableId } from '@/domain'
import { createDragController } from '@/scene/drag'

/** A controller that records what it tells the store. */
function recordedDrag() {
  const calls: string[] = []
  const moves: [PlaceableId, FloorPoint][] = []
  const drag = createDragController({
    onDragStart: () => calls.push('start'),
    onDragMove: (id, to) => {
      calls.push('move')
      moves.push([id, to])
    },
    onDragEnd: () => calls.push('end'),
  })
  return { drag, calls, moves }
}

const AT = { x: 1, y: 2 }

describe('dragging a marker', () => {
  it('starts on a press, follows the pointer keeping the grab offset, and ends on release', () => {
    const { drag, calls, moves } = recordedDrag()

    expect(drag.press(1, 'R', AT, { x: 1.1, y: 2 })).toBe(true)
    drag.move(1, { x: 2.1, y: 3 })
    drag.release(1)

    expect(calls).toEqual(['start', 'move', 'end'])
    expect(moves[0]?.[0]).toBe('R')
    expect(moves[0]?.[1].x).toBeCloseTo(2, 9)
    expect(moves[0]?.[1].y).toBeCloseTo(3, 9)
  })

  it('ends once when the pointer capture is lost, and ignores the pointer after that', () => {
    const { drag, calls } = recordedDrag()
    drag.press(1, 'R', AT, AT)

    // Lost capture, then the pointerup that may still follow.
    drag.release(1)
    drag.release(1)
    drag.move(1, { x: 3, y: 3 })

    expect(calls).toEqual(['start', 'end'])
  })

  it('ignores a second pointer while one is dragging', () => {
    const { drag, calls } = recordedDrag()
    drag.press(1, 'R', AT, AT)

    expect(drag.press(2, 'L', AT, AT)).toBe(false)
    drag.move(2, { x: 3, y: 3 })
    drag.release(2)

    expect(calls).toEqual(['start'])
    drag.release(1)
    expect(calls).toEqual(['start', 'end'])
  })

  it('ends when the window loses focus mid-drag, and only then', () => {
    const { drag, calls } = recordedDrag()

    drag.cancel()
    drag.press(1, 'R', AT, AT)
    drag.cancel()
    drag.release(1)

    expect(calls).toEqual(['start', 'end'])
  })
})
