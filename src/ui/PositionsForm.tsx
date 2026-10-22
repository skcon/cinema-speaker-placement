import {
  formatLength,
  FRONT_STAGE_WALL_DISTANCE,
  wallDistances,
  type PlaceableId,
  type PlacedItem,
  type Placement,
  type RoomPoint,
  type UnitSystem,
  type WallDistance,
} from '@/domain'
import { GRADE_STYLES } from '@/scene/speakers'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import { useSelection } from '@/state/selection-context'
import { LengthField } from '@/ui/LengthField'
import { SidebarSubsection } from '@/ui/SidebarSection'

/**
 * Where each speaker, subwoofer and the MLP is, for mounting it: height and
 * distances to the nearest walls, each editable (an overhead's height is the
 * ceiling's, shown with its elevation and grade). Editing an item (or
 * dragging it in the room view) makes it manual, so it stays put; auto
 * items follow the Room and the MLP until Auto-place resets them all.
 */
export function PositionsForm() {
  // In the analysis's order: the channels, the overhead channels, the
  // subwoofers, then the MLP.
  const { items } = useRoomAnalysis()
  const units = useConfig((state) => state.config.units)

  return (
    <SidebarSubsection title="Positions">
      <p className="text-xs text-muted-foreground">
        Drag speakers and the MLP in the room view, or edit them here. Opening a
        row selects its item in the room view, with its distances. Moved items
        are manual and stay where you put them; auto items follow the room and
        the MLP. Auto-place puts everything back to auto and the MLP at the
        recommended seat.
      </p>
      <p className="text-xs text-muted-foreground">
        Auto-place keeps Dolby&rsquo;s angles and puts Left, Center and Right{' '}
        {formatLength(FRONT_STAGE_WALL_DISTANCE.meters, units)} from the front
        wall and the other speakers at the walls, as most home theaters do. So
        they aren&rsquo;t all the same distance from the MLP: set each
        speaker&rsquo;s distance in your receiver (its distance or delay
        setting, which room calibration usually does). That evens out when their
        sound arrives, exactly at the MLP and less so at other seats.
      </p>
      <ul className="flex flex-col">
        {[...items.values()].map((item) => (
          <PositionItem
            key={item.id}
            id={item.id}
            abbreviation={item.kind === 'mlp' ? '' : item.id}
            name={item.name}
            position={item.position}
            placement={item.placement}
            {...heightOf(item)}
          />
        ))}
      </ul>
    </SidebarSubsection>
  )
}

/**
 * How an item's height is shown, by its kind: a listener-level speaker's
 * is editable; the others' are fixed, an overhead's with its elevation
 * and grade under it.
 */
function heightOf(
  item: PlacedItem,
): Pick<PositionItemProps, 'height' | 'note'> {
  switch (item.kind) {
    case 'listenerLevel':
      return { height: 'editable' }
    case 'overhead': {
      const { elevation } = item.placementRange
      return {
        height: { fixed: 'Ceiling' },
        note:
          `Elevation ${elevation.shown}° ` +
          `(${GRADE_STYLES[elevation.grade].label})`,
      }
    }
    case 'subwoofer':
      return { height: { fixed: 'Height' } }
    case 'mlp':
      return { height: { fixed: 'Ear height' } }
  }
}

type PositionItemProps = {
  id: PlaceableId
  abbreviation: string
  name: string
  position: RoomPoint
  placement: Placement
  /** Editable, or fixed and shown as text with this label. */
  height: 'editable' | { fixed: string }
  /** A line shown under the height, if any. */
  note?: string
}

function PositionItem({
  id,
  abbreviation,
  name,
  position,
  placement,
  height,
  note,
}: PositionItemProps) {
  const room = useConfig((state) => state.config.room)
  const units = useConfig((state) => state.config.units)
  const setItemHeight = useConfig((state) => state.setItemHeight)
  const setWallDistance = useConfig((state) => state.setWallDistance)
  const { select } = useSelection()
  const { across, along } = wallDistances(room, position)

  return (
    <li role="group" aria-label={`${name} position`} className="border-t">
      {/* Opening an item's row selects it in the room view: the keyboard
          way to select an item. */}
      <details
        className="group"
        onToggle={(event) => {
          if (event.currentTarget.open) select(id)
        }}
      >
        <summary className="flex min-h-9 cursor-pointer items-center gap-1 py-1 text-sm max-lg:min-h-11">
          <span className="w-9 shrink-0 font-medium">{abbreviation}</span>
          <span>{name}</span>
          <span
            className={
              placement === 'manual'
                ? 'ml-auto text-xs font-medium'
                : 'ml-auto text-xs text-muted-foreground'
            }
          >
            {placement}
          </span>
          {/* The flex summary hides the browser's own disclosure marker. */}
          <span
            aria-hidden
            className="w-4 text-center text-muted-foreground transition-transform group-open:rotate-90"
          >
            ›
          </span>
        </summary>
        <div className="flex flex-col gap-2 pb-3">
          {height === 'editable' ? (
            <LengthField
              label="Height above the floor"
              meters={position.z}
              units={units}
              onCommit={(meters) => setItemHeight(id, meters)}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {height.fixed} {formatLength(position.z, units)} (fixed)
            </p>
          )}
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
          {[along, across].map((distance) => (
            <WallDistanceField
              key={distance.wall}
              distance={distance}
              units={units}
              onCommit={(meters) => setWallDistance(id, distance.wall, meters)}
            />
          ))}
        </div>
      </details>
    </li>
  )
}

function WallDistanceField({
  distance: { wall, meters },
  units,
  onCommit,
}: {
  distance: WallDistance
  units: UnitSystem
  onCommit: (meters: number) => void
}) {
  return (
    <LengthField
      label={`From the ${wall} wall`}
      meters={meters}
      units={units}
      onCommit={onCommit}
    />
  )
}
