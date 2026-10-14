import { lazy, Suspense, useId, useState } from 'react'
import { formatLength, UNIT_SYSTEMS } from '@/domain'
import {
  useConfig,
  useRoomAnalysis,
  useSeatRecommendation,
} from '@/state/config-context'
import {
  describeSpeaker,
  describeSubwoofer,
  GRADE_STYLES,
  RECOMMENDED_SEAT_COLOR,
  UNGRADED_STYLE,
} from '@/scene/speakers'
import { canUseWebGL } from '@/scene/webgl'

const RoomCanvas = lazy(() =>
  import('@/scene/RoomCanvas').then((module) => ({
    default: module.RoomCanvas,
  })),
)

/**
 * The room view panel's content: the top-down scene with a text description
 * for screen readers, or the description alone when WebGL is unavailable.
 */
export function RoomView() {
  const [webGL] = useState(canUseWebGL)
  const { room, units } = useConfig((state) => state.config)
  const beginGesture = useConfig((state) => state.beginGesture)
  const moveItem = useConfig((state) => state.moveItem)
  const endGesture = useConfig((state) => state.endGesture)
  const { layout, mlp, speakers, subwoofers, seatRow, seatRuleOfThumb } =
    useRoomAnalysis()
  const recommendation = useSeatRecommendation()
  // The floor grid is drawn in the unit system's base unit: 1 m or 1 ft squares.
  const { baseUnit } = UNIT_SYSTEMS[units]

  const roomDescription =
    `Top-down view of the room, ${formatLength(room.length, units)} long ` +
    `and ${formatLength(room.width, units)} wide, with the front wall at ` +
    `the top and the MLP ${formatLength(mlp.y, units)} from the front wall.`
  const seatDescription = recommendation
    ? recommendation.mlpIsRecommended
      ? 'The MLP is at the recommended seat (an estimate).'
      : `The recommended seat (an estimate) is ringed, ` +
        `${formatLength(recommendation.recommended.position.y, units)} ` +
        `from the front wall.`
    : ''
  const speakersDescription =
    `${layout.name} listener-level speakers, angle from the MLP ` +
    `and Dolby placement-range grade: ` +
    `${speakers.map(describeSpeaker).join(', ')}.`
  const subwoofersDescription =
    `${subwoofers.length} ${subwoofers.length === 1 ? 'subwoofer' : 'subwoofers'}, ` +
    `not graded as Dolby gives subwoofers no placement range: ` +
    `${subwoofers.map(describeSubwoofer).join(', ')}.`

  if (!webGL) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>{roomDescription}</p>
        <p>{speakersDescription}</p>
        <p>{subwoofersDescription}</p>
        {seatDescription && <p>{seatDescription}</p>}
        <p>This browser can&rsquo;t draw the room view (no WebGL 2).</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        role="img"
        aria-label={[
          roomDescription,
          speakersDescription,
          subwoofersDescription,
          seatDescription,
        ]
          .filter(Boolean)
          .join(' ')}
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg"
      >
        <Suspense
          fallback={
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Loading the room view&hellip;
            </p>
          }
        >
          <RoomCanvas
            room={room}
            mlp={mlp}
            speakers={speakers}
            subwoofers={subwoofers}
            gridSpacing={baseUnit.meters}
            seatRow={seatRow}
            recommendedSeat={recommendation?.recommended.position ?? null}
            ruleOfThumbFromFrontWall={seatRuleOfThumb.fromFrontWall}
            onDragStart={beginGesture}
            onDragMove={moveItem}
            onDragEnd={endGesture}
          />
        </Suspense>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p>
          To scale, seen from above. Grid squares are 1 {baseUnit.unit}. Drag
          the speakers and the MLP to move them.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <GradeLegend />
          <p className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full border-2"
              style={{ borderColor: RECOMMENDED_SEAT_COLOR }}
            />
            Recommended seat (estimate)
          </p>
          <p className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-xs"
              style={{ backgroundColor: UNGRADED_STYLE.color }}
            />
            Subwoofer: {UNGRADED_STYLE.label}
          </p>
        </div>
      </div>
    </div>
  )
}

/** What the speaker colors mean; each label in the view also names its grade. */
function GradeLegend() {
  const headingId = useId()
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span id={headingId}>Dolby placement range:</span>
      <ul aria-labelledby={headingId} className="flex gap-3">
        {Object.values(GRADE_STYLES).map(({ color, label }) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-xs"
              style={{ backgroundColor: color }}
            />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
