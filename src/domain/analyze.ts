import type { Config } from './config'
import { CHANNELS, dolbyLayoutFor, type ChannelId } from './dolby-layouts'
import { defaultMlp } from './mlp'
import type { RoomPoint } from './room'

/** A listener-level speaker of the layout, auto-placed. */
export type PlacedSpeaker = {
  readonly channel: ChannelId
  /** Dolby's name for the channel, for example "Left Surround". */
  readonly name: string
}

/** Everything derived from a config. Later tickets add overheads, subwoofers and the estimated response. */
export type RoomAnalysis = {
  /** The MLP in room coordinates. */
  mlp: RoomPoint
  /** The layout's listener-level speakers, in Dolby's channel order. */
  speakers: readonly PlacedSpeaker[]
}

/** The domain entry point: derive the room plan from a config. */
export function analyzeRoom(config: Config): RoomAnalysis {
  const mlp = defaultMlp(config.room)
  const speakers = dolbyLayoutFor(config.layout).channels.map(
    ({ channel }) => ({ channel, name: CHANNELS[channel].name }),
  )
  return { mlp, speakers }
}
