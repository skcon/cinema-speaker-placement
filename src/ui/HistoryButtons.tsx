import { useEffect } from 'react'
import { useConfig } from '@/state/config-context'
import { Button } from '@/ui/components/button'

/** Finger-sized on phones and tablets, where the sidebar stacks on top. */
const TOUCH_SIZE = 'max-lg:h-11 max-lg:px-4'

/**
 * Undo and Redo for room edits (a drag counts as one), also on the usual
 * shortcuts: Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z and Ctrl+Y. Inside a text box the
 * shortcuts are left to the box's own undo.
 */
export function HistoryButtons() {
  const { canUndo, canRedo } = useConfig((state) => state.history)
  const undo = useConfig((state) => state.undo)
  const redo = useConfig((state) => state.redo)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const action = shortcutAction(event)
      if (!action || isTextEntry(event.target)) return
      event.preventDefault()
      if (action === 'undo') undo()
      else redo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={undo}
        disabled={!canUndo}
        className={TOUCH_SIZE}
      >
        Undo
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={redo}
        disabled={!canRedo}
        className={TOUCH_SIZE}
      >
        Redo
      </Button>
    </div>
  )
}

function shortcutAction(event: KeyboardEvent): 'undo' | 'redo' | null {
  const key = event.key.toLowerCase()
  const command = event.ctrlKey || event.metaKey
  if (!command || event.altKey) return null
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (key === 'y' && event.ctrlKey && !event.shiftKey) return 'redo'
  return null
}

function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLInputElement && target.type !== 'radio'))
  )
}
