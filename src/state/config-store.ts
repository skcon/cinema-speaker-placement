import { temporal } from 'zundo'
import { createStore } from 'zustand/vanilla'
import {
  decodeConfig,
  DEFAULT_CONFIG,
  type Config,
  type ShareLinkProblem,
  type TargetCurveKind,
  type UnitSystem,
} from '@/domain'

/**
 * A domain config edit (config-edits.ts, auto-place.ts, drag-targets.ts,
 * room-objects.ts ...): it takes the config and gives the edited one, or
 * the same config when the edit is rejected or changes nothing.
 */
export type ConfigEdit = (config: Config) => Config

export type ConfigState = {
  /**
   * The current config. Always valid: every edit of the room is a domain
   * config edit (see applyEdit), which rejects invalid input.
   */
  config: Config
  /**
   * Why the last share link opened couldn't be used (the default config is
   * shown instead), until dismissed or a good link opens.
   */
  linkProblem: ShareLinkProblem | null
  /**
   * The default config as shown in place of the last share link that
   * couldn't be opened, or null. Dismissing the message keeps it; see
   * isShowingLinkFallback.
   */
  linkFallback: Config | null
  /**
   * The config as the last share link (or the default room) opened it; see
   * isUneditedSinceOpened.
   */
  openedConfig: Config
  /** Whether undo and redo have anything to do. */
  history: { canUndo: boolean; canRedo: boolean }
  /**
   * The drag in progress, or null between drags: the config when it
   * started, and how many pointers are still dragging (see beginGesture).
   */
  gesture: { start: Config; depth: number } | null
  /**
   * Show and accept lengths in these units. The stored meters don't change.
   * A view preference: not an undo step.
   */
  setUnits: (units: UnitSystem) => void
  /**
   * Compare the estimated response against the flat or the house curve. A
   * view preference: not an undo step.
   */
  setTargetCurve: (targetCurve: TargetCurveKind) => void
  /**
   * Apply a domain config edit to the config, for example
   * `applyEdit((config) => withRoomDimension(config, 'length', 7))`. It is
   * one undo step, or part of the drag in progress (see beginGesture). An
   * edit that gives the same config back (rejected, or changing nothing)
   * changes no state, so undo records no empty step.
   */
  applyEdit: (edit: ConfigEdit) => void
  /**
   * Start a drag: until endGesture, edits change the config (so the view
   * and the grades follow live) without each one becoming an undo step.
   * Starts are counted, so a second pointer joins the drag in progress.
   */
  beginGesture: () => void
  /**
   * End a drag: when every start has ended, everything it changed becomes
   * one undo step. Extra ends do nothing.
   */
  endGesture: () => void
  /** Take back the last edit (a drag counts as one). Ignored mid-drag. */
  undo: () => void
  /** Make the last undone edit again. Ignored mid-drag. */
  redo: () => void
  /**
   * Replace the config with the one an encoded config (a share link's
   * `config` param) holds. Without one, that is the default config; one
   * that can't be opened also gives the default config, and sets
   * `linkProblem`. Opening a link starts the undo history over: it is not an
   * edit, and undo never goes back into another room.
   */
  openEncodedConfig: (encoded: string | undefined) => void
  /** Hide the share-link problem. The config stays as it is. */
  dismissLinkProblem: () => void
}

export type ConfigStore = ReturnType<typeof createConfigStore>

/**
 * Whether the config is still the default shown for a share link that
 * couldn't be opened, unedited (dismissing the message doesn't count). Every
 * edit makes a new config, so no action has to clear this.
 */
export function isShowingLinkFallback(state: ConfigState): boolean {
  return state.config === state.linkFallback
}

/**
 * Whether the config is still the one the last share link (or the default
 * room) opened, unedited. Every edit makes a new config, so no action has
 * to clear this.
 */
export function isUneditedSinceOpened(state: ConfigState): boolean {
  return state.config === state.openedConfig
}

/** How many edits undo can take back. */
const UNDO_LIMIT = 100

/**
 * A store holding one config, with undo and redo of config changes
 * (zundo). Each app (and each test) creates its own, so no state leaks
 * between them.
 */
export function createConfigStore(initialConfig: Config = DEFAULT_CONFIG) {
  const store = createStore<ConfigState>()(
    temporal(
      (set, get) => {
        /**
         * Change state without making an undo step. Tracking stays paused
         * while a drag is open, so the drag still becomes one step.
         */
        const setUntracked = (state: Partial<ConfigState>) => {
          const history = store.temporal.getState()
          history.pause()
          set(state)
          if (!get().gesture) history.resume()
        }
        /**
         * Step through the history, keeping the current view preferences
         * (units, target curve), which are not part of it.
         */
        const travel = (step: 'undo' | 'redo') => {
          if (get().gesture) return
          const { units, targetCurve } = get().config
          store.temporal.getState()[step]()
          const { config } = get()
          // An undone edit is still an edit of the room shown for a broken link.
          setUntracked({
            linkFallback: null,
            config:
              config.units === units && config.targetCurve === targetCurve
                ? config
                : { ...config, units, targetCurve },
          })
        }
        return {
          config: initialConfig,
          linkProblem: null,
          linkFallback: null,
          openedConfig: initialConfig,
          history: { canUndo: false, canRedo: false },
          gesture: null,
          setUnits: (units) =>
            setUntracked({ config: { ...get().config, units } }),
          setTargetCurve: (targetCurve) =>
            setUntracked({ config: { ...get().config, targetCurve } }),
          applyEdit: (edit) => {
            const { config } = get()
            const edited = edit(config)
            if (edited !== config) set({ config: edited })
          },
          beginGesture: () => {
            const { gesture, config } = get()
            if (gesture) {
              set({ gesture: { ...gesture, depth: gesture.depth + 1 } })
              return
            }
            store.temporal.getState().pause()
            set({ gesture: { start: config, depth: 1 } })
          },
          endGesture: () => {
            const { gesture, config } = get()
            if (!gesture) return
            if (gesture.depth > 1) {
              set({ gesture: { ...gesture, depth: gesture.depth - 1 } })
              return
            }
            // Put the config back as it was before the drag while not
            // tracking, then make the whole drag one tracked change.
            set({ gesture: null, config: gesture.start })
            store.temporal.getState().resume()
            if (config !== gesture.start) set({ config })
          },
          undo: () => travel('undo'),
          redo: () => travel('redo'),
          openEncodedConfig: (encoded) => {
            const { config, problem } =
              encoded === undefined
                ? { config: DEFAULT_CONFIG, problem: null }
                : decodeConfig(encoded)
            // The link replaces the room, and any drag in progress with it.
            set({ gesture: null })
            setUntracked({
              config,
              linkProblem: problem,
              linkFallback: problem ? config : null,
              openedConfig: config,
            })
            store.temporal.getState().clear()
          },
          dismissLinkProblem: () => set({ linkProblem: null }),
        }
      },
      {
        // Only the config is undone; the rest is about the page, not the
        // room. Units and the target curve are view preferences: they are
        // changed untracked and kept on undo and redo (see travel).
        partialize: ({ config }) => ({ config }),
        equality: (past, current) => past.config === current.config,
        limit: UNDO_LIMIT,
      },
    ),
  )
  store.temporal.subscribe(({ pastStates, futureStates }) => {
    const history = {
      canUndo: pastStates.length > 0,
      canRedo: futureStates.length > 0,
    }
    const current = store.getState().history
    if (
      current.canUndo !== history.canUndo ||
      current.canRedo !== history.canRedo
    ) {
      store.setState({ history })
    }
  })
  return store
}
