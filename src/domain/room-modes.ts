/**
 * Room modes of a rectangular Room: where they are and how strongly a
 * source at one point excites them at another
 * (docs/research/low-frequency-response.md section 2).
 *
 * Rigid walls are assumed, so a mode's pressure is a product of cosines
 * along the three dimensions, with its maxima at the walls.
 */
import type { Complex } from './complex'
import { LOW_FREQUENCY_REVERBERATION_TIME, SPEED_OF_SOUND } from './reference'
import type { Room, RoomPoint } from './room'

/** How many walls a mode bounces between: one pair, two pairs or all three. */
export type RoomModeKind = 'axial' | 'tangential' | 'oblique'

/** A mode's order along each room dimension (0 = no variation along it). */
export type RoomModeIndices = {
  readonly length: number
  readonly width: number
  readonly height: number
}

/** A normal mode of the Room. */
export type RoomMode = {
  readonly indices: RoomModeIndices
  readonly kind: RoomModeKind
  /** Its natural frequency, in Hz. */
  readonly frequency: number
}

const KINDS = ['axial', 'tangential', 'oblique'] as const

/**
 * Every mode of the Room up to `maxFrequency` Hz, lowest first:
 * f = (c/2)·√((nL/L)² + (nW/W)² + (nH/H)²).
 */
export function roomModes(room: Room, maxFrequency: number): RoomMode[] {
  const c = SPEED_OF_SOUND.metersPerSecond
  const highest = (dimension: number) =>
    Math.floor((2 * dimension * maxFrequency) / c)
  const modes: RoomMode[] = []
  for (let length = 0; length <= highest(room.length); length++) {
    for (let width = 0; width <= highest(room.width); width++) {
      for (let height = 0; height <= highest(room.height); height++) {
        const nonZero = [length, width, height].filter((n) => n > 0).length
        const kind = KINDS[nonZero - 1]
        if (!kind) continue
        const frequency =
          (c / 2) *
          Math.hypot(
            length / room.length,
            width / room.width,
            height / room.height,
          )
        if (frequency > maxFrequency) continue
        modes.push({ indices: { length, width, height }, kind, frequency })
      }
    }
  }
  return modes.sort((a, b) => a.frequency - b.frequency)
}

/**
 * Every mode's half-power bandwidth in Hz, from the assumed low-frequency
 * reverberation time: B = δ/π with δ = 3·ln 10 / T, about 2.2 / T.
 */
export function modalBandwidth(
  reverberationTime: number = LOW_FREQUENCY_REVERBERATION_TIME.seconds,
): number {
  return (3 * Math.LN10) / reverberationTime / Math.PI
}

/**
 * The pressure (up to a constant) a point source at `source` makes at
 * `receiver` at each frequency, summed over `modes` (the modal sum of
 * docs/research/low-frequency-response.md section 2, item 4):
 *
 *     p(f) = Σ ψ(source)·ψ(receiver) / (K·(fₙ² − f² + j·B·fₙ))
 *
 * where ψ is the mode's shape, K = (V/8)·2^(zero indices) its
 * normalisation and B the modal bandwidth. Written in Hz instead of rad/s,
 * which only scales every term by the same (2π)². Symmetric in source and
 * receiver.
 */
export function roomModeTransfer({
  room,
  modes,
  source,
  receiver,
  frequencies,
  bandwidth = modalBandwidth(),
}: {
  room: Room
  modes: readonly RoomMode[]
  source: RoomPoint
  receiver: RoomPoint
  frequencies: readonly number[]
  bandwidth?: number
}): Complex[] {
  const volume = room.length * room.width * room.height
  const terms = modes.map(({ indices, frequency }) => {
    const zeroIndices = [indices.length, indices.width, indices.height].filter(
      (n) => n === 0,
    ).length
    const normalisation = (volume / 8) * 2 ** zeroIndices
    return {
      weight:
        (modeShape(room, indices, source) *
          modeShape(room, indices, receiver)) /
        normalisation,
      squared: frequency * frequency,
      damping: bandwidth * frequency,
    }
  })
  return frequencies.map((f) => {
    let re = 0
    let im = 0
    for (const { weight, squared, damping } of terms) {
      // weight / (x + jy) = weight·(x − jy) / (x² + y²)
      const x = squared - f * f
      const scale = weight / (x * x + damping * damping)
      re += scale * x
      im -= scale * damping
    }
    return { re, im }
  })
}

/**
 * A mode's relative pressure at a point: 1 or -1 at the walls, 0 on its
 * nodal planes. Room coordinates put x = 0 on the center line, so x is
 * shifted to start at the left wall.
 */
function modeShape(
  room: Room,
  indices: RoomModeIndices,
  { x, y, z }: RoomPoint,
): number {
  return (
    Math.cos((indices.length * Math.PI * y) / room.length) *
    Math.cos((indices.width * Math.PI * (x + room.width / 2)) / room.width) *
    Math.cos((indices.height * Math.PI * z) / room.height)
  )
}
