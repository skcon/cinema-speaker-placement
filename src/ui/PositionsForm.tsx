import {
  checkRange,
  formatLength,
  FRONT_STAGE_WALL_DISTANCE,
  MLP_ID,
  positionLengths,
  type PlaceableId,
  type Placement,
  type PositionDimension,
  type PositionLength,
  type RoomPoint,
} from '@/domain'
import { GRADE_STYLES } from '@/scene/speakers'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import { useSelection } from '@/state/selection-context'
import { CheckedLengthField } from '@/ui/CheckedLengthField'
import { lengthErrorMessage } from '@/ui/lib/length-error'
import { SidebarSubsection } from '@/ui/SidebarSection'

/**
 * Where each speaker, subwoofer and the MLP is, for mounting it: height and
 * distances to the nearest walls, each editable (an overhead's height is the
 * ceiling's, shown with its elevation and grade). Editing an item (or
 * dragging it in the room view) makes it manual, so it stays put; auto
 * items follow the Room and the MLP until Auto-place resets them all.
 * A typed length outside the wall, floor or ceiling clearances is
 * rejected with the range the field accepts (positionLengths); a drag
 * stops at them instead.
 */
export function PositionsForm() {
  const { mlp, mlpPlacement, speakers, overheads, subwoofers } =
    useRoomAnalysis()
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
        {speakers.map(({ channel, name, position, placement }) => (
          <PositionItem
            key={channel}
            id={channel}
            abbreviation={channel}
            name={name}
            position={position}
            placement={placement}
            height="editable"
          />
        ))}
        {overheads.map(
          ({ channel, name, position, placement, placementRange }) => (
            <PositionItem
              key={channel}
              id={channel}
              abbreviation={channel}
              name={name}
              position={position}
              placement={placement}
              height={{ fixed: 'Ceiling' }}
              note={
                `Elevation ${placementRange.elevation.shown}° ` +
                `(${GRADE_STYLES[placementRange.elevation.grade].label})`
              }
            />
          ),
        )}
        {subwoofers.map(({ id, name, position, placement }) => (
          <PositionItem
            key={id}
            id={id}
            abbreviation={id}
            name={name}
            position={position}
            placement={placement}
            height={{ fixed: 'Height' }}
          />
        ))}
        <PositionItem
          id={MLP_ID}
          abbreviation=""
          name="MLP"
          position={mlp}
          placement={mlpPlacement}
          height={{ fixed: 'Ear height' }}
        />
      </ul>
    </SidebarSubsection>
  )
}

function PositionItem({
  id,
  abbreviation,
  name,
  position,
  placement,
  height,
  note,
}: {
  id: PlaceableId
  abbreviation: string
  name: string
  position: RoomPoint
  placement: Placement
  /** Editable, or fixed and shown as text with this label. */
  height: 'editable' | { fixed: string }
  /** A line shown under the height, if any. */
  note?: string
}) {
  const room = useConfig((state) => state.config.room)
  const units = useConfig((state) => state.config.units)
  const { select } = useSelection()
  const lengths = positionLengths(room, id, position)

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
            lengths.height && (
              <PositionLengthField
                id={id}
                dimension="height"
                length={lengths.height}
                label="Height above the floor"
                noun="height"
              />
            )
          ) : (
            <p className="text-xs text-muted-foreground">
              {height.fixed} {formatLength(position.z, units)} (fixed)
            </p>
          )}
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
          {lengths.walls.map((length) => (
            <PositionLengthField
              key={length.wall}
              id={id}
              dimension={length.wall}
              length={length}
              label={`From the ${length.wall} wall`}
              noun="distance"
            />
          ))}
        </div>
      </details>
    </li>
  )
}

/**
 * One of an item's lengths, its height or its distance to a wall, checked
 * against the limits the domain gives for it in this room (see
 * positionLengths), and applied when the field is left: a length outside
 * them shows the range instead of moving the item to the limit.
 */
function PositionLengthField({
  id,
  dimension,
  length,
  label,
  noun,
}: {
  id: PlaceableId
  dimension: PositionDimension
  length: PositionLength
  label: string
  /** The length in "Enter the … as a number". */
  noun: string
}) {
  const units = useConfig((state) => state.config.units)
  const setPositionLength = useConfig((state) => state.setPositionLength)

  return (
    <CheckedLengthField
      label={label}
      meters={length.meters}
      units={units}
      check={(value) => checkRange(value, length.limits)}
      errorMessage={(problem) =>
        lengthErrorMessage(noun, label, problem, units)
      }
      onChange={(value) => setPositionLength(id, dimension, value)}
      commitOn="leave"
    />
  )
}
