/**
 * The estimated response at the MLP (GLOSSARY.md): a simplified model of
 * what the room does to the subwoofers' sound at a listening position,
 * never a measurement.
 *
 * ## How it is built
 *
 * 1. `prepareRoomResponse` works out, once per room, subwoofer set and
 *    frequency list, everything that doesn't depend on the listening
 *    position (room-modes.ts). The seat score (#14) reuses it across a
 *    grid of candidate positions.
 * 2. `estimateResponse` hears it at one position: the subwoofers summed
 *    coherently (one bass-managed channel drives them all, in phase and at
 *    the same level), as a level in dB per frequency.
 * 3. `levelMatched` shifts that level so its average deviation from the
 *    target curve is 0 dB (the model has no absolute level), over the rows
 *    at or above the lowest mode the subwoofers excite. Below it the model
 *    has no room gain and only other modes' tails, so those rows are kept
 *    but marked unreliable.
 *
 * #12 adds contributors (`ResponseComponent`): per-subwoofer enclosure
 * roll-off and the crossover inside step 1, boundary interference for
 * listener-level speakers summed in step 2, all before step 3.
 */
import { decibels } from './complex'
import {
  LOW_FREQUENCY_REVERBERATION_TIME,
  RESPONSE_BAND,
  SPEED_OF_SOUND,
} from './reference'
import {
  modalBandwidth,
  prepareModalResponse,
  type ModalResponse,
} from './room-modes'
import type { Room, RoomPoint } from './room'
import type { TargetPoint } from './target-curve'

/**
 * The effects the estimate includes: the hook for #12, which adds
 * 'enclosure', 'crossover' and 'boundary-interference'.
 */
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

/** The estimate and the target at one frequency, levels in dB. */
export type ResponseRow = {
  readonly frequency: number
  /** The estimated level, matched to the target (see `levelMatched`). */
  readonly estimated: number
  /** The target curve's level, and its tolerance band. */
  readonly target: number
  readonly low: number
  readonly high: number
  /** False below the lowest mode the subwoofers excite. */
  readonly reliable: boolean
}

export type EstimatedResponse = {
  /** One row per frequency, lowest first. */
  readonly rows: readonly ResponseRow[]
  /**
   * The lowest mode the subwoofers excite, in Hz: rows below it are not
   * reliable. Undefined if they excite no mode in reach.
   */
  readonly reliableFrom: number | undefined
  readonly components: readonly ResponseComponent[]
  readonly model: ResponseModel
}

/**
 * Frequencies evenly spaced on a log axis, lowest first: by default the
 * response band (20-200 Hz, 161 points).
 */
export function responseFrequencies({
  lowestHz,
  highestHz,
  steps,
}: {
  lowestHz: number
  highestHz: number
  steps: number
} = RESPONSE_BAND): number[] {
  return Array.from(
    { length: steps + 1 },
    (_, i) => lowestHz * (highestHz / lowestHz) ** (i / steps),
  )
}

/** A room response worked out once, to hear at any listening position. */
export type PreparedRoomResponse = {
  readonly frequencies: readonly number[]
  readonly modal: ModalResponse
  readonly model: ResponseModel
}

/** Prepare the subwoofers' response in `room` at `frequencies`. */
export function prepareRoomResponse({
  room,
  sources,
  frequencies,
}: {
  room: Room
  /** The subwoofers' positions. */
  sources: readonly RoomPoint[]
  frequencies: readonly number[]
}): PreparedRoomResponse {
  const bandwidth = modalBandwidth()
  return {
    frequencies,
    modal: prepareModalResponse({ room, sources, frequencies, bandwidth }),
    model: {
      speedOfSound: SPEED_OF_SOUND.metersPerSecond,
      reverberationTime: LOW_FREQUENCY_REVERBERATION_TIME.seconds,
      modalBandwidth: bandwidth,
    },
  }
}

/**
 * The estimated response at `receiver`, against `target` (at the prepared
 * frequencies).
 */
export function estimateResponse(
  { frequencies, modal, model }: PreparedRoomResponse,
  receiver: RoomPoint,
  target: readonly TargetPoint[],
): EstimatedResponse {
  // #12: other contributors' pressures are summed with this one here.
  const levels = modal.pressureAt(receiver).map(decibels)
  const reliableFrom = modal.lowestExcitedMode?.frequency
  return {
    rows: levelMatched(
      frequencies.map((frequency, i) => ({
        frequency,
        level: levels[i] ?? -Infinity,
        target: target[i] ?? { frequency, level: 0, low: 0, high: 0 },
        reliable: reliableFrom === undefined || frequency >= reliableFrom,
      })),
    ),
    reliableFrom,
    components: ['room-modes'],
    model,
  }
}

/**
 * The one place the estimate's level is set: shifted so its average
 * deviation from the target is 0 dB over the reliable rows (all rows if
 * none is), like setting the subwoofer level to the target. The model has
 * no absolute level, so nothing else fixes it.
 */
function levelMatched(
  rows: readonly {
    frequency: number
    level: number
    target: TargetPoint
    reliable: boolean
  }[],
): ResponseRow[] {
  const reliable = rows.filter((row) => row.reliable)
  const matchedOver = reliable.length > 0 ? reliable : rows
  const offset =
    matchedOver.reduce((sum, row) => sum + row.level - row.target.level, 0) /
    matchedOver.length
  return rows.map(({ frequency, level, target, reliable }) => ({
    frequency,
    estimated: level - offset,
    target: target.level,
    low: target.low,
    high: target.high,
    reliable,
  }))
}
