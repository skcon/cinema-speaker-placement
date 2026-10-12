/**
 * The estimated response at the MLP (GLOSSARY.md): a simplified model of
 * what the room does to the subwoofers' sound at the MLP, never a
 * measurement.
 *
 * ## How it is built
 *
 * 1. Each subwoofer's pressure at the MLP is a complex transfer function
 *    over the response band: so far the room modes only (room-modes.ts).
 * 2. The subwoofers are summed coherently: one bass-managed channel drives
 *    them all, in phase and at the same level.
 * 3. The sum becomes a level in dB, shifted so its average deviation from
 *    the target curve is 0 dB (the model has no absolute level).
 *
 * #12 multiplies each subwoofer's transfer function by its enclosure
 * roll-off and the crossover before step 2, and adds boundary interference
 * for listener-level speakers, each listed in `components`.
 */
import { add, decibels, ZERO, type Complex } from './complex'
import {
  LOW_FREQUENCY_REVERBERATION_TIME,
  MODE_SUM_HEADROOM,
  RESPONSE_BAND,
  SPEED_OF_SOUND,
} from './reference'
import { modalBandwidth, roomModes, roomModeTransfer } from './room-modes'
import type { Room, RoomPoint } from './room'
import type { TargetPoint } from './target-curve'

/** A level in dB at one frequency in Hz. */
export type ResponsePoint = {
  readonly frequency: number
  readonly level: number
}

/** The effects the estimate includes. #12 adds more. */
export type ResponseComponent = 'room-modes'

/** The modelling assumptions an estimate was made with (src/domain/reference.ts). */
export type ResponseModel = {
  /** In m/s. */
  readonly speedOfSound: number
  /** The low-frequency reverberation time assumed for every mode, in s. */
  readonly reverberationTime: number
  /** Every mode's half-power bandwidth that follows from it, in Hz. */
  readonly modalBandwidth: number
}

export type EstimatedResponse = {
  /** Level-matched to the target curve, over the response band. */
  readonly points: readonly ResponsePoint[]
  readonly components: readonly ResponseComponent[]
  readonly model: ResponseModel
}

/** The response band's frequencies: evenly spaced on a log axis, lowest first. */
export function responseFrequencies(): number[] {
  const { lowestHz, highestHz, steps } = RESPONSE_BAND
  const ratio = highestHz / lowestHz
  return Array.from(
    { length: steps + 1 },
    (_, i) => lowestHz * ratio ** (i / steps),
  )
}

/**
 * The estimated response at the MLP from subwoofers at `sources`,
 * level-matched to `target` (which gives the frequencies).
 */
export function estimateResponse({
  room,
  mlp,
  sources,
  target,
}: {
  room: Room
  mlp: RoomPoint
  sources: readonly RoomPoint[]
  target: readonly TargetPoint[]
}): EstimatedResponse {
  const frequencies = target.map((point) => point.frequency)
  const modes = roomModes(
    room,
    RESPONSE_BAND.highestHz * MODE_SUM_HEADROOM.factor,
  )
  const bandwidth = modalBandwidth()
  const transfers = sources.map((source) =>
    roomModeTransfer({
      room,
      modes,
      source,
      receiver: mlp,
      frequencies,
      bandwidth,
    }),
  )
  const summed = frequencies.map((_, i) =>
    transfers.reduce<Complex>(
      (sum, transfer) => add(sum, transfer[i] ?? ZERO),
      ZERO,
    ),
  )
  const levels = summed.map(decibels)
  const offset =
    levels.reduce((total, level, i) => total + level - target[i]!.level, 0) /
    levels.length
  return {
    points: frequencies.map((frequency, i) => ({
      frequency,
      level: levels[i]! - offset,
    })),
    components: ['room-modes'],
    model: {
      speedOfSound: SPEED_OF_SOUND.metersPerSecond,
      reverberationTime: LOW_FREQUENCY_REVERBERATION_TIME.seconds,
      modalBandwidth: bandwidth,
    },
  }
}
