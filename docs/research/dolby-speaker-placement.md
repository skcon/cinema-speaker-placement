# Dolby home theater speaker placement: primary-source notes

Researched 2026-10-11. Everything below is paraphrased from Dolby's own public documents, which are hosted on dolby.com and professional.dolby.com. Local copies are kept in `docs/research/sources/` (gitignored). Most of the angle numbers appear only as labels inside diagrams, so they were read off rendered page images, not taken from extracted text. Anything not confirmed in a Dolby source is marked **UNVERIFIED**.

## Conventions used in this file

- **Azimuth**: horizontal angle seen from the main listening position (MLP). 0° points at the center speaker or the middle of the screen; Dolby calls this line the "center-front reference". Values apply to each side of the room (±). Dolby gives each range as two numbers, for example "22°–30°", drawn as an arc between two lines.
- **Elevation (Dolby side-view convention)**: in the per-layout sheets and the installation guide, height angles are measured in the vertical plane from the *front* horizontal. 0° is straight ahead at ear level, 90° is directly overhead and 180° is straight behind. So a "top rear" speaker at 135° sits 45° above the horizon, behind the listener. For code, convert values above 90° to `180° − x` above the rear horizon.
- **Citation keys**: `IG p.N` means page N of the Installation Guidelines PDF (the printed page number equals the PDF page index). `WP p.N` is the white paper. Each per-layout sheet has one page, so it is cited by its sheet key (for example `S-714-OH`).

## 1. Sources

