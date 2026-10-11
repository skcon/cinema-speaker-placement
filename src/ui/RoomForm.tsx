import { useId } from 'react'
import type { RoomDimension, UnitSystem } from '@/domain'
import { useConfig } from '@/state/config-context'
import { Label } from '@/ui/components/label'
import { RadioGroup, RadioGroupItem } from '@/ui/components/radio-group'
import { RoomDimensionField } from '@/ui/RoomDimensionField'

const UNIT_OPTIONS = [
  { value: 'metric', label: 'Metric (m)' },
  { value: 'imperial', label: 'Imperial (ft + in)' },
] as const satisfies readonly { value: UnitSystem; label: string }[]

const DIMENSIONS = [
  'length',
  'width',
  'height',
] as const satisfies readonly RoomDimension[]

/** The Room's size and the units it is entered in. */
export function RoomForm() {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h3 id={headingId} className="text-sm font-semibold">
        Room
      </h3>
      <UnitsToggle />
      {DIMENSIONS.map((dimension) => (
        <RoomDimensionField key={dimension} dimension={dimension} />
      ))}
    </section>
  )
}

function UnitsToggle() {
  const units = useConfig((state) => state.config.units)
  const setUnits = useConfig((state) => state.setUnits)
  const labelId = useId()
  const idPrefix = useId()

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-medium">
        Units
      </span>
      <RadioGroup
        aria-labelledby={labelId}
        value={units}
        onValueChange={(value) => {
          const option = UNIT_OPTIONS.find((o) => o.value === value)
          if (option) setUnits(option.value)
        }}
        className="flex flex-wrap gap-x-4 gap-y-2"
      >
        {UNIT_OPTIONS.map(({ value, label }) => (
          <div key={value} className="flex items-center gap-2">
            <RadioGroupItem value={value} id={`${idPrefix}-${value}`} />
            <Label htmlFor={`${idPrefix}-${value}`} className="font-normal">
              {label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
