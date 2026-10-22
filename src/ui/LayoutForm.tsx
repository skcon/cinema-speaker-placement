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
  V1_DOLBY_LAYOUTS,
  type SubwooferCount,
} from '@/domain'
import {
  useConfig,
  useRoomAnalysis,
  useSeatRecommendation,
} from '@/state/config-context'
import { Button } from '@/ui/components/button'
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
 * instead of the layout's overhead speakers.
 */
export function LayoutForm() {
  const subwoofersLabelId = useId()
  const layout = useConfig((state) => state.config.layout)
  const setLayout = useConfig((state) => state.setLayout)
  const setSubwooferCount = useConfig((state) => state.setSubwooferCount)
  const autoPlace = useConfig((state) => state.autoPlace)
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
            if (dolbyLayout) setLayout(dolbyLayout)
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
              if (count) setSubwooferCount(count)
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
        <Button
          onClick={autoPlace}
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
