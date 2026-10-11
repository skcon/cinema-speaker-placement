/**
 * Share-link fixtures for the domain, app and e2e tests. Plain data without
 * imports, so the e2e tests (typechecked without the app's `@/` alias) can
 * use it too; the domain tests check every config here against `Config`.
 */

/**
 * An 8 x 5 x 3 m room in imperial (26 ft 3 in x 16 ft 4.9 in x 9 ft 10.1 in)
 * with a 7.2.4 layout: nothing at its default.
 */
export const IMPERIAL_ROOM = {
  units: 'imperial',
  room: { length: 8, width: 5, height: 3 },
  layout: { dolbyLayout: '7.1.4', subwoofers: 2 },
} as const

/**
 * Version 1 share links as the app writes them (their encoded configs),
 * with the config each one holds. Once version 1 is released, never edit
 * these: if one stops opening, links people already shared no longer open,
 * and the schema change needs a new version and a migration (ADR 0003).
 * Two sit on the edges of the room ranges, so tightening the limits breaks
 * a test instead of quietly rejecting old links.
 */
export const V1_LINKS = {
  /** 24 x 15 x 9 ft (7.3152 x 4.572 x 2.7432 m) in imperial, 7.2.2. */
  imperialRoom: {
    encoded:
      'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEDAWwAcBTAJwwEMAbEeepJS3EF2lFiIALKAHYAdAGZoAVgBM8AO4YAJiKgAWCbLGKQw2tmFEo8iWM1T5AX3gsmATyR5TkUKqQsARo4AyTi5uIJLQEvLsICR43kpcaAxkkLY2NkA',
    config: {
      units: 'imperial',
      room: { length: 7.3152, width: 4.572, height: 2.7432 },
      layout: { dolbyLayout: '7.1.2', subwoofers: 2 },
    },
  },
  /** The smallest room accepted, 2 x 2 x 2 m, with 2.1. */
  smallestRoom: {
    encoded:
      'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEAWwFMiAnDBEeWpJC3EAGypSyIAsoAJngB3DABMBw+PyrZ+RYQF94nAIYBPJHiWRQEpJwBGmgDJadekEIB00JiBJ5jo1miq0yMZb6A',
    config: {
      units: 'metric',
      room: { length: 2, width: 2, height: 2 },
      layout: { dolbyLayout: '2.1', subwoofers: 1 },
    },
  },
  /** The largest room accepted, 15 x 15 x 5 m, with 7.4.4. */
  largestRoom: {
    encoded:
      'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEAWwFMiAnDBEeWpJC3EAGypSyIAso0AKzwA7hgAmAoaJD8q2fkSjCAvvE4BDAJ5I8KyKElJOAIx0AZXfsMgA7ADpojgCxMQJPGbGs0VWjJIVzVQoA',
    config: {
      units: 'metric',
      room: { length: 15, width: 15, height: 5 },
      layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
    },
  },
} as const
