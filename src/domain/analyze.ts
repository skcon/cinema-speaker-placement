import type { Config } from './config'
import { CHANNELS, type ChannelId } from './dolby-layouts'
import { summarizeLayout, type LayoutSummary } from './layout'
import type { Placement } from './manual-positions'
import {
  checkPlacementRange,
  type PlacementRangeCheck,
} from './placement-range'
import type { Aim } from './placement'
import { placeAll } from './placements'
import { azimuthFromMlp, type RoomPoint, type Wall } from './room'
import type { SubwooferSpecs } from './speaker-specs'
import { SUBWOOFERS, type SubwooferId } from './subwoofer-arrangements'
import {
  estimateResponse,
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
  hearSpeaker,
  isCharted,
  prepareConfigResponse,
  subwooferSpecsOf,
} from './listening'
import { seatRuleOfThumb, type SeatRuleOfThumb } from './mlp'
import { seatRowFootprint, type SeatRowFootprint } from './seat-row'
import { responseNotes, type ResponseNotes } from './response-notes'

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
  /** The Seat row drawn around the MLP (a visual cue, not analyzed). */
  seatRow: SeatRowFootprint
  /** The informal "38% rule", a reference only, and where the MLP is by it. */
  seatRuleOfThumb: SeatRuleOfThumb
  /** The layout's listener-level speakers, in Dolby's channel order. */
  speakers: readonly PlacedSpeaker[]
  /** The layout's subwoofers, Subwoofer 1 first. */
  subwoofers: readonly PlacedSubwoofer[]
  /** The estimated response at the MLP against the target curve. */
  response: ResponseAnalysis
}

/** The domain entry point: derive the room plan from a config. */
export function analyzeRoom(config: Config): RoomAnalysis {
  const { layout, targetCurve: targetCurveKind, crossoverHz } = config
  // The one place positions come from: manual where the user put an item,
  // else auto-placed (placements.ts). Everything below follows from them.
  const placements = placeAll(config)
  const mlp = placements.mlp.position
  const frequencies = responseFrequencies()

  // Each speaker faces the current MLP; its reflections follow from that
  // aim and are worked out once, for both the estimate and the notes.
  const heardSpeakers = placements.speakers.map(
    ({ reference, position, placement }) => {
      const { aim, reflections, levels } = hearSpeaker(
        config,
        position,
        mlp,
        frequencies,
      )
      const speaker: PlacedSpeaker = {
        channel: reference.channel,
        name: CHANNELS[reference.channel].name,
        position,
        placement,
        aim,
        placementRange: checkPlacementRange(
          reference,
          azimuthFromMlp(mlp, position),
        ),
      }
      return {
        speaker,
        charted: isCharted(reference.channel),
        reflections,
        levels,
      }
    },
  )

  const subwoofers = placements.subwoofers.map(
    ({ id, position, placement, wall }): PlacedSubwoofer => ({
      id,
      name: SUBWOOFERS[id].name,
      position,
      placement,
      wall,
      specs: subwooferSpecsOf(config, id),
    }),
  )

  const prepared = prepareConfigResponse(config, placements, frequencies)
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
    mlpPlacement: placements.mlp.placement,
    seatRow: seatRowFootprint(config.room, mlp, config.seatRowWidth),
    seatRuleOfThumb: seatRuleOfThumb(config.room, mlp),
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
