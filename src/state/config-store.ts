import { temporal } from 'zundo'
import { createStore } from 'zustand/vanilla'
import {
  decodeConfig,
  DEFAULT_CONFIG,
  MLP_ID,
  withAmplifierWatts,
  withAutoPlacement,
  withCrossover,
  withLayout,
  withMlpAtRecommendedSeat,
  withPositionLength,
  withRoomDimension,
  withSpeakerSpecs,
  withSubwooferHasOwnSpecs,
  withSubwooferSpecs,
  withDragged,
  withRoomObjectAdded,
  withRoomObjectDimension,
  withRoomObjectEdited,
  withRoomObjectRemoved,
  type Config,
  type DolbyLayout,
  type DragTarget,
  type FloorPoint,
  type PlaceableId,
  type PositionDimension,
  type RoomPoint,
  type RoomDimension,
  type RoomObjectAddition,
  type RoomObjectDimension,
  type RoomObjectEdit,
  type RoomObjectId,
  type SeatRecommendation,
  type ShareLinkProblem,
  type SpeakerGroupId,
  type SpeakerGroups,
  type SubwooferCount,
  type SubwooferId,
  type SubwooferSpecs,
  type TargetCurveKind,
  type UnitSystem,
} from '@/domain'

export type ConfigState = {
  /**
   * The current config. Always valid: every edit of the room is a domain
   * config edit (config-edits.ts), which rejects invalid input.
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
   * Set one room dimension, in meters (withRoomDimension in the domain).
   * Out-of-range values are ignored.
   */
  setRoomDimension: (dimension: RoomDimension, meters: number) => void
  /**
   * Switch to another v1 Dolby layout (X and Z), keeping the subwoofers
   * (withLayout in the domain).
   */
  setLayout: (dolbyLayout: DolbyLayout) => void
  /**
   * Set how many subwoofers the layout has (the Y), as withLayout in the
   * domain says. Subwoofers that stay keep their own specs; removed ones
   * drop theirs, and added ones use the group's.
   */
  setSubwooferCount: (subwoofers: SubwooferCount) => void
  /**
   * Change specs of the Subwoofers group, or the own specs of one
   * subwoofer (withSubwooferSpecs in the domain). Ignored when a spec would
   * be out of range (or the peak power below the RMS power), or the
   * subwoofer has no own specs.
   */
  setSubwooferSpecs: (
    target: 'group' | SubwooferId,
    change: Partial<SubwooferSpecs>,
  ) => void
  /**
   * Change specs of one other speaker group (Front L/R ... Overheads), as
   * withSpeakerSpecs in the domain says. Ignored when a spec would be out
   * of range.
   */
  setSpeakerSpecs: <G extends SpeakerGroupId>(
    group: G,
    change: Partial<SpeakerGroups[G]['specs']>,
  ) => void
  /**
   * Set the amplifier power per channel, in watts (withAmplifierWatts in
   * the domain). Out-of-range values are ignored.
   */
  setAmplifierWatts: (watts: number) => void
  /**
   * Give a subwoofer of the layout own specs, starting as a copy of the
   * group's, or make it use the group's again, dropping its own
   * (withSubwooferHasOwnSpecs in the domain).
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
   * Set the crossover between the Speakers and the Subwoofers, in Hz
   * (withCrossover in the domain). Out-of-range values are ignored.
   */
  setCrossover: (crossoverHz: number) => void
  /**
   * Drag a drag target on the floor plan: its anchor (see dragAnchors in
   * the domain) goes to `to`, as withDragged says. A channel, a subwoofer
   * or the MLP is made manual there, inside the wall clearances, keeping
   * its height; dragging the Seat row moves the MLP the same way; the
   * Screen slides along the front wall, a furniture box goes with its
   * middle to `to` and an opening slides along its own wall, each stopping
   * at the walls. Ignored for a target the config doesn't have.
   */
  moveDragTarget: (target: DragTarget, to: FloorPoint) => void
  /**
   * Set one of an item's lengths, its height above the floor or its
   * distance to a wall, in meters, making it manual. Ignored when the
   * value is outside the limits positionLengths gives (unlike a drag, it
   * isn't moved to the limit), or the item's height is fixed.
   */
  setPositionLength: (
    id: PlaceableId,
    dimension: PositionDimension,
    meters: number,
  ) => void
  /**
   * Add a room object: the Screen (the default TV, centred on the front
   * wall), a furniture box from a preset, or a door or window (see
   * withRoomObjectAdded in the domain). Ignored when the Room already has
   * as many of that kind as it may.
   */
  addRoomObject: (addition: RoomObjectAddition) => void
  /**
   * Take room object `id` away; the objects after it in its list move up a
   * place. Ignored for the seat row and an object the Room doesn't have.
   */
  removeRoomObject: (id: RoomObjectId) => void
  /**
   * Change room object `id` with `edit`, for example one of a kind
   * module's `with...` functions (a screen's kind, a box's name, an
   * opening's wall). Ignored when there is no such object, or the edit
   * rejects the change or gives one that doesn't fit the Room.
   */
  editRoomObject: <I extends RoomObjectId>(
    id: I,
    edit: RoomObjectEdit<I>,
  ) => void
  /**
   * Set one of room object `id`'s lengths, a size or a distance from a
   * wall (see withRoomObjectDimension in the domain). Ignored when the
   * value is outside the limits roomObjectLength gives, or there is no
   * such object or length.
   */
  setRoomObjectDimension: <I extends RoomObjectId>(
    id: I,
    dimension: RoomObjectDimension<I>,
    meters: number,
  ) => void
  /**
   * Move the MLP to `seat`, the recommended seat on screen ("Move MLP
   * here"), making it manual, as one undoable step; auto speakers follow
   * it. With the MLP already there it changes nothing.
   */
  moveMlpToRecommendedSeat: (seat: RoomPoint) => void
  /**
   * Put every channel, subwoofer and the MLP back to auto, dropping the
   * stored manual positions, then the MLP at the recommended seat, as one
   * undoable change. When that changes nothing it makes no new state, so
   * undo won't record an empty step.
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

/**
 * Whether the config is still the one the last share link (or the default
 * room) opened, unedited. Every edit makes a new config, so no action has
 * to clear this.
 */
export function isUneditedSinceOpened(state: ConfigState): boolean {
  return state.config === state.openedConfig
}

/**
 * Whether Auto-place has something to do: an item other than the MLP is
 * manual, or the MLP isn't at the recommended seat. Until the
 * recommendation is ready, whether anything is manual.
 */
export function canAutoPlace(
  config: Config,
  recommendation: SeatRecommendation | null,
): boolean {
  const manual = Object.keys(config.manualPositions)
  if (!recommendation) return manual.length > 0
  return manual.some((id) => id !== MLP_ID) || !recommendation.mlpIsRecommended
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
          openedConfig: initialConfig,
          history: { canUndo: false, canRedo: false },
          gesture: null,
          setUnits: (units) =>
            setUntracked({ config: { ...get().config, units } }),
          setRoomDimension: (dimension, meters) =>
            setConfigIfChanged((config) =>
              withRoomDimension(config, dimension, meters),
            ),
          setLayout: (dolbyLayout) =>
            setConfigIfChanged((config) =>
              withLayout(config, { ...config.layout, dolbyLayout }),
            ),
          setSubwooferCount: (subwoofers) =>
            setConfigIfChanged((config) =>
              withLayout(config, { ...config.layout, subwoofers }),
            ),
          setSubwooferSpecs: (target, change) =>
            setConfigIfChanged((config) =>
              withSubwooferSpecs(config, target, change),
            ),
          setSpeakerSpecs: (group, change) =>
            setConfigIfChanged((config) =>
              withSpeakerSpecs(config, group, change),
            ),
          setAmplifierWatts: (watts) =>
            setConfigIfChanged((config) => withAmplifierWatts(config, watts)),
          setSubwooferHasOwnSpecs: (subwoofer, hasOwnSpecs) =>
            setConfigIfChanged((config) =>
              withSubwooferHasOwnSpecs(config, subwoofer, hasOwnSpecs),
            ),
          setTargetCurve: (targetCurve) =>
            setUntracked({ config: { ...get().config, targetCurve } }),
          setCrossover: (hz) =>
            setConfigIfChanged((config) => withCrossover(config, hz)),
          moveDragTarget: (target, to) =>
            setConfigIfChanged((config) => withDragged(config, target, to)),
          setPositionLength: (id, dimension, meters) =>
            setConfigIfChanged((config) =>
              withPositionLength(config, id, dimension, meters),
            ),
          addRoomObject: (addition) =>
            setConfigIfChanged((config) =>
              withRoomObjectAdded(config, addition),
            ),
          removeRoomObject: (id) =>
            setConfigIfChanged((config) => withRoomObjectRemoved(config, id)),
          editRoomObject: (id, edit) =>
            setConfigIfChanged((config) =>
              withRoomObjectEdited(config, id, edit),
            ),
          setRoomObjectDimension: (id, dimension, meters) =>
            setConfigIfChanged((config) =>
              withRoomObjectDimension(config, id, dimension, meters),
            ),
          moveMlpToRecommendedSeat: (seat) =>
            setConfigIfChanged((config) =>
              withMlpAtRecommendedSeat(config, seat),
            ),
          autoPlace: () => setConfigIfChanged(withAutoPlacement),
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
