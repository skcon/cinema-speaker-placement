import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { RecentRoomsState, RecentRoomsStore } from './recent-rooms-store'

/** This browser's recent rooms; provided by RecentRoomsProvider. */
export const RecentRoomsContext = createContext<RecentRoomsStore | null>(null)

/** Read from the recent rooms store; re-renders only when the selected value changes. */
export function useRecentRooms<T>(selector: (state: RecentRoomsState) => T): T {
  const store = useContext(RecentRoomsContext)
  if (!store) {
    throw new Error('useRecentRooms must be used inside <RecentRoomsProvider>')
  }
  return useStore(store, selector)
}
