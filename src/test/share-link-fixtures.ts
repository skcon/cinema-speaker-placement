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
 * back right corner, a 9 x 5 ft acoustically transparent projection
 * screen 2 ft off the floor and 18 in in front of the front wall, moved
 * left of centre, a 4 x 1 x 6 ft bookshelf turned against the left
 * wall near the back, a 32 in door on the left wall and a 5 x 4 ft window
 * 3 ft up on the back wall: nothing at its default, but for Speakers
 * follow the seat (on).
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
  speakersInstalledFor: null,
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
    furniture: [
      // To the millimeter, as share links store furniture. Turned, so its
      // depth runs across: its back against the left wall.
      {
        name: 'Bookshelf',
        width: 1.219,
        depth: 0.305,
        height: 1.829,
        x: -2.347,
        y: 6.5,
        rotation: 90,
      },
    ],
    // To the millimeter, as share links store openings.
    openings: [
      { kind: 'door', wall: 'left', position: 4.2, width: 0.813 },
      {
        kind: 'window',
        wall: 'back',
        position: 2.5,
        width: 1.524,
        sill: 0.914,
        height: 1.219,
      },
    ],
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
 * Seven small furniture boxes in a row along the front of the largest
 * room, each with a 12-character name, for its fixture's eight boxes.
 */
const FURNITURE_ROW = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  name: `Plant pot 0${n}`,
  width: 0.4,
  depth: 0.4,
  height: 0.6,
  x: -7 + n,
  y: 1,
  rotation: 0,
})) as readonly {
  name: string
  width: number
  depth: number
  height: number
  x: number
  y: number
  rotation: 0
}[]

