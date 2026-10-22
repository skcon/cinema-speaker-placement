import { useId } from 'react'
import {
  checkFurnitureName,
  checkRange,
  formatLength,
  FURNITURE_NAME_MAX_LENGTH,
  FURNITURE_PRESETS,
  furnitureLabel,
  furnitureTurned,
  MAX_FURNITURE,
  MAX_OPENINGS,
  OPENING_KINDS,
  openingLabel,
  roomObjectId,
  roomObjectLength,
  SCREEN_ID,
  SEAT_ROW_HEAD_OFFSET,
  SEAT_ROW_ID,
  warningsAbout,
  withAcousticTransparency,
  withFurnitureName,
  withOpeningWall,
  withRoomObjectAdded,
  withRoomObjectDimension,
  withRoomObjectEdited,
  withRoomObjectRemoved,
  withScreenKind,
  type FurnitureBox,
  type FurnitureDimension,
  type FurnitureId,
  type FurnitureNameProblem,
  type FurniturePreset,
  type Opening,
  type OpeningDimension,
  type OpeningId,
  type OpeningKind,
  type RoomObjectDimension,
  type RoomObjectId,
  type ScreenDimension,
  type ScreenKind,
  type SeatRowDimension,
  type Wall,
} from '@/domain'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import { Input } from '@/ui/components/input'
import { PlacementWarningList } from '@/ui/PlacementWarnings'
import { Button } from '@/ui/components/button'
import { Label } from '@/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@/ui/components/radio-group'
import { CheckedLengthField } from '@/ui/CheckedLengthField'
import { lengthErrorMessage } from '@/ui/lib/length-error'
import { useDraftField, type TextCodec } from '@/ui/lib/use-draft-field'
import { SidebarSection, SidebarSubsection } from '@/ui/SidebarSection'

/**
 * Room objects in the sidebar (ADR 0006): things in the room besides the
 * speakers and the MLP: the Seat row, the Screen, furniture boxes and
 * doors and windows, then every placement warning.
 */
export function RoomObjectsForm() {
  return (
    <SidebarSection
      id="roomObjects"
      title="Room objects"
      description="What else is in your room, such as your couch and screen. Room objects are drawn in the room view and used for placement warnings, but they are not part of the estimated response."
    >
      <SidebarSubsection title="Seat row">
        <SeatRowForm />
      </SidebarSubsection>
      <SidebarSubsection title="Screen">
        <ScreenForm />
      </SidebarSubsection>
      <SidebarSubsection title="Furniture">
        <FurnitureForm />
      </SidebarSubsection>
      <SidebarSubsection title="Doors and windows">
        <OpeningsForm />
      </SidebarSubsection>
      <SidebarSubsection title="Placement warnings">
        <AllPlacementWarnings />
      </SidebarSubsection>
    </SidebarSection>
  )
}

/** How a length's field is labelled, and what its errors call it. */
type LengthText = { readonly label: string; readonly noun: string }

/** How each of the seat row's lengths is labelled, and named in its errors. */
const SEAT_ROW_FIELDS = {
  width: { label: 'Seat row width', noun: 'seat row width' },
  depth: { label: 'Seat row depth', noun: 'seat row depth' },
} as const satisfies Record<SeatRowDimension, LengthText>

/**
 * The Seat row: the couch the MLP sits on. Every room has one; it moves
 * with the MLP, so only its size is set here.
 */
function SeatRowForm() {
  const units = useConfig((state) => state.config.units)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Your couch or row of seats. The MLP (your head) sits on it,{' '}
        {formatLength(SEAT_ROW_HEAD_OFFSET, units)} in front of its back. Drag
        the seat row or the MLP in the top-down view to move both; Auto-place
        and &ldquo;Move MLP here&rdquo; move it too.
      </p>
      <LengthFields id={SEAT_ROW_ID} fields={SEAT_ROW_FIELDS} />
    </div>
  )
}

