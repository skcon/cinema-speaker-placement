/**
 * Drag targets: everything the room view drags on the floor plan, the
 * items (speakers, subwoofers, the MLP) and the room objects (the Seat
 * row, the Screen, furniture boxes, doors and windows).
 *
 * This module owns what a drag means for each of them, so the anchor and
 * its meaning live together: where a target's anchor is (the floor point
 * a drag moves), what the config becomes when the anchor is dragged to
 * `to`, and what pressing the target selects. The room view only grabs a
 * target by its anchor, keeping the grab offset, and works out which
 * target a press picks up (src/scene/grab-areas.ts); the store applies
 * the drag.
 */
import type { Config } from './config'
import { placeManually, samePositions } from './config-edits'
import { MLP_ID, type PlaceableId } from './manual-positions'
import type { PlacedItems } from './placed-items'
import type { FloorPoint } from './room'
import { fromWallFrame } from './wall-frame'
import {
  isRoomObjectId,
  roomObjectId,
  SCREEN_ID,
  SEAT_ROW_ID,
  withRoomObjectMoved,
  type RoomObjectId,
} from './room-objects'
import { screenSurface } from './screen'

/** What can be dragged on the floor plan: an item or a room object. */
export type DragTarget = PlaceableId | RoomObjectId

/**
 * Every drag target the config has, with its anchor: the floor point a
 * drag moves, which withDragged takes `to` as the new place of. In order:
 * the layout's items (its channels, overhead channels, subwoofers and
 * the MLP, where `items` has them: the config's Room analysis), then
 * the Seat row, the Screen, the furniture boxes and the openings the Room
 * has.
 *
 * - An item is anchored at its position.
 * - The Seat row is anchored at the MLP: it has no position of its own,
 *   and dragging it moves the MLP (wherever on the couch it is grabbed).
 * - The Screen is anchored at its middle on the front wall (or its
 *   standoff), a furniture box at its middle, and an opening at its middle
 *   on its wall.
 */
export function dragAnchors(
  config: Config,
  { mlp, items }: Pick<PlacedItems, 'mlp' | 'items'>,
): ReadonlyMap<DragTarget, FloorPoint> {
  const { room, roomObjects } = config
  const onFloor = ({ x, y }: FloorPoint): FloorPoint => ({ x, y })
  const anchors = new Map<DragTarget, FloorPoint>(
    [...items.values()].map(({ id, position }) => [id, onFloor(position)]),
  )
  anchors.set(SEAT_ROW_ID, onFloor(mlp))
  const { screen, furniture, openings } = roomObjects
  if (screen) {
    anchors.set(SCREEN_ID, {
      x: screen.x,
      y: screenSurface(screen).fromFrontWall,
    })
  }
  furniture.forEach(({ x, y }, index) =>
    anchors.set(roomObjectId('furniture', index), { x, y }),
  )
  openings.forEach(({ wall, position }, index) =>
    anchors.set(
      roomObjectId('opening', index),
      fromWallFrame(room, wall, { along: position, out: 0 }),
    ),
  )
  return anchors
}

/**
 * The config after `target`'s anchor (see dragAnchors) is dragged to `to`
 * on the floor plan:
 *
 * - An item goes to `to`, made manual, inside its wall clearances; it
 *   keeps its height (placeManually).
 * - The Seat row moves the MLP to `to` the same way, and comes with it.
 * - The Screen slides along the front wall (only `to.x` counts), a
 *   furniture box goes with its middle to `to`, and an opening slides along
 *   its own wall, each stopped at the walls (withRoomObjectMoved).
 *
 * Comes back as it was when the target isn't in the config, or a room
 * object (or the Seat row's MLP) doesn't move.
 */
export function withDragged(
  config: Config,
  target: DragTarget,
  to: FloorPoint,
): Config {
  if (target === SEAT_ROW_ID) {
    const moved = placeManually(config, MLP_ID, { x: to.x, y: to.y })
    return samePositions(moved, config) ? config : moved
  }
  if (isRoomObjectId(target)) return withRoomObjectMoved(config, target, to)
  return placeManually(config, target, { x: to.x, y: to.y })
}

/**
 * The Selected item a press on `target` makes, or null for a room object:
 * room objects are not selected, so pressing one clears the selection.
 */
export function pressSelects(target: DragTarget): PlaceableId | null {
  return isRoomObjectId(target) ? null : target
}
