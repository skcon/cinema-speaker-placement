import { createStore } from 'zustand/vanilla'
import {
  checkRoomDimension,
  DEFAULT_CONFIG,
  type Config,
  type DolbyLayout,
  type RoomDimension,
  type UnitSystem,
} from '@/domain'

export type ConfigState = {
  /** The current config. Always valid: actions reject out-of-range input. */
  config: Config
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
}

export type ConfigStore = ReturnType<typeof createConfigStore>

/**
 * A store holding one config. Each app (and each test) creates its own, so
 * no state leaks between them.
 */
export function createConfigStore(initialConfig: Config = DEFAULT_CONFIG) {
  return createStore<ConfigState>()((set) => ({
    config: initialConfig,
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
  }))
}
