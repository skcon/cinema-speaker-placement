# Screen or TV size, viewing distance and the front speakers

Researched 2026-10-15 for issue #42 (parent #39). It is the evidence for the screen room object and the auto-place rule ADR (#44). It covers how the screen or TV relates to the front speakers (L, C, R) and to the MLP. Dolby's own front-stage guidance (L/R 22°–30°, C at 0° just above or below the TV, listener-level speakers at about 1.2 m ear height) comes from `dolby-speaker-placement.md` and is the baseline here.

**How this was researched, and its main limit.** In this session the egress proxy refused every direct fetch (dolby.com, pub.smpte.org, cedia.org, thx.com, kaleidescape.com all failed). So **no primary document was opened directly for this note**. Each claim below comes from (a) the existing Dolby note, which was read from Dolby's PDFs, or (b) web-search excerpts of the named page, with the URL of the page that owns the claim. Claims seen only in an excerpt are marked *(excerpt)*. Claims that only a secondary write-up attributes to a standards body are marked **UNVERIFIED**. Arithmetic that we did ourselves is marked **ours**.

## Conventions used in this file

- **Azimuth**: the same as `dolby-speaker-placement.md`. It is the horizontal angle from the MLP, with 0° at the middle of the screen (the center-front reference), given per side (±).
- **Viewing angle (horizontal)**: the full angle the screen width subtends at the eye, `θ = 2·atan(W / 2d)`, where W is the image width and d is the eye-to-screen distance. The screen's *edge azimuth* is half of it, `θ/2`. Every viewing angle in this file is a **full** angle unless it says "per side".
- **Elevation**: the vertical angle from seated ear height, positive upward (this matches the RP22 glossary *(excerpt)*).
- **H**: picture height. ITU-R gives distances as multiples of H.
- **Community practice**: forum posts on avsforum.com and forums.audioholics.com. These are labelled **community practice** and are never the only source for a number. No audiosciencereview.com page on these questions turned up in search.
- **Practitioner / trade**: installer or acoustician blogs and trade press (Acoustic Frontiers, CE Pro, Sound & Vision). They rank above community practice but are not standards.

## 1. Sources

