import type { Config } from './config'
import { CHANNELS, DOLBY_LAYOUTS, type ChannelId } from './dolby-layouts'
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

/** The domain entry point: derive the room plan from a config. */
export function analyzeRoom({
  room,
  layout,
  speakerGroups,
  targetCurve: targetCurveKind,
}: Config): RoomAnalysis {
  const mlp = defaultMlp(room)
  const { channels } = DOLBY_LAYOUTS[layout.dolbyLayout]
  const speakers = channels.map((reference): PlacedSpeaker => {
    const position = autoPlaceSpeaker(room, mlp, reference)
    return {
      channel: reference.channel,
      name: CHANNELS[reference.channel].name,
      position,
      aim: aimAtMlp(position, mlp),
      placementRange: checkPlacementRange(
        reference,
        azimuthFromMlp(mlp, position),
      ),
    }
  })
  const { specs: groupSpecs, ownSpecs } = speakerGroups.subwoofers
  const subwoofers = autoPlaceSubwoofers(room, layout.subwoofers).map(
    ({ id, position, wall }): PlacedSubwoofer => ({
      id,
      name: SUBWOOFERS[id].name,
      position,
      wall,
      specs: ownSpecs[id] ?? groupSpecs,
    }),
  )
  const frequencies = responseFrequencies()
  const prepared = prepareRoomResponse({
    room,
    sources: subwoofers.map(({ position }) => position),
    frequencies,
  })
  const estimated = estimateResponse(
    prepared,
    mlp,
    targetCurve(targetCurveKind, frequencies),
  )
  return {
    layout: summarizeLayout(layout),
    mlp,
    speakers,
    subwoofers,
    response: {
      estimated,
      targetCurve: targetCurveKind,
      summary: summarizeResponse(estimated.rows),
      tableRows: responseTable(estimated.rows),
    },
  }
}
