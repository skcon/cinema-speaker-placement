import type { ScreenRelation } from '@/domain'

/**
 * A short note on how a front-stage speaker relates to the Screen, for the
 * Selected item panel. `name` is the speaker's name, for example "Left".
 */
export function screenRelationNote(
  name: string,
  relation: ScreenRelation,
): string {
  switch (relation.kind) {
    case 'outside-edge':
      return `${name} sits just outside the screen's edge, as seen from the MLP.`
    case 'inside-edge':
      return `${name} sits behind the acoustically transparent screen, just inside its edge, as seen from the MLP.`
    case 'clamped': {
      const screenAngle = Math.round(relation.screenAngle)
      const { dolbyAngle } = relation
      const where =
        relation.limit === 'min'
          ? `below Dolby's ${dolbyAngle}° minimum, so ${name} sits at ${dolbyAngle}°, beside the screen.`
          : `beyond Dolby's ${dolbyAngle}° maximum, so ${name} sits at ${dolbyAngle}°, ${relation.behindScreen ? 'behind' : 'in front of'} the image.`
      return `Kept inside Dolby's range: the screen's edge would put ${name} at ${screenAngle}°, ${where}`
    }
    case 'below':
      return `${name} sits just below the screen, nearer ear height than above it.`
    case 'above':
      return `${name} sits just above the screen, nearer ear height than below it.`
    case 'behind':
      return `${name} sits behind the acoustically transparent screen, at ear height.`
    case 'in-front':
      return `${name} stays at ear height in front of the image: there is no room below or above the screen.`
    case 'clear':
      return `${name} stays at ear height: the screen doesn't cover it.`
    case 'manual':
      return `Placed by hand, so auto-place doesn't fit ${name} to the screen.`
  }
}
