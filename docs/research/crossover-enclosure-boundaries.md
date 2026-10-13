# Crossover, enclosure roll-off and boundary interference

Researched 2026-10-13 for issue #12 (boundary interference, crossover, roll-off and the weaknesses list). This file lists where the models' shapes come from and which parts are ours. The AES papers below are paywalled, and their E-Library pages answered 403 to our fetch, so they were read **only through search-engine summaries of their abstracts**; their content is **UNVERIFIED** beyond what those summaries say, and no page is cited. Values the app chooses itself are marked **ours** and live in `src/domain/reference.ts` with a note saying so. Nothing here is a standard, and none of it comes from Dolby.

## 1. Sources

| Key | Title | URL | Status |
|---|---|---|---|
| LR-1976 | S. H. Linkwitz, "Active Crossover Networks for Noncoincident Drivers", J. Audio Eng. Soc. 24(1), pp. 2–8, February 1976 | https://aes2.org/publications/elibrary-page/?id=2649 | Paywalled; abstract via search summaries only |
| RANE-160 | D. Bohn, "Linkwitz-Riley Crossovers: A Primer", RaneNote 160, Rane Corporation, 2005 | https://ranecommercial.com/legacy/note160.html | **Read** |
| SV-BASS | Sound & Vision, "Home Theater Boot Camp: Bass Management" | https://www.soundandvision.com/content/home-theater-boot-camp-bass-management | Answered 403; read only through search summaries, **UNVERIFIED** |
| SMALL-CB | R. H. Small, "Closed-Box Loudspeaker Systems" (Parts I and II), J. Audio Eng. Soc., 1972–1973 | https://aes2.org/publications/elibrary-page/?id=2011 (Part II) | Paywalled; abstract via search summaries only |
| THIELE-VB | A. N. Thiele, "Loudspeakers in Vented Boxes" (Parts I and II), J. Audio Eng. Soc., 1971 | https://aes2.org/publications/elibrary-page/?id=2173 (Part I) | Paywalled; abstract via search summaries only |
| SMALL-VB | R. H. Small, "Vented-Box Loudspeaker Systems", J. Audio Eng. Soc., 1973 | (AES E-Library; id not confirmed) | Paywalled; abstract via search summaries only |
| ALLISON-1974 | R. F. Allison, "The Influence of Room Boundaries on Loudspeaker Power Output", J. Audio Eng. Soc. 22(5/6), 1974 (also AES 48th Convention, paper 951) | https://aes2.org/publications/elibrary-page/?id=2760 | Paywalled; abstract and secondary summaries only. Search results disagree on the issue number |
| STRUCK-2016 | C. J. Struck, "VC Spotlight: Boundary Effects on Sources at Low Frequencies", *Voice Coil*, July 2016 (online at audioXpress, 2017) | https://audioxpress.com/article/vc-spotlight-boundary-effects-on-sources-at-low-frequencies | **Read** |

## 2. Crossover (bass management)

