/**
 * The estimated response (GLOSSARY.md): a simplified model of what the room
 * does to the bass and low midrange at a listening position, never a
 * measurement.
 *
 * Its interface is one heard room, `hearRoom(config, placements)`, which
 * both the analysis at the MLP (analyze.ts) and the seat score
 * (seat-score.ts) use. It is the one home of the response's frequencies,
 * the target curve they are compared against, and which rows are reliable.
 *
 * ## How it is built
 *
 * 1. `hearRoom` prepares, once per room, subwoofer set and crossover,
 *    everything that doesn't depend on the listening position: the
 *    subwoofers' room modes (room-modes.ts), each subwoofer filtered by its
 *    enclosure roll-off (enclosure.ts), up to ROOM_MODE_BAND; and the
 *    crossover's LR4 filters (filters.ts). It remembers its last
 *    preparation, so moving only the MLP reuses it.
 * 2. `hear` takes one listening position and works out two parts, the
 *    costly step (the modal sum at the position):
 *    - the subwoofers summed coherently (one bass-managed channel drives
 *      them all, in phase and at the same level), flat above
 *      ROOM_MODE_BAND;
 *    - the charted Speakers (Left, Center and Right, listening.ts), each
 *      with its boundary interference (boundary-interference.ts), power
 *      averaged.
 * 3. A `ResponseCalibration` sets each part's level and then the overall
 *    level (SUBWOOFER_SPEAKER_SUM in reference.ts): each part to 0 dB over
 *    its own pass band, the parts added through the crossover, and the sum
 *    shifted so its average deviation from the target is 0 dB over the
 *    reliable rows (the model has no absolute level). `calibrateAt` works
 *    it out at a heard position, like a receiver's calibration at the MLP.
 *    The chart (`estimateAt`) calibrates at the MLP itself; the seat score
 *    keeps one calibration for every candidate seat (`deviationsAt`), so a
 *    seat with weaker bass than the MLP shows it.
 *
 * Rows below the lowest mode the subwoofers excite are kept but marked
 * unreliable: there the model has no room gain and only other modes'
 * tails.
 *
 * A Channel response (channel-response.ts) hears the same room with one
 * channel playing: `hear` with one speaker's levels as the Speakers' part,
 * or, for one subwoofer, a heard room of that subwoofer alone and
 * `estimateSubwoofersAt`, calibrated the same way over its own rows.
 */
import { add, decibels, scale, type Complex } from './complex'
import type { Config } from './config'
import { enclosureRollOff } from './enclosure'
import { linkwitzRiley4 } from './filters'
import { subwooferSpecsOf } from './listening'
import type { Placements } from './placements'
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
import { targetCurve, type TargetPoint } from './target-curve'

/** The effects the estimate includes. */
export type ResponseComponent =
  'room-modes' | 'enclosure' | 'crossover' | 'boundary-interference'

const COMPONENTS = [
  'room-modes',
  'enclosure',
  'crossover',
  'boundary-interference',
] as const satisfies readonly ResponseComponent[]

/** The effects the subwoofers' part alone includes: no Speaker, no boundary interference. */
const SUBWOOFER_COMPONENTS = [
  'room-modes',
  'enclosure',
  'crossover',
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
  /** The estimated level, calibrated (see `ResponseCalibration`). */
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
  /** The calibration the rows were made with. */
  readonly calibration: ResponseCalibration
  /** The room modes up to ROOM_MODE_BAND, lowest first. */
  readonly roomModes: readonly HeardMode[]
}

/**
 * The offsets, in dB, that set the estimate's levels: subtracted from the
 * subwoofers' part, from the Speakers' part, and from their sum. The
 * subwoofers' part alone (`estimateSubwoofersAt`) has no Speakers' part:
 * its `speakersDb` is 0.
 */
export type ResponseCalibration = {
  readonly subwooferDb: number
  readonly speakersDb: number
  readonly levelDb: number
}

