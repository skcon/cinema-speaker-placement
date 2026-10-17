import { rootRouteId, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { encodeConfig, type EncodedConfig } from '@/domain'
import { withConfigParam } from '@/search'
import { useConfig } from '@/state/config-context'
import {
  isShowingLinkFallback,
  isUneditedSinceOpened,
} from '@/state/config-store'
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
 * RecentRoomSaver saves the room to the recent rooms once the address has
 * settled on it.
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
      <ConfigParamSync configParam={configParam} />
      {children}
    </ConfigStoreProvider>
  )
}

/**
 * Encodes the store's config once per change, for both the address
 * (ShareLinkSync) and the recent rooms (RecentRoomSaver).
 */
function ConfigParamSync({ configParam }: { configParam: string | undefined }) {
  const config = useConfig((state) => state.config)
  const storeConfigParam = useMemo(() => encodeConfig(config), [config])
  return (
    <>
      <ShareLinkSync
        configParam={configParam}
        storeConfigParam={storeConfigParam}
      />
      <RecentRoomSaver
        configParam={configParam}
        roomConfig={storeConfigParam}
      />
    </>
  )
}

function ShareLinkSync({
  configParam,
  storeConfigParam,
}: {
  configParam: string | undefined
  /** The store's config, encoded. */
  storeConfigParam: EncodedConfig
}) {
  const navigate = useNavigate()
  const openEncodedConfig = useConfig((state) => state.openEncodedConfig)
  const showingLinkFallback = useConfig(isShowingLinkFallback)
  // The config param as this component last opened or wrote it, so our own
  // writes aren't mistaken for an address changed from outside.
  const lastSyncedConfigParam = useRef(configParam)

  useEffect(() => {
    if (configParam === lastSyncedConfigParam.current) return
    lastSyncedConfigParam.current = configParam
    openEncodedConfig(configParam)
  }, [configParam, openEncodedConfig])

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

/**
 * Saves the room to the recent rooms whenever the address has settled on
 * it: once the debounced address update has written an edit, or a link
 * (or the default room) has opened. Never while the default room stands in
 * for a link that couldn't be opened, and never twice in a row for the
 * same encoded config, so nothing else (such as that stand-in ending)
 * saves it again.
 *
 * A room as opened (from a link, back/forward, a recent room or a reload)
 * gets its own entry and is never replaced. Its edits get one entry of
 * their own, which later edits in this visit replace, so a room keeps one
 * entry however much it is edited.
 */
function RecentRoomSaver({
  configParam,
  roomConfig,
}: {
  configParam: string | undefined
  /** The store's config, encoded. */
  roomConfig: EncodedConfig
}) {
  const showingLinkFallback = useConfig(isShowingLinkFallback)
  const asOpened = useConfig(isUneditedSinceOpened)
  const save = useRecentRooms((state) => state.save)
  const lastSavedEncoded = useRef<EncodedConfig | undefined>(undefined)
  // The entry of this visit's edits, which the next settled edit replaces.
  const editsEntry = useRef<EncodedConfig | undefined>(undefined)

  useEffect(() => {
    if (
      configParam !== roomConfig ||
      showingLinkFallback ||
      roomConfig === lastSavedEncoded.current
    ) {
      return
    }
    lastSavedEncoded.current = roomConfig
    if (asOpened) {
      editsEntry.current = undefined
      save(roomConfig)
    } else {
      save(roomConfig, editsEntry.current)
      editsEntry.current = roomConfig
    }
  }, [configParam, roomConfig, showingLinkFallback, asOpened, save])

  return null
}