| Key | Title | URL | Date / version | Local file |
|---|---|---|---|---|
| IG | Dolby Atmos Home Theater Installation Guidelines (60 pp.) | https://www.dolby.com/siteassets/technologies/dolby-atmos/atmos-installation-guidelines-121318_r3.1.pdf | "Dec 2018", r3.1 (PDF modified 2018-12-13; footer says © 2016) | `atmos-installation-guidelines-121318_r3.1.pdf` |
| WP | Dolby Atmos for the Home Theater (white paper, 15 pp.) | https://professional.dolby.com/siteassets/tv/home/dolby-atmos/dolby-atmos-for-home-theater.pdf | PDF created 2016-10-11 | `dolby-atmos-for-home-theater.pdf` |
| SB | Dolby Atmos for the home: Sound bar setup guide (7 pp.) | https://professional.dolby.com/siteassets/tv/home/dolby-atmos/dolby-atmos_sound-bar-setup-guide.pdf | December 2017 | `dolby-atmos_sound-bar-setup-guide.pdf` |
| QSG | Dolby Vision and Dolby Atmos home entertainment setup guide | https://www.dolby.com/siteassets/about/support/guide/setup-guides/atmos-vision-setup-qsg-r9.pdf | r9, PDF 2019-02-05 | `atmos-vision-setup-qsg-r9.pdf` (consumer quick-start; no placement numbers beyond IG) |
| WEB101 | Dolby Atmos Speaker Setup 101 (web page) | https://www.dolby.com/about/support/guide/dolby-atmos-speaker-setup/ | fetched 2026-10-11 | `dolby-atmos-speaker-setup-101.html` |
| IDX | Dolby Atmos Speaker Setup Guides (index page) | https://www.dolby.com/about/support/guide/speaker-setup-guides/ | fetched 2026-10-11 | not saved |
| S-21 | Home Theater Speaker Guide: 2.1 Virtual Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/2.1-virtual-speakers/2_1_virtual_speakers.pdf | 2020-03-25 | `2_1_virtual_speakers.pdf` |
| S-31 | ... 3.1 Virtual Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/3.1-virtual-speakers-setup/3_1_virtual_speaker_setup.pdf | 2020-03-25 | `3_1_virtual_speaker_setup.pdf` |
| S-41 | ... 4.1 Virtual Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/4.1-virtual-speakers-setup/4_1_virtual_speaker_setup.pdf | 2020-03-25 | `4_1_virtual_speaker_setup.pdf` |
| S-51 | ... 5.1 Virtual Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1-virtual-speakers-setup/5_1_virtual_speaker_setup.pdf | 2020-03-25 | `5_1_virtual_speaker_setup.pdf` |
| S-71 | ... 7.1 Virtual Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1-virtual-speakers-setup/7_1_virtual_speaker_setup.pdf | 2020-03-25 | `7_1_virtual_speaker_setup.pdf` |
| S-91 | ... 9.1 Virtual Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/9.1-virtual-speakers-setup/sell-sheet-9.1-virtual.pdf | 2018-10-31 | `sell-sheet-9.1-virtual.pdf` |
| S-512-OH | ... 5.1.2 Overhead Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.2-overhead-speaker-placement/5_1_2_overhead_speakers_setup.pdf | 2020-03-25 | `5_1_2_overhead_speakers_setup.pdf` |
| S-512-EN | ... 5.1.2 Dolby Atmos Enabled Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.2-dolby-atmos-enabled-speaker-placement/5_1_2_atmos_enabled_speaker_setup.pdf | 2020-03-25 | `5_1_2_atmos_enabled_speaker_setup.pdf` |
| S-514-OH | ... 5.1.4 Overhead Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.4-overhead-speaker-placement/sell-sheet-5.1.4-mounted.pdf | 2017-06-22 | `sell-sheet-5.1.4-mounted.pdf` (image only, no text layer) |
| S-514-EN | ... 5.1.4 Dolby Atmos Enabled Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.4-dolby-atmos-enabled-speaker-placement/5_1_4_atmos_enabled_speaker_setup.pdf | 2020-03-25 | `5_1_4_atmos_enabled_speaker_setup.pdf` |
| S-514-HY | ... 5.1.4 Hybrid (front enabled / rear overhead) | https://www.dolby.com/siteassets/about/support/guide/setup-guides/5.1.4-hybrid-dolby-atmos-enabled--overhead-speaker-placement/5_1_4_hybrid_overhead.pdf | 2020-03-25 | `5_1_4_hybrid_overhead.pdf` |
| S-712-OH | ... 7.1.2 Overhead Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.2-overhead-speaker-placement/7_1_2_overhead_speaker_setup.pdf | 2020-03-25 | `7_1_2_overhead_speaker_setup.pdf` |
| S-712-EN | ... 7.1.2 Dolby Atmos Enabled Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.2-dolby-atmos-enabled-speaker-placement/7_1_2_atmos_enabled_speaker_setup.pdf | 2020-03-25 | `7_1_2_atmos_enabled_speaker_setup.pdf` |
| S-714-OH | ... 7.1.4 Overhead Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.4-overhead-speaker-placement/7_1_4_overhead_speaker_setup.pdf | 2020-03-25 | `7_1_4_overhead_speaker_setup.pdf` |
| S-714-EN | ... 7.1.4 Dolby Atmos Enabled Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.4-dolby-atmos-enabled-speaker-placement/7_1_4_atmos_enabled_speaker_setup.pdf | 2020-03-25 | `7_1_4_atmos_enabled_speaker_setup.pdf` |
| S-714-HY | ... 7.1.4 Hybrid (front enabled / rear overhead) | https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.4-hybrid-dolby-atmos-enabled--overhead-speaker-placement/7_1_4_hybrid_dolby_atmos_enabled_overhead_speaker_placement.pdf | 2020-03-25 | `7_1_4_hybrid_dolby_atmos_enabled_overhead_speaker_placement.pdf` |
| S-912-OH | ... 9.1.2 Overhead Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/9.1.2-overhead-speaker-placement/9_1_2_overhead_speaker_setup.pdf | 2020-03-25 | `9_1_2_overhead_speaker_setup.pdf` |
| S-914-OH | ... 9.1.4 Overhead Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/9.1.4-overhead-speaker-placement/9_1_4_overhead_speaker_setup.pdf | 2020-03-25 | `9_1_4_overhead_speaker_setup.pdf` |
| S-916-OH | ... 9.1.6 Overhead Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/9.1.6-overhead-speaker-placement/9_1_6_overhead_speaker_setup.pdf | 2020-03-25 | `9_1_6_overhead_speaker_setup.pdf` |
| S-1118-OH | ... 11.1.8 Overhead Speakers | https://www.dolby.com/siteassets/about/support/guide/setup-guides/11.1.8-mounted-overhead-speakers-setup-guide/sell-sheet-11.1.8-mounted2.pdf | 2018-10-11 | `sell-sheet-11.1.8-mounted2.pdf` |

