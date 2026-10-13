import type { Config } from './config'
import {
  CHANNELS,
  DOLBY_LAYOUTS,
  type ChannelId,
  type ChannelReference,
} from './dolby-layouts'
import { summarizeLayout, type LayoutSummary } from './layout'
import { defaultMlp } from './mlp'
import {
  checkPlacementRange,
  type PlacementRangeCheck,
} from './placement-range'
import { aimAtMlp, autoPlaceSpeaker, type Aim } from './placement'
import { azimuthFromMlp, type RoomPoint, type Wall } from './room'
import type { SubwooferSpecs } from './speaker-specs'
import { SUBWOOFERS, type SubwooferId } from './subwoofer-arrangements'
import { autoPlaceSubwoofers } from './subwoofer-placement'
import {
  estimateResponse,
  prepareRoomResponse,
  responseFrequencies,
  type EstimatedResponse,
  type ResponseRow,
} from './estimated-response'
import {
  responseTable,
  summarizeResponse,
  type ResponseSummary,
} from './response-summary'
import { targetCurve, type TargetCurveKind } from './target-curve'
import {
  boundaryReflections,
  interferenceLevels,
} from './boundary-interference'
import { responseNotes, type ResponseNotes } from './response-notes'

/** A listener-level speaker of the layout, auto-placed and checked. */
export type PlacedSpeaker = {
  readonly channel: ChannelId
  /** Dolby's name for the channel, for example "Left Surround". */
  readonly name: string
  /** Where the speaker is, in room coordinates (its acoustic center). */
  readonly position: RoomPoint
  /** Which way it faces: at the MLP. */
  readonly aim: Aim
  /** Its angle from the MLP, graded against Dolby's placement range. */
  readonly placementRange: PlacementRangeCheck
}

/**
 * A subwoofer of the layout, auto-placed in the cited multi-subwoofer
 * arrangement. Dolby gives subwoofers no placement range, so it is not
 * graded.
 */
export type PlacedSubwoofer = {
  /** Its short id, for example "Sub2". */
  readonly id: SubwooferId
  /** For example "Subwoofer 2". */
  readonly name: string
  /** Where it is, in room coordinates (its acoustic center). */
  readonly position: RoomPoint
  /** The wall it stands against. */
  readonly wall: Wall
  /**
   * The specs it is modelled with: its own specs, or the Subwoofers
   * group's. Resolved here for the acoustic estimates of #11-#13, which
   * need each subwoofer's enclosure, driver size and power.
   */
  readonly specs: SubwooferSpecs
}

/** The estimated response at the MLP and the target curve it is compared against. */
export type ResponseAnalysis = {
  /** Per frequency: the estimate, the target and its band, and reliability. */
  readonly estimated: EstimatedResponse
  /** The config's target curve choice. */
  readonly targetCurve: TargetCurveKind
  /** The reliable rows against the target, in a few numbers. */
  readonly summary: ResponseSummary
  /** The rows at third-octave frequencies, for a table. */
  readonly tableRows: readonly ResponseRow[]
  /** Weaknesses and strengths, each with its likely cause. */
  readonly notes: ResponseNotes
}

/** Everything derived from a config. Later tickets add overheads. */
export type RoomAnalysis = {
  /** The layout's name and channel counts. */
  layout: LayoutSummary
  /** The MLP in room coordinates. */
  mlp: RoomPoint
  /** The layout's listener-level speakers, in Dolby's channel order. */
  speakers: readonly PlacedSpeaker[]
  /** The layout's subwoofers, Subwoofer 1 first. */
  subwoofers: readonly PlacedSubwoofer[]
  /** The estimated response at the MLP against the target curve. */
  response: ResponseAnalysis
}

/**
 * The channels whose Speakers make up the chart's Speakers' part: the
 * front three, which every listener-level layout but 2.1 has all of. The
 * Center usually sits nearest the front wall.
 */
const CHARTED_CHANNELS = ['L', 'C', 'R'] as const satisfies readonly ChannelId[]

/**
 * Where everything is: the MLP, each listener-level channel's position and
 * each subwoofer's. The one place positions come from, so manual
 * positions (#9) replace auto-placed ones here and everything derived
 * (aims, reflections, the estimate) follows.
 */
function positionsOf({ room, layout }: Config): {
  mlp: RoomPoint
  speakers: { reference: ChannelReference; position: RoomPoint }[]
  subwoofers: ReturnType<typeof autoPlaceSubwoofers>
} {
  const mlp = defaultMlp(room)
  return {
    mlp,
    speakers: DOLBY_LAYOUTS[layout.dolbyLayout].channels.map((reference) => ({
      reference,
      position: autoPlaceSpeaker(room, mlp, reference),
    })),
    subwoofers: autoPlaceSubwoofers(room, layout.subwoofers),
  }
}

/** The domain entry point: derive the room plan from a config. */
export function analyzeRoom(config: Config): RoomAnalysis {
  const {
    room,
    layout,
    speakerGroups,
    targetCurve: targetCurveKind,
    crossoverHz,
  } = config
  const positions = positionsOf(config)
  const { mlp } = positions
  const frequencies = responseFrequencies()

  // Each speaker faces the current MLP; its reflections follow from that
  // aim and are worked out once, for both the estimate and the notes.
  const heardSpeakers = positions.speakers.map(({ reference, position }) => {
    const aim = aimAtMlp(position, mlp)
    const reflections = boundaryReflections(room, { position, aim }, mlp)
    const speaker: PlacedSpeaker = {
      channel: reference.channel,
      name: CHANNELS[reference.channel].name,
      position,
      aim,
      placementRange: checkPlacementRange(
        reference,
        azimuthFromMlp(mlp, position),
      ),
    }
    return {
      speaker,
      charted: CHARTED_CHANNELS.some((c) => c === reference.channel),
      reflections,
      levels: interferenceLevels(reflections, frequencies),
    }
  })

  const { specs: groupSpecs, ownSpecs } = speakerGroups.subwoofers
  const subwoofers = positions.subwoofers.map(
    ({ id, position, wall }): PlacedSubwoofer => ({
      id,
      name: SUBWOOFERS[id].name,
      position,
      wall,
      specs: ownSpecs[id] ?? groupSpecs,
    }),
  )

  const prepared = prepareRoomResponse({
    room,
    subwoofers: subwoofers.map(({ position, specs }) => ({
      position,
      enclosure: specs.enclosure,
    })),
    crossoverHz,
    frequencies,
  })
  const estimated = estimateResponse(
    prepared,
    {
      receiver: mlp,
      speakerLevels: heardSpeakers
        .filter(({ charted }) => charted)
        .map(({ levels }) => levels),
    },
    targetCurve(targetCurveKind, frequencies),
  )
  const summary = summarizeResponse(estimated.rows)
  const notes = responseNotes({
    rows: estimated.rows,
    summary,
    crossoverHz,
    modalBandwidth: estimated.model.modalBandwidth,
    roomModes: estimated.roomModes,
    speakers: heardSpeakers.map(
      ({ speaker, charted, reflections, levels }) => ({
        name: speaker.name,
        charted,
        reflections,
        levels,
      }),
    ),
    enclosures: subwoofers.map(({ specs }) => specs.enclosure),
  })
  return {
    layout: summarizeLayout(layout),
    mlp,
    speakers: heardSpeakers.map(({ speaker }) => speaker),
    subwoofers,
    response: {
      estimated,
      targetCurve: targetCurveKind,
      summary,
      tableRows: responseTable(estimated.rows),
      notes,
    },
  }
}
