import type { Config } from './config'
import {
  CHANNELS,
  OVERHEAD_CHANNELS,
  type ChannelId,
  type OverheadChannelId,
} from './dolby-layouts'
import { summarizeLayout, type LayoutSummary } from './layout'
import type { Placement } from './manual-positions'
import {
  checkOverheadPlacementRange,
  checkPlacementRange,
  type OverheadPlacementRangeCheck,
  type PlacementRangeCheck,
} from './placement-range'
import type { Aim } from './placement'
import { placeAll } from './placements'
import {
  azimuthFromMlp,
  sideViewElevation,
  type RoomPoint,
  type Wall,
} from './room'
import { estimateHeadroom, type HeadroomAnalysis } from './headroom'
import { speakerGroupsIn, type SubwooferSpecs } from './speaker-specs'
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
import { frontWallFraction, seatRuleOfThumb, type SeatRuleOfThumb } from './mlp'
import { seatRowFootprint, type SeatRowFootprint } from './seat-row'
import { responseNotes, type ResponseNotes } from './response-notes'
import { suggestsAtmosEnabledSpeakers } from './atmos-enabled'

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
 * An overhead speaker of the layout, on the ceiling. Dolby's placement
 * range grades its elevation and, for the top front and top rear pairs,
 * its azimuth. ADR 0002 models boundary interference for listener-level
 * speakers only, so an overhead is not in the estimated response or the
 * seat score.
 */
export type PlacedOverhead = {
  readonly channel: OverheadChannelId
  /** Dolby's name for the channel, for example "Left Top Front". */
  readonly name: string
  /** Where the speaker is, in room coordinates: on the ceiling. */
  readonly position: RoomPoint
  /** Auto-placed, or left by the user where it is. */
  readonly placement: Placement
  /** Its azimuth and elevation from the MLP, graded against Dolby's placement range. */
  readonly placementRange: OverheadPlacementRangeCheck
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

/** Everything derived from a config. */
export type RoomAnalysis = {
  /** The layout's name and channel counts. */
  layout: LayoutSummary
  /** The MLP in room coordinates. */
  mlp: RoomPoint
  /** Whether the MLP is auto-placed or left by the user where it is. */
  mlpPlacement: Placement
  /** The Seat row drawn around the MLP (a visual cue, not analyzed). */
  seatRow: SeatRowFootprint
  /** Where the informal "38% rule" puts the seat: a reference only. */
  seatRuleOfThumb: SeatRuleOfThumb
  /** How far back the MLP is, as a share of the room length. */
  mlpFrontWallFraction: number
  /** The layout's listener-level speakers, in Dolby's channel order. */
  speakers: readonly PlacedSpeaker[]
  /** The layout's overhead speakers, in Dolby's channel order. */
  overheads: readonly PlacedOverhead[]
  /** The layout's subwoofers, Subwoofer 1 first. */
  subwoofers: readonly PlacedSubwoofer[]
  /** The estimated response at the MLP against the target curve. */
  response: ResponseAnalysis
  /** Whether the Speakers and Subwoofers can reach reference level at the MLP. */
  headroom: HeadroomAnalysis
  /**
   * Whether the ceiling is low enough (8 ft or less) that Dolby suggests
   * Atmos-enabled speakers instead of the layout's overheads.
   */
  suggestsAtmosEnabledSpeakers: boolean
}

/** The domain entry point: derive the room plan from a config. */
export function analyzeRoom(config: Config): RoomAnalysis {
  const {
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
      const { aim, woofer, reflections, levels } = hearSpeaker(
        config,
        { channel: reference.channel, position },
        mlp,
        frequencies,
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
        charted: isCharted(reference.channel),
        reflections,
        levels,
      }
    },
  )

  const overheads = placements.overheads.map(
    ({ reference, position, placement }): PlacedOverhead => ({
      channel: reference.channel,
      name: OVERHEAD_CHANNELS[reference.channel].name,
      position,
      placement,
      placementRange: checkOverheadPlacementRange(
        reference,
        azimuthFromMlp(mlp, position),
        sideViewElevation(mlp, position),
      ),
    }),
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
  const layoutSummary = summarizeLayout(layout)
  const headroom = estimateHeadroom({
    mlp,
    speakerGroups,
    amplifierWatts,
    speakers: [...heardSpeakers.map(({ speaker }) => speaker), ...overheads],
    groups: speakerGroupsIn(layout),
    subwoofers,
  })
  return {
    layout: layoutSummary,
    mlp,
    mlpPlacement: placements.mlp.placement,
    seatRow: seatRowFootprint(config.room, mlp, config.seatRowWidth),
    seatRuleOfThumb: seatRuleOfThumb(config.room),
    mlpFrontWallFraction: frontWallFraction(config.room, mlp),
    speakers: heardSpeakers.map(({ speaker }) => speaker),
    overheads,
    subwoofers,
    response: {
      estimated,
      targetCurve: targetCurveKind,
      summary,
      tableRows: responseTable(estimated.rows),
      notes,
    },
    headroom,
    suggestsAtmosEnabledSpeakers: suggestsAtmosEnabledSpeakers(
      config.room,
      layout,
    ),
  }
}