/** A listening position and what the charted Speakers do there. */
export type Listening = {
  readonly receiver: RoomPoint
  /**
   * Per charted Speaker (`isCharted`, listening.ts), its boundary
   * interference level in dB at each of the heard room's `frequencies`
   * (`hearSpeaker`); none means flat.
   */
  readonly speakerLevels: readonly (readonly number[])[]
}

/** A listening position as heard, before any calibration (`HeardRoom.hear`). */
export type HeardSeat = {
  readonly receiver: RoomPoint
  readonly parts: ResponseParts
}

/** A room mode the subwoofers meet, and whether they excite it. */
export type ExcitedMode = {
  readonly mode: RoomMode
  /** False for a mode they cancel. */
  readonly excited: boolean
}

/**
 * A config's room with its subwoofers placed, ready to hear any listening
 * position in. Hearing a position is the costly step (the modal sum);
 * calibrating, estimating and deviations reuse what was heard.
 */
export type HeardRoom = {
  /**
   * The frequencies every response is worked out at, lowest first: the
   * response band, 20 Hz to about 500 Hz on a log axis, 225 points.
   */
  readonly frequencies: readonly number[]
  /**
   * Per frequency, whether the estimate is reliable there: from the lowest
   * mode the subwoofers excite up. The same at every listening position.
   */
  readonly reliable: readonly boolean[]
  /** The modes of the modal sum, lowest first. */
  readonly modes: readonly ExcitedMode[]
  /**
   * The index of the room-mode band's frequency nearest `frequency` (on a
   * log scale), or undefined when it lies outside that band's frequencies.
   */
  modeBandRowNearest(frequency: number): number | undefined
  /** Both parts of the response at a listening position. */
  hear(listening: Listening): HeardSeat
  /**
   * The calibration at a heard position: each part 0 dB on average over
   * its own pass band, then the sum 0 dB from the target on average over
   * the reliable rows.
   */
  calibrateAt(seat: HeardSeat): ResponseCalibration
  /**
   * The full estimated response at a heard position, against the config's
   * target curve, calibrated right there, as the chart is at the MLP.
   */
  estimateAt(seat: HeardSeat): EstimatedResponse
  /**
   * How far the estimate at a heard position is from the target at each
   * frequency, in dB, with a fixed `calibration` (usually the MLP's): the
   * light path for a grid of seats.
   */
  deviationsAt(seat: HeardSeat, calibration: ResponseCalibration): number[]
  /**
   * The subwoofers' part alone at a heard position, through the
   * crossover's low-pass, as a receiver plays the subwoofer channel: rows
   * up to the crossover only (its pass band), calibrated there as
   * `estimateAt` is (the subwoofers 0 dB over their pass band, then the
   * rows 0 dB from the target on average over the reliable ones).
   */
  estimateSubwoofersAt(seat: HeardSeat): EstimatedResponse
}

/**
 * The config's room, with its subwoofers where `placements` puts them,
 * ready to hear listening positions in.
 */
export function hearRoom(
  config: Config,
  { subwoofers }: Pick<Placements, 'subwoofers'>,
): HeardRoom {
  const prepared = prepareRoomResponse({
    room: config.room,
    subwoofers: subwoofers.map(({ id, position }) => ({
      position,
      enclosure: subwooferSpecsOf(config, id).enclosure,
    })),
    crossoverHz: config.crossoverHz,
    frequencies: responseFrequencies(),
  })
  const { frequencies, reliable, modalFrequencyCount } = prepared
  const modeBandRows = frequencies.slice(0, modalFrequencyCount)
  const target = targetCurve(config.targetCurve, frequencies)

  function hear(listening: Listening): HeardSeat {
    return {
      receiver: listening.receiver,
      parts: responseParts(prepared, listening),
    }
  }

  function calibrateAt({ parts }: HeardSeat): ResponseCalibration {
    return calibrate(prepared, parts, target)
  }

  function estimateAt(seat: HeardSeat): EstimatedResponse {
    return estimate(prepared, seat, target, calibrateAt(seat))
  }

  function deviationsAt(
    { parts }: HeardSeat,
    calibration: ResponseCalibration,
  ): number[] {
    return summedLevels(prepared, parts, calibration).map(
      (level, i) => level - calibration.levelDb - targetAt(target, i),
    )
  }

  function estimateSubwoofersAt(seat: HeardSeat): EstimatedResponse {
    return estimateSubwoofers(prepared, seat, target)
  }

  return {
    frequencies,
    reliable,
    modes: prepared.modes,
    modeBandRowNearest: (frequency) => nearestRow(modeBandRows, frequency),
    hear,
    calibrateAt,
    estimateAt,
    deviationsAt,
    estimateSubwoofersAt,
  }
}

