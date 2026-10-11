import type { Config } from './config'
import { CHANNELS, DOLBY_LAYOUTS, type ChannelId } from './dolby-layouts'
import { summarizeLayout, type LayoutSummary } from './layout'
import { defaultMlp } from './mlp'
import {
  checkPlacementRange,
  type PlacementRangeCheck,
} from './placement-range'
import { autoPlaceListenerLevel } from './placement'
import { azimuthFromMlp, type RoomPoint } from './room'

/** A listener-level speaker of the layout, auto-placed and checked. */
export type PlacedSpeaker = {
  readonly channel: ChannelId
  /** Dolby's name for the channel, for example "Left Surround". */
  readonly name: string
  /** Where the speaker is, in room coordinates (its acoustic center). */
  readonly position: RoomPoint
  /** Its angle from the MLP, graded against Dolby's placement range. */
  readonly placementRange: PlacementRangeCheck
}

/** Everything derived from a config. Later tickets add overheads, subwoofers and the estimated response. */
export type RoomAnalysis = {
  /** The layout's name and channel counts. */
  layout: LayoutSummary
  /** The MLP in room coordinates. */
  mlp: RoomPoint
  /** The layout's listener-level speakers, in Dolby's channel order. */
  speakers: readonly PlacedSpeaker[]
}

/** The domain entry point: derive the room plan from a config. */
export function analyzeRoom({ room, layout }: Config): RoomAnalysis {
  const mlp = defaultMlp(room)
  const { channels } = DOLBY_LAYOUTS[layout.dolbyLayout]
  const speakers = autoPlaceListenerLevel(room, mlp, channels).map(
    ({ channel, position }) => ({
      channel,
      name: CHANNELS[channel].name,
      position,
      placementRange: checkPlacementRange(
        layout.dolbyLayout,
        channel,
        azimuthFromMlp(mlp, position),
      ),
    }),
  )
  return { layout: summarizeLayout(layout), mlp, speakers }
}
