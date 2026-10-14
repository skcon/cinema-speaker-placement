import { temporal } from 'zundo'
import { createStore } from 'zustand/vanilla'
import {
  areValidSubwooferSpecs,
  checkCrossover,
  checkRoomDimension,
  decodeConfig,
  DEFAULT_CONFIG,
  placeAtWallDistance,
  placeManually,
  withAutoPlacement,
  withLayout,
  withRoom,
  type Config,
  type DolbyLayout,
  type FloorPoint,
  type PlaceableId,
  type RoomDimension,
  type ShareLinkProblem,
  subwooferIds,
  type SubwooferCount,
  type SubwooferGroup,
  type SubwooferId,
  type SubwooferSpecs,
  type TargetCurveKind,
  type UnitSystem,
  type Wall,
} from '@/domain'

export type ConfigState = {
  /** The current config. Always valid: actions reject out-of-range input. */
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
  /** Set one room dimension, in meters. Out-of-range values are ignored. */
  setRoomDimension: (dimension: RoomDimension, meters: number) => void
  /** Switch to another v1 Dolby layout (X and Z), keeping the subwoofers. */
  setLayout: (dolbyLayout: DolbyLayout) => void
  /**
   * Set how many subwoofers the layout has (the Y). Subwoofers that stay
   * keep their own specs; removed ones drop theirs, and added ones use the
   * group's.
   */
  setSubwooferCount: (subwoofers: SubwooferCount) => void
  /**
   * Change specs of the Subwoofers group, or the own specs of one
   * subwoofer. Ignored when a spec would be out of range (or the peak power
   * below the RMS power), or the subwoofer has no own specs.
   */
  setSubwooferSpecs: (
    target: 'group' | SubwooferId,
    change: Partial<SubwooferSpecs>,
  ) => void
  /**
   * Give a subwoofer of the layout own specs, starting as a copy of the
   * group's, or make it use the group's again (dropping its own).
   */
  setSubwooferHasOwnSpecs: (
    subwoofer: SubwooferId,
    hasOwnSpecs: boolean,
  ) => void
  /**
   * Compare the estimated response against the flat or the house curve. A
   * view preference: not an undo step.
   */
  setTargetCurve: (targetCurve: TargetCurveKind) => void
  /**
   * Set the crossover between the Speakers and the Subwoofers, in Hz.
   * Out-of-range values are ignored.
   */
  setCrossover: (crossoverHz: number) => void
  /**
   * Move a channel, a subwoofer or the MLP on the floor plan (a drag),
   * making it manual. It stays inside the Room by the wall clearances; its
   * height stays. Ignored for an item the layout doesn't have.
   */
  moveItem: (id: PlaceableId, to: FloorPoint) => void
  /**
   * Set a listener-level speaker's height above the floor, in meters,
   * making it manual. Kept inside the floor and ceiling clearances;
   * subwoofers and the MLP keep their fixed heights.
   */
  setItemHeight: (id: PlaceableId, meters: number) => void
  /**
   * Move an item until it is `meters` from `wall`, making it manual. Kept
   * inside the wall clearances.
   */
  setWallDistance: (id: PlaceableId, wall: Wall, meters: number) => void
  /**
   * Put every channel, subwoofer and the MLP back to auto, dropping the
   * stored manual positions, as one undoable change. With nothing manual it
   * changes nothing (and makes no new state, so undo won't record an empty
   * step).
   */
  autoPlace: () => void
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

/** Whether anything is manual, so Auto-place has something to reset. */
export function hasManualPositions(state: ConfigState): boolean {
  return Object.keys(state.config.manualPositions).length > 0
}

/** The group's own specs, kept only for the subwoofers in `ids`. */
function ownSpecsOf(
  { ownSpecs }: SubwooferGroup,
  ids: readonly SubwooferId[],
): SubwooferGroup['ownSpecs'] {
  return Object.fromEntries(
    ids.flatMap((id) => {
      const specs = ownSpecs[id]
      return specs ? [[id, specs] as const] : []
    }),
  )
}

/** The config with its Subwoofers speaker group replaced. */
function withSubwooferGroup(
  config: Config,
  subwoofers: SubwooferGroup,
): Config {
  return { ...config, speakerGroups: { ...config.speakerGroups, subwoofers } }
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
        /** Apply a config edit, unless it changed nothing. */
        const setConfigIfChanged = (edit: (config: Config) => Config) => {
          const { config } = get()
          const edited = edit(config)
          if (edited !== config) set({ config: edited })
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
          history: { canUndo: false, canRedo: false },
          gesture: null,
          setUnits: (units) =>
            setUntracked({ config: { ...get().config, units } }),
          setRoomDimension: (dimension, meters) => {
            if (checkRoomDimension(dimension, meters) !== null) return
            set(({ config }) => ({
              config: withRoom(config, { ...config.room, [dimension]: meters }),
            }))
          },
          setLayout: (dolbyLayout) =>
            set(({ config }) => ({
              config: withLayout(config, { ...config.layout, dolbyLayout }),
            })),
          setSubwooferCount: (subwoofers) =>
            set(({ config }) => {
              const group = config.speakerGroups.subwoofers
              const ownSpecs = ownSpecsOf(group, subwooferIds(subwoofers))
              return {
                config: withLayout(
                  withSubwooferGroup(config, { ...group, ownSpecs }),
                  { ...config.layout, subwoofers },
                ),
              }
            }),
          setSubwooferSpecs: (target, change) => {
            const { config } = get()
            const group = config.speakerGroups.subwoofers
            if (target === 'group') {
              const specs = { ...group.specs, ...change }
              if (!areValidSubwooferSpecs(specs)) return
              set({ config: withSubwooferGroup(config, { ...group, specs }) })
              return
            }
            const ownSpecs = group.ownSpecs[target]
            if (!ownSpecs) return
            const specs = { ...ownSpecs, ...change }
            if (!areValidSubwooferSpecs(specs)) return
            set({
              config: withSubwooferGroup(config, {
                ...group,
                ownSpecs: { ...group.ownSpecs, [target]: specs },
              }),
            })
          },
          setSubwooferHasOwnSpecs: (subwoofer, hasOwnSpecs) => {
            const { config } = get()
            const group = config.speakerGroups.subwoofers
            const inLayout = subwooferIds(config.layout.subwoofers)
            if (!inLayout.includes(subwoofer)) return
            if ((group.ownSpecs[subwoofer] !== undefined) === hasOwnSpecs)
              return
            const ownSpecs = hasOwnSpecs
              ? { ...group.ownSpecs, [subwoofer]: group.specs }
              : ownSpecsOf(
                  group,
                  inLayout.filter((id) => id !== subwoofer),
                )
            set({ config: withSubwooferGroup(config, { ...group, ownSpecs }) })
          },
          setTargetCurve: (targetCurve) =>
            setUntracked({ config: { ...get().config, targetCurve } }),
          setCrossover: (crossoverHz) => {
            if (checkCrossover(crossoverHz) !== null) return
            set(({ config }) => ({ config: { ...config, crossoverHz } }))
          },
          moveItem: (id, { x, y }) =>
            setConfigIfChanged((config) => placeManually(config, id, { x, y })),
          setItemHeight: (id, meters) =>
            setConfigIfChanged((config) =>
              placeManually(config, id, { z: meters }),
            ),
          setWallDistance: (id, wall, meters) =>
            setConfigIfChanged((config) =>
              placeAtWallDistance(config, id, wall, meters),
            ),
          autoPlace: () => {
            const { config } = get()
            if (Object.keys(config.manualPositions).length === 0) return
            set({ config: withAutoPlacement(config) })
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
