import { createContext, useContext } from 'react'
import type { CollapsedSections } from './collapsed-sections-storage'

/**
 * This browser's collapsed sidebar sections; provided by
 * CollapsedSectionsProvider. Without one, sections still collapse, but
 * nothing is remembered.
 */
export const CollapsedSectionsContext = createContext<CollapsedSections | null>(
  null,
)

/** This browser's collapsed sidebar sections, or null when not remembered. */
export function useCollapsedSections(): CollapsedSections | null {
  return useContext(CollapsedSectionsContext)
}
