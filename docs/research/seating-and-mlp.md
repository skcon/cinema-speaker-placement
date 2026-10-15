# Seating, the couch and the main listening position

Researched 2026-10-15 for issue #41 (where the listener and the couch go in a home theater, and why). It is the evidence for the couch geometry (#47), the off-centre recommended seat (#48) and the auto-place rule ADR (#44). Everything below is paraphrased.

**Read this first: how the sources were read.** In this session the web-page fetcher could not reach any host (DNS and proxy refusals for itu.int, cedia.org, harman.com, web.archive.org and others), so **no source's full text was opened for this note**. Every claim below comes from search-engine extracts of the named document (short passages the search tool returned with the document's URL), or from earlier repo notes that did read their source. Where a number comes only from an extract it says so; treat those as "seen quoted from the source, not checked in context". A follow-up that can open RP22, BS.1116 and Toole's Harman papers should confirm the values marked *(extract)* before they become typed reference data.

## Conventions used in this file

- **Terms** follow `GLOSSARY.md`: MLP (the listener's head, at ear height), seat row (the couch drawn around the MLP), seat score, recommended seat, auto-place.
- **Room coordinates** as in `src/domain/room.ts`: x across the room (0 = centre line), y from the front wall. "Back-wall distance" is from the back wall to the **centre of the listener's head**, which is how RP22 measures it (section 2).
- **Source quality labels**: *primary* (the standard or the author's own paper or white paper), *(extract)* (primary, but only a search-engine extract was seen), *secondary* (a third party describing a primary source), **community practice** (forums; never the sole source for a number), *retail* (furniture or seating sellers' guides). **UNVERIFIED** means no source confirmed it. **Ours** means our own arithmetic or inference.
- **Citation keys** are the keys in the sources table, with a section or page where the extract gave one.

## 1. Sources

| Key | Title | URL | Date / version | Accessed |
|---|---|---|---|---|
| RP22 | CEDIA/CTA-RP22, Immersive Audio Design Recommended Practice | https://cedia.org/site/assets/files/6057/cedia-cta_rp22_v1_2_sept_2023.pdf | v1.2, September 2023 | Extracts only (fetch blocked). Free to download per CEDIA |
| BS1116 | ITU-R BS.1116-3, Methods for the subjective assessment of small impairments in audio systems | https://www.itu.int/rec/R-REC-BS.1116 | -3, 02/2015 | **Not read** (fetch blocked); only described by EBU-TR274 and Fraunhofer's calculator page |
| EBU3276 | EBU Tech 3276, Listening conditions for the assessment of sound programme material | https://tech.ebu.ch/docs/tech/tech3276.pdf | 1998 (2nd ed.) | Extracts only |
| EBU-TR274 | Hoeg et al., EBU Technical Review no. 274 (listening conditions) | https://tech.ebu.ch/docs/techreview/trev_274-hoeg.pdf | Winter 1997 | Extracts only |
| TOOLE-URA | F. E. Toole, "Understanding Room Acoustics and Speaker Placement" (Harman white paper) | https://www.cieri.net/Documenti/Altri%20marchi/Harman%20Group%20-%20Understanding%20Room%20Acoustics%20and%20Speaker%20Placement%20(Floyd%20E.%20Toole).pdf (third-party mirror of a Harman document) | No date seen | Extracts only |
| TOOLE-LR3 | F. E. Toole, "Loudspeakers and Rooms", part 3 (Harman lecture slides) | https://www.harman.com/documents/LoudspeakersandRoomsPt3_0.pdf | No date seen | Extracts only |
| TOOLE-2006 | F. E. Toole, "Loudspeakers and Rooms for Sound Reproduction—A Scientific Review", J. Audio Eng. Soc. 54(6), pp. 451–476 | https://audioroundtable.com/misc/Loudspeakers_and_Rooms.pdf | June 2006 | Abstract-level extracts only |
| TOOLE-SR | F. E. Toole, *Sound Reproduction: The Acoustics and Psychoacoustics of Loudspeakers and Rooms*, 3rd ed. (Routledge), ch. 8 "Below the Transition Frequency" | (book) | 2018 | **Not read**; chapter title from a forum post quoting the book |
| HW-SUBS | T. Welti, "Subwoofers: Optimum Number and Locations" (Harman white paper) | https://www.harman.com/Documents/multsubs.pdf | c. 2002 | **Full text read** for `multi-subwoofer-placement.md` (2026-10-11); reused from that note |
| JAES-2006 | T. Welti & A. Devantier, "Low-Frequency Optimization Using Multiple Subwoofers", JAES 54(5), pp. 347–364 | https://audioroundtable.com/misc/Welti_Multisub.pdf | May 2006 | One extract only (this session); abstract read earlier (`multi-subwoofer-placement.md`) |
| IG | Dolby Atmos Home Theater Installation Guidelines | see `dolby-speaker-placement.md` | r3.1, Dec 2018 | Read earlier; reused from `dolby-speaker-placement.md` sections 5–6 |
| LACHOT | W. Lachot on the "38% rule" (ProSoundWeb forum post) | https://repforums.prosoundweb.com/index.php/topic,21551.0.html | — | Reused from `dolby-speaker-placement.md` section 8, item 3 |
| SV-VIEW | Sound & Vision, "Screen Size and Seating Distance" | https://www.soundandvision.com/content/screen-size-and-seating-distance | — | Extracts only; *secondary* for SMPTE and THX |
| AF-VIEW | Acoustic Frontiers, "Home theater viewing angles, distances and sightlines" | https://acousticfrontiers.com/blogs/articles/home-theater-viewing-angles-distances-and-sightlines | about 2013 | Extracts only; *secondary* (acoustics consultancy) |
| EN12520 | SGS SafeGuards 170/24, "European standard EN 12520:2024 on domestic seating revised" | https://www.sgs.com/en-us/news/2024/12/safeguards-17024-european-standard-en-12520-2024-on-domestic-seating-revised | December 2024 | Extracts only; *secondary* description of the standard's scope |
| RETAIL | Castlery "Best sofa depth & height"; Omhu "Standard sofa dimensions"; Valencia Theater Seating and Seatcraft guides (viewing distance, rows, risers) | https://www.castlery.com/us/blog/best-sofa-depth-and-height ; https://omhucph.com/blogs/inspiration/standard-sofa-dimensions ; https://us.valenciatheaterseating.com/blogs/knowledge-center/home-theater-seating-layout-spacing ; https://www.seatcraft.com/blogs/news/two-row-home-theater-seating | fetched via search 2026-10-15 | Extracts only; *retail* |
| COMMUNITY | AVS Forum "MLP in center of a home theater"; Gearspace "Bass cancellation"; Audioholics and Axiom forums on couches against the back wall; StereoNET recliner thread; Darko.Audio reader survey | https://www.avsforum.com/threads/mlp-in-center-of-a-home-theater.3242468/ ; https://gearspace.com/threads/bass-cancellation.1087310/ ; https://forums.audioholics.com/forums/threads/main-listening-position-mlp.129806/ ; https://www.stereonet.com/forums/topic/605260-advice-please-for-placement-of-rear-surrounds/ ; https://darko.audio/2022/06/global-feedback-how-far-do-you-sit-from-your-loudspeakers/ | — | Extracts only; **community practice** |

KUTTRUFF and MHA (room-mode textbooks) are cited as in `low-frequency-response.md` section 1. Not found at all: a THX document giving viewing angles or seating rules (only secondary descriptions), SMPTE EG-18 itself, any furniture standard with sofa dimensions, and an anthropometric source for the ear's distance from the back of the head.

## 2. Head position on a couch (question 1)

**What the sources say.**

- **No standard gives sofa dimensions.** EN 12520 (domestic seating) covers safety, strength and durability and explicitly excludes ergonomics, so it sets no seat depth or back height (EN12520, *secondary*). No ergonomics reference (Panero & Zelnik, ISO 7250) was reachable; ISO 7250-1 defines body measurements in an upright seated posture, not a reclined one, and its head landmarks could not be checked.
- **Retail ranges** (RETAIL, *retail*, consistent with each other but uncited): seat height 43–48 cm; seat depth 51–56 cm typical, up to about 61 cm for lounge sofas; back height 70–91 cm from the floor; overall depth 81–102 cm; a three-seat sofa 183–244 cm wide.
- **Ear height**: Dolby uses 1.2 m as seated ear height, citing BS.1116-1 (IG p.6, already in `dolby-speaker-placement.md` section 5).
- **Dolby's sheets draw a sofa with the MLP at its centre** (IG sheets, `dolby-speaker-placement.md` section 6). That is a symbol for "the central seat", not a statement about where the head sits in the couch's depth.
- **Head offset from the couch back: no source found.** One community report (StereoNET recliner thread, **community practice**) gives ears 300–400 mm in front of the wall with a reclined theater seat backed against it. Seating vendors note that reclining moves the eyes and ears down and back (RETAIL), so the offset depends on posture.

**Table: typical couch dimensions and head offset**

| Quantity | Typical value | Source and quality |
|---|---|---|
| Seat height (floor to cushion top) | 0.43–0.48 m | RETAIL, *retail*; **UNVERIFIED** against a standard |
| Seat depth (front edge to back cushion) | 0.51–0.56 m (lounge sofas to about 0.61 m) | RETAIL, *retail*; **UNVERIFIED** |
| Back height (floor to top of back) | 0.70–0.91 m | RETAIL, *retail*; **UNVERIFIED** |
| Overall depth (front edge to rear of frame) | 0.81–1.02 m | RETAIL, *retail*; **UNVERIFIED**. The app's fixed 0.9 m (`SEAT_ROW.depth`) is inside this range |
| Back thickness (overall depth minus seat depth) | about 0.25–0.45 m | **Ours** (arithmetic on the two retail ranges) |
| Width of a three-seat couch | 1.83–2.44 m | RETAIL, *retail*; **UNVERIFIED**. The app's default 2 m (`SEAT_ROW.defaultWidth`) is inside this range |
| Width per seat | about 0.6–0.8 m | **Ours** (three-seat width ÷ 3); **UNVERIFIED** |
| Seated ear height | 1.2 m | IG p.6 citing BS.1116-1, *primary* (read earlier) |
| **Head centre in front of the couch's rear edge** | **about 0.35 m (range 0.3–0.5 m)** | **Ours, UNVERIFIED**: back thickness (0.25–0.45 m) plus roughly 0.1 m from the back of the head to the ear, assuming the head rests against or just in front of the back cushion. The one community report (ears 0.3–0.4 m from the wall in a reclined seat against the wall) agrees in size but is a single anecdote |
| Head centre behind the couch's front edge (0.9 m deep couch) | about 0.55 m | **Ours** (0.9 − 0.35) |

So for #47: drawing the head 0.45 m from both edges (today's centred seat row) puts it about 0.1 m further forward than the estimate above. The direction of the fix is clear from couch geometry; the exact number is our estimate and must be labelled as such.

## 3. Distance from the back wall (question 2)

**Mechanism.** Near any wall the bass pressure is high (every room mode has a pressure maximum at a rigid wall), so a head close to the back wall hears more bass, and the reflection off the wall cancels the direct sound at the frequency whose quarter-wavelength equals the head-to-wall distance, f = c / (4d) (KUTTRUFF/MHA physics as in `low-frequency-response.md`; arithmetic **ours**): 0.5 m → 172 Hz, 0.8 m → 107 Hz, 1.0 m → 86 Hz, 1.2 m → 71 Hz, 1.5 m → 57 Hz, 2.0 m → 43 Hz. Moving away from the wall moves this notch down, into the subwoofer range, where room modes dominate anyway.

**What the sources say.**

- **Toole: a sofa against the back wall is "unfortunate"**, with a strong likelihood of excessive, boomy bass and poor imaging; the worst seat is in a corner and the best seats are a few feet out into the room. Remedies: equalization or moving the subwoofer for the bass, absorbing material behind the head for imaging (TOOLE-URA, *(extract)*).
- **Toole's measured example**: a listener starting about 0.5 m from the back wall was moved forward; the bass excess fell progressively and was acceptably subdued at about 2 m, which he puts down to the ears then being near the quarter-wavelength null of a 40 Hz standing wave (attributed to Toole's Harman papers, *(extract)*; which of TOOLE-URA or a companion Harman paper holds it is **UNVERIFIED**). This is one room, not a rule; c / (4 × 2 m) = 43 Hz agrees with his 40 Hz.
- **RP22 sets minimum head-to-wall clearances by performance level**, measured from the centre of the listener's head to the nearest side wall, back wall or protruding speaker baffle: **> 0.5 m (Level 1), > 0.8 m (Level 2), > 1.2 m (Level 3), > 1.5 m (Level 4)** (RP22, seating-layout performance table, *(extract)*; the extract was messy, so confirm the table before typing the values). The stated purpose is to limit seat-to-seat loudness differences and boundary interference.
- **RP22 on seats against the back wall**: if seating must go against the back wall, leave out the back (rear surround) speakers, because they would sit too close to those listeners' ears (RP22, *(extract)*).
- **EBU Tech 3276**: all listening positions at least **1.5 m** from the side walls and the back wall; loudspeakers at least 1 m from walls (EBU3276, *(extract)*). EBU-TR274 says BS.1116's listening conditions largely match Tech 3276 (*(extract)*). That BS.1116-3 itself states 1.5 m for the listener is **UNVERIFIED**: no extract of BS.1116 text was seen. These are critical-listening-room rules, stricter than a home theater needs.
- **Community practice**: move the couch so the ears are at least "a few feet" (about 1 m) in front of the back wall, or treat the wall with absorption if the couch must stay (Audioholics, Darko.Audio reader reports, COMMUNITY). A minority report good results against the back wall with two subwoofers and room EQ (AVS Forum, COMMUNITY). **Community practice**, anecdotal.