The HTML landing pages for each sheet follow the pattern `https://www.dolby.com/about/support/guide/speaker-setup-guides/<layout>-<overhead|dolby-atmos-enabled|hybrid-atmos-overhead|virtual-speakers>-speaker[s]-setup-guide/`. Every landing page carries the same instruction: pick a central seat, aim the speakers at it, and keep them at seated ear height unless the sheet says otherwise.

The IG reproduces all of these sheets (IG pp.17–50; figures 11–26 cover 5.1.2 to 9.1.4).

## 2. Channel naming (Dolby's own terms)

| Domain id (suggested) | Dolby name | Dolby abbreviation | Where |
|---|---|---|---|
| L / R | left / right speakers | L, R | IG p.8 fig.3 |
| C | center speaker | C | IG p.8 |
| LFE / Sub | subwoofer; Low-Frequency Effects | LFE (signal) | IG p.16; sheets |
| Ls / Rs | left / right surround | Ls, Rs | IG p.8 |
| Lrs / Rrs | left / right rear surround | Lrs, Rrs | IG p.8 |
| Lw / Rw | left / right wide | **UNVERIFIED** abbreviation (only the spelled-out name appears in IG p.51 and S-912/S-916/S-91) | IG p.51 |
| Ltf / Rtf | left / right top front (overhead) | Ltf, Rtf | IG p.3, p.8 fig.2 |
| Ltm / Rtm | left / right top middle (overhead) | **UNVERIFIED** abbreviation (spelled out in IG p.51 and S-512/S-712/S-912/S-916) | IG p.51 |
| Ltr / Rtr | left / right top rear (overhead) | Ltr, Rtr | IG p.8 fig.2 |
| Lfh / Rfh | left / right front height (wall-mounted, Pro Logic IIz style) | Lfh, Rfh | IG p.57 fig.34 |
| Lrh / Rrh | left / right rear height (wall-mounted) | Lrh, Rrh | IG p.58 fig.36 |
| Lc / Rc | left / right center | Lc, Rc | IG p.52 fig.27 |
| Lscr / Rscr | left / right screen | figure label reads "Lsc/Rsc" | IG p.53 fig.28 |
| Ls1 / Rs1, Ls2 / Rs2 | left / right surround 1, 2 | Ls1, Rs1, Ls2, Rs2 | IG pp.53–54 |
| Lrs1 / Rrs1, Lrs2 / Rrs2 | left / right rear surround 1, 2 | Lrs1, Rrs1, Lrs2, Rrs2 | IG p.55 |
| Lcs / Rcs | left / right center surround | Lcs, Rcs | IG p.56 fig.33 |
| Cs | center surround | **UNVERIFIED** abbreviation | IG p.56 |
| (enabled) | "left & right front Dolby Atmos enabled speakers", "left & right rear Dolby Atmos enabled surround speakers" | none | S-514-EN, S-714-EN |

Layout notation (IG p.3, p.16; sheets; WEB101): `X.Y.Z` means X listener-level ("ear-level") speakers, Y subwoofers, and Z overhead or Dolby Atmos enabled speakers. Dolby Atmos produces a single LFE signal even when there are several sub outputs (IG p.16). Every speaker except C and Cs has to be added as a left/right pair (IG p.5 fn.1, p.6, p.12; WP p.10). Note an error in IG p.3: its 5.1.4 example lists seven listener-level channels, including the rear surrounds.

## 3. Listener-level azimuths by layout

Values are read from the per-layout sheets (plan-view arcs). The bed-layer channels share identical numbers across the overhead, enabled and hybrid variants of a layout, so each table below covers all variants.

### Shared values (appear identically on every sheet that includes the channel)

