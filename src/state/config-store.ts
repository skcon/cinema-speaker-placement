import { createStore } from 'zustand/vanilla'
import {
  checkRoomDimension,
  decodeConfig,
  DEFAULT_CONFIG,
  type Config,
  type DolbyLayout,
  type RoomDimension,
  type ShareLinkProblem,
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
  /** Switch to another v1 Dolby layout (X and Z), keeping the subwoofer count. */
  setLayout: (dolbyLayout: DolbyLayout) => void
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

/**
 * A store holding one config. Each app (and each test) creates its own, so
 * no state leaks between them.
 */
export function createConfigStore(initialConfig: Config = DEFAULT_CONFIG) {
  return createStore<ConfigState>()((set) => ({
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
