import { describe, expect, it } from 'vitest'
import {
  analyzeRoom,
  dragAnchors,
  roomObjectAt,
  SCREEN_ID,
  SEAT_ROW_ID,
  withDragged,
  withRoomObjectAdded,
  type Config,
  type DragTarget,
  type FloorPoint,
} from '@/domain'
import { createDragController } from '@/scene/drag'
import { grabAreas, pressAt } from '@/scene/grab-areas'
import { createConfigStore, type ConfigStore } from '@/state/config-store'

/**
 * A store holding the default room (5.1.2, one subwoofer) with one of
 * every room object: a TV, a cabinet (moved off the TV, to the back left),
 * a door and a window.
 */
function furnishedStore(): ConfigStore {
  const store = createConfigStore()
  const { applyEdit } = store.getState()
  applyEdit((config) => withRoomObjectAdded(config, { kind: 'screen' }))
  applyEdit((config) =>
    withRoomObjectAdded(config, { kind: 'furniture', preset: 'cabinet' }),
  )
  applyEdit((config) =>
    withRoomObjectAdded(config, { kind: 'opening', preset: 'door' }),
  )
  applyEdit((config) =>
    withRoomObjectAdded(config, { kind: 'opening', preset: 'window' }),
  )
  applyEdit((config) => withDragged(config, 'furniture-1', { x: -1, y: 4.5 }))
  return store
}

/** The room view's zoom in these drags, in pixels per meter. */
const ZOOM = 100

/** Where `target`'s anchor is in the store's config. */
function anchorIn(store: ConfigStore, target: DragTarget): FloorPoint {
  const { config } = store.getState()
  const anchor = dragAnchors(config, analyzeRoom(config)).get(target)
  if (!anchor) throw new Error(`${target} has no anchor`)
  return anchor
}

/**
 * A whole drag as the room view does it (RoomCanvas without WebGL): the
 * pointer presses `grabbedAt` from `target`'s anchor, the press picks a
 * target up (pressAt), the drag controller tells the store, and the
 * pointer moves by `by` in two steps, then is released.
 */
function dragInView(
  store: ConfigStore,
  target: DragTarget,
  by: FloorPoint,
  grabbedAt: FloorPoint,
) {
  const { config, beginGesture, applyEdit, endGesture } = store.getState()
  // As the room view wires it (RoomView).
  const controller = createDragController({
    onDragStart: beginGesture,
    onDragMove: (moved, to) =>
      applyEdit((current) => withDragged(current, moved, to)),
    onDragEnd: endGesture,
  })
  const anchor = anchorIn(store, target)
  const pressed = { x: anchor.x + grabbedAt.x, y: anchor.y + grabbedAt.y }
  const area = pressAt(grabAreas(config, analyzeRoom(config)), pressed, ZOOM)
  expect(area?.target).toBe(target)
  if (!area) return
  controller.press(1, area.target, area.anchor, pressed)
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

/**
 * Where a target is grabbed from its anchor, when not just beside it: the
 * Seat row's anchor is the MLP, which a press there picks up instead.
 */
const GRABBED_AT: Partial<Record<DragTarget, FloorPoint>> = {
  [SEAT_ROW_ID]: { x: 0.6, y: 0.2 },
}

describe('dragging in the room view', () => {
  it.each(TARGETS)(
    'drags %s by its anchor, keeping where it was grabbed, as one undo step',
    (target) => {
      const store = furnishedStore()
      const before: Config = store.getState().config
      const anchor = anchorIn(store, target)
      const by = { x: 0.3, y: 0.4 }

      dragInView(store, target, by, GRABBED_AT[target] ?? { x: 0.05, y: -0.03 })

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
    const mlp = anchorIn(store, 'MLP')

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