| Key | Title | URL | Date / version | Accessed |
|---|---|---|---|---|
| DOLBY | Dolby notes in this repo (IG r3.1, WEB101, sheets) | `docs/research/dolby-speaker-placement.md` | IG Dec 2018 r3.1; WEB101 fetched 2026-10-11 | **Read** (repo file) |
| ITU-775 | Recommendation ITU-R BS.775, *Multichannel stereophonic sound system with and without accompanying picture* (-1 1994, -2 2006, -3 2012) | https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.775-3-201208-S!!PDF-E.pdf (also -1: …BS.775-1-199407…, -2: …BS.775-2-200607…) | -3, 08/2012. A "-4 (2022)" is claimed only by a calculator site: **UNVERIFIED** | Not fetched (proxy). Excerpts via search |
| ITU-2159 | Report ITU-R BS.2159-4, *Multichannel sound technology in home and broadcasting applications* | https://www.itu.int/dms_pub/itu-r/opb/rep/r-rep-bs.2159-4-2012-pdf-e.pdf | 05/2012 | Not fetched. Excerpt via search |
| SMPTE-EG18 | SMPTE EG 18-1994, *Design of Effective Cine Theaters* | https://pub.smpte.org/doc/eg18/19940325-pub/eg0018-1994_withdrawn2003.pdf | 1994-03-25, **withdrawn 2003-03-26** | Not fetched (DNS/proxy). Title and withdrawn status from the search listing of SMPTE's own URL. Numbers via secondary quotes only |
| THX | THX viewing-angle guidance | no thx.com page reached (www.thx.com refused) | n/a | **Not found as a primary page.** Numbers via SV-SIZE, BENQ (secondary) |
| RP22 | CEDIA/CTA-RP22 *Immersive Audio Design Recommended Practice* v1.2 | https://cedia.org/site/assets/files/6057/cedia-cta_rp22_v1_2_sept_2023.pdf | v1.2, Sept 2023 | Not fetched (proxy). Only glossary excerpts and one section heading seen |
| RP22-PR | Trade coverage of RP22 (scope, levels) | https://www.cepro.com/audio-video/media/rp22-immersive-audio-guidelines-set-to-revolutionize-industry-says-cedia-ceo/ ; ANSI blog summary https://blog.ansi.org/?p=190918 | 2023 | Excerpts via search |
| DCI | DCI container sizes (secondary: Wikipedia "Digital Cinema Package", "2K resolution") | https://en.wikipedia.org/wiki/Digital_Cinema_Package | n/a | Excerpts via search. DCI's own spec not opened |
| SV-SIZE | Sound & Vision, "Screen Size and Seating Distance" | https://www.soundandvision.com/content/screen-size-and-seating-distance | undated | Excerpt via search |
| BENQ | BenQ, "The Best Seat-to-Screen Distance for Different Projector Screen Sizes" (manufacturer) | https://www.benq.com/en-me/knowledge-center/knowledge/the-best-seat-to-screen-distance-for-different-projector-screen-sizes.html | undated | Excerpt via search |
| SV-AT | Sound & Vision, "Transparent Ambition" (tests of Stewart and Screen Research AT screens) | https://www.soundandvision.com/content/transparent-ambition | undated | Excerpt via search |
| ELITE-AT | Elite Screens FAQ, speaker distance behind AT materials (manufacturer) | https://elitescreens.com/es-faqs/how-far-should-i-place-my-speakers-behind-elites-acousticpro-1080p3-and-acousticpro-uhd-acoustically-transparent-screen-materials/ | undated | Excerpt via search |
| CEPRO-H | CE Pro, "How to Find the Ideal Height for a Projector Screen" (by Elite Screens' D. Rodgers) | https://www.cepro.com/news/how-to-find-ideal-height-for-projector-screen/2369/ | undated | Excerpt via search |
| AF-LAYOUT | Acoustic Frontiers, "Home theater speaker layout: 5.1 and 7.1 recommendations from Dolby, THX and ITU" (practitioner) | https://acousticfrontiers.com/blogs/articles/home-theater-speaker-layout-5-1-and-7-1-recommendations-from-dolby-thx-and-itu | undated | Excerpt via search |
| AF-SCREEN | Acoustic Frontiers (N. Mellor), "Screen channel / display placement" (practitioner) | https://acousticfrontiers.com/blogs/articles/screen-channel-display-placement | 2013 per search summary | Excerpt via search |
| AVS-RP22 | AVS Forum, "Making a Home Theater Sound Good: Implementation Guide companion to RP22" (**community practice**) | https://www.avsforum.com/threads/making-a-home-theater-sound-good-%E2%80%9Cimplementation-guide%E2%80%9D-companion-to-the-cedia-cta-rp22-immersive-audio-design-recommended-practice-in-first-post.3285380/ | n/a | Excerpt via search |
| AVS-AT | AVS Forum, "Acoustically Transparent Screens…Speaker Distance?" and "Height of speakers behind AT screen" (**community practice**) | https://www.avsforum.com/threads/acoustically-transparent-screens-speaker-distance.2675489/ ; https://www.avsforum.com/threads/height-of-speakers-behind-at-screen.2815497/ | n/a | Excerpts via search |
| AH-SCREEN | Audioholics forum, "height of bottom of screen to floor" (**community practice**) | https://forums.audioholics.com/forums/threads/height-of-bottom-of-screen-to-floor.32249/post-272258 | n/a | Excerpt via search |
| AH-CENTER | Audioholics forum, "MTM horizontal center vs vertical TM center" and "Vertical vs Horizontal Center Speaker Designs" (**community practice**) | https://forums.audioholics.com/forums/threads/mtm-horizontal-center-channel-speaker-vs-vertical-tm-center-channel-speaker.42063/latest ; https://forums.audioholics.com/forums/goto/post?id=479155 | n/a | Excerpts via search |

Not used as sources: generic calculator sites (inchcalculator, theatercalc, theaterowl and similar). They only repeat the THX/SMPTE numbers. One of them gives a wrong width multiplier for 30° (1.63 × **width**; 1.63 is in fact the **diagonal** multiplier, see section 2).

## 2. Viewing distance and viewing angle (question 1)

### 2.1 Recommendations by source

| Source | Full horizontal viewing angle | What it applies to | Distance for a 16:9 image (**ours**, from the formula) | Status |
|---|---|---|---|---|
| SMPTE EG 18-1994 | **≥ 30°** | Minimum, usually read as the farthest (back-row) seat in a cinema | d ≤ 1.87 W ≈ 1.63 × diagonal | Number via secondary quotes (SV-SIZE, BENQ). EG 18 is **withdrawn** (SMPTE URL). The exact text and row is **UNVERIFIED** |
| SMPTE EG 18-1994 (vertical) | Discomfort for most viewers when the angle to the top of the image is **> 35°**; 30° vertical sets the closest seat | Front row | n/a | Forum quote of EG 18 only, so **UNVERIFIED** |
| THX | **36°** recommended (also quoted as "minimum recommended"), **40°** ideal / "immersive", **26°** minimum acceptable | MLP | 36°: d ≈ 1.54 W ≈ 1.34 × diag. 40°: d ≈ 1.37 W ≈ 1.20 × diag. 26°: d ≈ 2.17 W ≈ 1.89 × diag | Secondary only (SV-SIZE, BENQ). SV-SIZE notes that THX's own calculator gave a slightly lower figure than its 40° article. **UNVERIFIED** against thx.com |
| ITU-R BS.775 | **33°** for an HDTV picture at the reference distance **3H** ("Screen 1"); **48°** for a larger screen at **2H** ("Screen 2") | Reference listening position | 3H = 1.69 W; 2H = 1.13 W | From figure labels in BS.775-1, quoted in a search excerpt. The text "television pictures are often restricted to 33° … cinema images may be displayed at such angles" *(excerpt)*. Figure not seen: **UNVERIFIED** |
| ITU-R BS.2159 | 3H as the HDTV reference distance | — | 1.69 W | *(excerpt)* |
| CEDIA/CTA-RP22 | **No source found** for a viewing-angle recommendation. The excerpts cover audio only, and ANSI's summary says RP22 does not cover speaker positioning around large emissive displays (video walls) | — | — | RP22 scope via RP22-PR *(excerpt)* |
| Dolby | **None** (already listed as a gap in `dolby-speaker-placement.md` section 7) | — | — | Read |

Formula (geometry, **ours**): `d = W / (2·tan(θ/2))`. For 16:9, W = 0.872 × diagonal and H = 0.490 × diagonal. Two checks: 3H = 1.6875 W, which gives 33.0°, and 2H = 1.125 W, which gives 47.9°. Both match the ITU labels, so the reading of the ITU figure is self-consistent.

### 2.2 Conflicts

1. **What 30° means.** SMPTE's 30° is a cinema minimum, usually for the back row. THX's 36°–40° is a target for the main seat. ITU's 33° describes how TV is typically watched, not a goal. So "30°" in a home-theater calculator is a floor for the image, not an ideal.
2. **THX: 36° or 40°.** Secondary sources label both numbers "recommended", "minimum recommended" and "ideal". The safest reading is 36° recommended, 40° ideal, 26° minimum. It stays **UNVERIFIED** until a thx.com page is read.
3. **Width or diagonal multipliers.** Rules of thumb such as "1.2 ×", "1.34 ×" and "1.63 ×" are 16:9 **diagonal** multipliers. Applied to the width they are wrong. The app should store width and use the formula.
4. **SMPTE is withdrawn.** EG 18 was withdrawn in 2003, and search found no current SMPTE replacement. It is historical guidance.

### 2.3 Typical sizes and aspect ratios

- **Projection aspect ratios** (DCI via Wikipedia, secondary): flat **1.85:1** (2K 1998 × 1080), scope **≈2.39:1** (2K 2048 × 858), full container ≈1.90:1. Home "scope" screens are sold as 2.35:1 or 2.40:1. That is market practice, and we found **no standards source** for it.
- **TVs and home projectors**: 16:9 (1.78:1). That is the HDTV format the ITU 3H figure assumes *(excerpt)*.
- **Typical sizes**: we found **no authoritative source** for a distribution of sizes. As a working assumption (**ours**, market observation and not cited), TVs run 55–85 in diagonal and home projection screens 100–150 in. Example (**ours**): a 65 in 16:9 TV is 1.44 m wide, so it gives 36° at 2.2 m and 30° at 2.7 m. At a typical 3–3.5 m seat it subtends only about 23°–27°.

## 3. L/R and the screen edges (question 2)

### 3.1 What the sources say

- **Dolby**: L/R at **22°–30°** per side on every per-layout sheet, and 30° nominal with a 22°–40° range in IG fig.3. Dolby says nothing about screen edges. IG section 4 adds optional **Lscr/Rscr** "screen" speakers at 5°–15° (nominal ~15°) and Lc/Rc at 10°–30°. That implies Dolby expects L/R to sit at or beyond a wide screen's edge, with extra channels filling the gap when needed (DOLBY: IG pp.52–53, fig.28). That last reading is our inference, **ours**.
- **ITU-R BS.775**: L/R on an arc at **±30°** (60° total), C at 0°, at ear height *(excerpt)*. The recommendation itself points out the mismatch: TV pictures subtend about 33°, so the ±30° sound image is wider than the picture. It treats that mismatch as the reason TV and cinema mixing practice differ *(excerpt)*.
- **THX**: L/R at **45° total** (±22.5°), as reported by AF-LAYOUT (practitioner, secondary). **UNVERIFIED** against THX.
- **RP22**: its glossary defines the screen-wall speakers as the front listener-level speakers "across the wall behind or around the screen" *(excerpt)*. Its parameter list includes "screen wall speakers outside recommended zones" *(excerpt)*. An RP22-derived excerpt says the formats it covers give screen-wall horizontal angles **between 44° and 60°** (total) relative to the reference seat, which agrees with Dolby's 22°–30° per side. RP22's exact zone table is **not seen**.
- **Practitioner**: AF-LAYOUT recommends 45° or slightly wider total, with L/R "just inside the screen's edges" behind an AT screen. That is the author's own choice, not THX's. AVS-RP22 (**community practice**) notes that behind an AT screen the FL–FR angle usually ends up slightly narrower than the viewing angle.
- **Community practice** (AVS and HTGuide threads, via search): the opinions conflict. Some put L/R "just inside" the screen and some "at the edges". One post observes that a 60° (±30°) spread almost always puts L/R outside the screen edges.

### 3.2 How this interacts with Dolby's 22°–30° (**ours**, geometry)

The screen's edge azimuth is half its viewing angle. For every recommendation in section 2:

| Viewing angle | Screen edge azimuth | Relation to Dolby L/R 22°–30° |
|---|---|---|
| 26° (THX min) | ±13° | L/R are 9°–17° **outside** the edges |
| 30° (SMPTE min) | ±15° | 7°–15° outside |
| 33° (ITU HDTV, 3H) | ±16.5° | 5.5°–13.5° outside |
| 36° (THX rec.) | ±18° | 4°–12° outside |
| 40° (THX ideal) | ±20° | 2°–10° outside |
| 44° | ±22° | L/R at 22° sit **exactly at** the edge |
| 48° (ITU 2H) | ±24° | 22° is **inside** the edge; 24°–30° outside |
| 60° | ±30° | the whole Dolby range is behind the screen |

Consequences:

- With a TV or a non-transparent screen, L/R inside the image is impossible anyway, and Dolby's range already puts them outside for every screen up to a 44° viewing angle. The only extra constraint is physical: the cabinet must clear the screen's edge.
- With an AT screen, L/R can sit **behind** the screen within Dolby's range only if the screen subtends **≥ 44°** (≥ 0.81 × the MLP distance in width). That is wider than THX's 40° ideal. For example, at 3.5 m the image must be at least 2.83 m wide (≈ 128 in 16:9, or ≈ 2.83 m wide scope). With 16:9 at THX 36°–40°, "L/R behind the screen" means going **below Dolby's 22°** (to ±18°–20°). The app's placement-range check would flag that.
- A **scope (2.39:1)** screen of the same height is 34% wider than 16:9, which makes the ≥ 44° case much more reachable in AT rooms. **Ours.**

## 4. Center channel (question 3)

- **Position, solid display**: C goes immediately above or below the picture when the screen is not acoustically transparent (ITU-775 *(excerpt)*; DOLBY WEB101 "just above or below the TV"). Receiver manuals (Denon, Marantz, via search) say the same. Neither source says which of the two is better.
- **Position, AT screen**: C goes behind the screen on the center line. Practitioner and community sources want L, C and R at the same height and timbre-matched (AF-SCREEN; AH-CENTER **community practice** prefers a vertical center or a third identical speaker behind an AT screen). AVS-AT (**community practice**) puts the *acoustic center* at ear height for a single row. A manufacturer guide (Arendal, via search) says "1/3 of the way up the screen or ear height, whichever is higher". That is a manufacturer suggestion, not a standard.
- **Vertical offset limits**:
  - Dolby: all listener-level speakers at the same height, about 1.2 m (seated ear height per ITU-R BS.1116) (DOLBY IG p.6). Dolby gives **no** tolerance for C.
  - RP22 has a section titled "Vertical Alignment of Screen Wall Speakers" *(excerpt: heading only)*. **Its contents were not seen**, so we have no number. Its glossary defines listener-level speakers as "at or just above seated ear level" and height speakers as ≥ 25° elevation *(excerpt)*. So a center above a TV clearly must stay well under 25°.
  - AF-SCREEN (practitioner): the acoustic centers of L, C and R should differ by **at most 5° elevation** at the seats. At 3.5 m, 5° is about 0.31 m (**ours**).
  - An in-wall speaker manual (Atlantic Technology, via search): keep the three front tweeters within about **18 in (0.46 m)** vertically. A consumer guide says no more than **24 in (0.61 m)** from ear level. Both are rules of thumb, and neither is a standard.
- **Tilt**: Dolby only says "aim at the seat" (DOLBY section 5). Consumer guides suggest 5°–15° of tilt toward the ears. AH-CENTER (**community practice**) adds that a horizontal MTM center lobes off-axis and that odd-order crossovers tilt the main lobe about 15°. No primary source gives a tilt value. **Ours**: tilt = atan(Δheight / horizontal distance), which aims the axis at the MLP's ears.

## 5. Screen height and mounting (question 4)

- **Bottom edge / image height**:
  - CEPRO-H (trade press, by a screen manufacturer): seated eye level should sit on the line between the bottom third and the top two-thirds of the image. Average seated eye height is 42–50 in (1.07–1.27 m), and 48 in is the working figure.
  - **Community practice** (AH-SCREEN and HTGuide, via search): a bottom edge of 24–36 in (0.6–0.9 m) for one or two rows, and 40–48 in (1.0–1.2 m) for multi-row rooms. One poster attributes a **30 in (0.76 m)** bottom edge to CEDIA, which we could not trace to a CEDIA document: **UNVERIFIED**.
  - SMPTE EG 18: a vertical angle to the top of the image above 35° causes discomfort *(forum quote)*: **UNVERIFIED**. That sets an upper bound on image top height for the front row.
  - THX: one forum summary says THX specifies no "optimal" vertical angle. A widely repeated "15°" figure could not be traced to THX: **UNVERIFIED / no source found**.
- **How the screen constrains speaker heights** (**ours**, combining the above):
  - Dolby's ear height is about 1.2 m. A TV's lower-third line at 1.2 m puts its bottom edge at about 0.93 m for a 65 in TV (image height 0.81 m), so C below it lands at roughly 0.8 m (about −6° at 3.5 m). C above, over a top edge at about 1.74 m, lands at about 1.85 m (about +10° to +11°). So **below is usually closer to ear level** for TVs mounted at the lower-third line.
  - With an AT screen whose bottom edge is at 0.6–0.9 m, the 1.2 m ear line falls in the lower third to half of the image, so L/C/R behind it can sit at Dolby's ear height.
  - A solid projection screen with its bottom at 0.6–0.9 m leaves little room below for C, which pushes C above the image, often by more than the 5° practitioner limit.
- **AT screen depth**: speakers need a gap behind the screen to avoid comb filtering. The figures conflict: about 12 in for microperf and 4 in for a woven screen in SV-AT's tests; about 1 in from dust cap to screen per ELITE-AT for its materials; at least 6 in for subwoofers (Seymour, quoted in AVS-AT, **community practice**). AT screens also lose high frequencies (Stewart via SV-AT: microperf starts rolling off at about 5–6 kHz, roughly 2 dB/octave unequalized). So **the screen sits in front of the front wall**, and the MLP's distance to the image differs from its distance to the front wall.

## 6. Data for the app (question 5): proposed minimal screen shape

This is a proposal for #39 and #44, not a decision. All values are SI and stored in the share-link config (schema bump plus migration, per CLAUDE.md). The screen is assumed centered on the front wall (**ours**, v1 simplification).

| Field | Type | Why it is needed |
|---|---|---|
| `kind` | `'display' \| 'acousticallyTransparent'` (optionally `'none'`) | Decides whether L/C/R may sit behind the image (section 3.2, section 4) and whether C goes above or below or behind. `'none'` keeps old links and audio-only rooms valid (migration default). |
| `widthM` | meters | Gives the viewing angle at the MLP (section 2) and the screen edge azimuth that the L/R rule compares with Dolby's 22°–30° (section 3.2). Store the **image** width, not the diagonal: the formulas use width, and diagonal multipliers depend on aspect (section 2.2 conflict 3). |
| `heightM` | meters | Together with width, it gives aspect (16:9 versus scope). With the bottom edge, it gives the top edge for the vertical-angle check (SMPTE 35°, **UNVERIFIED**) and for whether C above fits under the ceiling. |
| `bottomEdgeM` | meters above the floor | Sets where C can go (above or below a display) and whether the 1.2 m ear line falls inside an AT image (section 5). |
| `standoffM` (AT only, optional) | meters from the front wall to the screen | Gives the space for speakers behind an AT screen and the true eye-to-image distance (section 5, AT depth). Defaults to an **ours** value. Could be left out of v1 if L/C/R are always placed on or near the front wall. |

UI edge only, not stored: the diagonal in inches plus an aspect preset (16:9, 1.85, 2.39), converted to width and height at input (CLAUDE.md principle 3). Derived, not stored: viewing angle, edge azimuth, image center height, and the THX/SMPTE grade of the viewing angle.

## 7. Recommendations for the auto-place rule ADR (#44)

Options for how auto-place uses the screen when it places L/R. These are trade-offs, not a decision.

**Option A: Dolby angle first, screen only as an obstacle.**
Place L/R at Dolby's nominal angle (for example the 30° ideal, or a fixed point inside 22°–30°) regardless of the screen. For a `display`, push a speaker outward only if its cabinet would overlap the image.
- Pros: always inside Dolby's range; simplest; works without screen data (old links); consistent with ITU ±30°.
- Cons: with a small TV, a wide gap between the image and L/R (section 3.2: 9°–17° at 26°–30° viewing angles); ignores the chance to hide L/R behind an AT screen; a 30° target may hit side walls in narrow rooms.

**Option B: anchor to the screen edges, clamped to Dolby.**
Target the screen edge (just outside a `display`, just inside an `acousticallyTransparent` screen), then clamp into 22°–30°.
- Pros: the picture and the sound line up where the screen allows; uses the screen data; matches practitioner advice for AT rooms (AF-LAYOUT).
- Cons: for most screens (viewing angle < 44°) the clamp decides everything, so the result behaves like A at 22°; "inside the edge" behind a THX-sized AT screen is **below** 22°, so the rule either breaks Dolby or ignores the screen; needs an **ours** margin value for "just inside / just outside".

**Option C: lowest in-range angle that respects the screen (hybrid).**
Choose `max(22°, edgeAzimuth + margin)` for a `display`, and for an AT screen `22°` when the screen covers it (else as for a display), capped at 30°. If the screen is wider than ±30°, L/R go behind it at 30°.
- Pros: always Dolby-compliant; keeps L/R as close to the image as the guideline allows; uses AT screens when they are wide enough; degrades to A when there is no screen.
- Cons: more branches to test; it prefers 22° (a narrower soundstage) over Dolby's 30° ideal, which some may see as the wrong default; the margin and the cabinet width are **ours**.

**Option D: Dolby range plus an explicit "screen fit" check instead of a placement rule.**
Keep A's placement and add a Dolby-style check that reports the L/R gap to the screen edge and, for AT, whether L/R are behind the image.
- Pros: separates the guideline (placement) from the preference (screen alignment); honest; easy to explain in the UI.
- Cons: the user must move the speakers to fix it; the check's thresholds have no primary source.

Questions for the ADR whichever option wins:
- **Arc or wall plane.** Do L/R sit on the equidistant arc (Dolby IG p.6) or on the front-wall plane next to the screen? The plane is typical with screens, but it breaks equidistance, which then needs delay compensation.
- **Which 22°–30° point is "ideal".** Dolby's sheets say 22–30 and IG fig.3 says 30 (see the Dolby note's gap 1). This choice interacts directly with A versus C.
- **C height rule.** For a `display`, pick whichever of above or below is closer to ear height. For AT, use ear height (Dolby), clamped into the image. The 5° (AF-SCREEN) and 18 in tolerances are practitioner values, not standards.

