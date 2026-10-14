import { useId } from 'react'
import { RecommendedSeat } from '@/ui/RecommendedSeat'
import { RuleOfThumbReference } from '@/ui/RuleOfThumbReference'
import { SeatRowWidthField } from '@/ui/SeatRowWidthField'

/**
 * Seating in the sidebar: the recommended seat, the "38% rule" as a
 * reference only, and the Seat row's width.
 */
export function Seating() {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-sm font-semibold">
        Seating
      </h3>
      <RecommendedSeat />
      <RuleOfThumbReference />
      <SeatRowWidthField />
    </section>
  )
}