/**
 * Version 2 share links as v1.1.0 and v1.2.0 write them (their encoded
 * configs), with the config each one holds: the version 1 links' configs
 * as the migration to version 2 gives them (their seat row width as a
 * 0.9 m deep seat row, and no other room objects), except that the two on
 * the edges of the ranges also have a seat row depth, a screen, furniture
 * boxes and openings on the edges of their ranges. Version 2 is released
 * (v1.1.0), so never edit these: if one stops opening, links people
 * already shared no longer open, and the schema change needs a new version
 * and a migration (ADR 0003).
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
      'N4IgbiBcBMA0IGMD2A7AZgSwOZVAVyhAwFsAHAUwCcMBDAGxHktxAcgHYA6AZgEYBWOCADuUACyd+7IQAso0TuzHdoAX3h0AniwAmbEF16dojEAGd56kDkig0LM6RYAXQs6TCqps+SgBOAAZVKwQHJ1sQV0gQACMkJABrMxlyOnt4HygADizJYIzmCMcXQjjE5NT0819ILIA2fJBKCyLw0CjY+KSUtO8a+sakMId+-kaW0GKImpBSJEpnch1THWXIAJ5uAKFKUUgxfgD4Uj3AoPgkCZAAZTwYk2nCH3ollbWN6H4xJj3Po9m9ocgsErDQ9rxPvBnKFojIkHhMvAAB5DSAQ-7EXBWSioyZRUB7bicAJiLLwd6cPxWMwwlB4Oh0eBoAiQADaAF0LuEOSCgA',
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
      roomObjects: {
        seatRow: { width: 3.048, depth: 0.9 },
        screen: null,
        furniture: [],
        openings: [],
      },
    },
  },
  /**
   * The smallest room accepted, 2 x 2 x 2 m, with 2.1 and the smallest
   * subwoofer specs accepted (6 in, 10 W RMS and peak), the lowest
   * sensitivity (70 dB) for every speaker group, a 1 W amplifier, the lowest
   * crossover accepted (40 Hz), the narrowest and shallowest seat row (0.5 x 0.5 m), and every
   * item moved by hand to the
   * clearance lines, Left to the ceiling's and Right to the floor's,
   * the smallest screen at the floor and the left wall, and the smallest
   * furniture box, with a one-letter name, turned three times into the
   * back left corner, the narrowest door in the front left corner and the
   * smallest window up against the ceiling in the back right corner.
   */
  smallestRoom: {
    encoded:
      'N4IgbiBcBMA0IGMD2A7AZgSwOZVAVyhAFsBTAFwCcMER4LcQAbKOEAdxfgAsWBfeRgE8GAE2aQQ0AHQBGWiADOUGfxA5IoNAwUAHBmUIAjJEgDWCriUZb4CklADsABl6qaGxXo8GJxsxasbRXtIZ1dbeg9dfSMTc0treTtHF1UKJSivUB8QP3jApJCw1SRtLOCU8MUyhhDggENGEhF5ERbIJ1kAVmgAZgBOQaHhwYAOOg5IGSd4HUnpkozgV1V6+fgydxA0RnqDeAAPUsgAFhniBgAZBgOoAFpOh3hhDqle+AAvZSkHVQAlG5QR7Pb5PEBfV69VQAZTwhjkHlurzBL0673BQLeqgAspcAAqAyAPH4gqYkjFk6BVCjHUAKHygSadLrwdrM1QKdygUyEMgQeBMqQskA8SHwQwhc5I4kOYUKY4oPCMRiqNAESAAbVAKEIAEF5IKZKzMUaRSbDvdOv1hS8ZFJrXQfNAwgBdeBILwajXvGRdGa9JxON0alkyUZ+2ABmZhwOwaCBl0ulZAA',
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
      // The narrowest and shallowest seat row, the smallest screen, a TV
      // on the floor against the left wall, and the smallest furniture box
      // in the back left corner.
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
        furniture: [
          {
            name: 'A',
            width: 0.1,
            depth: 0.1,
            height: 0.1,
            x: -0.95,
            y: 1.95,
            rotation: 270,
          },
        ],
        openings: [
          { kind: 'door', wall: 'left', position: 0.15, width: 0.3 },
          {
            kind: 'window',
            wall: 'right',
            position: 1.85,
            width: 0.3,
            sill: 1.8,
            height: 0.2,
          },
        ],
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
   * and the MLP moved by hand into the corners, the largest screen at
   * the ceiling and the right wall, the most furniture boxes, each
   * with the longest name, the first one the largest box, in the back
   * right corner, and the most openings on every wall, the first the
   * largest window, floor to ceiling in the front right corner.
   */
  largestRoom: {
    encoded:
      'N4IgbiBcBMA0IGMD2A7AZgSwOZVAVyhAFsBTAFwCcMER4LcQAbKARgFZ4B3VjkACyhsAvvEYBPBgBNmkEAHYAdCwUAWWiADOUFSJA5IoNAw0AHBmUJkknEvXgaSrFgAYhumgc1nPF2VZt2mo6QLC5u9vSepuaW1rbqDk6uuhRaUd6gviD+8fbBocnwSMYZQUnhmiUMwSAmSBRkJJLqks2QzgoAbM4AnGw9A4NDA3TcIc4TzvAmY9CTrkVpoADKeABGap41DgCGjE0tbR3dfcNnPaOs89Oz824VO2Nsk-BkHvxIeInwAB7FMBN4EQGAAlBg-KCKOAgCQhFQKOTwABe2gRuhBlHBkIU0NhLHhiJAKMgwngqw2WMgAFoofA8QTkVAOgBmXQAWQAMgAFSk0nF0pkKZmMkI4ioUf6gDS+UBjAAc8Da0F0Gg8oAA1oQTBKAFYkBBkDCodTy+ACSAqeBrfK-KDMhS8DT-ZSkkBoAiQADaoBQhAA6ntGAACDR8EiMMAkLRcKAKkBtOPm3gQyD23h4lh0XwLH2ELmMHYoMhBurF5wsE2Cy3xqtmwWdW3Uhsw1hZpkiXOyfOF4uloPOaCV9qqRW1-j1xtU9OtkANduwTsgbtFktIMvMocdatHEfj4fNlNU6t4tvtDsgX1dgsrvvONQx4fbsfm46T4UtkKnnMXvPX3tr-s2E3Xcd2rF8uknXEZznM8Fx-K8e1XMtOmAp9HzrfdJ0zD9sJg79LyXP8kP7ORUNHdC91fEAUymHCvyEABdIpvE9T1LQKQE5ReKZngmJjPUzFQXi4vjYE9OA5F42AelEz1hXxNhnmk2SGzmQEWDU5Spg02TEV4qY1KmZkXkMhiGPuIA',
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
      // The widest and deepest seat row, the largest screen,
      // acoustically transparent at the largest standoff, up to the
      // ceiling against the right wall, eight furniture boxes with
      // 12-character names, the first the largest in the back right corner,
      // and six openings.
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
        furniture: [
          {
            name: 'Wall shelves',
            width: 8,
            depth: 8,
            height: 5,
            x: 3.5,
            y: 11,
            rotation: 0,
          },
          ...FURNITURE_ROW,
        ],
        openings: [
          {
            kind: 'window',
            wall: 'front',
            position: 11,
            width: 8,
            sill: 0,
            height: 5,
          },
          { kind: 'door', wall: 'right', position: 4, width: 8 },
          { kind: 'door', wall: 'back', position: 7.5, width: 0.9 },
          { kind: 'door', wall: 'left', position: 14.55, width: 0.9 },
          {
            kind: 'window',
            wall: 'back',
            position: 2,
            width: 1.2,
            sill: 0.9,
            height: 1.2,
          },
          {
            kind: 'window',
            wall: 'left',
            position: 5,
            width: 2,
            sill: 3,
            height: 2,
          },
        ],
      },
    },
  },
} as const

