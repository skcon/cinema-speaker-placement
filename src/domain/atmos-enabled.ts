/**
 * When to suggest Atmos-enabled speakers instead of overhead speakers
 * (GLOSSARY.md): Dolby says a ceiling of 8 ft or lower puts overheads too
 * close to the listeners (docs/research/dolby-speaker-placement.md
 * section 4, "When to avoid overhead speakers").
 */
import { summarizeLayout, type Layout } from './layout'
import { LOW_CEILING_FOR_OVERHEADS } from './reference'
import type { Room } from './room'

/** True when the layout has overheads and the ceiling is at or below 8 ft. */
export function suggestsAtmosEnabledSpeakers(
  room: Room,
  layout: Layout,
): boolean {
  return (
    summarizeLayout(layout).overheads > 0 &&
    room.height <= LOW_CEILING_FOR_OVERHEADS.meters
  )
}
