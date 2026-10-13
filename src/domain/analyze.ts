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
import type { SubwooferSpecs } from './speaker-specs'
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

/** A listener-level speaker of the layout, placed and checked. */
export type PlacedSpeaker = {
  readonly channel: ChannelId
  /** Dolby's name for the channel, for example "Left Surround". */
  readonly name: string
  /** Where the speaker is, in room coordinates (its acoustic center). */
  readonly position: RoomPoint
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
}

/** The domain entry point: derive the room plan from a config. */
export function analyzeRoom(config: Config): RoomAnalysis {
  const { room, layout, speakerGroups, targetCurve: targetCurveKind } = config
  const placements = placeAll(config)
  const mlp = placements.mlp.position
  const speakers = placements.speakers.map(
    ({ reference, position, placement }): PlacedSpeaker => ({
      channel: reference.channel,
      name: CHANNELS[reference.channel].name,
      position,
      placement,
      aim: aimAtMlp(position, mlp),
      placementRange: checkPlacementRange(
        reference,
        azimuthFromMlp(mlp, position),
      ),
    }),
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
    mlpPlacement: placements.mlp.placement,
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
