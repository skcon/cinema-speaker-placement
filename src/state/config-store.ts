import { temporal } from 'zundo'
import { createStore } from 'zustand/vanilla'
import {
  areValidSubwooferSpecs,
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
   * The config when the drag in progress started, or null between drags;
   * see beginGesture.
   */
  gestureStart: Config | null
  /** Show and accept lengths in these units. The stored meters don't change. */
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
  /** Compare the estimated response against the flat or the house curve. */
  setTargetCurve: (targetCurve: TargetCurveKind) => void
  /**
   * Move a channel, a subwoofer or the MLP on the floor plan (a drag),
   * making it manual. It stays inside the Room by the wall clearances; its
   * height stays. Ignored for an item the layout doesn't have.
   */
  moveItem: (id: PlaceableId, to: { x: number; y: number }) => void
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
   */
  beginGesture: () => void
  /** End a drag: everything it changed becomes one undo step. */
  endGesture: () => void
  /** Take back the last edit (a drag counts as one). */
  undo: () => void
  /** Make the last undone edit again. */
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
        /** Replace the config without making an undo step. */
        const setUntracked = (state: Partial<ConfigState>) => {
          const history = store.temporal.getState()
          history.pause()
          set(state)
          history.resume()
        }
        return {
          config: initialConfig,
          linkProblem: null,
          linkFallback: null,
          history: { canUndo: false, canRedo: false },
          gestureStart: null,
          setUnits: (units) =>
            set(({ config }) => ({ config: { ...config, units } })),
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
            set(({ config }) => ({ config: { ...config, targetCurve } })),
          moveItem: (id, { x, y }) => {
            const { config } = get()
            const moved = placeManually(config, id, { x, y })
            if (moved !== config) set({ config: moved })
          },
          setItemHeight: (id, meters) => {
            const { config } = get()
            const moved = placeManually(config, id, { z: meters })
            if (moved !== config) set({ config: moved })
          },
          setWallDistance: (id, wall, meters) => {
            const { config } = get()
            const moved = placeAtWallDistance(config, id, wall, meters)
            if (moved !== config) set({ config: moved })
          },
          autoPlace: () => {
            const { config } = get()
            if (Object.keys(config.manualPositions).length === 0) return
            set({ config: withAutoPlacement(config) })
          },
          beginGesture: () => {
            store.temporal.getState().pause()
            set({ gestureStart: get().config })
          },
          endGesture: () => {
            const { gestureStart, config } = get()
            if (gestureStart === null) return
            // Put the config back as it was before the drag while not tracking,
            // then make the whole drag one tracked change.
            setUntracked({ gestureStart: null, config: gestureStart })
            if (config !== gestureStart) set({ config })
          },
          undo: () => {
            store.temporal.getState().undo()
            // An undone edit is still an edit of the room shown for a broken link.
            set({ linkFallback: null })
          },
          redo: () => {
            store.temporal.getState().redo()
            set({ linkFallback: null })
          },
          openEncodedConfig: (encoded) => {
            const { config, problem } =
              encoded === undefined
                ? { config: DEFAULT_CONFIG, problem: null }
                : decodeConfig(encoded)
            setUntracked({
              config,
              linkProblem: problem,
              linkFallback: problem ? config : null,
              gestureStart: null,
            })
            store.temporal.getState().clear()
          },
          dismissLinkProblem: () => set({ linkProblem: null }),
        }
      },
      {
        // Only the config is undone; the rest is about the page, not the room.
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
