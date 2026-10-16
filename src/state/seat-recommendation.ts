import type { Config, RoomObjects } from '@/domain'

/**
 * The fields of the config the seat score doesn't depend on. Everything
 * else counts, including fields added later, so a new input can never be
 * left out of the memo by accident.
 */
const NOT_SCORED = ['units'] as const satisfies readonly (keyof Config)[]

/**
 * The room objects the seat score doesn't depend on: the Seat row's size
 * (where it is, the MLP, counts through the manual positions). A blocklist
 * too, so a room object that auto-place later uses is not left out.
 */
const NOT_SCORED_ROOM_OBJECTS = [
  'seatRow',
] as const satisfies readonly (keyof RoomObjects)[]

/** Whether `field` is in `blocklist`. */
function isIn(blocklist: readonly string[], field: string): boolean {
  return blocklist.includes(field)
}

/**
 * What the recommended seat is memoized on: the whole config except the
 * fields in NOT_SCORED and the room objects in NOT_SCORED_ROOM_OBJECTS
 * (blocklists, not allowlists).
 */
export function seatScoreKey(config: Config): string {
  const roomObjects = Object.entries(config.roomObjects).filter(
    ([object]) => !isIn(NOT_SCORED_ROOM_OBJECTS, object),
  )
  return JSON.stringify(
    Object.entries({ ...config, roomObjects }).filter(
      ([field]) => !isIn(NOT_SCORED, field),
    ),
  )
}
