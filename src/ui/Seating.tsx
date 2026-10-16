import { RecommendedSeat } from '@/ui/RecommendedSeat'
import { RuleOfThumbReference } from '@/ui/RuleOfThumbReference'
import { SidebarSection } from '@/ui/SidebarSection'

/**
 * Seating in the sidebar: the recommended seat and the "38% rule" as a
 * reference only. The Seat row's size is under Room objects.
 */
export function Seating() {
  return (
    <SidebarSection
      id="seating"
      title="Seating"
      description="Where you sit: the recommended seat, and the 38% rule of thumb for reference."
    >
      <div className="flex flex-col gap-2">
        <RecommendedSeat />
        <RuleOfThumbReference />
      </div>
    </SidebarSection>
  )
}
