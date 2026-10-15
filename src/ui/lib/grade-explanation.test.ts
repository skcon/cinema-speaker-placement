import { describe, expect, it } from 'vitest'
import { analyzeRoom, DEFAULT_CONFIG } from '@/domain'
import { explainGrade, formatCitation } from '@/ui/lib/grade-explanation'

const IG_TITLE = 'Dolby Atmos Home Theater Installation Guidelines (60 pp.)'
const IG_URL =
  'https://www.dolby.com/siteassets/technologies/dolby-atmos/atmos-installation-guidelines-121318_r3.1.pdf'

describe('formatCitation', () => {
  it('names a one-page sheet by its title and links it', () => {
    expect(formatCitation({ source: 'S-512-OH' })).toEqual({
      title: 'Home Theater Speaker Guide: 5.1.2 Overhead Speakers',
      url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.2-overhead-speaker-placement/5_1_2_overhead_speakers_setup.pdf',
      detail: null,
    })
  })

  it('gives the page and figure of a multi-page document', () => {
    expect(formatCitation({ source: 'IG', page: 8, figure: 'fig.2' })).toEqual({
      title: IG_TITLE,
      url: IG_URL,
      detail: 'p.8, fig.2',
    })
  })

  it('adds the citation’s note after the page', () => {
    expect(
      formatCitation({
        source: 'IG',
        page: 8,
        note: 'fig.3, the 7.1.4 reference: 30° nominal, range 22°–40°',
      }),
    ).toEqual({
      title: IG_TITLE,
      url: IG_URL,
      detail: 'p.8: fig.3, the 7.1.4 reference: 30° nominal, range 22°–40°',
    })
  })

  it('gives a page span noted as "pp." instead of the first page', () => {
    expect(
      formatCitation({ source: 'IG', page: 27, note: 'pp.27–28' }),
    ).toEqual({ title: IG_TITLE, url: IG_URL, detail: 'pp.27–28' })
  })

  it('names a general acoustics reference without a link', () => {
    expect(
      formatCitation({ generalReference: 3, note: 'a heuristic' }),
    ).toEqual({
      title: 'General acoustics reference 3 in our research notes',
      url: null,
      detail: 'a heuristic',
    })
  })
})

// The default room has the 5.1.2 layout (S-512-OH, S-512-EN, IG pp.27–28).
const S512_OH = {
  title: 'Home Theater Speaker Guide: 5.1.2 Overhead Speakers',
  url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.2-overhead-speaker-placement/5_1_2_overhead_speakers_setup.pdf',
  detail: null,
}
const S512_EN = {
  title: 'Home Theater Speaker Guide: 5.1.2 Dolby Atmos Enabled Speakers',
  url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.2-dolby-atmos-enabled-speaker-placement/5_1_2_atmos_enabled_speaker_setup.pdf',
  detail: null,
}
const IG_PP_27_28 = { title: IG_TITLE, url: IG_URL, detail: 'pp.27–28' }

function defaultRoom() {
  return analyzeRoom(DEFAULT_CONFIG)
}

