import { useEffect, useState, type ReactNode } from 'react'
import { RecentRoomsContext } from './recent-rooms-context'
import { RECENT_ROOMS_STORAGE_KEY } from './recent-rooms-storage'
import { createRecentRoomsStore } from './recent-rooms-store'

/**
 * One recent rooms store for everything inside it, kept in localStorage
 * and following the rooms other tabs save.
 */
export function RecentRoomsProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() =>
    createRecentRoomsStore({ storage: () => window.localStorage }),
  )

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === RECENT_ROOMS_STORAGE_KEY || event.key === null) {
        store.getState().reload()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [store])

  return <RecentRoomsContext value={store}>{children}</RecentRoomsContext>
}
