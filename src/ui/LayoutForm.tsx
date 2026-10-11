import { useId } from 'react'
import { formatLayout, V1_DOLBY_LAYOUTS } from '@/domain'
import { useConfig, useRoomAnalysis } from '@/state/config-context'
import { Button } from '@/ui/components/button'
import { ToggleGroup, ToggleGroupItem } from '@/ui/components/toggle-group'

/** The Layout picker, in X.Y.Z notation, and the Auto-place button. */
export function LayoutForm() {
  const headingId = useId()
  const layout = useConfig((state) => state.config.layout)
  const setLayout = useConfig((state) => state.setLayout)
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
            className="px-1 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {formatLayout({ dolbyLayout, subwoofers: layout.subwoofers })}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {overheads > 0 && (
        <p className="text-xs text-muted-foreground">
          Overhead speakers aren&rsquo;t placed yet: the room view shows the{' '}
          {listenerLevel} listener-level speakers.
        </p>
      )}
      <Button onClick={autoPlace} className="self-start">
        Auto-place
      </Button>
    </section>
  )
}
