import { useEffect, useState } from 'react'
import type { Config } from '@/domain'
import { useConfig } from '@/state/config-context'
import { Button } from '@/ui/components/button'

type CopyResult = 'copied' | 'failed'

const RESULT_TEXT = {
  copied: 'Link copied',
  failed: 'Couldn’t copy the link. Copy it from the address bar instead.',
} as const satisfies Record<CopyResult, string>

/** How long the result stays next to the button. */
const RESULT_VISIBLE_MS = 4000

/**
 * Copies the share link of the room in the store, even if the address bar
 * hasn't caught up with the last edit yet, and says whether it worked in a
 * status message that screen readers announce.
 */
export function CopyLinkButton({
  shareLinkFor,
}: {
  /** The full URL that opens `config`. */
  shareLinkFor: (config: Config) => string
}) {
  const config = useConfig((state) => state.config)
  const [result, setResult] = useState<CopyResult | null>(null)

  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => setResult(null), RESULT_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [result])

  async function copy() {
    try {
      // Missing outside secure contexts, which then fails like a refusal.
      await navigator.clipboard.writeText(shareLinkFor(config))
      setResult('copied')
    } catch {
      setResult('failed')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button variant="outline" size="sm" onClick={() => void copy()}>
        Copy link
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {result && RESULT_TEXT[result]}
      </p>
    </div>
  )
}