/**
 * A version 2 fixture's config with `speakersInstalledFor`, in the order
 * the config schema has its fields (before the room objects), as the app
 * writes a version 3 link.
 */
function inVersion3<C extends { readonly roomObjects: unknown }, P>(
  { roomObjects, ...config }: C,
  speakersInstalledFor: P,
): Omit<C, 'roomObjects'> & {
  readonly speakersInstalledFor: P
  readonly roomObjects: C['roomObjects']
} {
  return { ...config, speakersInstalledFor, roomObjects }
}

/**
 * Version 3 share links as the 1.3.1 release cycle writes them (their
 * encoded configs), with the config each one holds: the version 2 links'
 * configs with Speakers follow the seat on, as the migration to version 3
 * gives them, except that the two on the edges of the ranges have the
 * auto speakers installed for a seat in another corner of the MLP's
 * clearance lines, and one more has them held for the auto MLP while the
 * MLP was moved back. Once version 3 is released, never edit these: if one
 * stops opening, links people already shared no longer open, and the
 * schema change needs a new version and a migration (ADR 0003).
 */
export const V3_LINKS = {
  /** The version 1 and 2 imperial room (24 x 15 x 9 ft, 7.2.2), as is. */
  imperialRoom: {
    encoded:
      'N4IgbiBcDMA0IGMD2A7AZgSwOZVAVyhAwFsAHAUwCcMBDAGxHktxAcgHYA6aARgFYATPADuUACyc+7ISAAWUAZ3ZjoAgL7w6ATxYATNiC49OAxiADOCjSByRQaFudIsALoRdJhVM+fJQAnAAMatYIjs52IG6QIABGSEgA1uay5HQO8L5QABzZkiGZzJFOroTxSSlpGRZ+kNkAbAUglJbFEaDRcQnJqek+tQ1NSOGOA3xNraAlkbUgpEiULuS6ZrorkIHc0IEylKKQYnyB8KT7QcHwSJMgAMp4saYzhL70y6vrmwJ8Ykz7X8dzfZHYIhaw0fY8L7wFxhGKyJB4LLwAAew0gkIBxFw1nMGCgKDwdDoTDRU2ioH20E4gTE2XgH04-hxsIJRPgaAIkAA2gBdS4RXmgoA',
    config: inVersion3(V2_LINKS.imperialRoom.config, null),
  },
  /**
   * The imperial room with Speakers follow the seat off: the auto
   * speakers held for the auto MLP (2.78 m from the front wall, to the
   * millimeter), and the MLP moved by hand 0.7 m back and 0.4 m right.
   */
  speakersHeld: {
    encoded:
      'N4IgbiBcDMA0IGMD2A7AZgSwOZVAVyhAwFsAHAUwCcMBDAGxHktxAcgHYA6aARgFYATPADuUACyc+7ISAAWUAZ3ZjoAgL7w6ATxYATNiC49OAxiADOCjSByRQaFudIsALoRdJhVM+fJQAnAAMatYIjs52IG6QIABGSEgA1uay5HQO8L5QABzZkiGZzJFOroTxSSlpGRZ+kNkAbAUglJbFEaDRcQnJqek+tQ1NSOGOA3xNraAlkbUgpEiULuS6ZrorkIHc0IEylKKQYnyB8KT7QcHwSJMgAMp4saYzhL70y6vrmwJ8Ykz7X8dzfZHYIhaw0fY8L7wFxhGKyJB4LLwAAew0gkIBxBYAFkADIABRYyKgmx+IB0ME4Ymy8AAXlBjOprOYMESSfAKYp2DSQPT0SZrJQ0VNoqB9tBOIFqfAPpx-MzYSg8HQ6PA0ARIABtAC6lwiOtBQA',
    config: inVersion3(
      {
        ...V2_LINKS.imperialRoom.config,
        manualPositions: { MLP: { x: 0.4, y: 3.48, z: 1.2 } },
      },
      { x: 0, y: 2.78, z: 1.2 },
    ),
  },
  /**
   * The smallest room of the version 2 links, the auto speakers installed
   * for the front right corner of the MLP's clearance lines.
   */
  smallestRoom: {
    encoded:
      'N4IgbiBcDMA0IGMD2A7AZgSwOZVAVyhAFsBTAFwCcMER4LcQAbKAJngHdX4ALVgX3iMAngwAmzSCBYA6AIy0QAZyiyBIHJFBoGigA4MyhAEZIkAa0XcSjbfEUkoAdgAMfNTU1L9nw5JPnLa1slB0gXNzt6Tz0DY1MLKxsFeydXNQplaO9QXxB-BKDk0PC1JB1skNSIpXKGUJCAQ0YSUQVRVshnOQBWFmgATkGh4cGADjpOSFlneF1J6dLM4Dc1Bvn4Mg8QNEYGw3gADzLIABYZ4gYAGQYDqABaLsd4EU7pOBAALxVpRzUAJRuUEez2+T0+QLeagAyngjPJPLdXmCXl13l9XtA1ABZS4ABUBkAePxBU2J4NJLGqigwBOBIBRb3g6Nk0kpdGOoEUvlAky63XgHT5akUHlAZkIZAgHAh-JAvAx8CMoXOiKJjllimOKDwjEYajQBEgAG1QChCABBBS8uQCiGyHh2w73Lr9WUvFmuui+FjhAC68CQ3iNRrgsm6M2gzmc-qN-Nko3DsEjM3jUdgLCjvt9KyAA',
    config: inVersion3(V2_LINKS.smallestRoom.config, {
      x: 0.7,
      y: 0.3,
      z: 1.2,
    }),
  },
  /**
   * The largest room of the version 2 links, the auto speakers installed
   * for the back right corner of the MLP's clearance lines.
   */
  largestRoom: {
    encoded:
      'N4IgbiBcDMA0IGMD2A7AZgSwOZVAVyhAFsBTAFwCcMER4LcQAbKARgFZ4B3VjkACyhsAvvEYBPBgBNmkEAHYAdCwUAWWiADOUFSJA5IoNAw0AHBmUJkknEvXgaSrFgAYhumgc1nPF2VZt2mo6QLC5u9vSepuaW1rbqDk6uuhRaUd6gviD+8fbBocnwSMYZQUnhmiUMwSAmSBRkJJLqks2QzgoAbM4AnGw9A4NDA3TcIc4TzvAmYwBMk65FaaAAyngARmqeNQ4AhoxNLW0d3X3D5z2jrAvTcwtuFbtjbJPwZB78SHiJ8AAexZB5lNiAwAEoMX5QRSzeASEIqBRyeAAL20iN0oMoEKhChhIDhLARSJAqMgwnga022MgAFpobDWESUVAOtBdABZAAyAAVqXTcQz2go4CTWLiKhoMNT6fjGYjmSFxXQAaANL5QGMABzwNqzXQaDygADWhBMFCQACsSAgyBhUOotfABJAVPB1vk-lBoApeBoAcpySA0ARIABtUAoQgAdX2jAABBo+CRGGASFouFBtSA2lnnbxITAfYLQnRfIsI4RuYxdigyHG6nXnCwHSzVDrW67+K3Op7aT3ZSFSyyRBXZFWa3WG3HnLMW0LO8c212hf2CzTeASh+0RyBI2Pq7X60hG9A5x0Fx2nd3ezTO5uQA1h7BRyBx4ep841Bn5+2f8uTjeIr3o+27PrulYHpOx7TmwZ5LounbOgBIBrniwFljue6vpBR6Np0cEXn+SFdDeLDFlu5bgfuE64dOcgEb+55XiuvbAuhw4ALpFN4oahq6BQTLAmqvFMLwTFxoZkSorzCeJsChjCchibAPRyaGcCEmwLwqWpPZAlMLBAjpBlAhJSJiVM+mwNArz6RxHEPEAA',
    config: inVersion3(V2_LINKS.largestRoom.config, {
      x: 7.2,
      y: 14.7,
      z: 1.2,
    }),
  },
} as const
