/**
 * The estimated response at the MLP (GLOSSARY.md): a simplified model of
 * what the room does to the bass and low midrange at a listening position,
 * never a measurement.
 *
 * ## How it is built
 *
 * 1. `prepareRoomResponse` works out, once per room, subwoofer set,
 *    crossover and frequency list, everything that doesn't depend on the
 *    listening position: the subwoofers' room modes (room-modes.ts), each
 *    subwoofer filtered by its enclosure roll-off (enclosure.ts), up to
 *    ROOM_MODE_BAND; and the crossover's filters (crossover.ts). The seat
 *    score (#14) reuses it across a grid of candidate positions.
 * 2. `estimateResponse` hears it at one position:
 *    - the subwoofers summed coherently (one bass-managed channel drives
 *      them all, in phase and at the same level), flat above
 *      ROOM_MODE_BAND;
 *    - the Speakers given (the Left and Right pair, from analyze.ts), each
 *      with its boundary interference (boundary-interference.ts), power
 *      averaged;
 *    - the two parts each set to 0 dB over their own pass band and added
 *      through the crossover (SUBWOOFER_SPEAKER_SUM in reference.ts).
 * 3. `levelMatched` shifts that level so its average deviation from the
 *    target curve is 0 dB (the model has no absolute level), over the rows
 *    at or above the lowest mode the subwoofers excite. Below it the model
 *    has no room gain and only other modes' tails, so those rows are kept
 *    but marked unreliable.
 */
import {
  boundaryInterference,
  boundaryReflections,
  type BoundaryReflection,
  type BoundarySource,
} from './boundary-interference'
import { add, decibels, magnitude, scale, type Complex } from './complex'
import { crossoverHighPass, crossoverLowPass } from './crossover'
import { enclosureRollOff } from './enclosure'
import {
  BOUNDARY_INTERFERENCE,
  LOW_FREQUENCY_REVERBERATION_TIME,
  RESPONSE_BAND,
  ROOM_MODE_BAND,
  SPEED_OF_SOUND,
} from './reference'
import {
  modalBandwidth,
  modeShapeAt,
  prepareModalResponse,
  type ModalResponse,
  type RoomMode,
} from './room-modes'
import type { Room, RoomPoint } from './room'
import type { Enclosure } from './speaker-specs'
import type { TargetPoint } from './target-curve'

/** The effects the estimate includes. */
export type ResponseComponent =
  'room-modes' | 'enclosure' | 'crossover' | 'boundary-interference'

const COMPONENTS = [
  'room-modes',
  'enclosure',
  'crossover',
  'boundary-interference',
] as const satisfies readonly ResponseComponent[]

