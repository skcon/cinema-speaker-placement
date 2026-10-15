import { formatLength } from '@/domain'
import { useConfig, useRoomAnalysis } from '@/state/config-context'

/**
 * The informal "38% rule" of thumb, as a reference only: where it would
 * put the seat in this Room, and how far back the MLP is by the same
 * measure. It plays no part in the recommendation.
 */
export function RuleOfThumbReference() {
  const units = useConfig((state) => state.config.units)
  const { seatRuleOfThumb, mlpFrontWallFraction } = useRoomAnalysis()

  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium">Reference only:</span> the informal
      &ldquo;38% rule&rdquo; of thumb puts the seat{' '}
      {percent(seatRuleOfThumb.fraction)} of the room length back,{' '}
      {formatLength(seatRuleOfThumb.fromFrontWall, units)} from the front wall
      here (the dashed line), to stay off the halfway length null. It is a rule
      of thumb, not a standard, and not part of the recommendation. Your MLP is{' '}
      {percent(mlpFrontWallFraction)} back.
    </p>
  )
}

/** A share, 0 to 1, as a whole percentage. */
function percent(share: number): string {
  return `${Math.round(share * 100)}%`
}