- **LR4** (LR-1976; RANE-160): a 4th-order Linkwitz-Riley crossover is two 2nd-order Butterworth filters in series. Each output is 6 dB down at the crossover frequency and falls at 24 dB/octave; the low- and high-pass outputs are in phase at every frequency, so they sum flat (RANE-160).
- **THX bass management** (SV-BASS, via search summaries only, **UNVERIFIED**): a 24 dB/octave low-pass at 80 Hz for the subwoofer and a 12 dB/octave high-pass for speakers set to "small", relying on the speakers' own 12 dB/octave roll-off, so the acoustic sum is 24 dB/octave on both sides.
- **What the app encodes**: the *acoustic* result as an LR4 crossover at the configured frequency, for every Speaker and Subwoofer. **Ours**: that model choice (no receiver's actual filters are modelled), the 80 Hz default (the v1 spec, issue #2, user story 20), and the accepted range of 40–200 Hz (a product limit, not cited).

## 3. Enclosure roll-off

- **Sealed** (SMALL-CB): a closed-box system behaves as a 2nd-order (12 dB/octave) high-pass filter, set by its resonance frequency and total damping.
- **Ported** (THIELE-VB; SMALL-VB): a vented box behaves as a 4th-order (24 dB/octave) high-pass filter that can be aligned to standard filter responses, a 4th-order Butterworth among them.
- **What the app encodes**: a Butterworth high-pass of that order per subwoofer, multiplied into its own term of the room-mode sum before the subwoofers are added, so a mixed set is modelled per subwoofer. **Ours**: the Butterworth alignment for both, and the corner (−3 dB) frequencies, 30 Hz sealed and 20 Hz ported. The specs hold no corner frequency, and real subwoofers differ per model. Room gain, which in a real room offsets part of the roll-off, is not modelled (see `low-frequency-response.md`).

## 4. Boundary interference (SBIR)

- **Three nearest boundaries** (ALLISON-1974, through its abstract and STRUCK-2016): Allison showed, by theory and measurement, that the floor and walls nearest a loudspeaker change its low-frequency output by several dB depending on placement. STRUCK-2016 reproduces his figure 8 (as STRUCK-2016 numbers it; the original was not seen), the effect of up to three mutually perpendicular boundaries, and puts the response dip, when the boundary distance approaches a quarter wavelength, down to earlier work (Waterhouse, 1955, not read).
- **Notch frequencies** (textbook geometry, no source needed): a reflection that travels Δ further than the direct sound cancels it partly where Δ is an odd number of half wavelengths, f = (2k + 1)·c/(2Δ). For the wall behind a speaker d away, heard on its axis, Δ ≈ 2d and the first notch is the quarter-wave one, f = c/(4d).
- **What the app encodes** (all **ours** except the three-boundary idea):
  - First-order image sources only, summed with the direct sound with their extra delay and 1/r spreading loss.
  - The surfaces: the wall behind the speaker (the first wall a ray opposite its aim meets), the nearest other wall (both side walls when they are equally near, as for the Center), and the nearer of the floor and ceiling.
  - Reflection coefficient 1 (rigid surfaces), as in the room-mode model. Real notches are shallower.
  - Omnidirectional speakers. Real cabinets send less sound backwards as the frequency rises, so notches from the wall behind are overstated toward 500 Hz.
  - The chart's Speakers' part is the front three, Left, Center and Right (the Center usually sits nearest the front wall), power averaged; every other listener-level speaker's own deepest notch is listed in the weaknesses.

## 5. Adding the subwoofers and the speakers (ours)

- Each part is set to 0 dB averaged over its own pass band (the subwoofers over their reliable rows up to the crossover, the speakers from the crossover up), like a receiver's level calibration. The sum is then shifted so its average deviation from the target over the reliable rows is 0 dB. These three offsets are worked out at the MLP, as a receiver calibrates there, and kept fixed for other seats (the seat score, #14), so a seat with weaker bass than the MLP shows it.
- The parts are then added through the LR4 filters, in phase, as if the receiver's distance setting had time-aligned them. Only each part's magnitude comes from the room, so the crossover region is smoother than a real room's.
- The room-mode model runs only up to 200 Hz (ADR 0002's room-mode range). Above it the subwoofers are flat at their level, and there they are mostly crossed out. This also keeps the seat-score grid (#14) fast: scoring 20 × 20 seats in the largest room with 4 subwoofers and 3 speakers takes about 0.7 s under Vitest.

## 6. Weaknesses and strengths (ours)

Matching a peak or dip to its likely cause is our own rule of thumb (`RESPONSE_NOTES` in `reference.ts`): a room mode within 5% (or one modal bandwidth), the MLP "near a node" below a relative mode pressure of 0.3, and a reflection's notch or boost within 10%. A dip up to 1.25 × the enclosure's corner frequency that no mode explains goes down to the roll-off. A peak or dip deepest at the first or last reliable row (such as the default room's dip running into the 502 Hz top of the chart) is left out, as its center lies outside the chart. The list says these are likely causes in a simplified model, not a diagnosis.
