import { lazy, Suspense, useId, useState } from 'react'
import { formatLayout, formatLength, UNIT_SYSTEMS } from '@/domain'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import { describeSpeaker, GRADE_STYLES } from '@/scene/speakers'
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
  const { room, units, layout } = useConfig((state) => state.config)
  const { mlp, speakers } = useRoomAnalysis()
  // The floor grid is drawn in the unit system's base unit: 1 m or 1 ft squares.
  const { baseUnit } = UNIT_SYSTEMS[units]

  const roomDescription =
    `Top-down view of the room, ${formatLength(room.length, units)} long ` +
    `and ${formatLength(room.width, units)} wide, with the front wall at ` +
    `the top and the MLP ${formatLength(mlp.y, units)} from the front wall.`
  const speakersDescription =
    `${formatLayout(layout)} listener-level speakers, angle from the MLP ` +
    `and Dolby placement-range grade: ` +
    `${speakers.map(describeSpeaker).join(', ')}.`

  if (!webGL) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>{roomDescription}</p>
        <p>{speakersDescription}</p>
        <p>This browser can&rsquo;t draw the room view (no WebGL 2).</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        role="img"
        aria-label={`${roomDescription} ${speakersDescription}`}
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
            gridSpacing={baseUnit.meters}
          />
        </Suspense>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p>To scale, seen from above. Grid squares are 1 {baseUnit.unit}.</p>
        <GradeLegend />
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