/** The modelling assumptions an estimate was made with (src/domain/reference.ts). */
export type ResponseModel = {
  /** In m/s. */
  readonly speedOfSound: number
  /** The low-frequency reverberation time assumed for every mode, in s. */
  readonly reverberationTime: number
  /** Every mode's half-power bandwidth that follows from it, in Hz. */
  readonly modalBandwidth: number
  /** The highest frequency the room modes are worked out at, in Hz. */
  readonly roomModesUpTo: number
  /** The crossover between the Speakers and the Subwoofers, in Hz. */
  readonly crossoverHz: number
  /** The reflection coefficient of every surface. */
  readonly reflectionCoefficient: number
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

/** A room mode up to ROOM_MODE_BAND, as the subwoofers and the receiver meet it. */
export type HeardMode = {
  readonly mode: RoomMode
  /** Whether the subwoofers excite it (false: they cancel it). */
  readonly excited: boolean
  /** Its relative pressure at the receiver: ±1 at an antinode, 0 at a node. */
  readonly atReceiver: number
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
  /** The room modes up to ROOM_MODE_BAND, lowest first. */
  readonly roomModes: readonly HeardMode[]
  /** Per Speaker given, in order: its reflections heard at the receiver. */
  readonly reflections: readonly (readonly BoundaryReflection[])[]
}

/**
 * Frequencies evenly spaced on a log axis, lowest first: by default the
 * response band (20 Hz to about 500 Hz, 225 points).
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

/** A subwoofer as far as the estimate goes. */
export type ResponseSubwoofer = {
  readonly position: RoomPoint
  readonly enclosure: Enclosure
}

/** A room response worked out once, to hear at any listening position. */
export type PreparedRoomResponse = {
  readonly room: Room
  readonly frequencies: readonly number[]
  /** The subwoofers' room modes, at the first `modal.frequencyCount` frequencies. */
  readonly modal: ModalResponse & { readonly frequencyCount: number }
  /** The crossover's filters at each frequency. */
  readonly lowPass: readonly Complex[]
  readonly highPass: readonly Complex[]
  readonly model: ResponseModel
}

/** Frequencies within this factor of ROOM_MODE_BAND count as inside it (rounding). */
const ROUNDING = 1 + 1e-9

/** Prepare the subwoofers' response in `room` at `frequencies`. */
export function prepareRoomResponse({
  room,
  subwoofers,
  crossoverHz,
  frequencies,
}: {
  room: Room
  subwoofers: readonly ResponseSubwoofer[]
  crossoverHz: number
  frequencies: readonly number[]
}): PreparedRoomResponse {
  const bandwidth = modalBandwidth()
  const modalFrequencies = frequencies.filter(
    (f) => f <= ROOM_MODE_BAND.highestHz * ROUNDING,
  )
  const modal = prepareModalResponse({
    room,
    sources: subwoofers.map(({ position }) => position),
    sourceFilters: subwoofers.map(({ enclosure }) =>
      modalFrequencies.map((f) => enclosureRollOff(enclosure, f)),
    ),
    frequencies: modalFrequencies,
    bandwidth,
  })
  return {
    room,
    frequencies,
    modal: { ...modal, frequencyCount: modalFrequencies.length },
    lowPass: frequencies.map((f) => crossoverLowPass(f, crossoverHz)),
    highPass: frequencies.map((f) => crossoverHighPass(f, crossoverHz)),
    model: {
      speedOfSound: SPEED_OF_SOUND.metersPerSecond,
      reverberationTime: LOW_FREQUENCY_REVERBERATION_TIME.seconds,
      modalBandwidth: bandwidth,
      roomModesUpTo: ROOM_MODE_BAND.highestHz,
      crossoverHz,
      reflectionCoefficient: BOUNDARY_INTERFERENCE.reflectionCoefficient,
    },
  }
}

/**
 * The estimated response at `receiver` with `speakers` as the Speakers'
 * part, against `target` (at the prepared frequencies).
 */
export function estimateResponse(
  prepared: PreparedRoomResponse,
  {
    receiver,
    speakers,
  }: { receiver: RoomPoint; speakers: readonly BoundarySource[] },
  target: readonly TargetPoint[],
): EstimatedResponse {
  const { room, frequencies, modal, lowPass, highPass, model } = prepared
  const reliableFrom = modal.lowestExcitedMode?.frequency
  const isReliable = (frequency: number) =>
    reliableFrom === undefined || frequency >= reliableFrom

  const reflections = speakers.map((speaker) =>
    boundaryReflections(room, speaker, receiver),
  )
  const subwooferLevels = calibrated(
    subwooferPart(modal.pressureAt(receiver), frequencies.length),
    frequencies.map(
      (f, i) =>
        i < modal.frequencyCount && isReliable(f) && f <= model.crossoverHz,
    ),
    frequencies.map((f, i) => i < modal.frequencyCount && isReliable(f)),
  )
  const speakerLevels = calibrated(
    speakerPart(reflections, frequencies),
    frequencies.map((f) => f >= model.crossoverHz),
  )
  const levels = frequencies.map((_, i) =>
    decibels(
      add(
        scale(10 ** (subwooferLevels[i]! / 20), lowPass[i]!),
        scale(10 ** (speakerLevels[i]! / 20), highPass[i]!),
      ),
    ),
  )

  return {
    rows: levelMatched(
      frequencies.map((frequency, i) => ({
        frequency,
        level: levels[i] ?? -Infinity,
        target: target[i] ?? { frequency, level: 0, low: 0, high: 0 },
        reliable: isReliable(frequency),
      })),
    ),
    reliableFrom,
    components: COMPONENTS,
    model,
    roomModes: modal.modes.flatMap((mode, n) =>
      mode.frequency <= model.roomModesUpTo
        ? [
            {
              mode,
              excited: modal.excited[n] ?? false,
              atReceiver: modeShapeAt(room, mode.indices, receiver),
            },
          ]
        : [],
    ),
    reflections,
  }
}

/**
 * The subwoofers' level in dB at each frequency: the modal sum where it is
 * worked out, then flat (0 dB before calibration) above ROOM_MODE_BAND.
 */
function subwooferPart(pressures: readonly Complex[], count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const pressure = pressures[i]
    return pressure ? decibels(pressure) : Number.NaN
  })
}

/**
 * The Speakers' level in dB at each frequency: their boundary interference
 * power averaged (0 dB, the direct sound alone, without Speakers).
 */
function speakerPart(
  reflections: readonly (readonly BoundaryReflection[])[],
  frequencies: readonly number[],
): number[] {
  if (reflections.length === 0) return frequencies.map(() => 0)
  const perSpeaker = reflections.map((own) =>
    boundaryInterference(own, frequencies),
  )
  return frequencies.map((_, i) => {
    const power =
      perSpeaker.reduce(
        (sum, pressures) => sum + magnitude(pressures[i]!) ** 2,
        0,
      ) / perSpeaker.length
    return 10 * Math.log10(power)
  })
}

/**
 * Levels shifted so their average over the rows `over` picks (else over
 * `fallback`'s rows, else over every row worked out) is 0 dB; a row not
 * worked out (NaN, above the room-mode band) becomes 0 dB.
 */
function calibrated(
  levels: readonly number[],
  over: readonly boolean[],
  fallback: readonly boolean[] = over,
): number[] {
  const pick = (mask: readonly boolean[]) =>
    levels.filter((level, i) => mask[i] && Number.isFinite(level))
  const chosen = [
    pick(over),
    pick(fallback),
    pick(levels.map(() => true)),
  ].find((values) => values.length > 0)
  const offset = chosen
    ? chosen.reduce((sum, level) => sum + level, 0) / chosen.length
    : 0
  return levels.map((level) => (Number.isNaN(level) ? 0 : level - offset))
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
