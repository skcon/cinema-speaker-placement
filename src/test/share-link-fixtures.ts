/**
 * Share-link fixtures for the domain, app and e2e tests. Plain data without
 * imports, so the e2e tests (typechecked without the app's `@/` alias) can
 * use it too; the domain tests check every config here against `Config`.
 */

/**
 * An 8 x 5 x 3 m room in imperial (26 ft 3 in x 16 ft 4.9 in x 9 ft 10.1 in)
 * with a 7.2.4 layout, ported 15 in subwoofers and Subwoofer 2 a sealed
 * 12 in model of its own: nothing at its default.
 */
export const IMPERIAL_ROOM = {
  units: 'imperial',
  room: { length: 8, width: 5, height: 3 },
  layout: { dolbyLayout: '7.1.4', subwoofers: 2 },
  speakerGroups: {
    subwoofers: {
      specs: {
        enclosure: 'ported',
        driverDiameter: 0.381,
        rmsWatts: 800,
        peakWatts: 1600,
      },
      ownSpecs: {
        Sub2: {
          enclosure: 'sealed',
          driverDiameter: 0.30479999999999996,
          rmsWatts: 500,
          peakWatts: 1200,
        },
      },
    },
  },
} as const

/**
 * Version 1 share links as the app writes them (their encoded configs),
 * with the config each one holds. Once version 1 is released, never edit
 * these: if one stops opening, links people already shared no longer open,
 * and the schema change needs a new version and a migration (ADR 0003).
 * Two sit on the edges of the room and subwoofer spec ranges, so
 * tightening the limits breaks a test instead of quietly rejecting old
 * links.
 */
export const V1_LINKS = {
  /**
   * 24 x 15 x 9 ft (7.3152 x 4.572 x 2.7432 m) in imperial, 7.2.2, ported
   * 13 in subwoofers with Subwoofer 2 a sealed 10 in model of its own.
   */
  imperialRoom: {
    encoded:
      'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEDAWwAcBTAJwwEMAbEeepJS3EF2lFiIALKAHYAdAGZoAVgBM8AO4YAJiKgAWCbLGKQw2tmFEo8iWM1T5AX3gsmATyR5TkUKqQsARo4AyTi5uIJLQEvLsICR43kpcaAxkkLbwJHRMANYMAOKceNRJoNGx8Ym8abQIhSACCCxI0fS05NRI9ES0qpGqjGAMACLMlLQd9FAADNJS4-r0lCQA6kxEpFqy4-DpGUsrSQCc4+N2IEhKKADKdFW85zER7jUodQ14TeQktKyd3b0DQyMMCbhWSaDjzHarZLrTafbbLSHrI42ZHIoA',
    config: {
      units: 'imperial',
      room: { length: 7.3152, width: 4.572, height: 2.7432 },
      layout: { dolbyLayout: '7.1.2', subwoofers: 2 },
      speakerGroups: {
        subwoofers: {
          specs: {
            enclosure: 'ported',
            driverDiameter: 0.3302,
            rmsWatts: 450,
            peakWatts: 900,
          },
          ownSpecs: {
            Sub2: {
              enclosure: 'sealed',
              driverDiameter: 0.254,
              rmsWatts: 250,
              peakWatts: 500,
            },
          },
        },
      },
    },
  },
  /**
   * The smallest room accepted, 2 x 2 x 2 m, with 2.1 and the smallest
   * subwoofer specs accepted: 6 in, 10 W RMS and peak.
   */
  smallestRoom: {
    encoded:
      'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEAWwFMiAnDBEeWpJC3EAGypSyIAsoAJngB3DABMBw+PyrZ+RYQF94nAIYBPJHiWRQEpJwBGmgDJadekEIB00JiBJ5jo1miq0yMVU4AOVOoA1p4A4ix4ft6gzq7untH+VAiJPAicSM60VOQkgdwSjhL0YJ4AIhjq1ESeUAAM9gCsQgDMAJwdnV0dABzMFCQA6upEpFDQdfABwcOj3hO+SKIoAMoBKbjKW1tAA',
    config: {
      units: 'metric',
      room: { length: 2, width: 2, height: 2 },
      layout: { dolbyLayout: '2.1', subwoofers: 1 },
      speakerGroups: {
        subwoofers: {
          specs: {
            enclosure: 'sealed',
            driverDiameter: 0.15239999999999998,
            rmsWatts: 10,
            peakWatts: 10,
          },
          ownSpecs: {},
        },
      },
    },
  },
  /**
   * The largest room accepted, 15 x 15 x 5 m, with 7.4.4 and the largest
   * subwoofer specs accepted (24 in, 10,000 W RMS, 20,000 W peak), Subwoofer
   * 4 with them as its own.
   */
  largestRoom: {
    encoded:
      'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEAWwFMiAnDBEeWpJC3EAGypSyIAso0AKzwA7hgAmAoaJD8q2fkSjCAvvE4BDAJ5I8KyKElJOAIx0AZXfsMgA7ADpojgCxMQJPGbGs0VWjJIVw1PAAcqLQBrAIBxFjwwoNAvHz8A5PCqBEyeBE4kL1oqcjCkWiIqSQ9JejAAgBEMLWpK2igABkcANg6ATmE+oeGRoeYKEgB1LSJSIQ6FjvgI6OnZoIAmRY7QpDEUAGUInI4D73cjEDyCopLIT0juavhajHraJpaaAM6e-sHRoDxlMZnMYNtlpEomswVtFmoEYigA',
    config: {
      units: 'metric',
      room: { length: 15, width: 15, height: 5 },
      layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
      speakerGroups: {
        subwoofers: {
          specs: {
            enclosure: 'ported',
            driverDiameter: 0.6095999999999999,
            rmsWatts: 10000,
            peakWatts: 20000,
          },
          ownSpecs: {
            Sub4: {
              enclosure: 'sealed',
              driverDiameter: 0.6095999999999999,
              rmsWatts: 10000,
              peakWatts: 20000,
            },
          },
        },
      },
    },
  },
} as const
