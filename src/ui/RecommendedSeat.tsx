import { useId } from 'react'
import {
  formatLength,
  wallDistances,
  type Room,
  type ScoredSeat,
  type UnitSystem,
} from '@/domain'
import {
  useConfig,
  useRoomAnalysis,
  useSeatRecommendation,
} from '@/state/config-context'
import { Button } from '@/ui/components/button'
import { LengthField } from '@/ui/LengthField'

/**
 * Seating: the recommended MLP from the seat score, with "Move MLP here";
 * the informal "38% rule" as a reference only; and the Seat row's width.
 * The recommendation is an estimate from a simplified model, and says so.
 */
export function RecommendedSeat() {
  const headingId = useId()
  const recommendation = useSeatRecommendation()
  const { seatRuleOfThumb } = useRoomAnalysis()
  const room = useConfig((state) => state.config.room)
  const units = useConfig((state) => state.config.units)
  const seatRowWidth = useConfig((state) => state.config.seatRowWidth)
  const moveMlp = useConfig((state) => state.moveMlpToRecommendedSeat)
  const setSeatRowWidth = useConfig((state) => state.setSeatRowWidth)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-sm font-semibold">
        Seating
      </h3>
      <div aria-live="polite" className="flex flex-col gap-1 text-sm">
        {recommendation ? (
          <>
            <p>
              <span className="font-medium">Recommended seat:</span>{' '}
              {describeSeat(recommendation.recommended, room, units)}, seat
              score {percent(recommendation.recommended)}.
            </p>
            <p className="text-muted-foreground">
              {recommendation.mlpIsRecommended
                ? 'Your MLP is at the recommended seat: no seat scores meaningfully better.'
                : `Your MLP scores ${percent(recommendation.current)}.`}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            Working out the recommended seat&hellip;
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="self-start max-lg:h-11 max-lg:px-4"
        disabled={!recommendation || recommendation.mlpIsRecommended}
        onClick={moveMlp}
      >
        Move MLP here
      </Button>
      <p className="text-xs text-muted-foreground">
        An estimate from a simplified model, never a measurement: a grid of
        seats scored on bass smoothness (the estimated response against the
        target) and on the speakers&rsquo; Dolby placement ranges, with the
        receiver calibrated at the MLP. Moving the MLP makes it manual; undo
        takes it back.
      </p>
      <p className="text-xs text-muted-foreground">
        For reference only: the informal &ldquo;38% rule&rdquo; puts the seat{' '}
        {Math.round(seatRuleOfThumb.fraction * 100)}% of the room length back,{' '}
        {formatLength(seatRuleOfThumb.fromFrontWall, units)} from the front wall
        here (the dashed line), to stay off the halfway length null. It is a
        rule of thumb, not a standard. Your MLP is{' '}
        {Math.round(seatRuleOfThumb.seatFraction * 100)}% back.
      </p>
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
    </section>
  )
}

/** Where a seat is: from the front wall, and from the nearer side wall. */
function describeSeat(
  { position }: ScoredSeat,
  room: Room,
  units: UnitSystem,
): string {
  const { across } = wallDistances(room, position)
  return (
    `${formatLength(position.y, units)} from the front wall and ` +
    `${formatLength(across.meters, units)} from the ${across.wall} wall`
  )
}

/** A seat score as a whole number out of 100. */
function percent({ score }: ScoredSeat): string {
  return `${Math.round(score * 100)}/100`
}
