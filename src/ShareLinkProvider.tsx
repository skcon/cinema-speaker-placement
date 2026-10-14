import { rootRouteId, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { encodeConfig } from '@/domain'
import { withConfigParam } from '@/search'
import { useConfig } from '@/state/config-context'
import { isShowingLinkFallback } from '@/state/config-store'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'
import { useRecentRooms } from '@/state/recent-rooms-context'

/**
 * How long the address waits after the last edit before it follows. Fewer
 * writes while typing or dragging; browsers also throttle pages that call
 * history.replaceState too often.
 */
const ADDRESS_UPDATE_DELAY_MS = 300

/**
 * Keeps the config store and the share link (the address, whose `config`
 * search param holds the encoded config) in step: the store starts from
 * the address, the address follows the store, and an address changed from
 * outside (back/forward, a link inside the app) is opened into the store.
 * A link that couldn't be opened stays in the address until the user edits
 * the default room shown instead, so reloading (after an app update, say)
 * can still open it.
 *
 * It also saves the room to the recent rooms whenever the address has
 * settled on it: once the debounced address update has written an edit,
 * or a link has opened (then, if the address is rewritten, once that has
 * settled), but never while the default room stands in for a link that
 * couldn't be opened. Edits replace the entry of the room they were made
 * to, so a room keeps one entry however much it is edited; a room opened
 * from outside (a link, back/forward, a recent room) gets its own.
 *
 * Only this component reads the search params, so a new address re-renders
 * it but not `children`.
 */
export function ShareLinkProvider({ children }: { children: ReactNode }) {
  const configParam = useSearch({
    from: rootRouteId,
    select: (search) => search.config,
  })
  return (
    <ConfigStoreProvider initialEncodedConfig={configParam}>
      <ShareLinkSync configParam={configParam} />
      {children}
    </ConfigStoreProvider>
  )
}

function ShareLinkSync({ configParam }: { configParam: string | undefined }) {
  const navigate = useNavigate()
  const config = useConfig((state) => state.config)
  const openEncodedConfig = useConfig((state) => state.openEncodedConfig)
  const showingLinkFallback = useConfig(isShowingLinkFallback)
  const storeConfigParam = useMemo(() => encodeConfig(config), [config])
  // The config param as this component last opened or wrote it, so our own
  // writes aren't mistaken for an address changed from outside.
  const lastSyncedConfigParam = useRef(configParam)
  const saveRecentRoom = useRecentRooms((state) => state.save)
  // The recent room the next settled edit replaces: the one last saved,
  // unless a room has opened from outside since.
  const editedFrom = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (configParam === lastSyncedConfigParam.current) return
    lastSyncedConfigParam.current = configParam
    editedFrom.current = undefined
    openEncodedConfig(configParam)
  }, [configParam, openEncodedConfig])

  useEffect(() => {
    if (
      configParam === undefined ||
      configParam !== storeConfigParam ||
      showingLinkFallback
    ) {
      return
    }
    saveRecentRoom(configParam, editedFrom.current)
    editedFrom.current = configParam
  }, [configParam, storeConfigParam, showingLinkFallback, saveRecentRoom])

  useEffect(() => {
    if (showingLinkFallback || storeConfigParam === configParam) return
    const timer = setTimeout(() => {
      lastSyncedConfigParam.current = storeConfigParam
      void navigate({
        to: '.',
        search: withConfigParam(storeConfigParam),
        replace: true,
        resetScroll: false,
      })
    }, ADDRESS_UPDATE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [showingLinkFallback, storeConfigParam, configParam, navigate])

  return null
}
