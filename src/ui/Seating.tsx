import { RecommendedSeat } from '@/ui/RecommendedSeat'
import { RuleOfThumbReference } from '@/ui/RuleOfThumbReference'
import { SeatRowWidthField } from '@/ui/SeatRowWidthField'
import { SidebarSection } from '@/ui/SidebarSection'

/**
 * Seating in the sidebar: the recommended seat, the "38% rule" as a
 * reference only, and the Seat row's width.
 */
export function Seating() {
  return (
    <SidebarSection
      id="seating"
      title="Seating"
      description="Where you sit: the recommended seat, and how wide your seat row is."
    >
      <div className="flex flex-col gap-2">
        <RecommendedSeat />
        <RuleOfThumbReference />
        <SeatRowWidthField />
      </div>
    </SidebarSection>
  )
}