| Channel | Azimuth range | Notes | Citation |
|---|---|---|---|
| C | 0° | on screen axis, just above or below the TV (WEB101) | all sheets |
| L / R | 22°–30° | Per-layout sheets show 22–30. IG fig.3 (7.1.4 reference) instead shows **30° nominal, range 22°–40°**, and IG p.7 uses ±30° as the reference for L/R separation. See Gaps. | all sheets; IG p.8 fig.3 |
| Lw / Rw | 50°–70° | only in 9.x and 11.x layouts | S-91, S-912-OH, S-914-OH, S-916-OH, S-1118-OH |
| Ls / Rs (5-channel bed: 4.1, 5.1, 5.1.x) | 110°–120° | behind the listener | S-41, S-51, S-512-*, S-514-* |
| Ls / Rs (7- and 9-channel bed) | 90°–110° | side surrounds | S-71, S-712-*, S-714-*, S-91, S-912/914/916-OH, S-1118-OH |
| Lrs / Rrs | 135°–150° | rear surrounds | same as above |
| Ls1 / Rs1 (11.1.8) | 117°–127° | between Ls/Rs and Lrs/Rrs | S-1118-OH |

### Per layout

| Layout | Channels (Dolby legend) | Azimuths | Citation |
|---|---|---|---|
| 2.1 | L, R, Sub | L/R 22–30° | S-21; IG p.18 |
| 3.1 | L, C, R, Sub | C 0°, L/R 22–30° | S-31 |
| 4.1 | L, R, Sub, Ls/Rs | L/R 22–30°, Ls/Rs 110–120° (no center) | S-41 |
| 5.1 | L, C, R, Sub, Ls/Rs | C 0°, L/R 22–30°, Ls/Rs 110–120° | S-51 |
| 7.1 | + Lrs/Rrs | L/R 22–30°, Ls/Rs 90–110°, Lrs/Rrs 135–150° | S-71 |
| 9.1 | + Lw/Rw | L/R 22–30°, Lw/Rw 50–70°, Ls/Rs 90–110°, Lrs/Rrs 135–150° | S-91 |
| 5.1.2 | 5.1 bed + 2 heights | as 5.1 | S-512-OH, S-512-EN; IG pp.27–28 |
| 5.1.4 | 5.1 bed + 4 heights | as 5.1 | S-514-OH/EN/HY; IG pp.29–32 |
| 7.1.2 | 7.1 bed + 2 heights | as 7.1 | S-712-OH/EN; IG pp.34–35 |
| 7.1.4 | 7.1 bed + 4 heights | as 7.1 (IG fig.3 uses L/R 30°, range 22–40°) | S-714-OH/EN/HY; IG pp.8, 36–39 |
| 9.1.2 | 9.1 bed + Ltm/Rtm | as 9.1 | S-912-OH; IG pp.43–44 |
| 9.1.4 | 9.1 bed + Ltf/Rtf + Ltr/Rtr | as 9.1 (see the legend error in Gaps) | S-914-OH; IG pp.45–46 |
| 9.1.6 | 9.1 bed + Ltf/Rtf, Ltm/Rtm, Ltr/Rtr | as 9.1 | S-916-OH |
| 11.1.8 | 9.1 bed + Ls1/Rs1 + Lfh/Rfh, Ltf/Rtf, Ltr/Rtr, Lrh/Rrh | as 9.1, plus Ls1/Rs1 117–127° | S-1118-OH |

### Extended listener-level channels (IG section 4; measured from the center-front reference)

| Channel | Nominal | Range shown | Citation |
|---|---|---|---|
| Lc / Rc | ~15° (~30° when Lscr/Rscr are also present) | 10°–30° | IG p.52 fig.27 |
| Lscr / Rscr | ~15° | 5°–15° | IG pp.52–53 fig.28 |
| Ls1 / Rs1 | ~75° | 60°–90° | IG p.53 fig.29 |
| Ls2 / Rs2 | ~105° | 90°–120° | IG p.54 fig.30 |
| Lrs1 / Rrs1 | ~120° (~135° when Ls2/Rs2 are present) | 105°–135° | IG pp.54–55 fig.31 |
| Lrs2 / Rrs2 | ~145° | 130°–155° | IG p.55 fig.32 |
| Lcs / Rcs | ~165° | 155°–175° | IG p.56 fig.33 |
| Cs | 180° | directly behind the listener | IG p.56 |

