import { DEFAULT_LAYOUT, type Layout } from './layout'
import { DEFAULT_ROOM, type Room } from './room'
import type { UnitSystem } from './units'

/**
 * The single source of truth for a room plan: only inputs (and, later,
 * manual positions). Everything else is derived by `analyzeRoom`. Lengths
 * are in meters whatever `units` says; `units` only picks how the UI shows
 * and accepts them.
 */
export type Config = {
  units: UnitSystem
  room: Room
  layout: Layout
}

export const DEFAULT_CONFIG: Config = {
  units: 'metric',
  room: DEFAULT_ROOM,
  layout: DEFAULT_LAYOUT,
}
