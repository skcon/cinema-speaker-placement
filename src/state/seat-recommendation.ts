import { recommendationInputs, type Config, type RoomObjects } from '@/domain'

/**
 * The fields of the config the recommended seat doesn't depend on. Everything
 * else counts, including fields added later, so a new input can never be
 * left out of the memo by accident.
 */
const NOT_SCORED = ['units'] as const satisfies readonly (keyof Config)[]

/**
 * The room objects the recommended seat doesn't depend on: the Seat row
 * (its size, and where it is, which is the MLP). A blocklist too, so a
 * room object that auto-place later uses is not left out.
 */
const NOT_SCORED_ROOM_OBJECTS = [
  'seatRow',
] as const satisfies readonly (keyof RoomObjects)[]

/** Whether `field` is in `blocklist`. */
function isIn(blocklist: readonly string[], field: string): boolean {
  return blocklist.includes(field)
}

/**
 * What the recommended seat (findRecommendedSeat) is memoized on: the
 * config as it reads it (recommendationInputs: no MLP and no manual
 * speakers, only manual subwoofers, #120), except the fields in
 * NOT_SCORED and the room objects in NOT_SCORED_ROOM_OBJECTS (blocklists,
 * not allowlists). So moving the MLP or a speaker keeps the memo.
 */
export function seatScoreKey(config: Config): string {
  const inputs = recommendationInputs(config)
  const roomObjects = Object.entries(inputs.roomObjects).filter(
    ([object]) => !isIn(NOT_SCORED_ROOM_OBJECTS, object),
  )
  return JSON.stringify(
    Object.entries({ ...inputs, roomObjects }).filter(
      ([field]) => !isIn(NOT_SCORED, field),
    ),
  )
}
