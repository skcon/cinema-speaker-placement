import { useId } from 'react'
import { formatLayout, SUBWOOFER_COUNTS, V1_DOLBY_LAYOUTS } from '@/domain'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import { Button } from '@/ui/components/button'
import { ToggleGroup, ToggleGroupItem } from '@/ui/components/toggle-group'

/** The look of a chosen option in the layout form's pickers. */
const CHOSEN_OPTION =
  'px-1 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

/**
 * The Layout picker, in X.Y.Z notation, the subwoofer count (the Y) and the
 * Auto-place button.
 */
export function LayoutForm() {
  const headingId = useId()
  const subwoofersLabelId = useId()
  const layout = useConfig((state) => state.config.layout)
  const setLayout = useConfig((state) => state.setLayout)
  const setSubwooferCount = useConfig((state) => state.setSubwooferCount)
  const autoPlace = useConfig((state) => state.autoPlace)
  const { listenerLevel, overheads } = useRoomAnalysis().layout

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-sm font-semibold">
        Layout
      </h3>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-labelledby={headingId}
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
      {overheads > 0 && (
        <p className="text-xs text-muted-foreground">
          Overhead speakers aren&rsquo;t placed yet: the room view shows the{' '}
          {listenerLevel} listener-level speakers and the subwoofers.
        </p>
      )}
      <Button onClick={autoPlace} className="self-start">
        Auto-place
      </Button>
    </section>
  )
}
