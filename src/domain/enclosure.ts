/**
 * A subwoofer's low-frequency roll-off from its Enclosure (GLOSSARY.md):
 * a Butterworth high-pass of the enclosure's order at an assumed corner
 * frequency (ENCLOSURE_ROLL_OFF in reference.ts).
 */
import type { Complex } from './complex'
import { butterworth } from './filters'
import { ENCLOSURE_ROLL_OFF } from './reference'
import type { Enclosure } from './speaker-specs'

/** The enclosure's response at `frequency`, as a filter on the subwoofer. */
export function enclosureRollOff(
  enclosure: Enclosure,
  frequency: number,
): Complex {
  const { order, cornerHz } = ENCLOSURE_ROLL_OFF[enclosure]
  return butterworth('high-pass', order, frequency, cornerHz)
}
