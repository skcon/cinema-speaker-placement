/**
 * A config whose recommended seat is meaningfully better than the auto
 * MLP, for tests of "Move MLP here" and Auto-place. Since the auto
 * speakers stay symmetric to the room for every candidate seat (ADR 0005,
 * amendment), the default room recommends its own 38% MLP (#48).
 */
import { DEFAULT_CONFIG, type Config } from '@/domain'

/**
 * The default config in a 6 x 4 x 2.6 m room: the recommended seat is on
 * the center line about 2.6 m from the front wall, a little behind the
 * 2.28 m auto MLP.
 */
export const ROOM_WITH_A_BETTER_SEAT: Config = {
  ...DEFAULT_CONFIG,
  room: { length: 6, width: 4, height: 2.6 },
}
