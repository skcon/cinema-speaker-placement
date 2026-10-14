import { useConfig } from '@/state/config-context'
import { LengthField } from '@/ui/LengthField'

/** The Seat row's width: drawn centered on the MLP, never analyzed. */
export function SeatRowWidthField() {
  const units = useConfig((state) => state.config.units)
  const seatRowWidth = useConfig((state) => state.config.seatRowWidth)
  const setSeatRowWidth = useConfig((state) => state.setSeatRowWidth)

  return (
    <div className="flex flex-col gap-1">
      <LengthField
        label="Seat row width"
        meters={seatRowWidth}
        units={units}
        onCommit={setSeatRowWidth}
      />
      <p className="text-xs text-muted-foreground">
        The couch or row of seats, drawn centered on the MLP. Only drawn, not
        analyzed.
      </p>
    </div>
  )
}
