import { useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { encodeConfig, type Config } from '@/domain'
import { withConfigParam } from '@/search'
import { ShareLinkProvider } from '@/ShareLinkProvider'
import { AppShell } from '@/ui/AppShell'

/**
 * The root route's component: the page layout around one config store that
 * stays in step with the share link in the address.
 */
export function App() {
  const shareLinkFor = useShareLinkFor()
  return (
    <ShareLinkProvider>
      <AppShell shareLinkFor={shareLinkFor} />
    </ShareLinkProvider>
  )
}

/**
 * The share link for a config: this page's full URL, base path included
 * (such as /cinema-speaker-placement/ on GitHub Pages), with the encoded
 * config in its `config` param.
 */
function useShareLinkFor(): (config: Config) => string {
  const router = useRouter()
  return useCallback(
    (config) => {
      const { publicHref } = router.buildLocation({
        to: '.',
        search: withConfigParam(encodeConfig(config)),
      })
      return new URL(publicHref, window.location.href).href
    },
    [router],
  )
}