/**
 * Frequencies evenly spaced on a log axis, lowest first: the response band
 * (20 Hz to about 500 Hz, 225 points).
 */
function responseFrequencies(): number[] {
  const { lowestHz, highestHz, steps } = RESPONSE_BAND
  return Array.from(
    { length: steps + 1 },
    (_, i) => lowestHz * (highestHz / lowestHz) ** (i / steps),
  )
}

/** A subwoofer as far as the estimate goes. */
type ResponseSubwoofer = {
  readonly position: RoomPoint
  readonly enclosure: Enclosure
}

/** What a room response is prepared from: everything but the listening position. */
type RoomResponseInput = {
  readonly room: Room
  readonly subwoofers: readonly ResponseSubwoofer[]
  readonly crossoverHz: number
  readonly frequencies: readonly number[]
}

/** A room response worked out once, to hear at any listening position. */
type PreparedRoomResponse = {
  readonly room: Room
  readonly frequencies: readonly number[]
  /** The subwoofers' room modes, at the first `modalFrequencyCount` frequencies. */
  readonly modal: ModalResponse
  readonly modalFrequencyCount: number
  /** The modal sum's modes, with whether the subwoofers excite each. */
  readonly modes: readonly ExcitedMode[]
  /** The lowest mode the subwoofers excite, in Hz (see EstimatedResponse). */
  readonly reliableFrom: number | undefined
  /** Per frequency, whether it is at or above `reliableFrom`. */
  readonly reliable: readonly boolean[]
  /** The crossover's filters at each frequency. */
  readonly lowPass: readonly Complex[]
  readonly highPass: readonly Complex[]
  readonly model: ResponseModel
}

/** Frequencies this little above ROOM_MODE_BAND still count as inside it (float error). */
const MODE_BAND_TOLERANCE = 1e-9

/**
 * The last few prepared responses, most recent last, by what they were
 * prepared from. A memo of a pure function: the same input always gives
 * the same result, so keeping them changes nothing but speed (dragging the
 * MLP, #9). More than one, so a selected subwoofer's Channel response (its
 * room alone) and the combined response don't evict each other.
 */
const recentlyPrepared: { key: string; prepared: PreparedRoomResponse }[] = []

/** How many prepared responses `recentlyPrepared` keeps. */
const PREPARED_KEPT = 3

/**
 * Prepare the subwoofers' response for `input`, or return one recently
 * prepared from the same input.
 */
function prepareRoomResponse(input: RoomResponseInput): PreparedRoomResponse {
  const key = JSON.stringify(input)
  const index = recentlyPrepared.findIndex((entry) => entry.key === key)
  const entry =
    index >= 0
      ? recentlyPrepared.splice(index, 1)[0]!
      : { key, prepared: prepare(input) }
  recentlyPrepared.push(entry)
  if (recentlyPrepared.length > PREPARED_KEPT) recentlyPrepared.shift()
  return entry.prepared
}

