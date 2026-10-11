import type { ShareLinkProblem } from '@/domain'
import { useConfig } from '@/state/config-context'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/ui/components/alert'
import { Button } from '@/ui/components/button'

const MESSAGES = {
  unreadable: {
    title: 'This link couldn’t be opened',
    description:
      'It may be incomplete or changed. Showing the default room instead.',
  },
  'newer-version': {
    title: 'This link needs a newer version of the app',
    description:
      'Reload the page to update it. Showing the default room for now.',
  },
} as const satisfies Record<
  ShareLinkProblem,
  { title: string; description: string }
>

/**
 * Says why a share link didn't open, until dismissed. The default room is
 * shown and editable meanwhile, so nothing waits on this message.
 */
export function LinkProblemMessage() {
  const problem = useConfig((state) => state.linkProblem)
  const dismiss = useConfig((state) => state.dismissLinkProblem)
  if (!problem) return null

  const { title, description } = MESSAGES[problem]
  return (
    <Alert>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="xs" onClick={dismiss}>
          Dismiss
        </Button>
      </AlertAction>
    </Alert>
  )
}