const KIND_OPTIONS = [
  { value: 'tv', label: 'TV' },
  { value: 'projection', label: 'Projection screen' },
] as const satisfies readonly { value: ScreenKind; label: string }[]

const MOUNTING_OPTIONS = [
  { value: 'wall', label: 'On the front wall' },
  {
    value: 'transparent',
    label: 'Acoustically transparent, speakers behind it',
  },
] as const

/**
 * How each of the screen's lengths is labelled, and named in its errors.
 * `fromLeftWall` places it along the front wall.
 */
const DIMENSION_FIELDS = {
  width: { label: 'Screen width', noun: 'screen width' },
  height: { label: 'Screen height', noun: 'screen height' },
  bottomEdge: { label: 'Bottom edge above the floor', noun: 'bottom edge' },
  fromLeftWall: {
    label: 'Left edge from the left wall',
    noun: 'distance from the left wall',
  },
  standoff: {
    label: 'Standoff from the front wall',
    noun: 'standoff',
  },
} as const satisfies Record<ScreenDimension, LengthText>

/**
 * The Screen: added on request (a room without one works as in v1.0.0),
 * then its kind, mounting and size in the user's units, or removed.
 */
function ScreenForm() {
  const screen = useConfig((state) => state.config.roomObjects.screen)
  const applyEdit = useConfig((state) => state.applyEdit)

  if (!screen) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-xs text-muted-foreground">
          No screen. Add your TV or projection screen to see it on the front
          wall.
        </p>
        <Button
          variant="outline"
          className="max-lg:h-11"
          onClick={() =>
            applyEdit((config) =>
              withRoomObjectAdded(config, { kind: 'screen' }),
            )
          }
        >
          Add a screen
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Drawn on the front wall; drag it along the wall in the top-down view, or
        edit it here. Sizes are of the picture, not the diagonal.
      </p>
      <KindPicker kind={screen.kind} />
      {screen.kind === 'projection' && (
        <MountingPicker transparent={screen.standoff !== null} />
      )}
      <LengthFields id={SCREEN_ID} fields={DIMENSION_FIELDS} />
      <Button
        variant="outline"
        className="self-start max-lg:h-11"
        onClick={() =>
          applyEdit((config) => withRoomObjectRemoved(config, SCREEN_ID))
        }
      >
        Remove the screen
      </Button>
    </div>
  )
}

function KindPicker({ kind }: { kind: ScreenKind }) {
  const applyEdit = useConfig((state) => state.applyEdit)
  return (
    <OptionPicker
      label="Kind"
      value={kind}
      options={KIND_OPTIONS}
      onChange={(value) =>
        applyEdit((config) =>
          withRoomObjectEdited(config, SCREEN_ID, (_, screen) =>
            withScreenKind(screen, value),
          ),
        )
      }
    />
  )
}

function MountingPicker({ transparent }: { transparent: boolean }) {
  const applyEdit = useConfig((state) => state.applyEdit)
  return (
    <OptionPicker
      label="Mounting"
      value={transparent ? 'transparent' : 'wall'}
      options={MOUNTING_OPTIONS}
      onChange={(value) =>
        applyEdit((config) =>
          withRoomObjectEdited(config, SCREEN_ID, (_, screen) =>
            withAcousticTransparency(screen, value === 'transparent'),
          ),
        )
      }
    />
  )
}

