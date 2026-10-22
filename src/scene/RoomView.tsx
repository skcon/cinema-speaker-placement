import { lazy, Suspense, useEffect, useId, useMemo, useState } from 'react'
import { pressSelects, UNIT_SYSTEMS, type DragTarget } from '@/domain'
import {
  useConfig,
  useRoomAnalysis,
  useSeatHeatmap,
  useSeatRecommendation,
} from '@/state/config-context'
import { useSelectedItem, useSelection } from '@/state/selection-context'
import {
  dimensionTargetName,
  selectionDimensions,
  type SelectionDimensions,
} from '@/scene/dimensions'
import { GRADE_STYLES, UNGRADED_STYLE } from '@/scene/speakers'
import { RECOMMENDED_SEAT_COLOR, RULE_OF_THUMB_COLOR } from '@/scene/palette'
import {
  roomObjectsDragHelp,
  roomObjectsLegend,
  type RoomObjectsInView,
} from '@/scene/room-objects'
import { describeRoomView } from '@/scene/room-description'
import { grabAreas } from '@/scene/grab-areas'
import { canUseWebGL } from '@/scene/webgl'
import { heatmapGradient } from '@/scene/heatmap'
import { CAMERA_VIEW_KINDS, CAMERA_VIEWS, type CameraView } from '@/scene/orbit'
import { Button } from '@/ui/components/button'
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
  const config = useConfig((state) => state.config)
  const { room, units } = config
  const beginGesture = useConfig((state) => state.beginGesture)
  const moveDragTarget = useConfig((state) => state.moveDragTarget)
  const endGesture = useConfig((state) => state.endGesture)
  const analysis = useRoomAnalysis()
  const { overheads, seatRow, seatRuleOfThumb } = analysis
  const objectsInView: RoomObjectsInView = {
    room,
    roomObjects: config.roomObjects,
    seatRow,
  }
  const recommendation = useSeatRecommendation()
  const { select, clear } = useSelection()
  // What a press picks up, and what a press on it selects (a room object
  // is never the Selected item: pressing one clears it).
  const areas = useMemo(() => grabAreas(config, analysis), [config, analysis])
  const press = (target: DragTarget) => {
    const item = pressSelects(target)
    if (item) select(item)
    else clear()
  }
  const selectedItem = useSelectedItem()
  const selection = selectedItem && selectionDimensions(selectedItem, units)
  useClearSelectionOnEscape(selectedItem !== null, clear)
  // View state only: not in the config, the share link or the undo history.
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [view, setView] = useState<CameraView>('top-down')
  const viewPickerId = useId()
  // From the shared recommendation: deferred and kept through a drag.
  const heatmap = useSeatHeatmap(showHeatmap)
  // The floor grid is drawn in the unit system's base unit: 1 m or 1 ft squares.
  const { baseUnit } = UNIT_SYSTEMS[units]

  const description = describeRoomView({
    analysis,
    objectsInView,
    recommendation,
    heatmap,
    units,
    view,
  })

  if (!webGL) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {description.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>This browser can&rsquo;t draw the room view (no WebGL 2).</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        role="img"
        aria-label={description.join(' ')}
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
            items={analysis.items}
            roomObjects={objectsInView}
            gridSpacing={baseUnit.meters}
            recommendedSeat={recommendation?.recommended.position ?? null}
            heatmap={heatmap}
            ruleOfThumbFromFrontWall={seatRuleOfThumb.fromFrontWall}
            view={view}
            units={units}
            grabAreas={areas}
            onDragStart={beginGesture}
            onDragMove={moveDragTarget}
            onDragEnd={endGesture}
            selection={selection}
            onSelect={press}
            onDeselect={clear}
          />
        </Suspense>
      </div>
      {selectedItem && selection && (
        <SelectionReadout
          name={selectedItem.name}
          selection={selection}
          onClear={clear}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {view === '3d' ? (
          <p>
            Seen in perspective, up to the ceiling. Drag to orbit, scroll or
            pinch to zoom. View only: switch to Top-down to move items.
          </p>
        ) : (
          <p>
            To scale, seen from above. Grid squares are 1 {baseUnit.unit}. Drag
            the speakers and the MLP to move them; click or tap one to see its
            distances. {roomObjectsDragHelp(objectsInView)}
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
          {roomObjectsLegend(objectsInView).map(({ text, swatch }) => (
            <p key={text} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={swatch.className}
                style={{
                  backgroundColor: swatch.fill,
                  borderColor: swatch.edge,
                }}
              />
              {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Clears the selection when Escape is pressed anywhere on the page while
 * something is selected (unless something else already handled the key).
 */
function useClearSelectionOnEscape(selected: boolean, clear: () => void) {
  useEffect(() => {
    if (!selected) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) clear()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, clear])
}

/**
 * The Selected item's distances in one line under the scene, with a
 * finger-sized Clear button, on screens narrower than the desktop layout,
 * where the sidebar's details panel is far away (or hidden).
 */
function SelectionReadout({
  name,
  selection,
  onClear,
}: {
  name: string
  selection: SelectionDimensions
  onClear: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm lg:hidden">
      <p role="status" aria-label="Selected in the room view">
        <span className="font-medium">{name}</span>:{' '}
        {selection.lines
          .map(
            ({ target, text }) => `${text} to ${dimensionTargetName(target)}`,
          )
          .join(', ')}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 max-lg:h-11 max-lg:px-4"
        aria-label="Clear selection"
        onClick={onClear}
      >
        Clear
      </Button>
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
