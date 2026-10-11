import { useId } from 'react'
import { formatLayout, V1_SPEAKER_FORMATS } from '@/domain'
import { useConfig } from '@/state/config-context'
import { Button } from '@/ui/components/button'
import { ToggleGroup, ToggleGroupItem } from '@/ui/components/toggle-group'

/** The Layout picker, in X.Y.Z notation, and the Auto-place button. */
export function LayoutForm() {
  const headingId = useId()
  const layout = useConfig((state) => state.config.layout)
  const setLayout = useConfig((state) => state.setLayout)
  const autoPlace = useConfig((state) => state.autoPlace)
  const options = V1_SPEAKER_FORMATS.map((format) => ({
    format,
    label: formatLayout({ ...format, subwoofers: layout.subwoofers }),
  }))

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
        value={formatLayout(layout)}
        onValueChange={(value) => {
          // Clicking the chosen option again sends '' (nothing chosen): ignore it.
          const option = options.find(({ label }) => label === value)
          if (option) setLayout(option.format)
        }}
        className="grid w-full grid-cols-4"
      >
        {options.map(({ label }) => (
          <ToggleGroupItem
            key={label}
            value={label}
            className="px-1 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {layout.overheads > 0 && (
        <p className="text-xs text-muted-foreground">
          Overhead speakers aren&rsquo;t placed yet: the room view shows the{' '}
          {layout.listenerLevel} listener-level speakers.
        </p>
      )}
      <Button onClick={autoPlace} className="self-start">
        Auto-place
      </Button>
    </section>
  )
}