/** A labelled set of radio buttons. */
function OptionPicker<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: V
  options: readonly { value: V; label: string }[]
  onChange: (value: V) => void
}) {
  const labelId = useId()
  const idPrefix = useId()
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <RadioGroup
        aria-labelledby={labelId}
        value={value}
        onValueChange={(chosen) => {
          const option = options.find((o) => o.value === chosen)
          if (option) onChange(option.value)
        }}
        className="flex flex-col gap-2"
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem
              value={option.value}
              id={`${idPrefix}-${option.value}`}
            />
            <Label
              htmlFor={`${idPrefix}-${option.value}`}
              className="font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

/** How each preset's add button reads. */
const PRESET_BUTTONS = {
  cabinet: 'Add a cabinet',
  table: 'Add a table',
  shelf: 'Add a shelf',
} as const satisfies Record<FurniturePreset, string>

/**
 * Furniture boxes: added from a preset (a cabinet, table or shelf, against
 * the middle of the front wall), then named, sized, moved from the walls,
 * turned or removed. Up to MAX_FURNITURE of them.
 */
function FurnitureForm() {
  const furniture = useConfig((state) => state.config.roomObjects.furniture)
  const applyEdit = useConfig((state) => state.applyEdit)
  const full = furniture.length >= MAX_FURNITURE

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Cabinets, tables, shelves and the like, as boxes. Drawn in the room view
        and used for placement warnings, but not part of the estimated response.
        Drag them in the top-down view; distances are to a box&rsquo;s nearest
        side.
      </p>
      {furniture.map((box, index) => (
        <FurnitureBoxForm
          // Keyed by place: the room view names a box by it (roomObjectId).
          key={index}
          id={roomObjectId('furniture', index)}
          box={box}
          label={furnitureLabel(box, index)}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        {FURNITURE_PRESETS.map((preset) => (
          <Button
            key={preset}
            variant="outline"
            className="max-lg:h-11"
            disabled={full}
            onClick={() =>
              applyEdit((config) =>
                withRoomObjectAdded(config, { kind: 'furniture', preset }),
              )
            }
          >
            {PRESET_BUTTONS[preset]}
          </Button>
        ))}
      </div>
      {full && (
        <p className="text-xs text-muted-foreground">
          A room holds up to {MAX_FURNITURE} furniture boxes, so its share link
          stays short enough to send.
        </p>
      )}
    </div>
  )
}

/** How each of a box's lengths is labelled, and named in its errors. */
const FURNITURE_FIELDS = {
  width: { label: 'Box width', noun: 'box width' },
  depth: { label: 'Box depth', noun: 'box depth' },
  height: { label: 'Box height', noun: 'box height' },
  fromLeftWall: { label: 'Box from the left wall', noun: 'distance' },
  fromFrontWall: { label: 'Box from the front wall', noun: 'distance' },
} as const satisfies Record<FurnitureDimension, LengthText>

/** Which wall a box's front faces, by how it is turned (see furniture.ts). */
const FRONT_FACES = {
  0: 'the back wall',
  90: 'the left wall',
  180: 'the front wall',
  270: 'the right wall',
} as const satisfies Record<FurnitureBox['rotation'], string>

/** One furniture box: its name, size, place, turn, warnings and removal. */
function FurnitureBoxForm({
  id,
  box,
  label,
}: {
  id: FurnitureId
  box: FurnitureBox
  label: string
}) {
  const headingId = useId()
  const applyEdit = useConfig((state) => state.applyEdit)
  const warnings = warningsAbout(useRoomAnalysis().placementWarnings, id)

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-md border p-2"
    >
      <h4 id={headingId} className="text-sm font-medium">
        {label}
      </h4>
      <FurnitureNameField id={id} name={box.name} />
      <LengthFields id={id} fields={FURNITURE_FIELDS} />
      <p className="text-xs text-muted-foreground">
        Turned {box.rotation}°: its front faces {FRONT_FACES[box.rotation]}.
      </p>
      <PlacementWarningList
        warnings={warnings}
        label={`Placement warnings for ${label}`}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="max-lg:h-11"
          aria-label={`Turn ${label} 90°`}
          onClick={() =>
            applyEdit((config) =>
              withRoomObjectEdited(config, id, furnitureTurned),
            )
          }
        >
          Turn 90°
        </Button>
        <Button
          variant="outline"
          className="max-lg:h-11"
          aria-label={`Remove ${label}`}
          onClick={() =>
            applyEdit((config) => withRoomObjectRemoved(config, id))
          }
        >
          Remove
        </Button>
      </div>
    </section>
  )
}

/** What a rejected name gets told. */
const NAME_ERRORS = {
  empty: 'Give the box a name.',
  'too-long': `Use at most ${FURNITURE_NAME_MAX_LENGTH} characters.`,
  characters:
    "Use letters (also with accents such as é or ö), digits, spaces and - ' & ( ) . , / only.",
} as const satisfies Record<FurnitureNameProblem, string>

/** A name as a field's text: spaces around it don't count. */
const NAME_TEXT: TextCodec<string, string> = {
  write: (name) => name,
  read: (text) => text.trim(),
}

/**
 * A box's name, checked as it is typed (useDraftField): an accepted name
 * goes to the store (trimmed), a rejected one stays in the field with an
 * inline error. When the stored name changes elsewhere (undo, a share
 * link) the field starts over from it.
 */
function FurnitureNameField({ id, name }: { id: FurnitureId; name: string }) {
  const applyEdit = useConfig((state) => state.applyEdit)
  const { text, problem, edit } = useDraftField({
    value: name,
    codec: NAME_TEXT,
    check: checkFurnitureName,
    onCommit: (typed) =>
      applyEdit((config) =>
        withRoomObjectEdited(config, id, (_, box) =>
          withFurnitureName(box, typed),
        ),
      ),
  })
  const inputId = useId()
  const errorId = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>Name</Label>
      <Input
        id={inputId}
        autoComplete="off"
        value={text}
        onChange={(event) => edit(event.target.value)}
        aria-invalid={problem !== null}
        aria-describedby={errorId}
        className="max-w-48"
      />
      <p id={errorId} aria-live="polite" className="text-sm text-destructive">
        {problem && NAME_ERRORS[problem]}
      </p>
    </div>
  )
}

/** How each kind's add button reads. */
const OPENING_BUTTONS = {
  door: 'Add a door',
  window: 'Add a window',
} as const satisfies Record<OpeningKind, string>

/**
 * Doors and windows: added (a door in the middle of the back wall, a
 * window in the middle of the right wall), then moved to their wall, sized
 * and moved along it, or removed. Up to MAX_OPENINGS of them.
 */
function OpeningsForm() {
  const openings = useConfig((state) => state.config.roomObjects.openings)
  const applyEdit = useConfig((state) => state.applyEdit)
  const full = openings.length >= MAX_OPENINGS

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Doors and windows on the walls. Drawn in the room view and used for
        placement warnings, but not modelled: the estimated response still
        assumes closed, solid walls. Drag them along their wall in the top-down
        view; distances are to an opening&rsquo;s nearest edge.
      </p>
      {openings.map((opening, index) => (
        <OpeningForm
          // Keyed by place: the room view names an opening by it (roomObjectId).
          key={index}
          id={roomObjectId('opening', index)}
          opening={opening}
          label={openingLabel(opening, index)}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        {OPENING_KINDS.map((kind) => (
          <Button
            key={kind}
            variant="outline"
            className="max-lg:h-11"
            disabled={full}
            onClick={() =>
              applyEdit((config) =>
                withRoomObjectAdded(config, { kind: 'opening', preset: kind }),
              )
            }
          >
            {OPENING_BUTTONS[kind]}
          </Button>
        ))}
      </div>
      {full && (
        <p className="text-xs text-muted-foreground">
          A room holds up to {MAX_OPENINGS} doors and windows, so its share link
          stays short enough to send.
        </p>
      )}
    </div>
  )
}

const WALL_OPTIONS = [
  { value: 'front', label: 'Front wall' },
  { value: 'right', label: 'Right wall' },
  { value: 'back', label: 'Back wall' },
  { value: 'left', label: 'Left wall' },
] as const satisfies readonly { value: Wall; label: string }[]

/** Where along each wall an opening is measured from. */
const FROM_CORNER_LABELS = {
  front: 'From the left wall',
  back: 'From the left wall',
  left: 'From the front wall',
  right: 'From the front wall',
} as const satisfies Record<Wall, string>

/** How each of an opening's lengths is labelled, and named in its errors. */
const OPENING_FIELDS = {
  width: { label: 'Opening width', noun: 'opening width' },
  fromCorner: { label: 'From the corner', noun: 'distance' },
  sill: { label: 'Sill height', noun: 'sill height' },
  height: { label: 'Window height', noun: 'window height' },
} as const satisfies Record<OpeningDimension, LengthText>

/** One door or window: its wall, size, place, warnings and removal. */
function OpeningForm({
  id,
  opening,
  label,
}: {
  id: OpeningId
  opening: Opening
  label: string
}) {
  const headingId = useId()
  const applyEdit = useConfig((state) => state.applyEdit)
  const warnings = warningsAbout(useRoomAnalysis().placementWarnings, id)

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-md border p-2"
    >
      <h4 id={headingId} className="text-sm font-medium">
        {label}
      </h4>
      <OptionPicker
        label="Wall"
        value={opening.wall}
        options={WALL_OPTIONS}
        onChange={(wall) =>
          applyEdit((config) =>
            withRoomObjectEdited(config, id, (room, opening) =>
              withOpeningWall(room, opening, wall),
            ),
          )
        }
      />
      <LengthFields
        id={id}
        fields={{
          ...OPENING_FIELDS,
          fromCorner: {
            ...OPENING_FIELDS.fromCorner,
            label: FROM_CORNER_LABELS[opening.wall],
          },
        }}
      />
      <PlacementWarningList
        warnings={warnings}
        label={`Placement warnings for ${label}`}
      />
      <Button
        variant="outline"
        className="self-start max-lg:h-11"
        aria-label={`Remove ${label}`}
        onClick={() => applyEdit((config) => withRoomObjectRemoved(config, id))}
      >
        Remove
      </Button>
    </section>
  )
}

/**
 * A field for each of room object `id`'s lengths in `fields`, in their
 * order; a length the object doesn't have (a door's sill, the standoff of
 * a screen on the wall) gets none.
 */
function LengthFields<I extends RoomObjectId>({
  id,
  fields,
}: {
  id: I
  fields: Record<RoomObjectDimension<I>, LengthText>
}) {
  const dimensions = Object.keys(fields) as RoomObjectDimension<I>[]
  return dimensions.map((dimension) => (
    <RoomObjectLengthField
      key={dimension}
      id={id}
      dimension={dimension}
      {...fields[dimension]}
    />
  ))
}

/**
 * One of a room object's lengths, a size or a distance from a wall,
 * checked against the limits the domain gives for it in this room (see
 * roomObjectLength): every value it accepts gives a valid config.
 */
function RoomObjectLengthField<I extends RoomObjectId>({
  id,
  dimension,
  label,
  noun,
}: {
  id: I
  dimension: RoomObjectDimension<I>
} & LengthText) {
  const room = useConfig((state) => state.config.room)
  const roomObjects = useConfig((state) => state.config.roomObjects)
  const units = useConfig((state) => state.config.units)
  const applyEdit = useConfig((state) => state.applyEdit)
  const length = roomObjectLength({ room, roomObjects }, id, dimension)
  if (!length) return null

  return (
    <CheckedLengthField
      label={label}
      meters={length.meters}
      units={units}
      check={(value) => checkRange(value, length.limits)}
      errorMessage={(problem) =>
        lengthErrorMessage(noun, label, problem, units)
      }
      onChange={(value) =>
        applyEdit((config) =>
          withRoomObjectDimension(config, id, dimension, value),
        )
      }
    />
  )
}

/**
 * Every placement warning in the room, with where its rule comes from: a
 * hint, never a block.
 */
function AllPlacementWarnings() {
  const { placementWarnings } = useRoomAnalysis()
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Hints where a room object makes a speaker or the MLP worse off, each
        with where its rule comes from. They never stop you placing anything,
        and they don&rsquo;t change the estimated response.
      </p>
      {placementWarnings.length === 0 ? (
        <p className="text-xs">No placement warnings.</p>
      ) : (
        <PlacementWarningList warnings={placementWarnings} />
      )}
    </div>
  )
}
