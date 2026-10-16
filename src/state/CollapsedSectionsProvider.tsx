import { useState, type ReactNode } from 'react'
import { CollapsedSectionsContext } from './collapsed-sections-context'
import { collapsedSectionsStorage } from './collapsed-sections-storage'

/** Remembers which sidebar sections are collapsed, in localStorage. */
export function CollapsedSectionsProvider({
  children,
}: {
  children: ReactNode
}) {
  const [sections] = useState(() =>
    collapsedSectionsStorage(() => window.localStorage),
  )
  return (
    <CollapsedSectionsContext value={sections}>
      {children}
    </CollapsedSectionsContext>
  )
}
