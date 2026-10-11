/**
 * The domain's public interface. The state and presentation layers import
 * from `@/domain` only, so the modules behind it can change freely.
 */
export {
  feetAndInchesToMeters,
  formatLength,
  metersToFeetAndInches,
  roundToCentimeters,
  type FeetAndInches,
  type UnitSystem,
} from './units'
