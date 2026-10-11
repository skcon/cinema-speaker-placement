import { createStore } from 'zustand/vanilla'
import {
  areValidSubwooferSpecs,
  checkRoomDimension,
  decodeConfig,
  DEFAULT_CONFIG,
  type Config,
  type DolbyLayout,
  type RoomDimension,
  type ShareLinkProblem,
  type SubwooferCount,
  type SubwooferGroup,
  type SubwooferNumber,
  type SubwooferSpecs,
  type UnitSystem,
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
   * Change specs of the Subwoofers group, or of one subwoofer that has
   * specs of its own. Ignored when a spec would be out of range (or the
   * peak power below the RMS power), or the subwoofer has no specs of its
   * own.
   */
  setSubwooferSpecs: (
    target: 'group' | SubwooferNumber,
    change: Partial<SubwooferSpecs>,
  ) => void
  /**
   * Give a subwoofer specs of its own, starting as a copy of the group's,
   * or make it use the group's again (dropping its own).
   */
  setSubwooferHasOwnSpecs: (
    subwoofer: SubwooferNumber,
    hasOwnSpecs: boolean,
  ) => void
  /**
   * Put every speaker back at its auto-placed position. Manual positions
   * arrive with #9: then this sets every channel back to auto, dropping the
   * stored manual positions, as one undoable change. Until then every
   * position is derived already, so it changes nothing (and makes no new
   * state, so undo won't record an empty step).
   */
  autoPlace: () => void
  /**
   * Replace the config with the one an encoded config (a share link's
   * `config` param) holds. Without one, that is the default config; one
   * that can't be opened also gives the default config, and sets
   * `linkProblem`.
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

/** The config with its Subwoofers speaker group replaced. */
function withSubwooferGroup(
  config: Config,
  subwoofers: SubwooferGroup,
): Config {
  return { ...config, speakerGroups: { ...config.speakerGroups, subwoofers } }
}

/**
 * A store holding one config. Each app (and each test) creates its own, so
 * no state leaks between them.
 */
export function createConfigStore(initialConfig: Config = DEFAULT_CONFIG) {
  return createStore<ConfigState>()((set, get) => ({
    config: initialConfig,
    linkProblem: null,
    linkFallback: null,
    setUnits: (units) =>
      set(({ config }) => ({ config: { ...config, units } })),
    setRoomDimension: (dimension, meters) => {
      if (checkRoomDimension(dimension, meters) !== null) return
      set(({ config }) => ({
        config: { ...config, room: { ...config.room, [dimension]: meters } },
      }))
    },
    setLayout: (dolbyLayout) =>
      set(({ config }) => ({
        config: { ...config, layout: { ...config.layout, dolbyLayout } },
      })),
    setSubwooferCount: (subwoofers) =>
      set(({ config }) => {
        const group = config.speakerGroups.subwoofers
        const overrides = Array.from(
          { length: subwoofers },
          (_, index) => group.overrides[index] ?? null,
        )
        return {
          config: {
            ...withSubwooferGroup(config, { ...group, overrides }),
            layout: { ...config.layout, subwoofers },
          },
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
      const index = target - 1
      const ownSpecs = group.overrides[index]
      if (!ownSpecs) return
      const specs = { ...ownSpecs, ...change }
      if (!areValidSubwooferSpecs(specs)) return
      set({
        config: withSubwooferGroup(config, {
          ...group,
          overrides: group.overrides.with(index, specs),
        }),
      })
    },
    setSubwooferHasOwnSpecs: (subwoofer, hasOwnSpecs) => {
      const { config } = get()
      const group = config.speakerGroups.subwoofers
      const index = subwoofer - 1
      const ownSpecs = group.overrides[index]
      if (ownSpecs === undefined || (ownSpecs !== null) === hasOwnSpecs) return
      set({
        config: withSubwooferGroup(config, {
          ...group,
          overrides: group.overrides.with(
            index,
            hasOwnSpecs ? group.specs : null,
          ),
        }),
      })
    },
    autoPlace: () => {},
    openEncodedConfig: (encoded) => {
      const { config, problem } =
        encoded === undefined
          ? { config: DEFAULT_CONFIG, problem: null }
          : decodeConfig(encoded)
      set({
        config,
        linkProblem: problem,
        linkFallback: problem ? config : null,
      })
    },
    dismissLinkProblem: () => set({ linkProblem: null }),
  }))
}
