import type { Config } from './config'
import { CHANNELS, type ChannelId } from './dolby-layouts'
import { summarizeLayout, type LayoutSummary } from './layout'
import type { Placement } from './manual-positions'
import {
  checkPlacementRange,
  type PlacementRangeCheck,
} from './placement-range'
import { aimAtMlp, type Aim } from './placement'
import { placeAll } from './placements'
import { azimuthFromMlp, type RoomPoint, type Wall } from './room'
import { estimateHeadroom, type HeadroomAnalysis } from './headroom'
import {
  SPEAKER_GROUP_OF,
  speakerGroupsIn,
  wooferPosition,
  type SubwooferSpecs,
} from './speaker-specs'
import { SUBWOOFERS, type SubwooferId } from './subwoofer-arrangements'
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

/** A listener-level speaker of the layout, placed and checked. */
export type PlacedSpeaker = {
  readonly channel: ChannelId
  /** Dolby's name for the channel, for example "Left Surround". */
  readonly name: string
  /** Where the speaker is, in room coordinates (its acoustic center). */
  readonly position: RoomPoint
  /**
   * Where its woofer is: below the acoustic center by its speaker group's
   * type (bookshelf or tower). Boundary interference starts from here.
   */
  readonly woofer: RoomPoint
  /** Auto-placed, or left by the user where it is. */
  readonly placement: Placement
  /** Which way it faces: at the MLP. */
  readonly aim: Aim
  /** Its angle from the MLP, graded against Dolby's placement range. */
  readonly placementRange: PlacementRangeCheck
}

/**
 * A subwoofer of the layout, auto-placed in the cited multi-subwoofer
 * arrangement or left by the user where it is. Dolby gives subwoofers no placement range, so it is not
 * graded.
 */
export type PlacedSubwoofer = {
  /** Its short id, for example "Sub2". */
  readonly id: SubwooferId
  /** For example "Subwoofer 2". */
  readonly name: string
  /** Where it is, in room coordinates (its acoustic center). */
  readonly position: RoomPoint
  /** Auto-placed, or left by the user where it is. */
  readonly placement: Placement
  /** The wall it stands against (for a manual one, the nearest wall). */
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
  /** Whether the MLP is auto-placed or left by the user where it is. */
  mlpPlacement: Placement
  /** The layout's listener-level speakers, in Dolby's channel order. */
  speakers: readonly PlacedSpeaker[]
  /** The layout's subwoofers, Subwoofer 1 first. */
  subwoofers: readonly PlacedSubwoofer[]
  /** The estimated response at the MLP against the target curve. */
  response: ResponseAnalysis
  /** Whether the Speakers and Subwoofers can reach reference level at the MLP. */
  headroom: HeadroomAnalysis
}

/**
 * The channels whose Speakers make up the chart's Speakers' part: the
 * front three, which every listener-level layout but 2.1 has all of. The
 * Center usually sits nearest the front wall.
 */
const CHARTED_CHANNELS = ['L', 'C', 'R'] as const satisfies readonly ChannelId[]

/** The domain entry point: derive the room plan from a config. */
export function analyzeRoom(config: Config): RoomAnalysis {
  const {
    room,
    layout,
    speakerGroups,
    targetCurve: targetCurveKind,
    crossoverHz,
    amplifierWatts,
  } = config
  // The one place positions come from: manual where the user put an item,
  // else auto-placed (placements.ts). Everything below follows from them.
  const placements = placeAll(config)
  const mlp = placements.mlp.position
  const frequencies = responseFrequencies()

  // Each speaker faces the current MLP; its reflections follow from that
  // aim and are worked out once, for both the estimate and the notes.
  const heardSpeakers = placements.speakers.map(
    ({ reference, position, placement }) => {
      const aim = aimAtMlp(position, mlp)
      const { specs } = speakerGroups[SPEAKER_GROUP_OF[reference.channel]]
      // Overheads have no type: their woofer is taken at their position.
      const woofer =
        'type' in specs ? wooferPosition(position, specs.type) : position
      // Below about 500 Hz the woofer is what reflects off the surfaces.
      const reflections = boundaryReflections(
        room,
        { position: woofer, aim },
        mlp,
      )
      const speaker: PlacedSpeaker = {
        channel: reference.channel,
        name: CHANNELS[reference.channel].name,
        position,
        woofer,
        placement,
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
    },
  )

  const { specs: groupSpecs, ownSpecs } = speakerGroups.subwoofers
  const subwoofers = placements.subwoofers.map(
    ({ id, position, placement, wall }): PlacedSubwoofer => ({
      id,
      name: SUBWOOFERS[id].name,
      position,
      placement,
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
  const layoutSummary = summarizeLayout(layout)
  const headroom = estimateHeadroom({
    mlp,
    speakerGroups,
    amplifierWatts,
    speakers: heardSpeakers.map(({ speaker }) => speaker),
    groups: speakerGroupsIn(layout),
    subwoofers,
  })
  return {
    layout: layoutSummary,
    mlp,
    mlpPlacement: placements.mlp.placement,
    speakers: heardSpeakers.map(({ speaker }) => speaker),
    subwoofers,
    response: {
      estimated,
      targetCurve: targetCurveKind,
      summary,
      tableRows: responseTable(estimated.rows),
      notes,
    },
    headroom,
  }
}
