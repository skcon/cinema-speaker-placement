/**
 * What the estimated response needs from a config at one listening
 * position, shared by the analysis at the MLP (analyze.ts) and the seat
 * score at candidate seats (seat-score.ts), so both prepare the same room
 * response (and so reuse it, see prepareRoomResponse).
 */
import type { Config } from './config'
import type { ChannelId } from './dolby-layouts'
import {
  prepareRoomResponse,
  type PreparedRoomResponse,
} from './estimated-response'
import { aimAtMlp, type Aim } from './placement'
import type { Placements } from './placements'
import type { RoomPoint } from './room'
import {
  boundaryReflections,
  interferenceLevels,
  type BoundaryReflection,
} from './boundary-interference'
import {
  SPEAKER_GROUP_OF,
  wooferPosition,
  type SpeakerChannelId,
  type SubwooferSpecs,
} from './speaker-specs'
import type { SubwooferId } from './subwoofer-arrangements'

/**
 * The channels whose Speakers make up the chart's Speakers' part: the
 * front three, which every listener-level layout but 2.1 has all of. The
 * Center usually sits nearest the front wall.
 */
const CHARTED_CHANNELS = ['L', 'C', 'R'] as const satisfies readonly ChannelId[]

/** Whether a channel's Speaker is part of the chart's Speakers' part. */
export function isCharted(channel: ChannelId): boolean {
  return CHARTED_CHANNELS.some((c) => c === channel)
}

/** The specs subwoofer `id` is modelled with: its own, or the group's. */
export function subwooferSpecsOf(
  { speakerGroups }: Config,
  id: SubwooferId,
): SubwooferSpecs {
  const { specs, ownSpecs } = speakerGroups.subwoofers
  return ownSpecs[id] ?? specs
}

/** The subwoofers' room response for the config with its subwoofers where `placements` puts them. */
export function prepareConfigResponse(
  config: Config,
  { subwoofers }: Pick<Placements, 'subwoofers'>,
  frequencies: readonly number[],
): PreparedRoomResponse {
  return prepareRoomResponse({
    room: config.room,
    subwoofers: subwoofers.map(({ id, position }) => ({
      position,
      enclosure: subwooferSpecsOf(config, id).enclosure,
    })),
    crossoverHz: config.crossoverHz,
    frequencies,
  })
}

/**
 * Where channel `channel`'s Speaker at `position` has its woofer: below it
 * by its speaker group's type (bookshelf or tower). A group without a type
 * (the overheads) has it at the speaker's position.
 */
export function wooferOf(
  { speakerGroups }: Config,
  channel: SpeakerChannelId,
  position: RoomPoint,
): RoomPoint {
  const { specs } = speakerGroups[SPEAKER_GROUP_OF[channel]]
  return 'type' in specs ? wooferPosition(position, specs.type) : position
}

/** A Speaker as heard at a listening position. */
export type HeardSpeaker = {
  /** It faces the listening position. */
  readonly aim: Aim
  /** Where its woofer is, which its reflections start from. */
  readonly woofer: RoomPoint
  readonly reflections: readonly BoundaryReflection[]
  /** Its boundary interference in dB at each frequency. */
  readonly levels: readonly number[]
}

/**
 * Channel `channel`'s Speaker at `position` (its acoustic center), aimed
 * at and heard at `listener`. Below about 500 Hz the woofer is what
 * reflects off the surfaces, so the reflections start from it.
 */
export function hearSpeaker(
  config: Config,
  { channel, position }: { channel: SpeakerChannelId; position: RoomPoint },
  listener: RoomPoint,
  frequencies: readonly number[],
): HeardSpeaker {
  const aim = aimAtMlp(position, listener)
  const woofer = wooferOf(config, channel, position)
  const reflections = boundaryReflections(
    config.room,
    { position: woofer, aim },
    listener,
  )
  return {
    aim,
    woofer,
    reflections,
    levels: interferenceLevels(reflections, frequencies),
  }
}