**Summary.** Every source points the same way (don't put the head at the back wall), and two give numbers: RP22's graded 0.5 / 0.8 / 1.2 / 1.5 m, and EBU's 1.5 m for critical listening. Toole's 2 m is a single-room example, not a minimum.

## 4. Front-to-back seat position (question 3)

- **The "38% rule"**: an informal starting point from acoustician Wes Lachot, not a standard; meant to keep the seat off the room's length midpoint (LACHOT, already in `dolby-speaker-placement.md` section 8, item 3). Some write-ups credit others with it (Critical Listening Lab names Bob McCarthy and John Brandt; *secondary*, attribution disputed). The app uses it as the auto MLP seed.
- **Why "avoid the middle"**: at the length midpoint the first and third (odd) length modes have pressure nulls and the second has a maximum (JAES-2006, *(extract)*: "the second-order mode has a maximum at the center ... while the first- and third-order modes pass through a minimum"). Toole states the same for a listener at the midpoint: the odd modes are nulled there, which leaves the second-order length mode as the main problem (TOOLE-LR3, *(extract)*). So the midpoint is not "a null" in general: it removes the lowest length mode (thin deep bass) and sits on the second one's peak.
- **Welti's seating results**: Welti's optimizations score a seating **area** in the centre or centre-rear of the room, not one seat; moving the seats toward the rear and weighting the centre seats double left the best subwoofer arrangements unchanged (HW-SUBS Investigation 7 and slide 72, via `multi-subwoofer-placement.md`). He gives no single-seat front-to-back rule. His approach is to fix the bass by subwoofer count and position so that the seat matters less (HW-SUBS; TOOLE-2006 abstract, *(extract)*: multiple subwoofers give similarly good bass to several listeners).
- **Toole** (TOOLE-SR ch. 8, **not read**): the book is reported to treat seat position, subwoofer placement and equalization together as ways to manage room modes (Stereophile review, *secondary*). No seat-position percentage from Toole was found.
- **Dolby** gives no row placement or wall distance for home theaters (IG, `dolby-speaker-placement.md` section 6).
- **Community practice**: the 38% figure is widely repeated, with the caveats that it assumes a rectangular room and that the seat should not be at the back wall (several acoustics-retailer and forum write-ups, COMMUNITY).

## 5. Off-centre seats (question 4)

**Is the centre line a good or a bad single seat for bass?**

- **The modal facts** (rigid rectangular room; KUTTRUFF ch. 3 as in `low-frequency-response.md`): on the centre line every odd width mode has a pressure null and every even width mode a maximum. In the default 6 × 4.5 m room (**ours**): width modes at 38.1 Hz (n = 1, null on the centre line), 76.2 Hz (n = 2, maximum on the centre line, nulls at x = ±1.125 m) and 114.3 Hz (n = 3, null on the centre line).
- **A centred subwoofer does not excite odd width modes at all.** The coupling of a mode is the product of its shape at the source and at the seat (`low-frequency-response.md`, item 4). One subwoofer on the front-wall midpoint, the 1-subwoofer arrangement (`multi-subwoofer-placement.md`), sits on the odd width modes' null, so those modes are silent everywhere, at the centre line or not (**ours**, from the modal sum). Toole makes the same point for two front subwoofers placed symmetrically: the odd width modes cancel (TOOLE-LR3, *(extract)*), and Welti's symmetric arrangements work the same way (HW-SUBS).
- **So in a symmetric room with symmetric subwoofers, the centre line's real bass cost is the even width modes' maximum, not the odd modes' null.** At the seat the app recommends (x = −0.56 m), the second width mode's shape factor drops from 1.0 to 0.71 (|cos(2π · 1.69 / 4.5)|, **ours**), which lowers the 76 Hz peak. That is our reading of why the bass-smoothness part prefers that seat; it has **not** been confirmed by inspecting the app's model output (the speakers above the crossover and boundary interference also feed the score), so #48 should check it before the ADR relies on it. Issue #48's wording ("odd width modes have nulls on the centre line") is true but is probably not the cause when the subwoofer is centred.
- **The model's limits matter here**: rigid walls, one reverberation time for all modes, point-source subwoofers (`low-frequency-response.md` section 2). Real side walls are not perfectly symmetric or rigid, so the exact advantage of a 0.56 m offset is less certain than the model's two points suggest.

**How practitioners trade bass against symmetry.**

- **RP22 (primary design practice)**: in a rectangular room with reasonably uniform walls, the reference seating position (RP22's term, which it says unifies MLP, primary seat and reference viewing position) should ideally be on the perpendicular axis of the front centre speaker, that is on the centre line, and the room should have at least one seat where the fewest compromises are made for both sound and picture (RP22 section 4.1.1, *(extract)*). Room ratings apply to that seat **and one adjacent seat**, to keep seat-to-seat differences small (RP22, *(extract)*).
- **Toole and Welti**: keep the seat where the picture and imaging want it and fix the bass with subwoofer count, positions and equalization, judged over the seating area (TOOLE-2006 abstract, TOOLE-LR3 *(extract)*; HW-SUBS). Neither source recommends moving a single main seat off the centre line for bass (none found; **UNVERIFIED** that they never do).
- **Community practice**: an off-centre seat can give better bass, and high-frequency left/right symmetry can be restored with absorption (Gearspace, COMMUNITY); others reply that in small, near-square rooms one cannot leave the centre and stay symmetric, and that across the width the even modes' peaks and nulls remain wherever you sit (AVS Forum, COMMUNITY). The usual answer in those threads is more subwoofers and seat-averaged EQ rather than an offset seat. **Community practice**, no numbers taken from it.

**Answer.** The centre line is the expected single seat in published practice (RP22) and for imaging and Dolby's equidistance, and with centred or symmetric subwoofers it does not suffer from the odd width modes. It does sit on the even width modes' peaks. The off-centre recommendation in #48 is acoustically defensible in the model but is at odds with published practice, which fixes bass with subwoofers rather than by moving the main seat.

**Options for the recommended-seat behaviour (for #44 question 5; not a decision):**

| Option | What it does | For | Against |
|---|---|---|---|
| A. Keep the current score | The best grid seat wins if it beats the MLP by 0.02 | Honest to the model; no new assumptions | Contradicts RP22's centre-axis seat; reads as a bug (#48); rests on a simplified model whose margin (two points) is within its own stated precision |
| B. Prefer the centre line | Recommend the best seat on x = 0, unless an off-centre seat beats it by a larger, separate margin (a "symmetry margin", ours) | Matches RP22 and common practice; small change to `recommendSeat`; heatmap can still show the off-centre area | The margin is our modelling assumption with no source; hides a real bass gain unless the UI says so |
| C. Show both | Recommend the centre-line seat as the MLP, and mark the best-bass seat separately with a short explanation (bass vs symmetry) | Most transparent; teaches the trade-off; matches "be honest about estimates" | More UI and a new glossary term (for example "best bass seat"); two markers may confuse |
| D. Score symmetry explicitly | Add a left/right symmetry term to placement fit (for example the L/R distance or angle mismatch from the seat) | Keeps one recommendation; the score itself explains the result | The term and its weight are ours; changes every heatmap and pinned test |

B and C can be combined: prefer the centre line and also mark the best-bass seat when it is meaningfully better.

## 6. Viewing distance (question 5)

- **SMPTE**: a minimum horizontal viewing angle of 30° (attributed to SMPTE EG-18; SV-VIEW and RETAIL, *secondary*; the SMPTE text was not seen, **UNVERIFIED** as worded).
- **THX**: about 36° for the main seat (SV-VIEW, *secondary*); a range of 26°–36° and an "immersive" 40° also circulate (RETAIL, *retail*). No THX document was found, so every THX figure is **UNVERIFIED** against THX.
- **Vertical**: no viewer more than 15° to the top or bottom of the screen (attributed to CEDIA by AF-VIEW, *secondary*, about 2013; the newer CTA/CEDIA video practice, CEB23/RP23, was not read).
- **Distance from angle** (**ours**, geometry): seat distance = screen width / (2 · tan(angle / 2)), so 30° → 1.87 × width, 36° → 1.54 × width, 40° → 1.37 × width. Installer write-ups quote the same multipliers (1.9 and 1.54 × width; SV-VIEW, *secondary*).
- **Link to the screen research (#42)**: with a screen size in the config, the seat distance from the screen gives a viewing angle; combined with the 38% seed and the back-wall clearance (section 3) this can over-constrain small rooms. Which wins belongs to the ADR (#44).

## 7. Multi-row basics (question 6)

What v1.1.0 leaves out, recorded so the gap is visible:

- RP22 rates a room at the reference seat plus one adjacent seat (RP22, *(extract)*); a forum summary says more than 3 dB seat-to-seat deviation fails Level 3 (AVS Forum, **community practice**, not seen in RP22's text).
- A back row against the back wall: RP22 says to drop the back speakers then (section 3).
- Welti's subwoofer arrangements are optimised for a seating area, which is what multi-row rooms need (HW-SUBS); the app scores one MLP.
- Riser height (about 0.15–0.4 m) and row spacing (about 0.9–1.2 m back-to-front, more for recliners) appear only in seating vendors' guides (RETAIL, *retail*, **UNVERIFIED**). Seat-back height can block surround sound for a row behind (RP22 section 5.6.3.1, as quoted secondhand, **UNVERIFIED**).
- The app's seat row stays one visual couch, not analysed (`GLOSSARY.md`).

## 8. Recommendations for the auto-place rule ADR (#44)

Options with trade-offs, not a decision.

**MLP distance from the back wall**

| Option | Rule | For | Against |
|---|---|---|---|
| 1. 38% seed only (today) | MLP at 0.38 L from the front wall | Simple; already shipped; in any room longer than about 1.9 m it leaves the head at least 1.2 m from the back wall (0.62 L ≥ 1.2 m, **ours**) | Has no wall-clearance rule, so the recommended-seat grid (up to 15 × 0.25 m per side) can still pick seats near the back or side walls |
| 2. 38% seed plus an RP22 clearance | Keep the seed; exclude seats from the recommended-seat grid (and warn on a dragged MLP) whose head is closer than a chosen RP22 level to the side or back walls: 0.5, 0.8, 1.2 or 1.5 m | Cited (once the RP22 table is confirmed); graded, so the UI can say "Level 2 clearance" instead of right/wrong; matches Toole's direction | The level choice is ours; Level 3–4 (1.2–1.5 m) rules out much of a small room's width (a room 3 m wide or narrower has no seat more than 1.5 m from both side walls) |
| 3. Fixed distance from the back wall | For example 1 m (community practice) or 2 m (Toole's example) | Easy to explain | 1 m has no primary source; 2 m comes from one room in Toole's example and is too much for small rooms |
| 4. Allow "couch against the back wall" as a user choice | When the user drags the couch to the wall, warn about bass build-up and suggest dropping the rear surrounds (RP22) and adding absorption (Toole) | Matches many real living rooms | Needs a warning rule and copy; not a default |

**Where the head sits on the couch (for #47)**

- Draw the seat row with its rear edge about 0.35 m behind the MLP (**ours, UNVERIFIED**; range 0.3–0.5 m), instead of centring it on the MLP. Trade-off: no source gives this number, so it must live in `reference.ts` as a product choice with that note, like `SEAT_ROW.depth` today. The glossary's "drawn centered on the MLP" would need rewording.
- Any back-wall clearance (option 2) should be measured to the head, as RP22 does, not to the couch; the couch then needs head offset ≤ back-wall distance to fit in the room.

**The recommended seat and the centre line**: see the options table in section 5.

## 9. Gaps

1. **No full text was read in this session** (fetch blocked). RP22's clearance table, its section 4.1.1 wording on the reference seat, and its back-speaker advice are from extracts and must be confirmed before they become typed reference data with page numbers.
2. **BS.1116-3 not read.** Its listener-to-wall distance is described only by EBU documents; the 1.5 m figure is EBU Tech 3276's.
3. **Head offset from the couch back has no source.** The 0.35 m value is our estimate from retail couch ranges and a rough head size; no anthropometric source for the ear's distance from the back of the head (ANSUR II, ISO 7250) was reached.
4. **No furniture standard sets sofa dimensions** (EN 12520 excludes ergonomics); every couch number is retail.
5. **Toole's book (ch. 8) not read**, and the 0.5 m → 2 m example's exact source document is unconfirmed.
6. **THX and SMPTE viewing angles are secondary only.**
7. **Why the model picks x = −0.56 m** is our modal inference (second width mode), not checked against the app's output.
8. **Multi-row numbers** (risers, row spacing, the 3 dB seat-to-seat figure) are retail or community only.
