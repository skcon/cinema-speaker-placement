/**
 * Room modes of a rectangular Room: where they are and how strongly
 * sources at some points excite them at another
 * (docs/research/low-frequency-response.md section 2).
 *
 * Rigid walls are assumed, so a mode's pressure is a product of cosines
 * along the three dimensions, with its maxima at the walls.
 */
import type { Complex } from './complex'
import {
  LOW_FREQUENCY_REVERBERATION_TIME,
  MODE_SUM_HEADROOM,
  SPEED_OF_SOUND,
} from './reference'
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

/** How many of a mode's three indices are not zero, by kind. */
const NON_ZERO_INDICES = {
  axial: 1,
  tangential: 2,
  oblique: 3,
} as const satisfies Record<RoomModeKind, number>

const KIND_BY_NON_ZERO_INDICES = ['axial', 'tangential', 'oblique'] as const

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
        const kind = KIND_BY_NON_ZERO_INDICES[nonZero - 1]
        // (0, 0, 0) is the uniform pressure term (room gain): left out,
        // see docs/research/low-frequency-response.md section 2.
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

/** Sources' modal sum, prepared once and heard at any receiver. */
export type ModalResponse = {
  /** The modes summed: up to MODE_SUM_HEADROOM × the highest frequency. */
  readonly modes: readonly RoomMode[]
  /**
   * The lowest mode the sources excite together (sources that cancel a
   * mode don't excite it), or undefined if none. Below it the modal sum
   * has only other modes' tails, and no room gain (left out), so it is not
   * reliable there.
   */
  readonly lowestExcitedMode: RoomMode | undefined
  /** The summed pressure (up to a constant) at `receiver`, per frequency. */
  readonly pressureAt: (receiver: RoomPoint) => Complex[]
}

/** Below this, a mode's summed source weight counts as cancelled (rounding). */
const CANCELLED = 1e-9

/**
 * The pressure (up to a constant) that point sources, all driven in phase
 * at the same level, make at a receiver at each frequency, summed over the
 * room modes (the modal sum of docs/research/low-frequency-response.md
 * section 2, item 4):
 *
 *     p(f) = Σₙ ψₙ(receiver)·Σₛ ψₙ(source) / (Kₙ·(fₙ² − f² + j·B·fₙ))
 *
 * where ψ is a mode's shape, K = (V/8)·2^(zero indices) its normalisation
 * and B the modal bandwidth. Written in Hz instead of rad/s, which only
 * scales every term by the same (2π)². Symmetric in source and receiver.
 *
 * Everything but ψₙ(receiver) is worked out here once, so `pressureAt` costs
 * one multiply-add per mode and frequency: a 20 x 20 receiver grid in the
 * largest room (15 x 15 x 5 m, about 3,100 modes, 161 frequencies, 4
 * sources) takes about 0.45 s (see room-modes.test.ts).
 *
 * #12: a per-source filter (enclosure roll-off, crossover) multiplies into
 * that source's term inside Σₛ, per frequency.
 */
export function prepareModalResponse({
  room,
  sources,
  frequencies,
  bandwidth = modalBandwidth(),
}: {
  room: Room
  sources: readonly RoomPoint[]
  frequencies: readonly number[]
  bandwidth?: number
}): ModalResponse {
  const modes = roomModes(
    room,
    Math.max(...frequencies) * MODE_SUM_HEADROOM.factor,
  )
  const volume = room.length * room.width * room.height
  const count = frequencies.length
  // Per mode and frequency: Σₛ ψₙ(source) / (Kₙ·Dₙ(f)), real and imaginary.
  const re = new Float64Array(modes.length * count)
  const im = new Float64Array(modes.length * count)
  let lowestExcitedMode: RoomMode | undefined
  modes.forEach((mode, n) => {
    const sourceWeight = sources.reduce(
      (sum, source) => sum + modeShape(room, mode.indices, source),
      0,
    )
    if (!lowestExcitedMode && Math.abs(sourceWeight) > CANCELLED) {
      lowestExcitedMode = mode
    }
    const zeroIndices = 3 - NON_ZERO_INDICES[mode.kind]
    const weight = sourceWeight / ((volume / 8) * 2 ** zeroIndices)
    const squared = mode.frequency * mode.frequency
    const damping = bandwidth * mode.frequency
    frequencies.forEach((f, i) => {
      // weight / (x + jy) = weight·(x − jy) / (x² + y²)
      const x = squared - f * f
      const scale = weight / (x * x + damping * damping)
      re[n * count + i] = scale * x
      im[n * count + i] = -scale * damping
    })
  })

  return {
    modes,
    lowestExcitedMode,
    pressureAt: (receiver) => {
      const sumRe = new Float64Array(count)
      const sumIm = new Float64Array(count)
      modes.forEach((mode, n) => {
        const shape = modeShape(room, mode.indices, receiver)
        const offset = n * count
        for (let i = 0; i < count; i++) {
          sumRe[i]! += shape * re[offset + i]!
          sumIm[i]! += shape * im[offset + i]!
        }
      })
      return Array.from(sumRe, (value, i) => ({ re: value, im: sumIm[i]! }))
    },
  }
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
