import type { Config } from './config'
import { summarizeLayout, type LayoutSummary } from './layout'
import { placeItems, type PlacedItems } from './placed-items'
import { estimateHeadroom, type HeadroomAnalysis } from './headroom'
import { speakerGroupsIn } from './speaker-specs'
import {
  hearRoom,
  type EstimatedResponse,
  type ResponseRow,
} from './estimated-response'
import {
  responseTable,
  summarizeResponse,
  type ResponseSummary,
} from './response-summary'
import type { TargetCurveKind } from './target-curve'
import { hearSpeaker, isCharted } from './listening'
import { frontWallFraction, seatRuleOfThumb, type SeatRuleOfThumb } from './mlp'
import { seatRowFootprint, type SeatRowFootprint } from './seat-row'
import { responseNotes, type ResponseNotes } from './response-notes'
import { suggestsAtmosEnabledSpeakers } from './atmos-enabled'
import { placementWarnings, type PlacementWarning } from './placement-warnings'

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

/**
 * Everything derived from a config. It is a PlacedItems (placed-items.ts):
 * the MLP, the speakers, overheads and subwoofers by kind, and every item
 * by id (`items`), the one by-id lookup for a placed item.
 */
export type RoomAnalysis = PlacedItems & {
  /** The layout's name and channel counts. */
  readonly layout: LayoutSummary
  /** The Seat row the MLP sits on (a room object, not analyzed). */
  readonly seatRow: SeatRowFootprint
  /** Where the informal "38% rule" puts the seat: a reference only. */
  readonly seatRuleOfThumb: SeatRuleOfThumb
  /** How far back the MLP is, as a share of the room length. */
  readonly mlpFrontWallFraction: number
  /** The estimated response at the MLP against the target curve. */
  readonly response: ResponseAnalysis
  /** Whether the Speakers and Subwoofers can reach reference level at the MLP. */
  readonly headroom: HeadroomAnalysis
  /**
   * Whether the ceiling is low enough (8 ft or less) that Dolby suggests
   * Atmos-enabled speakers instead of the layout's overheads.
   */
  readonly suggestsAtmosEnabledSpeakers: boolean
  /**
   * Hints where a room object makes a speaker or the MLP worse off (ADR
   * 0006): never a block, and not part of the estimated response.
   */
  readonly placementWarnings: readonly PlacementWarning[]
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
  // else auto-placed (placements.ts), each with its per-item facts
  // (placed-items.ts). Everything below follows from them.
  const placed = placeItems(config)
  const { mlp, speakers, overheads, subwoofers } = placed
  // The room with the subwoofers where they are, heard at the MLP: the
  // same heard room the seat score hears its candidate seats in.
  const heardRoom = hearRoom(config, placed)
  const { frequencies } = heardRoom

  // Each speaker is installed for and graded from the current MLP, and
  // faces it; its reflections follow from that aim and are worked out
  // once, for both the estimate and the notes.
  const heardSpeakers = speakers.map((speaker) => {
    const { reflections, levels } = hearSpeaker(
      config,
      speaker,
      mlp,
      frequencies,
    )
    return {
      speaker,
      charted: isCharted(speaker.channel),
      reflections,
      levels,
    }
  })

  const estimated = heardRoom.estimateAt(
    heardRoom.hear({
      receiver: mlp,
      speakerLevels: heardSpeakers
        .filter(({ charted }) => charted)
        .map(({ levels }) => levels),
    }),
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
  const headroom = estimateHeadroom({
    mlp,
    speakerGroups,
    amplifierWatts,
    speakers: [...speakers, ...overheads],
    groups: speakerGroupsIn(layout),
    subwoofers,
  })
  return {
    ...placed,
    layout: summarizeLayout(layout),
    seatRow: seatRowFootprint(config.room, mlp, config.roomObjects.seatRow),
    seatRuleOfThumb: seatRuleOfThumb(config.room),
    mlpFrontWallFraction: frontWallFraction(config.room, mlp),
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
    placementWarnings: placementWarnings({
      room: config.room,
      roomObjects: config.roomObjects,
      mlp,
      speakers,
      overheads,
      subwoofers,
    }),
  }
}