The maximum Dolby Atmos home layout is 24.1.10, which is 34 speakers (IG p.51; WP p.10, p.13).

## 4. Height speaker guidance

### Overhead (ceiling) speakers: elevation, using the side-view convention from section 1

| Channel | Range | Ideal / middle line | Citation |
|---|---|---|---|
| Ltf / Rtf | 30°–55° | 45° (IG: should be 45 in the 7.1.4 reference, adjustable 30–55) | IG p.7, p.8 fig.2; S-514-OH, S-714-OH, S-914-OH, S-916-OH |
| Ltr / Rtr | 125°–150° (that is, 30°–55° above the rear horizon) | 135° | IG p.8 fig.2; S-514-OH/HY, S-714-OH/HY, S-914-OH, S-916-OH |
| Ltm / Rtm (x.1.2 layouts) | 65°–100° | 80° middle line ("ideal" is not stated; **UNVERIFIED**) | S-512-OH, S-712-OH, S-912-OH |
| Ltm / Rtm (9.1.6) | 70°–110° | 90° middle line | S-916-OH |
| Ltf / Rtf (11.1.8) | 45°–55° | none | S-1118-OH |
| Ltr / Rtr (11.1.8) | 125°–135° | none | S-1118-OH |
| Lfh / Rfh (11.1.8, wall) | 20°–30° | none | S-1118-OH |
| Lrh / Rrh (11.1.8, wall) | 150°–160° | none | S-1118-OH |

- **Overhead azimuth (top view)**: the front overhead pair sits at 30°–60° azimuth and the rear pair at 120°–150°. The array is centered front-to-back over the listener and spaced to hit the target elevation (IG p.9 fig.4).
- **Overhead lateral spacing**: about the same as the L/R spacing at ±30°, which works out to 0.5–0.7 × the overall layout width (IG p.7; p.8 fig.3).
- **Overhead mounting height**: H3 = 2–3 × H1, where H1 is the listener-level speaker height of about 1.2 m. That gives roughly 2.4–3.6 m (IG p.7, p.8 fig.2).
- **Front-to-back placement (white paper)**: with four overheads, put the front pair ahead of the seat and the rear pair behind it, each about one third of the way in from the front or rear wall. With two overheads, mount them slightly in front of the seat (WP p.8). The plan diagrams in S-512-OH, S-712-OH and S-912-OH also draw Ltm/Rtm ahead of the seat, in line with L/R.
- **Aiming and dispersion**: an overhead with wide dispersion (about ±45° from 100 Hz to 10 kHz) can point straight down. Narrower or aimable speakers should be angled toward the MLP (IG p.7; WP p.7–8). For 8–14 ft (2.4–4.3 m) ceilings, use ±45° dispersion. Above 14 ft, most speakers have dispersed enough by the time sound reaches the listener (WP p.7).
- **When to avoid overhead speakers**: ceilings of 8 ft (about 2.44 m) or lower, or speakers hung on trusses or brackets, put the overheads too close to the listener; use enabled speakers instead (WP p.7; IG p.12).
- **Don't put all speakers in the ceiling**: listener-level and overhead speakers must be kept separate (IG p.9 fn.4; WP p.5).
- **Timbre**: overheads should be timbre-, frequency- and power-matched to the listener-level speakers (IG p.7; WP p.7).

### Wall-mounted front and rear height (Lfh/Rfh, Lrh/Rrh; IG pp.57–59)

- Lfh/Rfh go on the front wall, directly above L/R at about 30° azimuth. If they have to go on the ceiling, place them no more than one-eighth of the distance to the room's middle, at about 45° elevation. The side view (fig.34) shows a 30°–45° elevation range.
- Lrh/Rrh go on the rear wall at about 30° from the center line (as drawn, mirrored behind the listener). If they have to go overhead, keep them within one-eighth of the distance to the middle, at about 135°. Fig.36 shows a 135°–150° range.
- Dolby prefers overhead or enabled speakers over front heights. Front heights can be added alongside overheads in larger rooms (IG p.14).

