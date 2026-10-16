import { useId } from 'react'
import {
  checkScreenDimension,
  checkSeatRowDimension,
  formatLength,
  screenDimension,
  SEAT_ROW_HEAD_OFFSET,
  type RoomScreen,
  type ScreenDimension,
  type ScreenKind,
  type SeatRowDimension,
} from '@/domain'
import { useConfig } from '@/state/config-context'
import { Button } from '@/ui/components/button'
import { Label } from '@/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@/ui/components/radio-group'
import { CheckedLengthField } from '@/ui/CheckedLengthField'
import { lengthErrorMessage } from '@/ui/lib/length-error'
import { SidebarSection, SidebarSubsection } from '@/ui/SidebarSection'

/**
 * Room objects in the sidebar (ADR 0006): things in the room besides the
 * speakers and the MLP. So far the Seat row and the Screen; furniture
 * boxes and openings join this section as subsections.
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
    </SidebarSection>
  )
}

/** How each of the seat row's lengths is labelled, and named in its errors. */
const SEAT_ROW_FIELDS = {
  width: { label: 'Seat row width', noun: 'seat row width' },
  depth: { label: 'Seat row depth', noun: 'seat row depth' },
} as const satisfies Record<SeatRowDimension, { label: string; noun: string }>

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
      <SeatRowDimensionField dimension="width" />
      <SeatRowDimensionField dimension="depth" />
    </div>
  )
}

/** One of the seat row's lengths, checked against its range. */
function SeatRowDimensionField({ dimension }: { dimension: SeatRowDimension }) {
  const units = useConfig((state) => state.config.units)
  const meters = useConfig(
    (state) => state.config.roomObjects.seatRow[dimension],
  )
  const setSeatRowDimension = useConfig((state) => state.setSeatRowDimension)
  const { label, noun } = SEAT_ROW_FIELDS[dimension]

  return (
    <CheckedLengthField
      label={label}
      meters={meters}
      units={units}
      check={(value) => checkSeatRowDimension(dimension, value)}
      errorMessage={(problem) =>
        lengthErrorMessage(noun, label, problem, units)
      }
      onChange={(value) => setSeatRowDimension(dimension, value)}
    />
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
} as const satisfies Record<ScreenDimension, { label: string; noun: string }>

/**
 * The Screen: added on request (a room without one works as in v1.0.0),
 * then its kind, mounting and size in the user's units, or removed.
 */
function ScreenForm() {
  const screen = useConfig((state) => state.config.roomObjects.screen)
  const addScreen = useConfig((state) => state.addScreen)
  const removeScreen = useConfig((state) => state.removeScreen)

  if (!screen) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-xs text-muted-foreground">
          No screen. Add your TV or projection screen to see it on the front
          wall.
        </p>
        <Button variant="outline" className="max-lg:h-11" onClick={addScreen}>
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
      <ScreenDimensionField screen={screen} dimension="width" />
      <ScreenDimensionField screen={screen} dimension="height" />
      <ScreenDimensionField screen={screen} dimension="bottomEdge" />
      <ScreenDimensionField screen={screen} dimension="fromLeftWall" />
      {screen.standoff !== null && (
        <ScreenDimensionField screen={screen} dimension="standoff" />
      )}
      <Button
        variant="outline"
        className="self-start max-lg:h-11"
        onClick={removeScreen}
      >
        Remove the screen
      </Button>
    </div>
  )
}

function KindPicker({ kind }: { kind: ScreenKind }) {
  const setScreenKind = useConfig((state) => state.setScreenKind)
  return (
    <OptionPicker
      label="Kind"
      value={kind}
      options={KIND_OPTIONS}
      onChange={setScreenKind}
    />
  )
}

function MountingPicker({ transparent }: { transparent: boolean }) {
  const setTransparent = useConfig(
    (state) => state.setScreenAcousticallyTransparent,
  )
  return (
    <OptionPicker
      label="Mounting"
      value={transparent ? 'transparent' : 'wall'}
      options={MOUNTING_OPTIONS}
      onChange={(value) => setTransparent(value === 'transparent')}
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

/** One of the screen's lengths, checked against its range in this room. */
function ScreenDimensionField({
  screen,
  dimension,
}: {
  screen: RoomScreen
  dimension: ScreenDimension
}) {
  const room = useConfig((state) => state.config.room)
  const units = useConfig((state) => state.config.units)
  const setScreenDimension = useConfig((state) => state.setScreenDimension)
  const { label, noun } = DIMENSION_FIELDS[dimension]
  const meters = screenDimension(room, screen, dimension)
  if (meters === null) return null

  return (
    <CheckedLengthField
      label={label}
      meters={meters}
      units={units}
      check={(value) => checkScreenDimension(room, screen, dimension, value)}
      errorMessage={(problem) =>
        lengthErrorMessage(noun, label, problem, units)
      }
      onChange={(value) => setScreenDimension(dimension, value)}
    />
  )
}
