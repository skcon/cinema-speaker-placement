import { describe, expect, it } from 'vitest'
import {
  dragAnchors,
  roomObjectAt,
  SCREEN_ID,
  SEAT_ROW_ID,
  withDragged,
  type Config,
  type DragTarget,
  type FloorPoint,
} from '@/domain'
import { createDragController } from '@/scene/drag'
import { createConfigStore, type ConfigStore } from '@/state/config-store'

/**
 * A store holding the default room (5.1.2, one subwoofer) with one of
 * every room object: a TV, a cabinet, a door and a window.
 */
function furnishedStore(): ConfigStore {
  const store = createConfigStore()
  const { addRoomObject } = store.getState()
  addRoomObject({ kind: 'screen' })
  addRoomObject({ kind: 'furniture', preset: 'cabinet' })
  addRoomObject({ kind: 'opening', preset: 'door' })
  addRoomObject({ kind: 'opening', preset: 'window' })
  return store
}

/**
 * A whole drag of `target` as the room view wires it (RoomView and
 * RoomCanvas, without WebGL): the drag controller tells the store, the
 * pointer presses `grabbedAt` from the target's anchor and moves by `by`
 * in two steps, then is released.
 */
function dragInView(
  store: ConfigStore,
  target: DragTarget,
  by: FloorPoint,
  grabbedAt: FloorPoint,
) {
  const { beginGesture, moveDragTarget, endGesture } = store.getState()
  const controller = createDragController({
    onDragStart: beginGesture,
    onDragMove: moveDragTarget,
    onDragEnd: endGesture,
  })
  const anchor = dragAnchors(store.getState().config).get(target)
  if (!anchor) throw new Error(`${target} has no anchor`)
  const pressed = { x: anchor.x + grabbedAt.x, y: anchor.y + grabbedAt.y }
  controller.press(1, target, anchor, pressed)
  controller.move(1, { x: pressed.x + by.x / 2, y: pressed.y + by.y / 2 })
  controller.move(1, { x: pressed.x + by.x, y: pressed.y + by.y })
  controller.release(1)
}

/** `config` with every number rounded to the nanometer, to compare drags. */
function rounded(config: Config): unknown {
  return JSON.parse(JSON.stringify(config), (_, value: unknown) =>
    typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : value,
  )
}

const TARGETS: readonly DragTarget[] = [
  'R',
  'Ltm',
  'Sub1',
  'MLP',
  SEAT_ROW_ID,
  SCREEN_ID,
  'furniture-1',
  'opening-1',
  'opening-2',
]

describe('dragging in the room view', () => {
  it.each(TARGETS)(
    'drags %s by its anchor, keeping where it was grabbed, as one undo step',
    (target) => {
      const store = furnishedStore()
      const before: Config = store.getState().config
      const anchor = dragAnchors(before).get(target)!
      const by = { x: 0.3, y: 0.4 }

      dragInView(store, target, by, { x: 0.25, y: -0.15 })

      // The same as dragging its anchor straight to where the pointer took
      // it: the grab offset is kept, so nothing jumps.
      const after = store.getState().config
      expect(after).not.toBe(before)
      expect(rounded(after)).toEqual(
        rounded(
          withDragged(before, target, {
            x: anchor.x + by.x,
            y: anchor.y + by.y,
          }),
        ),
      )
      store.getState().undo()
      expect(store.getState().config).toBe(before)
    },
  )

  it('moves the MLP by as much as the pointer moved when the seat row is grabbed away from it', () => {
    const store = furnishedStore()
    const mlp = dragAnchors(store.getState().config).get('MLP')!

    dragInView(store, SEAT_ROW_ID, { x: 0.3, y: 0.4 }, { x: 0.8, y: -0.5 })

    const moved = store.getState().config.manualPositions.MLP
    expect(moved?.x).toBeCloseTo(mlp.x + 0.3, 9)
    expect(moved?.y).toBeCloseTo(mlp.y + 0.4, 9)
  })

  it('slides the screen along the front wall by as much as the pointer moved across', () => {
    const store = furnishedStore()
    const screen = store.getState().config.roomObjects.screen!

    dragInView(store, SCREEN_ID, { x: -0.5, y: 1 }, { x: 0.4, y: 0.03 })

    const config = store.getState().config
    expect(roomObjectAt(config.roomObjects, SCREEN_ID)?.x).toBeCloseTo(
      screen.x - 0.5,
      9,
    )
  })
})
