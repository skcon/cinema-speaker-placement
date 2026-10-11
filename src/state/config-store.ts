import { createStore } from 'zustand/vanilla'
import {
  checkRoomDimension,
  decodeConfig,
  DEFAULT_CONFIG,
  type Config,
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
  /** Show and accept lengths in these units. The stored meters don't change. */
  setUnits: (units: UnitSystem) => void
  /** Set one room dimension, in meters. Out-of-range values are ignored. */
  setRoomDimension: (dimension: RoomDimension, meters: number) => void
  /**
   * Replace the config with the one a share link's search param holds.
   * Without a param, that is the default config; a param that can't be
   * opened also gives the default config, and sets `linkProblem`.
   */
  openShareLink: (param: string | undefined) => void
  /** Hide the share-link problem. The config stays as it is. */
  dismissLinkProblem: () => void
}

export type ConfigStore = ReturnType<typeof createConfigStore>

/**
 * A store holding one config. Each app (and each test) creates its own, so
 * no state leaks between them.
 */
export function createConfigStore(initialConfig: Config = DEFAULT_CONFIG) {
  return createStore<ConfigState>()((set) => ({
    config: initialConfig,
    linkProblem: null,
    setUnits: (units) =>
      set(({ config }) => ({ config: { ...config, units } })),
    setRoomDimension: (dimension, meters) => {
      if (checkRoomDimension(dimension, meters) !== null) return
      set(({ config }) => ({
        config: { ...config, room: { ...config.room, [dimension]: meters } },
      }))
    },
    openShareLink: (param) => {
      const { config, problem } =
        param === undefined
          ? { config: DEFAULT_CONFIG, problem: null }
          : decodeConfig(param)
      set({ config, linkProblem: problem })
    },
    dismissLinkProblem: () => set({ linkProblem: null }),
  }))
}