function prepare({
  room,
  subwoofers,
  crossoverHz,
  frequencies,
}: RoomResponseInput): PreparedRoomResponse {
  const bandwidth = modalBandwidth()
  const modalFrequencies = frequencies.filter(
    (f) => f <= ROOM_MODE_BAND.highestHz * (1 + MODE_BAND_TOLERANCE),
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
  const reliableFrom = modal.lowestExcitedMode?.frequency
  return {
    room,
    frequencies,
    modal,
    modalFrequencyCount: modalFrequencies.length,
    modes: modal.modes.map((mode, n) => ({
      mode,
      excited: modal.excited[n] ?? false,
    })),
    reliableFrom,
    reliable: frequencies.map(
      (f) => reliableFrom === undefined || f >= reliableFrom,
    ),
    lowPass: frequencies.map((f) => linkwitzRiley4('low-pass', f, crossoverHz)),
    highPass: frequencies.map((f) =>
      linkwitzRiley4('high-pass', f, crossoverHz),
    ),
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

/** The calibration from the parts heard at a position (`HeardRoom.calibrateAt`). */
function calibrate(
  prepared: PreparedRoomResponse,
  { subwoofers, speakers }: ResponseParts,
  target: readonly TargetPoint[],
): ResponseCalibration {
  const { frequencies, model, reliable } = prepared
  const subwooferDb = subwooferCalibration(prepared, subwoofers)
  const speakersDb = averageOverFirst(frequencies, speakers, [
    (f) => f >= model.crossoverHz,
  ])
  const levels = summedLevels(
    prepared,
    { subwoofers, speakers },
    {
      subwooferDb,
      speakersDb,
    },
  )
  const levelDb = levelCalibration(frequencies, reliable, levels, target)
  return { subwooferDb, speakersDb, levelDb }
}

/**
 * The subwoofers' part's offset: its average over its pass band in the
 * room-mode band (reliable rows up to the crossover), else over the
 * reliable rows of that band, else over the whole band.
 */
function subwooferCalibration(
  { frequencies, modalFrequencyCount, model, reliable }: PreparedRoomResponse,
  subwoofers: readonly number[],
): number {
  const inModeBand = (i: number) => i < modalFrequencyCount
  return averageOverFirst(frequencies, subwoofers, [
    (f, i) => inModeBand(i) && reliable[i]! && f <= model.crossoverHz,
    (_, i) => inModeBand(i) && reliable[i]!,
    (_, i) => inModeBand(i),
  ])
}

/**
 * The overall offset: the levels' average deviation from the target over
 * the reliable rows (all rows if none is).
 */
function levelCalibration(
  frequencies: readonly number[],
  reliable: readonly boolean[],
  levels: readonly number[],
  target: readonly TargetPoint[],
): number {
  const deviations = levels.map((level, i) => level - targetAt(target, i))
  return averageOverFirst(frequencies, deviations, [
    (_, i) => reliable[i]!,
    () => true,
  ])
}

/**
 * The average of the finite `values` picked by the first of `picks` (each
 * by frequency and index) that picks any, or 0 if none does.
 */
function averageOverFirst(
  frequencies: readonly number[],
  values: readonly number[],
  picks: readonly ((f: number, i: number) => boolean)[],
): number {
  for (const pick of picks) {
    const picked = values.filter(
      (value, i) => pick(frequencies[i]!, i) && Number.isFinite(value),
    )
    if (picked.length > 0) {
      return picked.reduce((sum, value) => sum + value, 0) / picked.length
    }
  }
  return 0
}

/** The estimated response at a heard position, with `calibration`. */
function estimate(
  prepared: PreparedRoomResponse,
  { receiver, parts }: HeardSeat,
  target: readonly TargetPoint[],
  calibration: ResponseCalibration,
): EstimatedResponse {
  return responseOf(
    prepared,
    receiver,
    summedLevels(prepared, parts, calibration),
    target,
    calibration,
    COMPONENTS,
  )
}

/**
 * The subwoofers' part alone at a heard position, through the low-pass,
 * up to the crossover (`HeardRoom.estimateSubwoofersAt`).
 */
function estimateSubwoofers(
  prepared: PreparedRoomResponse,
  { receiver, parts }: HeardSeat,
  target: readonly TargetPoint[],
): EstimatedResponse {
  const { frequencies, lowPass, model, reliable } = prepared
  const subwooferDb = subwooferCalibration(prepared, parts.subwoofers)
  const passBand = frequencies.filter(
    (f) => f <= model.crossoverHz * (1 + MODE_BAND_TOLERANCE),
  )
  const levels = passBand.map((_, i) => {
    const raw = parts.subwoofers[i]!
    const level = Number.isNaN(raw) ? 0 : raw - subwooferDb
    return decibels(scale(10 ** (level / 20), lowPass[i]!))
  })
  const levelDb = levelCalibration(passBand, reliable, levels, target)
  return responseOf(
    prepared,
    receiver,
    levels,
    target,
    { subwooferDb, speakersDb: 0, levelDb },
    SUBWOOFER_COMPONENTS,
  )
}

/**
 * The response at `receiver` from calibrated `levels` (one per frequency,
 * from the lowest, as many rows as levels), less the overall offset.
 */
function responseOf(
  prepared: PreparedRoomResponse,
  receiver: RoomPoint,
  levels: readonly number[],
  target: readonly TargetPoint[],
  calibration: ResponseCalibration,
  components: readonly ResponseComponent[],
): EstimatedResponse {
  const { room, frequencies, modal, model, reliableFrom, reliable } = prepared
  return {
    rows: levels.map((estimated, i) => {
      const frequency = frequencies[i]!
      const { level, low, high } = target[i] ?? NO_TARGET
      return {
        frequency,
        estimated: estimated - calibration.levelDb,
        target: level,
        low,
        high,
        reliable: reliable[i]!,
      }
    }),
    reliableFrom,
    components,
    model,
    calibration,
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
  }
}

const NO_TARGET = { level: 0, low: 0, high: 0 } as const

function targetAt(target: readonly TargetPoint[], i: number): number {
  return target[i]?.level ?? 0
}

/** Each part's level in dB per frequency, before calibration. */
type ResponseParts = {
  /** The subwoofers' modal sum; NaN above the room-mode band. */
  readonly subwoofers: readonly number[]
  /** The charted Speakers' interference, power averaged. */
  readonly speakers: readonly number[]
}

/**
 * The two parts at a listening position, before calibration: the costly
 * step (the modal sum), which doesn't depend on the calibration.
 */
function responseParts(
  { modal, frequencies }: PreparedRoomResponse,
  { receiver, speakerLevels }: Listening,
): ResponseParts {
  const pressures = modal.pressureAt(receiver)
  return {
    subwoofers: frequencies.map((_, i) => {
      const pressure = pressures[i]
      return pressure ? decibels(pressure) : Number.NaN
    }),
    speakers: frequencies.map((_, i) => {
      if (speakerLevels.length === 0) return 0
      const power =
        speakerLevels.reduce(
          (sum, levels) => sum + 10 ** ((levels[i] ?? 0) / 10),
          0,
        ) / speakerLevels.length
      return 10 * Math.log10(power)
    }),
  }
}

/**
 * The two parts, each shifted by its calibration offset, added through the
 * crossover, in dB. Above the room-mode band the subwoofers count as flat
 * at their calibrated level (0 dB).
 */
function summedLevels(
  { lowPass, highPass }: PreparedRoomResponse,
  { subwoofers, speakers }: ResponseParts,
  {
    subwooferDb,
    speakersDb,
  }: Pick<ResponseCalibration, 'subwooferDb' | 'speakersDb'>,
): number[] {
  return subwoofers.map((raw, i) => {
    const subwooferLevel = Number.isNaN(raw) ? 0 : raw - subwooferDb
    const speakerLevel = speakers[i]! - speakersDb
    return decibels(
      add(
        scale(10 ** (subwooferLevel / 20), lowPass[i]!),
        scale(10 ** (speakerLevel / 20), highPass[i]!),
      ),
    )
  })
}

/**
 * The index of the row nearest `frequency` (on a log scale), or undefined
 * when it lies outside the rows.
 */
function nearestRow(
  rows: readonly number[],
  frequency: number,
): number | undefined {
  const first = rows[0]
  const last = rows.at(-1)
  if (first === undefined || last === undefined) return undefined
  if (frequency < first || frequency > last) return undefined
  const distance = (i: number) => Math.abs(Math.log(rows[i]! / frequency))
  return rows.reduce(
    (nearest, _, i) => (distance(i) < distance(nearest) ? i : nearest),
    0,
  )
}
