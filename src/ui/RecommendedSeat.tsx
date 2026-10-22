import { formatHz } from '@/charts/format'
import { modeName } from '@/charts/notes-text'
import {
  formatLength,
  SEAT_SCORE,
  SEATING_DISTANCE,
  wallDistances,
  type OffCenterLine,
  type Room,
  type ScoredSeat,
  type SeatRecommendation,
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
            {recommendation.offCenterLine && (
              <p className="text-muted-foreground">
                {offCenterLineText(recommendation.offCenterLine, units)}
              </p>
            )}
            <p className="text-muted-foreground">
              {mlpComparisonText(recommendation)}
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
        target) and on the listener-level speakers&rsquo; Dolby placement ranges
        (auto speakers installed symmetric to the room), with the receiver
        calibrated at the &ldquo;38% rule&rdquo; seat. The recommended seat
        places every speaker automatically (subwoofers stay where they are), so
        moving the MLP or a speaker doesn&rsquo;t move it; your MLP is scored
        with the speakers where they are. Only seats at least{' '}
        {formatLength(SEATING_DISTANCE.fromSpeaker, units)} from every speaker
        and subwoofer, {formatLength(SEATING_DISTANCE.fromWall, units)} from the
        side and back walls, and{' '}
        {formatLength(SEATING_DISTANCE.behindFrontStage, units)} behind the
        front speakers, count. The best seat on the center line is preferred, as
        in published practice, unless a seat off it scores meaningfully better.
        Moving the MLP makes it manual; undo takes it back. Auto-place also puts
        the MLP here.
      </p>
    </div>
  )
}

/**
 * How the current MLP compares with the recommended seat: its score, and
 * whether it is at the seat, within the model's precision of it, or too
 * close to a speaker, a wall or the front stage.
 */
function mlpComparisonText({
  current,
  mlpIsRecommended,
  mlpKeepsSeatingDistances,
  mlpWithinMeaningfulDifference,
}: SeatRecommendation): string {
  const scores = `scores ${outOf100(current)}`
  if (mlpIsRecommended) {
    return `Your MLP is at the recommended seat and ${scores}.`
  }
  if (!mlpKeepsSeatingDistances) {
    return (
      `Your MLP ${scores}, but it is too close to a speaker, a wall or ` +
      `the front stage.`
    )
  }
  if (mlpWithinMeaningfulDifference) {
    return (
      `Your MLP ${scores}: within the ` +
      `${Math.round(SEAT_SCORE.meaningfulDifference * 100)} points the ` +
      `simplified model can tell apart, about as good as the recommended seat.`
    )
  }
  return `Your MLP ${scores}.`
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

/**
 * Why the recommended seat is off the center line: by how much it beats
 * the best center-line seat, and the width mode behind it, if any.
 */
function offCenterLineText(
  { centerLine, margin, widthMode }: OffCenterLine,
  units: UnitSystem,
): string {
  // One decimal: the margin is only just over the precision (2 points).
  const points = (margin * 100).toFixed(1)
  const beats =
    `It is off the center line: it scores ${points} points more than the ` +
    `best seat on the center line (${formatLength(centerLine.position.y, units)} ` +
    `from the front wall, ${outOf100(centerLine)}), more than the ` +
    `${Math.round(SEAT_SCORE.meaningfulDifference * 100)} points the ` +
    `simplified model can tell apart.`
  if (!widthMode) return beats
  const mode = `${modeName(widthMode.mode)} (${formatHz(widthMode.mode.frequency)})`
  return widthMode.atCenterLine === 'null'
    ? `${beats} The bass is smoother off it: the center line sits on a null of the ${mode}.`
    : `${beats} The bass is smoother off it: the ${mode} is strongest on the center line.`
}

/** A seat score as a whole number out of 100. */
function outOf100({ score }: ScoredSeat): string {
  return `${Math.round(score * 100)}/100`
}
