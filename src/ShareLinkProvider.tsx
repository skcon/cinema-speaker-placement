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
 * Keeps the config store and the share link in the address (the `config`
 * search param) in step: the store starts from the address, the address
 * follows the store, and an address changed from outside (back/forward, a
 * link inside the app) is opened into the store.
 *
 * Only this component reads the search params, so a new address re-renders
 * it but not `children`.
 */
export function ShareLinkProvider({ children }: { children: ReactNode }) {
  const shareLink = useSearch({
    from: rootRouteId,
    select: (search) => search.config,
  })
  return (
    <ConfigStoreProvider initialShareLink={shareLink}>
      <ShareLinkSync shareLink={shareLink} />
      {children}
    </ConfigStoreProvider>
  )
}

function ShareLinkSync({ shareLink }: { shareLink: string | undefined }) {
  const navigate = useNavigate()
  const config = useConfig((state) => state.config)
  const openShareLink = useConfig((state) => state.openShareLink)
  const currentLink = useMemo(() => encodeConfig(config), [config])
  // The address's share link as this component last opened or wrote it, so
  // our own writes aren't mistaken for an address changed from outside.
  const synced = useRef(shareLink)

  useEffect(() => {
    if (shareLink === synced.current) return
    synced.current = shareLink
    openShareLink(shareLink)
  }, [shareLink, openShareLink])

  useEffect(() => {
    if (currentLink === shareLink) return
    const timer = setTimeout(() => {
      synced.current = currentLink
      void navigate({
        to: '.',
        search: (search) => ({ ...search, config: currentLink }),
        replace: true,
        resetScroll: false,
      })
    }, ADDRESS_UPDATE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [currentLink, shareLink, navigate])

  return null
}