### Dolby Atmos enabled (up-firing) speakers

- **Placement**: with four enabled speakers, put two at the L/R positions and the other two ideally at Lrs/Rrs, or at Ls/Rs as the alternative. With two, use the L/R positions (IG p.12; WP p.7). The sheets follow this: S-514-EN puts the rear pair on the surrounds, and S-714-EN puts them on the rear surrounds.
- **Height**: at or slightly above seated ear height, and no higher than half the wall height (IG p.12; WP p.7).
- **Distance from listeners**: at least 0.9 m (3 ft), ideally 1.5 m (5 ft) or more. Less is acceptable when the up-firing driver sits well above the nearest head (IG p.13; WP p.7).
- **Add-on modules**: on top of the host speaker or within 0.9 m of it, driver facing the ceiling (IG p.13; WP p.6).
- **Ceiling**: flat and reflective, 2.3–4.3 m (7.5–14 ft) high, ideally 2.3–3.66 m (7.5–12 ft). Swap out acoustic tiles at the reflection points (IG p.13; WP p.6–7).
- **Hybrids**: overheads at the front with enabled speakers at the rear, or the reverse (IG p.13). Dolby publishes sheets only for the front-enabled / rear-overhead hybrid (S-514-HY, S-714-HY). IG figs. 15/16 and 21/22 cover both directions.
- **Distance setting**: the delay distance for an enabled speaker is speaker-to-ceiling plus ceiling-to-MLP (IG p.15).
- Dolby Atmos enabled sound bar: at or slightly above seated ear level, at least 1.2–1.5 m from the seat (SB p.4–5).

## 5. Listener-level height, distance and aiming

- Follows ITU-R BS.775-3 (IG p.6).
- All listener-level speakers at the same height, typically 1.2 m (3.9 ft), which is seated ear height per ITU-R BS.1116-1 (IG p.6; WEB101).
- Rear speakers ideally at the same height as the fronts. If that isn't possible they can go higher, but no more than 1.25 × the front height (IG p.6, p.8 fig.2).
- The white paper is looser: listener level up to 2 ft (about 0.6 m) higher is "optimal", and speakers should not go near the ceiling (WP p.5).
- **Equidistance**: the front speakers set the reference distance. All listener-plane speakers should ideally be the same distance from the listener; otherwise use delay compensation (IG p.6, p.15).
- **Toe-in / aiming**: aim the speakers at the central seat (sheet landing pages). Toe L/R in toward the listening position; how much depends on the room and speakers (WEB101).
- **Speaker type**: dipole surrounds are not recommended (IG p.6; WP p.5). Monopole or bipole is fine (WP p.5).
- **Calibration**: each full-range channel set to 79–82 dB SPL (C-weighted) at the MLP with −20 dBFS RMS pink noise. The sub level should match the bass that is redirected from the mains (IG p.15).

## 6. Subwoofer, seating and room size

- **Subwoofer**: Dolby gives no position or angle. Bass is non-directional, so the sub can go almost anywhere; try several spots. Most systems use one sub, and large rooms sometimes use two (WEB101). Every sheet draws the sub at the front, next to the screen or left speaker, but this is illustrative only. Apply bass management to enabled speakers and smaller speakers (IG p.11, p.14).
- **Seating**: one central seat (the "sweet spot") that all speakers aim at (sheets; WEB101). The sheets draw a sofa with the MLP at its center. Dolby gives **no** guidance on row placement, distance from the walls, or multi-row seating in these documents.
- **Room size**: the IG covers "a typical home theater in a standard listening space" (IG p.3). The only dimensional limits Dolby gives are ceiling heights (section 4). Dolby suggests 7.1.4 for high-end theaters (WP p.10). No minimum room dimensions or volumes are given. The 50 m³ figure that circulates comes from Focal, not Dolby, and is **UNVERIFIED** as Dolby guidance.

## 7. Gaps, inconsistencies and what Dolby does not specify