describe('explainGrade', () => {
  it('explains Left in the default room: 26°, ideal, with both ranges, the conflict and the sources', () => {
    const left = defaultRoom().speakers.find(({ channel }) => channel === 'L')

    expect(
      explainGrade({ kind: 'speaker', check: left!.placementRange }),
    ).toEqual({
      graded: true,
      grade: 'ideal',
      angles: [
        {
          name: 'Angle',
          measuredAs:
            'From the MLP, from straight ahead at the screen, on the speaker’s own side.',
          grade: 'ideal',
          reading: '26°, ideal',
          ranges: [
            {
              name: 'Ideal range',
              range: '22–30°',
              sources: [S512_OH, S512_EN, IG_PP_27_28],
              note: null,
              assumption: null,
            },
            {
              name: 'Acceptable range',
              range: '22–40°',
              sources: [
                {
                  title: IG_TITLE,
                  url: IG_URL,
                  detail:
                    'p.8: fig.3, the 7.1.4 reference: 30° nominal, range 22°–40°',
                },
              ],
              note:
                'Conflict in the Dolby data: every per-layout sheet shows L/R at ' +
                '22°–30°, while IG fig.3 shows 30° nominal with a 22°–40° range ' +
                '(and IG p.7 uses ±30° as the L/R reference).',
              assumption:
                "Our modelling assumption, not Dolby's: the sheets set the ideal " +
                'range, and IG fig.3 widens it to acceptable for every layout.',
            },
          ],
          note: null,
        },
      ],
    })
  })

  it('says a channel with only a single Dolby range has no acceptable range', () => {
    const center = defaultRoom().speakers.find(({ channel }) => channel === 'C')

    const explanation = explainGrade({
      kind: 'speaker',
      check: center!.placementRange,
    })

    expect(explanation.graded && explanation.angles[0]?.ranges).toEqual([
      expect.objectContaining({ name: 'Ideal range', range: '0°' }),
      {
        name: 'Acceptable range',
        range: null,
        sources: [],
        note: 'Dolby gives no wider range',
        assumption: null,
      },
    ])
  })

  it('explains a top middle speaker: its elevation range and source, and that its angle has no Dolby range', () => {
    const ltm = defaultRoom().overheads.find(({ channel }) => channel === 'Ltm')

    const explanation = explainGrade({
      kind: 'overhead',
      check: ltm!.placementRange,
    })

    expect(explanation).toEqual({
      graded: true,
      grade: 'ideal',
      angles: [
        {
          name: 'Angle',
          measuredAs:
            'From the MLP, from straight ahead at the screen, on the speaker’s own side.',
          grade: null,
          reading: expect.stringMatching(/^\d+°, not graded$/) as string,
          ranges: [],
          note:
            'Dolby gives top middle speakers (x.1.2 layouts) no angle range ' +
            'from straight ahead: S-512-OH and S-712-OH draw them ahead of ' +
            'the seat, in line with L/R. So only their elevation is graded.',
        },
        {
          name: 'Elevation',
          measuredAs:
            'From the MLP, seen from the side: 0° straight ahead, 90° overhead, 180° straight behind.',
          grade: 'ideal',
          reading: expect.stringMatching(/^\d+°, ideal$/) as string,
          ranges: [
            {
              name: 'Ideal range',
              range: '65–100°',
              sources: [
                S512_OH,
                {
                  title: 'Home Theater Speaker Guide: 7.1.2 Overhead Speakers',
                  url: 'https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.2-overhead-speaker-placement/7_1_2_overhead_speaker_setup.pdf',
                  detail: null,
                },
              ],
              note: 'Dolby states no ideal angle inside the range.',
              assumption: null,
            },
            {
              name: 'Acceptable range',
              range: null,
              sources: [],
              note: 'Dolby gives no wider range',
              assumption: null,
            },
          ],
          note: null,
        },
      ],
    })
  })

  it('says a subwoofer is not graded, and why', () => {
    expect(explainGrade({ kind: 'subwoofer' })).toEqual({
      graded: false,
      reason:
        'Dolby gives subwoofers no position or angle: bass is hard to place ' +
        'by ear, so a subwoofer can go almost anywhere. Auto-place puts the ' +
        'subwoofers where a Harman study of one test room found the bass ' +
        'most even across the seats, scaled to your room.',
      sources: [
        {
          title: 'Dolby Atmos Speaker Setup 101 (web page)',
          url: 'https://www.dolby.com/about/support/guide/dolby-atmos-speaker-setup/',
          detail: null,
        },
        {
          title:
            'T. Welti (Harman International), "Subwoofers: Optimum Number and Locations", Harman white paper (slides with notes, 80 slides on 30 pages)',
          url: 'https://www.harman.com/Documents/multsubs.pdf',
          detail: null,
        },
      ],
    })
  })
})
