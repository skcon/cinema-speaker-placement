import { rootRouteId, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { encodeConfig } from '@/domain'
import { useConfig } from '@/state/config-context'
import { ConfigStoreProvider } from '@/state/ConfigStoreProvider'

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
  const storeConfigParam = useMemo(() => encodeConfig(config), [config])
  // The config param as this component last opened or wrote it, so our own
  // writes aren't mistaken for an address changed from outside.
  const lastSyncedConfigParam = useRef(configParam)

  useEffect(() => {
    if (configParam === lastSyncedConfigParam.current) return
    lastSyncedConfigParam.current = configParam
    openEncodedConfig(configParam)
  }, [configParam, openEncodedConfig])

  useEffect(() => {
    if (storeConfigParam === configParam) return
    const timer = setTimeout(() => {
      lastSyncedConfigParam.current = storeConfigParam
      void navigate({
        to: '.',
        search: (search) => ({ ...search, config: storeConfigParam }),
        replace: true,
        resetScroll: false,
      })
    }, ADDRESS_UPDATE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [storeConfigParam, configParam, navigate])

  return null
}
