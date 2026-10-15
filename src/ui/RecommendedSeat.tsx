import {
  formatLength,
  wallDistances,
  type Room,
  type ScoredSeat,
  type UnitSystem,
} from '@/domain'
import { useConfig, useSeatRecommendation } from '@/state/config-context'
import { Button } from '@/ui/components/button'

/**
 * The recommended MLP from the seat score, how the current MLP compares,
 * and "Move MLP here", which moves the MLP to the seat shown. The
 * recommendation is an estimate from a simplified model, and says so.
 */
export function RecommendedSeat() {
  const recommendation = useSeatRecommendation()
  const room = useConfig((state) => state.config.room)
  const units = useConfig((state) => state.config.units)
  const moveMlp = useConfig((state) => state.moveMlpToRecommendedSeat)

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite" className="flex flex-col gap-1 text-sm">
        {recommendation ? (
          <>
            <p>
              <span className="font-medium">Recommended seat:</span>{' '}
              {describeSeat(recommendation.recommended, room, units)}, seat
              score {outOf100(recommendation.recommended)}.
            </p>
            <p className="text-muted-foreground">
              {recommendation.mlpIsRecommended
                ? 'Your MLP is at the recommended seat: no seat scores meaningfully better.'
                : `Your MLP scores ${outOf100(recommendation.current)}.`}
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
        onClick={() => {
          if (recommendation) moveMlp(recommendation.recommended.position)
        }}
      >
        Move MLP here
      </Button>
      <p className="text-xs text-muted-foreground">
        An estimate from a simplified model, never a measurement: a grid of
        seats scored on bass smoothness (the estimated response against the
        target) and on the listener-level speakers&rsquo; Dolby placement
        ranges, with the receiver calibrated at the MLP. Moving the MLP makes it
        manual; undo takes it back. Auto-place also puts the MLP here.
      </p>
    </div>
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
function outOf100({ score }: ScoredSeat): string {
  return `${Math.round(score * 100)}/100`
}
