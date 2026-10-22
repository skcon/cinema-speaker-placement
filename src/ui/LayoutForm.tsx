import { useId } from 'react'
import {
  canAutoPlace,
  evenerSubwooferCounts,
  formatLayout,
  formatLength,
  LOW_CEILING_FOR_OVERHEADS,
  SUBWOOFER_ARRANGEMENT_SOURCE,
  SUBWOOFER_ARRANGEMENTS,
  SUBWOOFER_COUNTS,
  speakersFollowSeat,
  V1_DOLBY_LAYOUTS,
  withAutoPlacement,
  withLayout,
  withSpeakersFollowSeat,
  type SubwooferCount,
} from '@/domain'
import {
  useConfig,
  useRoomAnalysis,
  useSeatRecommendation,
} from '@/state/config-context'
import { Button } from '@/ui/components/button'
import { Label } from '@/ui/components/label'
import { ToggleGroup, ToggleGroupItem } from '@/ui/components/toggle-group'
import { SidebarSection } from '@/ui/SidebarSection'

/** The look of a chosen option in the layout form's pickers. */
const CHOSEN_OPTION =
  'px-1 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

/**
 * The Layout picker, in X.Y.Z notation, the subwoofer count (the Y) and the
 * Auto-place button, which puts every manual item back to auto and the MLP
 * at the recommended seat (and is off while that would change nothing).
 * Under a ceiling of 8 ft or less it suggests Atmos-enabled speakers
 * instead of the layout's overhead speakers. Speakers follow the seat
 * (GLOSSARY.md) says whether the auto speakers follow the MLP.
 */
export function LayoutForm() {
  const subwoofersLabelId = useId()
  const layout = useConfig((state) => state.config.layout)
  const applyEdit = useConfig((state) => state.applyEdit)
  const config = useConfig((state) => state.config)
  const recommendation = useSeatRecommendation()
  const suggestsAtmosEnabled = useRoomAnalysis().suggestsAtmosEnabledSpeakers

  return (
    <SidebarSection
      id="layout"
      title="Layout"
      description="Which speakers you have, as X.Y.Z: X listener-level speakers, Y subwoofers and Z height speakers."
    >
      <div className="flex flex-col gap-3">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Layout"
          value={layout.dolbyLayout}
          onValueChange={(value) => {
            // Clicking the chosen option again sends '' (nothing chosen): ignore it.
            const dolbyLayout = V1_DOLBY_LAYOUTS.find((name) => name === value)
            if (!dolbyLayout) return
            applyEdit((config) =>
              withLayout(config, { ...config.layout, dolbyLayout }),
            )
          }}
          className="grid w-full grid-cols-4"
        >
          {V1_DOLBY_LAYOUTS.map((dolbyLayout) => (
            <ToggleGroupItem
              key={dolbyLayout}
              value={dolbyLayout}
              className={CHOSEN_OPTION}
            >
              {formatLayout({ dolbyLayout, subwoofers: layout.subwoofers })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex flex-col gap-2">
          <span id={subwoofersLabelId} className="text-sm font-medium">
            Subwoofers
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            aria-labelledby={subwoofersLabelId}
            value={String(layout.subwoofers)}
            onValueChange={(value) => {
              // As above, '' means the chosen count was clicked again.
              const count = SUBWOOFER_COUNTS.find((n) => String(n) === value)
              if (!count) return
              applyEdit((config) =>
                withLayout(config, { ...config.layout, subwoofers: count }),
              )
            }}
            className="grid w-full grid-cols-4"
          >
            {SUBWOOFER_COUNTS.map((count) => (
              <ToggleGroupItem
                key={count}
                value={String(count)}
                className={CHOSEN_OPTION}
              >
                {count}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <EvenerCountNote count={layout.subwoofers} />
        {suggestsAtmosEnabled && (
          <p className="text-xs text-muted-foreground">
            With a ceiling of{' '}
            {formatLength(LOW_CEILING_FOR_OVERHEADS.meters, config.units)} or
            lower, overhead speakers end up too close to the listeners. Dolby
            suggests Atmos-enabled speakers instead: they fire upward and
            reflect sound off the ceiling.
          </p>
        )}
        <SpeakersFollowSeatField />
        <Button
          onClick={() => applyEdit(withAutoPlacement)}
          disabled={!canAutoPlace(config, recommendation)}
          className="self-start max-lg:h-11"
        >
          Auto-place
        </Button>
      </div>
    </SidebarSection>
  )
}

/**
 * The Speakers follow the seat checkbox (on by default): on, the auto
 * speakers are installed around the MLP and move with it; off, they stay
 * where they are while the MLP moves. Each change is one undo step.
 */
function SpeakersFollowSeatField() {
  const checkboxId = useId()
  const hintId = useId()
  const applyEdit = useConfig((state) => state.applyEdit)
  const following = useConfig((state) => speakersFollowSeat(state.config))

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 max-lg:min-h-11">
        <input
          id={checkboxId}
          type="checkbox"
          checked={following}
          aria-describedby={hintId}
          onChange={(event) => {
            const on = event.target.checked
            applyEdit((config) => withSpeakersFollowSeat(config, on))
          }}
          className="size-4 accent-primary"
        />
        <Label htmlFor={checkboxId} className="font-normal">
          Speakers follow the seat
        </Label>
      </div>
      <p id={hintId} className="text-xs text-muted-foreground">
        {following
          ? 'Auto speakers move with the MLP. Turn this off to keep them where they are while you try other seats.'
          : 'Auto speakers stay where they are when the MLP moves, and are graded from where it is. Turn this on to place them around the MLP again.'}
      </p>
    </div>
  )
}

/**
 * When other subwoofer counts evened out the bass better in Welti's study
 * (only 3, against 2 and 4), says so with the numbers and their source.
 */
function EvenerCountNote({ count }: { count: SubwooferCount }) {
  const evener = evenerSubwooferCounts(count)
  if (evener.length === 0) return null
  const std = (n: SubwooferCount) =>
    `${SUBWOOFER_ARRANGEMENTS[n].seatToSeatStdDb} dB`
  const slides = [count, ...evener]
    .map((n) => SUBWOOFER_ARRANGEMENTS[n].citations[0].figure)
    .toSorted()
    .map((figure) => figure.replace('slide ', ''))
  return (
    <p className="text-xs text-muted-foreground">
      {listWithOr(evener.map(String))} subwoofers usually even out the bass
      better: in Welti&rsquo;s study the best layout for {count} varied{' '}
      {std(count)} from seat to seat, against{' '}
      {listWithAnd(evener.map((n) => `${std(n)} for ${n}`))} (
      {SUBWOOFER_ARRANGEMENT_SOURCE}, slides {listWithAnd(slides)}).
    </p>
  )
}

/** "a", "a or b", "a, b or c". */
function listWithOr(items: readonly string[]): string {
  return joinList(items, 'or')
}

/** "a", "a and b", "a, b and c". */
function listWithAnd(items: readonly string[]): string {
  return joinList(items, 'and')
}

function joinList(items: readonly string[], word: string): string {
  const last = items.at(-1) ?? ''
  return items.length < 2
    ? last
    : `${items.slice(0, -1).join(', ')} ${word} ${last}`
}
