/**
 * The Channel response (GLOSSARY.md): the estimated response at the MLP as
 * if only one channel plays, for the chart while that speaker or
 * subwoofer is the Selected item. Like the combined estimated response, a
 * simplified model, never a measurement.
 *
 * - A **speaker** (listener-level, surrounds included, or overhead): that
 *   speaker above the crossover, with its own boundary interference, and
 *   every subwoofer below it, as a receiver's bass management plays the
 *   channel. A listener-level speaker reflects off the surfaces the
 *   combined response uses for L, C and R (`hearSpeaker`); an overhead off
 *   its nearest walls (`hearOverhead`, ADR 0002 amendment).
 * - A **subwoofer**: that subwoofer alone, through the crossover's
 *   low-pass, up to the crossover (its pass band).
 *
 * Each is heard in the same heard room (estimated-response.ts) and
 * calibrated at the MLP the way the combined response is, so the curves
 * and their Response scores compare. The combined response itself is not
 * touched: it stays the subwoofers and the front stage (analyze.ts).
 *
 * Costly (a modal sum at the MLP), so worked out only for the selected
 * item; the caller memoizes it per config and id.
 */
import type { BoundaryReflection } from './boundary-interference'
import type { Config } from './config'
import type { EstimatedResponse, ResponseRow } from './estimated-response'
import { hearRoom } from './estimated-response'
import { hearOverhead, hearSpeaker } from './listening'
import type { PlaceableId } from './manual-positions'
import type { PlacedItem, PlacedItems } from './placed-items'
import {
  responseScore,
  responseTable,
  summarizeResponse,
  type ResponseScore,
  type ResponseSummary,
} from './response-summary'

/** The kinds of item that have a channel: every one but the MLP. */
export type ChannelKind = Exclude<PlacedItem['kind'], 'mlp'>

/** One channel's estimated response at the MLP, with its Response score. */
export type ChannelResponse = {
  /** The speaker's channel or the subwoofer's id. */
  readonly id: PlaceableId
  /** Its name, for example "Left Surround" or "Subwoofer 1". */
  readonly name: string
  readonly kind: ChannelKind
  /** Per frequency: the estimate, the target and its band, and reliability. */
  readonly estimated: EstimatedResponse
  /** The reliable rows against the target, in a few numbers. */
  readonly summary: ResponseSummary
  /** How close the reliable rows are to the target, out of 100. */
  readonly score: ResponseScore
  /** The rows at third-octave frequencies, for a table. */
  readonly tableRows: readonly ResponseRow[]
  /** The speaker's reflections at the MLP; none for a subwoofer. */
  readonly reflections: readonly BoundaryReflection[]
}

/**
 * The channel response of item `id` at the MLP of `placed` (the config's
 * placed items, or its Room analysis), or null for the MLP or an item the
 * layout doesn't have.
 */
export function channelResponse(
  config: Config,
  placed: PlacedItems,
  id: PlaceableId,
): ChannelResponse | null {
  const item = placed.items.get(id)
  if (!item || item.kind === 'mlp') return null
  const { mlp } = placed

  if (item.kind === 'subwoofer') {
    const heardRoom = hearRoom(config, { subwoofers: [item] })
    const estimated = heardRoom.estimateSubwoofersAt(
      heardRoom.hear({ receiver: mlp, speakerLevels: [] }),
    )
    return channelOf(item, estimated, [])
  }

  // Every subwoofer below the crossover, as bass management plays them.
  const heardRoom = hearRoom(config, placed)
  const { reflections, levels } =
    item.kind === 'listenerLevel'
      ? hearSpeaker(config, item, mlp, heardRoom.frequencies)
      : hearOverhead(config, item.position, mlp, heardRoom.frequencies)
  const estimated = heardRoom.estimateAt(
    heardRoom.hear({ receiver: mlp, speakerLevels: [levels] }),
  )
  return channelOf(item, estimated, reflections)
}

/** The channel response of `item` from its estimate. */
function channelOf(
  item: Extract<PlacedItem, { kind: ChannelKind }>,
  estimated: EstimatedResponse,
  reflections: readonly BoundaryReflection[],
): ChannelResponse {
  const summary = summarizeResponse(estimated.rows)
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    estimated,
    summary,
    score: responseScore(summary),
    tableRows: responseTable(estimated.rows),
    reflections,
  }
}