**Inconsistencies inside the Dolby sources:**
1. **L/R azimuth**: every per-layout sheet shows 22°–30°, but IG fig.3 shows 30° nominal with a 22°–40° range. Suggestion: use 22–30 as the "recommended" range, 30 as the ideal, and allow up to 40 when the IG reference is in play.
2. **Ls/Rs in 5-channel beds**: 110°–120°. That matches ITU-R BS.775's 100–120 only partly; Dolby narrows it.
3. **9.1.4 sheet legend error**: the legend lists only 7 items (it repeats the 5.1.4 legend), but the diagram numbers go to 9. We infer the diagram follows 9.1.2 numbering: 5 = wide, 6 = surround, 7 = rear surround, 8 = top front, 9 = top rear.
4. **IG p.3** lists seven bed channels for "5.1.4".
5. **Top-middle elevation**: 65–100° in the x.1.2 sheets versus 70–110° in 9.1.6.
6. **Ltm/Rtm placement**: the plan views draw them roughly in line with the front L/R and ahead of the seat, while the side views put them close to overhead (65–100°). Use the elevation angle as the rule.

**Not specified by Dolby (needs general acoustics rules or our own defaults):**
- Subwoofer placement, and how many subs to use relative to room size.
- Where the MLP should sit in the room (distance from front and back walls), and layouts for multiple rows or seats.
- Minimum or maximum room dimensions, preferred room ratios, and how far speakers should be from boundaries.
- Precise toe-in angles. Vertical tilt of listener-level speakers beyond "aim at the seat".
- Screen size and viewing distance. These come from SMPTE/THX and are not in these documents.
- Exact elevation for enabled speakers; that depends on the product, since Dolby specifies the driver angle in the cabinet (IG p.10).
- Elevation for 5.1.2-enabled or 7.1.2-enabled layouts; those sheets have no side view.
- Dolby's pro "Home Entertainment Studio" technical guidelines and its Room Design Tool (professional.dolby.com) may hold min/max/ideal angle tables for mixing rooms. They were **not located or downloaded**, so their content is **UNVERIFIED**.

## 8. General acoustics references (for the gaps)

1. **Axial room modes**: f = c / (2L) for each dimension, with harmonics n·c/(2L) and c ≈ 343 m/s. The general rectangular-room (Rayleigh) formula is f = (c/2)·√((nx/Lx)² + (ny/Ly)² + (nz/Lz)²). Textbook: F. A. Everest & K. C. Pohlmann, *Master Handbook of Acoustics* (McGraw-Hill), room-modes chapter. Online reference and calculator: https://sengpielaudio.com/calculator-roommodes.htm
2. **ITU-R BS.775** (multichannel loudspeaker arrangement, which Dolby cites) and **ITU-R BS.1116** (listening-room conditions: 1.2 m ear height, room dimension ratios, distance from boundaries): https://www.itu.int/rec/R-REC-BS.775 and https://www.itu.int/rec/R-REC-BS.1116
3. **"38% rule"** (put the seat about 38% of the room length from the front wall to stay off the 50% length null). It is an informal heuristic, not a published standard. Acoustician Wes Lachot says he started it as a starting point and never called it a rule: https://repforums.prosoundweb.com/index.php/topic,21551.0.html . Summary: https://www.tvtechnology.com/opinions/proper-loudspeaker-placement . Treat it as a soft default.
4. **Multiple subwoofers and seat-to-seat variation**: T. Welti & A. Devantier, "Low-Frequency Optimization Using Multiple Subwoofers", JAES 54(5), 2006, https://aes2.org/publications/elibrary-page/?id=13680 . T. Welti, AES Conv. Paper 8748 (2012), "Optimal Configurations for Subwoofers in Rooms Considering Seat to Seat Variation and Low Frequency Efficiency", likely https://aes2.org/publications/elibrary-page/?id=16490 (**UNVERIFIED** id). Reported finding (from a secondary interview summary, so **UNVERIFIED** against the paper text): four subs at the wall midpoints, or four subs set in ¼ of the room length and width from the corners (Toole's layout), gave the most consistent response across seats. See also F. Toole, *Sound Reproduction* (3rd ed., Routledge).