## 8. Gaps, inconsistencies and what we could not verify

1. **No primary document was opened in this session** (the egress proxy blocked dolby.com, smpte.org, cedia.org and thx.com). The ITU, SMPTE, RP22 and THX content is from search excerpts and secondary write-ups. Re-check against the PDFs (do not commit them) before an ADR relies on a specific number.
2. **THX** numbers (26° / 36° / 40°, L/R 45° total) are secondary only: **UNVERIFIED**.
3. **SMPTE EG 18** is withdrawn (2003). The ≥ 30° horizontal and 35° vertical numbers are from secondary quotes. Search found no current SMPTE replacement.
4. **RP22 v1.2**: no viewing-angle guidance found, and the "Vertical Alignment of Screen Wall Speakers" section and the screen-wall zone table were **not seen**. These matter most for the C tolerance and the L/R zones. RP22 is free from CEDIA (some press says free to members); reading it is the top follow-up.
5. **ITU-R BS.775** 33° / 3H and 48° / 2H come from figure labels quoted in an excerpt. Our arithmetic is consistent with them, but the figure itself was not seen. Whether a BS.775-4 exists is unconfirmed.
6. **Screen bottom edge**: no standard found. The 30 in "CEDIA" figure is **UNVERIFIED**, and everything else is trade press or community practice.
7. **AT screen gap and HF loss**: manufacturer figures conflict (1 in to 12 in+). Treat them as product-specific, and do not model them in v1 without a source.
8. **Typical TV and projection sizes**: no authoritative source; the ranges in section 2.3 are ours.
9. **audiosciencereview.com**: no relevant thread surfaced in search, so nothing is cited from it.
