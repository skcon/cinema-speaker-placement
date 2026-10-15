import { lazy, Suspense, useId, useState } from 'react'
import { formatLength, UNIT_SYSTEMS } from '@/domain'
import {
  useConfig,
  useRoomAnalysis,
  useSeatHeatmap,
  useSeatRecommendation,
} from '@/state/config-context'
import {
  describeOverhead,
  describeSpeaker,
  describeSubwoofer,
  GRADE_STYLES,
  UNGRADED_STYLE,
} from '@/scene/speakers'
import { RECOMMENDED_SEAT_COLOR, RULE_OF_THUMB_COLOR } from '@/scene/palette'
import { canUseWebGL } from '@/scene/webgl'
import { describeHeatmap, heatmapGradient } from '@/scene/heatmap'
import { CAMERA_VIEW_KINDS, CAMERA_VIEWS, type CameraView } from '@/scene/orbit'
import { Toggle } from '@/ui/components/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/ui/components/toggle-group'

/**
 * The look of a chosen option, as in the app's other pickers, with a
 * finger-sized target (44 px) below the desktop layout.
 */
const CHOSEN_OPTION =
  'text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground max-lg:h-11 max-lg:px-4'

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
  const {
    layout,
    mlp,
    speakers,
    overheads,
    subwoofers,
    seatRow,
    seatRuleOfThumb,
  } = useRoomAnalysis()
  const recommendation = useSeatRecommendation()
  // View state only: not in the config, the share link or the undo history.
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [view, setView] = useState<CameraView>('top-down')
  const viewPickerId = useId()
  // From the shared recommendation: deferred and kept through a drag.
  const heatmap = useSeatHeatmap(showHeatmap)
  // The floor grid is drawn in the unit system's base unit: 1 m or 1 ft squares.
  const { baseUnit } = UNIT_SYSTEMS[units]

  const roomDescription =
    view === '3d'
      ? `3D view of the room, ${formatLength(room.length, units)} long, ` +
        `${formatLength(room.width, units)} wide and ` +
        `${formatLength(room.height, units)} high, seen from behind the ` +
        `seats, with the MLP ${formatLength(mlp.y, units)} from the front wall.`
      : `Top-down view of the room, ${formatLength(room.length, units)} long ` +
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
  const overheadsDescription =
    overheads.length > 0
      ? `${overheads.length} overhead speakers on the ceiling, angle and ` +
        `elevation from the MLP and Dolby placement-range grade: ` +
        `${overheads.map(describeOverhead).join(', ')}.`
      : ''
  const subwoofersDescription =
    `${subwoofers.length} ${subwoofers.length === 1 ? 'subwoofer' : 'subwoofers'}, ` +
    `not graded as Dolby gives subwoofers no placement range: ` +
    `${subwoofers.map(describeSubwoofer).join(', ')}.`

  if (!webGL) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>{roomDescription}</p>
        <p>{speakersDescription}</p>
        {overheadsDescription && <p>{overheadsDescription}</p>}
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
          overheadsDescription,
          subwoofersDescription,
          seatDescription,
          describeHeatmap(heatmap, units),
        ]
          .filter(Boolean)
          .join(' ')}
        // Below lg the panel stacks over the others: the drawing keeps a
        // usable height of its own, whatever the legend below it takes.
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg max-lg:min-h-96"
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
            overheads={overheads}
            subwoofers={subwoofers}
            gridSpacing={baseUnit.meters}
            seatRow={seatRow}
            recommendedSeat={recommendation?.recommended.position ?? null}
            heatmap={heatmap}
            ruleOfThumbFromFrontWall={seatRuleOfThumb.fromFrontWall}
            view={view}
            units={units}
            onDragStart={beginGesture}
            onDragMove={moveItem}
            onDragEnd={endGesture}
          />
        </Suspense>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {view === '3d' ? (
          <p>
            Seen in perspective, up to the ceiling. Drag to orbit, scroll or
            pinch to zoom. View only: switch to Top-down to move items.
          </p>
        ) : (
          <p>
            To scale, seen from above. Grid squares are 1 {baseUnit.unit}. Drag
            the speakers and the MLP to move them.
          </p>
        )}
        <div className="flex items-center gap-2">
          <span id={viewPickerId}>Camera</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            aria-labelledby={viewPickerId}
            value={view}
            onValueChange={(value) => {
              // Clicking the chosen option again sends '' (nothing chosen): ignore it.
              const chosen = CAMERA_VIEW_KINDS.find((kind) => kind === value)
              if (chosen) setView(chosen)
            }}
          >
            {CAMERA_VIEW_KINDS.map((kind) => (
              <ToggleGroupItem
                key={kind}
                value={kind}
                className={CHOSEN_OPTION}
              >
                {CAMERA_VIEWS[kind].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Toggle
          variant="outline"
          size="sm"
          className={CHOSEN_OPTION}
          pressed={showHeatmap}
          onPressedChange={setShowHeatmap}
        >
          Seat-score heatmap
        </Toggle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {heatmap && (
            <HeatmapLegend scoresAboutTheSame={heatmap.scoresAboutTheSame} />
          )}
          <GradeLegend />
          {overheads.length > 0 && (
            <p className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-full border-2 border-current"
              />
              Overhead speaker (ring)
            </p>
          )}
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
              className="w-3 border-t border-dashed"
              style={{ borderColor: RULE_OF_THUMB_COLOR }}
            />
            38% rule of thumb (reference only)
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

/**
 * What the heatmap colors mean, and what the scores are: relative to the
 * current MLP's calibration, and an estimate. When the seats score about
 * the same, the colors sit near the middle of the scale and a note says so.
 */
function HeatmapLegend({
  scoresAboutTheSame,
}: {
  scoresAboutTheSame: boolean
}) {
  const headingId = useId()
  return (
    <div className="flex basis-full flex-wrap items-center gap-x-3 gap-y-1">
      <div
        role="group"
        aria-labelledby={headingId}
        className="flex items-center gap-1.5"
      >
        <span id={headingId}>Seat score (estimate)</span>
        <span>low</span>
        <span
          aria-hidden
          className="h-2.5 w-16 rounded-xs"
          style={{ background: heatmapGradient() }}
        />
        <span>high</span>
      </div>
      {scoresAboutTheSame && <p>Seats score about the same.</p>}
      <p>
        Relative to the current MLP&rsquo;s calibration: an estimate from a
        simplified model.
      </p>
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
