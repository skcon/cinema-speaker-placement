/**
 * A config whose recommended seat is meaningfully better than the auto
 * MLP, for tests of "Move MLP here" and Auto-place. Since the auto
 * speakers stay symmetric to the room for every candidate seat (ADR 0005,
 * amendment), the default room recommends its own 38% MLP (#48).
 */
import { DEFAULT_CONFIG, type Config } from '@/domain'

/**
 * The default config in a 7.5 x 5 x 2.6 m room: the recommended seat is on
 * the center line about 3.26 m from the front wall, a little behind the
 * 2.85 m auto MLP, and about 4.6 points better.
 *
 * Until #121 this was a 6 x 4 m room (recommended seat 2.61 m back). Aiming
 * Left and Right at 29° instead of 26° moves them, and so the bass they add
 * below the crossover, and that room's 38% MLP became its best seat.
 */
export const ROOM_WITH_A_BETTER_SEAT: Config = {
  ...DEFAULT_CONFIG,
  room: { length: 7.5, width: 5, height: 2.6 },
}
