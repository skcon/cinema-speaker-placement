/**
 * Share-link fixtures for the domain, app and e2e tests. Plain data without
 * imports, so the e2e tests (typechecked without the app's `@/` alias) can
 * use it too; the domain tests check every config here against `Config`.
 */

/**
 * An 8 x 5 x 3 m room in imperial (26 ft 3 in x 16 ft 4.9 in x 9 ft 10.1 in)
 * with a 7.2.4 layout, ported 15 in subwoofers, Subwoofer 2 a sealed
 * 12 in model as its own specs, tower fronts and rear surrounds, our own
 * sensitivity for every speaker group, a 150 W amplifier, the house
 * curve, a 100 Hz crossover, a 12 x 3 ft seat row,
 * the Right Rear Surround and Subwoofer 2 moved by hand into the
 * back right corner, and a 9 x 5 ft acoustically transparent projection
 * screen 2 ft off the floor and 18 in in front of the front wall, moved
 * left of centre: nothing at its default.
 */
export const IMPERIAL_ROOM = {
  units: 'imperial',
  room: { length: 8, width: 5, height: 3 },
  layout: { dolbyLayout: '7.1.4', subwoofers: 2 },
  speakerGroups: {
    front: { specs: { type: 'tower', sensitivity: 89 } },
    center: { specs: { type: 'bookshelf', sensitivity: 91.5 } },
    surrounds: { specs: { type: 'bookshelf', sensitivity: 85 } },
    rearSurrounds: { specs: { type: 'tower', sensitivity: 88 } },
    overheads: { specs: { sensitivity: 84.5 } },
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
  amplifierWatts: 150,
  targetCurve: 'house',
  crossoverHz: 100,
  manualPositions: {
    Rrs: { x: 2.2, y: 7.2, z: 1.5 },
    Sub2: { x: 2.2, y: 7.7, z: 0.3 },
  },
  roomObjects: {
    seatRow: { width: 3.6576, depth: 0.9144 },
    screen: {
      kind: 'projection',
      width: 2.7432,
      height: 1.524,
      bottomEdge: 0.6096,
      x: -0.25,
      standoff: 0.4572,
    },
  },
} as const

/**
 * Version 1 share links as v1.0.0 wrote them (their encoded configs), with
 * the config each one holds. Version 1 is released, so never edit these:
 * if one stops opening, links people already shared no longer open, and
 * the schema change needs a new version and a migration (ADR 0003). Two
 * sit on the edges of the room, speaker and subwoofer spec, amplifier
 * power, crossover, seat row and position ranges, so tightening the limits
 * breaks a test instead of quietly rejecting old links.
 */
export const V1_LINKS = {
  /**
   * 24 x 15 x 9 ft (7.3152 x 4.572 x 2.7432 m) in imperial, 7.2.2, ported
   * 13 in subwoofers with Subwoofer 2 a sealed 10 in model as its own
   * specs, tower fronts, a 125 W amplifier, the house curve, a 120 Hz
   * crossover and a 10 ft seat row; nothing moved by hand.
   */
  imperialRoom: {
    encoded:
      'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEDAWwAcBTAJwwEMAbEeepJS3EF2lFiIALKAHYAdAGZoAVgBM8AO4YAJiKgAWCbLGKQw2tmFEo8iWM1T5AX3gsmATyR5TkUKqQsARo4AyTi5uIJLQEvLsICR43kpcaAxkkLbwJHRMANYMAOKceNRJoGicKG6gabQIhSBEjnTkREhKDJEkAiTEGGDEjlAAnAAMNnaIAkQt7lF0Vby19ZAg3lwZJIYsaK3tnd21UAAcezrDqXj0eSiq1RUzk3O05EtIK2sbqVtEXT37AGzHIPS0Jj0ADKp3Ol1412qdwey1WtHWmxQHQ+O16kD2vxGSDADEMTAhkyhkPen12GNkf2isXiiUh02qAgQLCQ0QB5GoSHo41UkVUjFx9AAIsxKLRxvQoANpFIBvp6JQSAB1JhEUhaWQDeDpDIqtVJQZDeBNFDAhm8UHeCKTJkstn3BZtVi0XnwfldBgiphiiVS8KyTQcRV69XJTXawG61WhzVDYYjb3UFgYTAMENJaDyWTwIhArDigDCp1x5GELjakQQnBIJBxDAAEgAvKCZrVRQFEABKTSVag0kCkEgGmj28EoTBQeFYAAVWZ1UIV40A',
    config: {
      units: 'imperial',
      room: { length: 7.3152, width: 4.572, height: 2.7432 },
      layout: { dolbyLayout: '7.1.2', subwoofers: 2 },
      speakerGroups: {
        front: { specs: { type: 'tower', sensitivity: 90 } },
        center: { specs: { type: 'bookshelf', sensitivity: 88.5 } },
        surrounds: { specs: { type: 'bookshelf', sensitivity: 86 } },
        rearSurrounds: { specs: { type: 'bookshelf', sensitivity: 86 } },
        overheads: { specs: { sensitivity: 85 } },
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
      amplifierWatts: 125,
      targetCurve: 'house',
      crossoverHz: 120,
      seatRowWidth: 3.048,
      manualPositions: {},
    },
  },
  /**
   * The smallest room accepted, 2 x 2 x 2 m, with 2.1 and the smallest
   * subwoofer specs accepted (6 in, 10 W RMS and peak), the lowest
   * sensitivity (70 dB) for every speaker group, a 1 W amplifier, the lowest
   * crossover accepted (40 Hz), the narrowest seat row (0.5 m), and every
   * item moved by hand to the
   * clearance lines, Left to the ceiling's and Right to the floor's.
   */
  smallestRoom: {
    encoded:
      'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEAWwFMiAnDBEeWpJC3EAGypSyIAsoAJngB3DABMBw+PyrZ+RYQF94nAIYBPJHiWRQEpJwBGmgDJadekEIB00JiBJ5jo1miq0yMVU4AOVOoA1p4A4ix4ft6gaCwoeqAkAQjRIESaAeTGrEEkcpxojiQ8JMQYYMSaUADsAAzKvgg8RJ4cSVQpHOmZkCDZSLn5hfDFKKVE5ZU19b7OtBEoEqntnfppGVRZOXlUBUUlZRXp0w3MgbQAynjzOovLyandm739g7vDTgcTR1WQdacgJBgTxydRLNoPNpfSbHP4zEYuNxIDxeCEdVI8BCcJBzZ6fdTcCSOCT0YG0AAiGHU1BatCgtXsAFYhABmACcHM5XI5AA5mBQSAB1dREUhQaC1eABYLC0XeCW+JCiFAXSH6Bq+al+TgYTCeWVimDwIjqWhYGgAYWuwPIaA0SngCBYJBIQM8AAkAF5QAAskvxRAASkrBZJpJAGYz4BR1Cg8ASAAo4sqoVJmDgADygAFoGdV4L8GSz4N6YLZqr5A5n6eWC+LayBS0XfFdjA41lmIw3C7Zi42ayzfABZMwJ6uQXPd+v5-tloQa5RAA',
    config: {
      units: 'metric',
      room: { length: 2, width: 2, height: 2 },
      layout: { dolbyLayout: '2.1', subwoofers: 1 },
      speakerGroups: {
        front: { specs: { type: 'bookshelf', sensitivity: 70 } },
        center: { specs: { type: 'bookshelf', sensitivity: 70 } },
        surrounds: { specs: { type: 'bookshelf', sensitivity: 70 } },
        rearSurrounds: { specs: { type: 'bookshelf', sensitivity: 70 } },
        overheads: { specs: { sensitivity: 70 } },
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
      amplifierWatts: 1,
      targetCurve: 'flat',
      crossoverHz: 40,
      seatRowWidth: 0.5,
      // Every item moved by hand to the clearance lines.
      manualPositions: {
        L: { x: -0.7, y: 0.3, z: 1.7 },
        R: { x: 0.7, y: 1.7, z: 0.3 },
        Sub1: { x: 0.7, y: 0.3, z: 0.3 },
        MLP: { x: -0.7, y: 1.7, z: 1.2 },
      },
    },
  },
  /**
   * The largest room accepted, 15 x 15 x 5 m, with 7.4.4 and the largest
   * subwoofer specs accepted (24 in, 10,000 W RMS, 20,000 W peak), Subwoofer
   * 4 with them as its own, towers of the highest sensitivity (110 dB) in
   * every group, a 5,000 W amplifier, the house curve, the highest
   * crossover accepted (200 Hz), the widest seat row (8 m), and Right (at
   * the ceiling clearance), Right Top Rear (on the ceiling), Subwoofer 4
   * and the MLP moved by hand into the corners.
   */
  largestRoom: {
    encoded:
      'N4IgbiBcCMA0IGMD2A7AZgSwOZVAVxQwBcBnKEAWwFMiAnDBEeWpJC3EAGypSyIAso0AKzwA7hgAmAoaJD8q2fkSjCAvvE4BDAJ5I8KyKElJOAIx0AZXfsMgA7ADpojgCxMQJPGbGs0VWjJIVw1PAAcqLQBrAIBxFjwwoNA0FhRDUBIIhGSQIh0I8iIkMQCPEh4SYgwwYh0haAAGNVCEHiIyo3CqHI58wsg8krL4CpQqohq6hubQr1oElElcrJ7c-qoi4dpyyura-JmW5kjaAGU8Bf0llez1gs3B4tKd0b3Jg-qYJuOQJDAAgotMsOKtel0xhMpodvrNRt5fEh-IFQXcODwEJwkPNHiAwkhaB1JB5JPQAbQACIYLTUDo7SCNRwANkaAE5hKzOVzuZzmBQSAB1LREUhCRrixrwCLRIUioIAJglzXgJRQZzRXQuZncXQxWJx5AqWm4xPgpJqASpNJonUZLPZPMdrL5guFopgSqlkSisvdiolLV+NLCnAwmACvqCwgl8CIWloWBoAGFLgDyPx9BUPAgWCQSP8AgAJABeUH9b2FACUSgKpDJIAAOeAULQoPDGgAK2OqqFylY4AA8oE55fAvtBXI57PBS8Ep6FK3RB8PHKOQOPJ9OQLP1PAtTrQEPIABaEdjoSbmdQRkAZlCAFlLB3lyez+vr44b1eYKvA2ogA',
    config: {
      units: 'metric',
      room: { length: 15, width: 15, height: 5 },
      layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
      speakerGroups: {
        front: { specs: { type: 'tower', sensitivity: 110 } },
        center: { specs: { type: 'tower', sensitivity: 110 } },
        surrounds: { specs: { type: 'tower', sensitivity: 110 } },
        rearSurrounds: { specs: { type: 'tower', sensitivity: 110 } },
        overheads: { specs: { sensitivity: 110 } },
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
      amplifierWatts: 5000,
      targetCurve: 'house',
      crossoverHz: 200,
      seatRowWidth: 8,
      // Right, Right Top Rear, Subwoofer 4 and the MLP moved by hand to the
      // clearance lines.
      manualPositions: {
        R: { x: 7.2, y: 14.7, z: 4.7 },
        Rtr: { x: 7.2, y: 14.7, z: 5 },
        Sub4: { x: -7.2, y: 14.7, z: 0.3 },
        MLP: { x: -7.2, y: 0.3, z: 1.2 },
      },
    },
  },
} as const

/**
 * Version 2 share links as the app writes them today, with the config each
 * one holds: the version 1 links' configs as the migration to version 2
 * gives them (their seat row width as a 0.9 m deep seat row, and no other
 * room objects), except that the two on the edges of the ranges also have
 * a seat row depth and a screen on the edges of their ranges. Version 2 is not
 * released until v1.1.0 is tagged, so the 1.1.0 changes that extend it
 * regenerate these (ADR 0003); after that, never edit them.
 */
export const V2_LINKS = {
  /**
   * 24 x 15 x 9 ft (7.3152 x 4.572 x 2.7432 m) in imperial, 7.2.2, ported
   * 13 in subwoofers with Subwoofer 2 a sealed 10 in model as its own
   * specs, tower fronts, a 125 W amplifier, the house curve, a 120 Hz
   * crossover and a 10 ft seat row; nothing moved by hand.
   */
  imperialRoom: {
    encoded:
      'N4IgbiBcBMA0IGMD2A7AZgSwOZVAVyhAwFsAHAUwCcMBDAGxHktxAcgHYA6AZgEYBWOCADuUACyd+7IQAso0TuzHdoAX3h0AniwAmbEF16dojEAGd56kDkig0LM6RYAXQs6TCqps+SgBOAAZVKwQHJ1sQV0gQACMkJABrMxlyOnt4HygADizJYIzmCMcXQjjE5NT0819ILIA2fJBKCyLw0CjY+KSUtO8a+sakMId+-kaW0GKImpBSJEpnch1THWXIAJ5uAKFKUUgxfgD4Uj3AoPgkCZAAZTwYk2nCH3ollbWN6H4xJj3Po9m9ocgsErDQ9rxPvBnKFojIkHhMvAAB5DSAQ-7EXBWSioyZRUB7bicAJiLLwd6cPxWMwwlB4Oh0EFAA',
    config: {
      units: 'imperial',
      room: { length: 7.3152, width: 4.572, height: 2.7432 },
      layout: { dolbyLayout: '7.1.2', subwoofers: 2 },
      speakerGroups: {
        front: { specs: { type: 'tower', sensitivity: 90 } },
        center: { specs: { type: 'bookshelf', sensitivity: 88.5 } },
        surrounds: { specs: { type: 'bookshelf', sensitivity: 86 } },
        rearSurrounds: { specs: { type: 'bookshelf', sensitivity: 86 } },
        overheads: { specs: { sensitivity: 85 } },
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
      amplifierWatts: 125,
      targetCurve: 'house',
      crossoverHz: 120,
      manualPositions: {},
      roomObjects: { seatRow: { width: 3.048, depth: 0.9 }, screen: null },
    },
  },
  /**
   * The smallest room accepted, 2 x 2 x 2 m, with 2.1 and the smallest
   * subwoofer specs accepted (6 in, 10 W RMS and peak), the lowest
   * sensitivity (70 dB) for every speaker group, a 1 W amplifier, the lowest
   * crossover accepted (40 Hz), the narrowest and shallowest seat row (0.5 x 0.5 m), and every
   * item moved by hand to the
   * clearance lines, Left to the ceiling's and Right to the floor's, and
   * the smallest screen at the floor and the left wall.
   */
  smallestRoom: {
    encoded:
      'N4IgbiBcBMA0IGMD2A7AZgSwOZVAVyhAFsBTAFwCcMER4LcQAbKOEAdxfgAsWBfeRgE8GAE2aQQ0AHQBGWiADOUGfxA5IoNAwUAHBmUIAjJEgDWCriUZb4CklADsABl6qaGxXo8GJxsxasbRXtIZ1dbeg9dfSMTc0treTtHF1UKJSivUB8QP3jApJCw1SRtLOCU8MUyhhDggENGEhF5ERbIJ1kAVmgAZgBOQaHhwYAOOg5IGSd4HUnpkozgV1V6+fgydxA0RnqDeAAPUsgAFhniBgAZBgOoAFpOh3hhDqle+AAvZSkHVQAlG5QR7Pb5PEBfV69VQAZTwhjkHlurzBL0673BQLeqgAspcAAqAyAPH4gqYkjFk6BVCjHUAKHygSadLrwdrM1QKdygUyEMgQeBMqQskA8SHwQwhc5I4kOYUKY4oPCMRgrXhAA',
    config: {
      units: 'metric',
      room: { length: 2, width: 2, height: 2 },
      layout: { dolbyLayout: '2.1', subwoofers: 1 },
      speakerGroups: {
        front: { specs: { type: 'bookshelf', sensitivity: 70 } },
        center: { specs: { type: 'bookshelf', sensitivity: 70 } },
        surrounds: { specs: { type: 'bookshelf', sensitivity: 70 } },
        rearSurrounds: { specs: { type: 'bookshelf', sensitivity: 70 } },
        overheads: { specs: { sensitivity: 70 } },
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
      amplifierWatts: 1,
      targetCurve: 'flat',
      crossoverHz: 40,
      // Every item moved by hand to the clearance lines.
      manualPositions: {
        L: { x: -0.7, y: 0.3, z: 1.7 },
        R: { x: 0.7, y: 1.7, z: 0.3 },
        Sub1: { x: 0.7, y: 0.3, z: 0.3 },
        MLP: { x: -0.7, y: 1.7, z: 1.2 },
      },
      // The narrowest and shallowest seat row, and the smallest screen, a
      // TV on the floor against the left wall.
      roomObjects: {
        seatRow: { width: 0.5, depth: 0.5 },
        screen: {
          kind: 'tv',
          width: 0.5,
          height: 0.3,
          bottomEdge: 0,
          x: -0.75,
          standoff: null,
        },
      },
    },
  },
  /**
   * The largest room accepted, 15 x 15 x 5 m, with 7.4.4 and the largest
   * subwoofer specs accepted (24 in, 10,000 W RMS, 20,000 W peak), Subwoofer
   * 4 with them as its own, towers of the highest sensitivity (110 dB) in
   * every group, a 5,000 W amplifier, the house curve, the highest
   * crossover accepted (200 Hz), the widest and deepest seat row (8 x 2 m), and Right (at
   * the ceiling clearance), Right Top Rear (on the ceiling), Subwoofer 4
   * and the MLP moved by hand into the corners, and the largest screen at
   * the ceiling and the right wall.
   */
  largestRoom: {
    encoded:
      'N4IgbiBcBMA0IGMD2A7AZgSwOZVAVyhAFsBTAFwCcMER4LcQAbKARgFZ4B3VjkACyhsAvvEYBPBgBNmkEAHYAdCwUAWWiADOUFSJA5IoNAw0AHBmUJkknEvXgaSrFgAYhumgc1nPF2VZt2mo6QLC5u9vSepuaW1rbqDk6uuhRaUd6gviD+8fbBocnwSMYZQUnhmiUMwSAmSBRkJJLqks2QzgoAbM4AnGw9A4NDA3TcIc4TzvAmY9CTrkVpoADKeABGap41DgCGjE0tbR3dfcNnPaOs89Oz824VO2Nsk-BkHvxIeInwAB7FMBN4EQGAAlBg-KCKOAgCQhFQKOTwABe2gRuhBlHBkIU0NhLHhiJAKMgwngqw2WMgAFoofA8QTkVAOgBmXQAWQAMgAFSk0nF0pkKZmMkI4ioUf6gDS+UBjAAc8Da0F0Gg8oAA1oQTBKAFYkBBkDCodTy+ACSAqeBrfK-KDMhS8DT-ZTCe5AA',
    config: {
      units: 'metric',
      room: { length: 15, width: 15, height: 5 },
      layout: { dolbyLayout: '7.1.4', subwoofers: 4 },
      speakerGroups: {
        front: { specs: { type: 'tower', sensitivity: 110 } },
        center: { specs: { type: 'tower', sensitivity: 110 } },
        surrounds: { specs: { type: 'tower', sensitivity: 110 } },
        rearSurrounds: { specs: { type: 'tower', sensitivity: 110 } },
        overheads: { specs: { sensitivity: 110 } },
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
      amplifierWatts: 5000,
      targetCurve: 'house',
      crossoverHz: 200,
      // Right, Right Top Rear, Subwoofer 4 and the MLP moved by hand to the
      // clearance lines.
      manualPositions: {
        R: { x: 7.2, y: 14.7, z: 4.7 },
        Rtr: { x: 7.2, y: 14.7, z: 5 },
        Sub4: { x: -7.2, y: 14.7, z: 0.3 },
        MLP: { x: -7.2, y: 0.3, z: 1.2 },
      },
      // The widest and deepest seat row, and the largest screen,
      // acoustically transparent at the largest standoff, up to the
      // ceiling against the right wall.
      roomObjects: {
        seatRow: { width: 8, depth: 2 },
        screen: {
          kind: 'projection',
          width: 8,
          height: 4,
          bottomEdge: 1,
          x: 3.5,
          standoff: 1.5,
        },
      },
    },
  },
} as const
