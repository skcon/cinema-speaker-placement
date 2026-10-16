import type { FloorPoint, PlaceableId, RoomObjectId } from '@/domain'
import { draggedTo, grabOffset } from '@/scene/top-down'

/** What can be dragged in the room view: a placeable item or a room object. */
export type DragTarget = PlaceableId | RoomObjectId

/** What a drag tells the store: start, moves, end (one undo step). */
export type DragCallbacks = {
  onDragStart: () => void
  onDragMove: (id: DragTarget, to: FloorPoint) => void
  onDragEnd: () => void
}

/**
 * The pointer side of dragging markers, kept apart from react-three-fiber
 * so it can be tested. One pointer drags at a time: a second one is
 * ignored until the first is released. Every start gets exactly one end,
 * whether the drag ends by release, cancel, lost pointer capture or the
 * window losing focus.
 */
export function createDragController(callbacks: DragCallbacks) {
  let active: {
    pointerId: number
    id: DragTarget
    offset: FloorPoint
  } | null = null

  return {
    /** Whether a pointer is dragging. */
    isDragging: () => active !== null,
    /**
     * A pointer pressed on item `id`, which is at `at`. Starts a drag and
     * returns true, or returns false while another pointer is dragging.
     */
    press(
      pointerId: number,
      id: DragTarget,
      at: FloorPoint,
      pointer: FloorPoint,
    ): boolean {
      if (active) return false
      active = { pointerId, id, offset: grabOffset(at, pointer) }
      callbacks.onDragStart()
      return true
    },
    /** The dragging pointer moved over the floor plan. */
    move(pointerId: number, pointer: FloorPoint) {
      if (active?.pointerId !== pointerId) return
      callbacks.onDragMove(active.id, draggedTo(pointer, active.offset))
    },
    /** A pointer was released, cancelled or lost its capture. */
    release(pointerId: number) {
      if (active?.pointerId !== pointerId) return
      active = null
      callbacks.onDragEnd()
    },
    /** End any drag, whatever its pointer (the window lost focus). */
    cancel() {
      if (!active) return
      active = null
      callbacks.onDragEnd()
    },
  }
}

export type DragController = ReturnType<typeof createDragController>
