import type { PlacementWarning, SourceClass } from '@/domain'
import {
  formatCitation,
  type FormattedCitation,
} from '@/ui/lib/grade-explanation'

/** How each source class is named in the UI (GLOSSARY.md, "Placement warning"). */
export const SOURCE_CLASS_LABELS = {
  standard: 'Standard',
  manufacturer: 'Manufacturer advice',
  community: 'Community practice',
  ours: 'Our own assumption',
} as const satisfies Record<SourceClass, string>

/** A placement warning as the UI shows it. */
export type FormattedWarning = {
  /** Its id, for example "W4". */
  readonly id: string
  readonly message: string
  /** Where its rule comes from, for example "Standard". */
  readonly sourceClass: string
  /** What the rule rests on and what is ours. */
  readonly note: string
  readonly sources: readonly FormattedCitation[]
}

/** A placement warning in words, its sources ready to link. */
export function formatWarning(warning: PlacementWarning): FormattedWarning {
  return {
    id: warning.id,
    message: warning.message,
    sourceClass: SOURCE_CLASS_LABELS[warning.sourceClass],
    note: warning.note,
    sources: warning.citations.map(formatCitation),
  }
}
