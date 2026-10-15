# Speaker placement in real rooms (beyond Dolby's angles)

Researched 2026-10-15 for issue #40 (parent #39). It is the evidence for the auto-place rule ADR (#44) and the clustering bug (#49). It covers how listener-level and overhead speakers are placed in real home theaters, and how that relates to Dolby's placement ranges. Dolby's own guidance comes from `dolby-speaker-placement.md` and is the baseline here. The screen side of the front stage (screen edges, the Center and the screen) is covered in more depth in `screen-and-front-stage.md` (#42), and this note points there instead of repeating it.

**How this was researched, and its main limit.** In this session the egress proxy refused every direct fetch (itu.int, genelec.com, dolby.com, cedia.org, thx.com, kef.com, audiosciencereview.com, aes2.org, web.archive.org and others all failed), so **no document was opened directly for this note**. Each claim below comes from (a) the existing Dolby note, which was read from Dolby's PDFs, or (b) web-search excerpts of the named page, cited by the URL of the page that owns the claim. Claims seen only in a search excerpt of the owning page are marked *(excerpt)*. Claims that only a secondary write-up attributes to a source are marked **UNVERIFIED**. Forum and magazine material is marked **community practice** and never carries a number on its own. Arithmetic we did ourselves is marked **ours**. Nothing was downloaded, and nothing is quoted at length.

## Conventions used in this file

- **Azimuth**: the same as `dolby-speaker-placement.md`: the horizontal angle from the MLP, 0° at the center-front reference, given per side (±).
- **Elevation**: the vertical angle from seated ear height, positive upward (the RP22 glossary's convention *(excerpt)*). Dolby's 0°–180° side-view convention is converted where needed.
- **Front-wall distance `d`**: from the speaker's front baffle to the wall behind it, as Genelec measures it *(excerpt)*.
- **Quarter-wave notch**: the first boundary-interference notch from the wall behind a speaker, `f = c / (4d)` with c ≈ 343 m/s (textbook geometry; see `crossover-enclosure-boundaries.md` section 4).
- **Delay**: 1 m of path is about 2.9 ms (c ≈ 343 m/s, **ours**).
- **Citation keys**: the keys in section 1. Dolby keys (`IG`, `WP`, `WEB101`) are the ones in `dolby-speaker-placement.md`.

## 1. Sources

| Key | Title | URL | Date / version | Status | Kind |
|---|---|---|---|---|---|
| BS775 | Recommendation ITU-R BS.775, "Multichannel stereophonic sound system with and without accompanying picture" | https://www.itu.int/rec/R-REC-BS.775 (BS.775-3 PDF: https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.775-3-201208-S!!PDF-E.pdf) | BS.775-3 (08/2012), superseded by BS.775-4 (12/2022) | Fetch refused; BS.775-3 text seen only as search excerpts. BS.775-4 not seen, so what changed is **UNVERIFIED** | Primary (standard) |
| BS1116 | Recommendation ITU-R BS.1116, subjective assessment of small impairments (listening-room conditions) | https://www.itu.int/rec/R-REC-BS.1116 | BS.1116-3 current | Not seen; only reported by EBU Technical Review 274 (https://tech.ebu.ch/files/live/sites/tech/files/shared/techreview/trev_274-hoeg.pdf) and a Fraunhofer tool page | Primary, read through secondary only |
| RP22 | CEDIA/CTA-RP22, Immersive Audio Design Recommended Practice, v1.2 | https://cedia.org/site/assets/files/6057/cedia-cta_rp22_v1_2_sept_2023.pdf | September 2023 | Fetch refused; glossary terms seen as excerpts; placement tables **not seen** | Primary (recommended practice) |
| D-MIX | Dolby Professional Support, "How to Design a Dolby Atmos Mix Room" (and the room-dimensions FAQ) | https://professionalsupport.dolby.com/s/article/How-to-Design-a-Dolby-Atmos-Mix-Room?language=en_US ; https://professionalsupport.dolby.com/s/article/What-room-dimensions-are-needed-to-mix-content-in-Dolby-Atmos?language=en_US | undated web articles, seen 2026-10-15 | Excerpts only | Primary (Dolby, studio guidance) |
| IG / WP / WEB101 | Dolby home theater documents | see `dolby-speaker-placement.md` section 1 | 2016–2018 | **Read** (by the Dolby note) | Primary |
| HANSCHKE-2023 | Hanschke et al. (Dolby Laboratories), "Improved Panning on Non-Equidistant Loudspeakers with Direct Sound Level Compensation", AES 155th Convention, October 2023 | https://arxiv.org/pdf/2310.17004 (AES: https://aes2.org/publications/elibrary-page/?id=22250) | October 2023 | Abstract and excerpts only | Primary (paper, open preprint) |
| GEN-SUP | Genelec support, "I am not getting enough bass, do I have a backwall cancellation?" | https://support.genelec.com/hc/en-us/articles/360013434539-I-am-not-getting-enough-bass-do-I-have-a-backwall-cancellation | undated, seen 2026-10-15 | Excerpts only | Primary (manufacturer) |
| GEN-GUIDE | Genelec, "Monitor Setup Guide" | https://assets.ctfassets.net/4zjnzn055a4v/3oerOc4piQKHTbc2tm2sK7/fa3f672b49d6fba7bc90fabb140e3c0d/Genelec_Monitor_Setup_Guide.pdf | undated PDF | Excerpts only | Primary (manufacturer) |
| GEN-8260 | Genelec 8240A/8250A/8351A/8260A operating manual | https://assets.ctfassets.net/4zjnzn055a4v/1CrttMuYgAaMuawMUAOOEu/2dbe47e74ff875175d05cc9f6f191cc9/genelec_8240_8250_8351_8260_opman.pdf | undated PDF | Excerpts only | Primary (manufacturer) |
| ADAM | ADAM Audio blog, "How to position studio monitors in your room"; T Series operation manual | https://www.adam-audio.com/blog/how-to-position-studio-monitors-in-your-room/ ; https://www.adam-audio.com/content/uploads/2018/03/adam-audio-t-series-user-manual-english.pdf | 2018 manual; blog undated | Excerpts only | Primary (manufacturer) |
| KEF | KEF, "10 Tips for Speaker Placement"; "How to build your perfect home theatre with the new Q Series" | https://eu.kef.com/blogs/news/10-tips-for-speaker-placement ; https://us.kef.com/blogs/news/how-to-build-your-perfect-home-theatre-with-the-new-q-series-with-mat | undated | Excerpts only | Primary (manufacturer) |
| DENON | Denon AV receiver online manuals, "Distances" setting (AVR-X580BT, AVR-X1700H and others) | https://manuals.denon.com/AVRX580BT/EU/EN/WBSPSYlynwmklu.php ; https://manuals.denon.com/AVRX1700H/EU/EN/DRDZSYyvwvohgk.php | current online manuals | Excerpts only | Primary (manufacturer) |
| QSC | QSC, "Sound Advice: Loudspeaker placement part 2: Low frequency cancellation" | https://support.qsc.com/sound-advice/sound-advice-%7C-loudspeaker-placement-part-2-low-frequency-cancellation | undated | Excerpts only | Primary (manufacturer) |
| THX | THX FAQ pages (desktop setup, manual calibration, screen placement) | https://www.thx.com/questions/set-desktop-systems/ ; https://www.thx.com/blog/faq_category/buying-setup-guides/ | undated | Excerpts only | Primary (THX), consumer level |
| AURO | Auro-3D Home Theater Setup Guidelines v11 | https://www.auro-3d.com/wp-content/uploads/2024/05/Auro-3D-Home-Theater-Setup-Guidelines-v11-20240429.pdf | 2024-04-29 | Table of contents only; no numbers seen | Primary (format owner) |
| TOOLE-SR | F. E. Toole, *Sound Reproduction: The Acoustics and Psychoacoustics of Loudspeakers and Rooms*, 3rd ed., Routledge/Focal | https://routledgetextbooks.com/textbooks/9781138921368/ | 2017 | **Not read.** Only forum quotations and reviews seen | Primary, read through secondary only |
| TOOLE-URA | F. E. Toole (Harman), "Understanding Room Acoustics and Speaker Placement" | third-party mirror: https://www.cieri.net/Documenti/Altri%20marchi/Harman%20Group%20-%20Understanding%20Room%20Acoustics%20and%20Speaker%20Placement%20(Floyd%20E.%20Toole).pdf | undated | Excerpts of a mirror copy only | Primary (author's own paper) |
| TOOLE-LR | F. E. Toole, "Loudspeakers and Rooms for Multichannel Audio Reproduction", Harman white paper, parts 1 and 3 | https://Harman.com/documents/LoudspeakersandRoomsPt1_0.pdf ; https://www.harman.com/documents/LoudspeakersandRoomsPt3_0.pdf | Part 1 dated 2002-01-31 | Title, date and fragments only | Primary (author's own paper) |
| TOOLE-SV | Sound & Vision, "Advice From an Audio Insider" (interview with Toole) | https://www.soundandvision.com/content/advice-audio-insider | undated | Excerpts only | Secondary (interview quoting Toole) |
| LACHOT | W. Lachot on the "38%" listening position (R/E/P forum; reproduced on RealTraps) | https://repforums.prosoundweb.com/index.php/topic,21551.0.html ; https://realtraps.com/art_room-setup.htm | undated | Already cited in `dolby-speaker-placement.md` section 8; excerpts | Primary (originator's own words, informal) |
| CARDAS | Cardas Audio, "Speaker Placement" (Golden Cuboid method) | https://www.cardas.com/system-setup | undated | Excerpts only; coefficients seen only in a forum quotation | Primary (originator, manufacturer) |
| STEREOPHILE | Stereophile, "Fine Tunes" (rule of thirds; Golden Cuboid) | https://www.stereophile.com/finetunes/171 ; https://www.stereophile.com/content/golden-cuboidspeaker-placement | undated | Excerpts only | Secondary (magazine) |
| SV-THX | Sound & Vision, "THX Ultra: Episode 2" and "Can I Use Dipole Speakers in a 7.1.4 Atmos Setup?" | https://www.soundandvision.com/content/thx-ultra-episode-2-listening-strikes-back-part-2 ; https://www.soundandvision.com/node/117043 | about 2000; undated | Excerpts only | Secondary (magazine) |
| AVS-DIST | AVS Forum threads on distance settings and surround distance | https://www.avsforum.com/threads/what-does-speaker-distance-setting-actually-do.1472681/ ; https://www.avsforum.com/threads/distance-from-surround-speakers-to-listening-position.2134586/ | various | Excerpts only | **Community practice** |
| AVS-BAFFLE | AVS Forum baffle-wall and flush-screen threads | https://www.avsforum.com/threads/baffle-wall-acoustic-treatment.3218187/ ; https://www.avsforum.com/threads/how-best-to-set-up-speakers-behind-a-flush-to-the-wall-fixed-screen.3256785/ | various | Excerpts only | **Community practice** |
| AH-ATMOS | Audioholics forum, "The Dolby Atmos, DTS-X, and Auro-3D Discussion Thread" | https://forums.audioholics.com/forums/goto/post?id=1283902 | various | Excerpts only | **Community practice** |
| AH-38 | Audioholics forum, "The 38% rule" | https://forums.audioholics.com/forums/threads/the-38-rule.15211/latest | various | Excerpts only | **Community practice** |

Counts: 27 source rows; 20 are primary (standards, Dolby, manufacturers, Toole's, Lachot's and Cardas's own writing, a Dolby AES paper), of which TOOLE-SR and BS1116 were reachable only through secondary write-ups. Three are magazine or interview write-ups, and four are community practice. Audio Science Review threads came up in searches but gave nothing that a primary source here does not already say, so none is cited.

## 2. Front L/R and center (question 1)

### 2.1 Distance from the front wall, and boundary interference (SBIR)

- **The mechanism** (textbook; GEN-SUP *(excerpt)*; QSC *(excerpt)*): the wall behind a speaker returns a delayed copy of its sound, and the first cancellation sits where the baffle-to-wall distance is a quarter wavelength, `f = c/(4d)`. Genelec's guide tabulates about 429 Hz at 0.2 m, 214 Hz at 0.4 m, 123 Hz at 0.7 m, 86 Hz at 1.0 m and 43 Hz at 2.0 m (GEN-GUIDE *(excerpt)*), which matches the formula. QSC notes that EQ cannot fix the notch, because the reflection changes by the same amount (QSC *(excerpt)*).
- **Close to the wall is the manufacturers' default.** Genelec: keep the front baffle preferably under 0.6 m from the wall behind, with at least 50 mm behind a rear port (GEN-SUP; GEN-GUIDE *(excerpts)*). The 8240A–8260A manual says cancellation becomes a concern beyond about 0.3 m and to avoid 1–2.2 m (GEN-8260 *(excerpt)*). ADAM: within about 0.5 m (with the boundary EQ switch set) or more than 1.5 m, and avoid the middle band (ADAM blog *(excerpt)*); its S-series manual separately says at least 400 mm from the nearest wall *(excerpt)*, so ADAM is not fully consistent with itself.
- **Hi-fi and home theater manufacturers say farther out.** KEF: typically 300–1000 mm from the wall behind, both speakers the same distance (KEF *(excerpt)*); KEF Australia's version gives at least 225 mm *(excerpt)*.
- **Flush (in-wall, baffle wall)** removes the wall-behind reflection and the cabinet edge diffraction, and adds about +6 dB of low-frequency boundary gain that has to be equalized (GEN-GUIDE *(excerpt)*). **Community practice** (AVS-BAFFLE): dedicated-theater builders widely favor a full baffle wall behind an acoustically transparent screen for this reason; a common rule in those threads is "unless the speakers can come more than 3 m into the room, keep their fronts under 1 m from the front wall", so the notch moves up to where wall absorption can treat it. Not a source for a number.
- **About 1 m out** is the worst of both in most of these sources: the first notch lands at about 86 Hz, in the crossover region (80 Hz, the app's default), where neither the subwoofer nor absorption fixes it (**ours**, from the formula and GEN-8260's 1–2.2 m band).
- **Dolby** says nothing about wall distance (`dolby-speaker-placement.md` section 7). ITU-R BS.1116 reportedly asks for at least 1 m from monitor acoustic centre to the walls, and listening positions at least 1.5 m from the side and back walls (EBU Tech Review 274, reporting BS.1116; **UNVERIFIED** against the ITU text). That is a critical-listening-room rule for test rooms, not a home theater rule, and it conflicts with the manufacturers' "close to the wall" advice.

### 2.2 The screen edges, and toe-in

- **Screen**: see `screen-and-front-stage.md` sections 3 and 4. In short, BS.775 accepts that a TV picture (about 33° wide at the reference distance) is narrower than the ±30° front pair *(excerpt)*, and THX's consumer pages put L/R beside the display *(excerpt)*. KEF says the front pair should be about as wide as the seating area, with clearance from the side walls (KEF *(excerpt)*).
- **Toe-in**: Dolby asks to aim at the central seat and toe L/R in (WEB101). Genelec: aim the acoustic axes at the listening position (GEN-8260 *(excerpt)*). KEF, for its wide-dispersion coaxial drivers, suggests starting flat to the room and rarely more than about 10° of toe-in, equal on both sides (KEF *(excerpt)*). A review of Toole's book says Toole cautions against aiming speakers at the audience in home theaters (review in Boston Audio Society *Speaker*, https://www.enjoythemusic.com/magazine/bas/0609/ ; **UNVERIFIED** against TOOLE-SR). No source gives a numeric toe-in rule for several seats.

### 2.3 The center: above, below or behind an acoustically transparent screen

- BS.775: the front speakers' acoustic centres should ideally be at ear height, which implies an acoustically transparent screen; otherwise the center goes immediately above or below the picture (BS775 *(excerpt)*).
- Dolby: on the screen axis, just above or below the TV (WEB101). Toole urges that L, C and R be in-wall, on-wall or free-standing close to ear level (TOOLE-SV, quoting Toole).
- **Community practice** (forum threads collected in `screen-and-front-stage.md`): behind an AT screen is preferred where a projector is used; a center slightly below with L/R at the same height is accepted. No number from these.

## 3. Surrounds and rear surrounds (question 2)

### 3.1 On the side and back walls, or on stands

- Toole places the surround speakers to the sides of the listeners, not behind them (TOOLE-URA *(excerpt)*). For movie-oriented rooms he describes bipoles or dipoles high on the side walls; for music some engineers prefer surrounds behind, on the back wall (TOOLE-URA *(excerpt)*).
- KEF: surrounds in line with or just behind the MLP (KEF *(excerpt)*).
- BS.775: surrounds anywhere between 100° and 120°, and the exact position is said not to be critical (BS775 *(excerpt)*).
- Dolby's mix-room guidance treats surround distance as free: surrounds must arrive coincident with the fronts *either* by equal path length *or* by signal delay (D-MIX *(excerpt)*). It also sets a minimum of 3.0 m between the side surrounds, baffle to baffle, for non-theatrical mix rooms (D-MIX FAQ *(excerpt)*).
- **Community practice** (AVS-DIST): in home theaters the side surrounds normally go on (or just off) the side walls at the Dolby azimuth, and the receiver's distance setting handles the different distance; posters stress that the angle matters more than the distance. One poster notes that in small rooms the outside seats can be about 1 m from one surround and 3 m from the other, which delay cannot fix (a level problem). Not a source for a number.
- Toole recommends free-standing speakers or speakers on an open shelf over speakers in cabinet cavities (TOOLE-URA *(excerpt)*).

### 3.2 Height above ear level

| Source | Surround height | Status |
|---|---|---|
| Dolby IG | same as the fronts ideally; no more than 1.25 × the front height (IG p.6) | Read |
| Dolby WP | up to about 0.6 m (2 ft) above listener level is "optimal" (WP p.5) | Read |
| BS.775 | surround height said to be less critical; up to about 15° of elevation reportedly acceptable | Only a patent (US8654997B2) reports this; **UNVERIFIED** |
| RP22 | "listener level" is seated ear height plus or minus a margin; height and top speakers start at about 25° elevation | Glossary *(excerpt)*; the margin's value was **not seen** |
| KEF | surround and rear speakers above ear height, to help diffuse ambient sound | *(excerpt)* |
| Toole | ceiling locations for surrounds can be "got away with" but are not ideal; L/C/R close to ear level | TOOLE-SV (interview) |
| Community practice | anything from ear level to 0.6–0.9 m above it; raising surrounds clears the heads of a first row in multi-row rooms | AVS-DIST and consumer guides; no number |

For the app (**ours**): at Dolby's 1.2 m ear height, 1.25 × gives 1.5 m, about +0.3 m. At 2 m from the MLP, +0.3 m is about 8.5° of elevation, +0.6 m is about 17°. So Dolby's IG limit is the strictest of these; WP's 0.6 m sits near the reported BS.775 15°, and both stay well under RP22's 25° height-layer floor.

### 3.3 Dipole versus direct

- Dolby: dipole surrounds are not recommended; monopole or bipole is fine (IG p.6; WP p.5).
- THX history (SV-THX, secondary): THX required dipole side surrounds for THX-certified systems in the Pro Logic era, for even coverage and less localization of a mono surround channel; THX Ultra2 kept dipoles at the sides but used two closely spaced direct radiators at the back. After discrete 5.1, Dolby moved to direct radiators. **UNVERIFIED** against THX documents.
- Toole describes dipoles or bipoles high on the side walls as a common movie-room choice that softens surround localization (TOOLE-URA *(excerpt)*).
- **Not modelled by the app**: the app treats every speaker as a monopole (`crossover-enclosure-boundaries.md`), so this has no effect on auto-place.

## 4. Equidistance versus delay compensation (question 3)

- **What a receiver corrects.** Denon receivers accept distances from 0.00 to 18.00 m in 0.1 m or 0.01 m steps, and the manual asks that the distances differ by less than 6.00 m (DENON *(excerpt)*). So a mismatch of up to 6 m (about 17 ms, **ours**) is inside the product's stated range. The distance setting is a delay, not a level change; level is set separately by calibration (AVS-DIST, **community practice**; THX's manual-calibration FAQ also treats distance and level as two separate steps *(excerpt)*).
- **It is exact at one seat only.** Delay and level calibration is computed for the MLP. Dolby's own AES paper shows that even at the calibrated seat, when one speaker of a pair is much closer than the other, the phantom image shifts toward it: about 10° of average localization error in their test layout under standard calibration, which their direct-sound compensation largely corrected (HANSCHKE-2023, abstract and summary *(excerpt)*). Off the MLP, a seat nearer one speaker hears it first and louder, and the precedence effect pulls the image toward it; only moving the speaker (or adding distance) reduces that (precedence effect, general psychoacoustics; AVS-DIST, **community practice**).
- **Where equidistance is asked for.**
  - BS.775: the reference arrangement puts the speakers on an arc of a circle; where the front speakers must be on a straight line, delay the center feed so all signals arrive together (BS775 *(excerpt)*).
  - Dolby home: equidistant ideally, otherwise delay compensation (IG p.6, p.15).
  - Dolby mix rooms: the front L/R equidistant; the center and the surrounds may be delay-aligned instead (D-MIX *(excerpt)*). The mix position goes between 30% and 70% of the distance from the center baffle to the rear-surround line (D-MIX *(excerpt)*).
  - Genelec and ADAM (studios): the two (stereo) monitors equidistant from the listening position, in a symmetric layout (GEN-GUIDE; GEN-8260; ADAM *(excerpts)*).
- **Answer.** No source found recommends putting every listener-level speaker on one circle around the MLP for a home theater. The circle is a studio and reference construction (BS.775's arc, Dolby's mix rooms), and even there Dolby allows delay for C and the surrounds. Home sources (Dolby IG, receivers, AVS practice) treat delay compensation as the normal answer to unequal distances. The one bound that is stated for the front pair is the studio rule that L and R themselves be equidistant (D-MIX; GEN-GUIDE), and the best documented limit on mismatch is perceptual, not a delay-range one (HANSCHKE-2023): large L/R distance differences move the image even after calibration. No source gives a numeric "acceptable mismatch" in metres for a home theater.

## 5. Overheads in real rooms (question 4)

- **Dolby** (from the Dolby note, section 4): front and rear overheads at 30°–55° elevation (45° ideal), lateral spacing about the L/R spacing, mounting height 2–3 × the listener-level height, wide-dispersion speakers may face straight down, narrower ones angled at the MLP, and below 2.4 m (8 ft) ceilings overheads may be too close, so use enabled speakers. When a high ceiling pushes the angle out of range, move the overheads apart toward the front and back walls and set delays (Dolby IG, seen again as a search excerpt).
- **RP22**: height and top speakers have at least about 25° of elevation (RP22 glossary *(excerpt)*). An excerpt also gives 25°–40° (30° optimal) between the listener-level and upper layers, but it is unclear whether this is RP22's own number or its description of the Auro-3D layout; **UNVERIFIED**. RP22's per-level tables (spacing and maximum angle between adjacent speakers) were not seen; forum readers report a maximum of 60° between adjacent speakers at Level 3 (avforums.com RP22 thread, **community practice**, **UNVERIFIED**).
- **Auro-3D** puts its height layer on the walls at about 30° elevation, not on the ceiling (AURO; values only from a forum quotation, **UNVERIFIED**). That is a different design from Dolby's overhead speakers and is outside v1's scope.
- **Dolby mix rooms** set a minimum floor-to-overhead height of about 8 ft (D-MIX *(excerpt)*), the same 2.4 m threshold as the home guidance.
- **Community practice** (AH-ATMOS): with low ceilings, owners place the front pair roughly above the knees and in line with the front L/R, and angle in-ceiling speakers at the MLP once the ceiling is about 8.5 ft (2.6 m) or lower. The geometry in those threads is the same as Dolby's: 45° needs the overhead as far ahead of the MLP as it is above ear height (**ours**: at 2.4 m ceiling and 1.2 m ear height, that is 1.2 m ahead and 1.2 m behind, 2.4 m between the front and rear pairs).
- **Answer**: no source changes Dolby's overhead angles. Real-room practice adds aiming (angled baffles in low rooms) and accepts the elevation range's lower end in small rooms. The minimum ceiling stays Dolby's 2.4 m everywhere it appears.

## 6. Symmetry (question 5)

- Genelec: place the speakers symmetrically and at equal distance from the listening position; a symmetrical layout keeps reflections symmetrical, which helps localization (GEN-8260; Genelec 8020A manual, https://assets.ctfassets.net/4zjnzn055a4v/zY1wilv2LYwKCu2CsQOcG/1612b005485a73e1eb32d5520e3a399f/opman_8020A.pdf *(excerpts)*).
- ADAM: matched bass needs mirror-image placement, with each monitor the same distance from its own side wall and from the wall behind (ADAM T-series manual *(excerpt)*).
- KEF: both front speakers the same distance from the front wall (KEF *(excerpt)*).
- Toole (through forum quotations of TOOLE-SR only, **UNVERIFIED**): side-wall reflections are not something to eliminate; for multichannel, treating the side-wall reflection points is optional. That is about treatment, not about the speakers' symmetry, and it does not contradict the manufacturers.
- **Community practice** (AVS-DIST): symmetric angles matter more than equal distances.
- **Answer**: every source that speaks to it wants the left/right pairs mirrored about the room's center line, which in a rectangular room means the MLP on the center line too. No source quantifies how much asymmetry is tolerable. This bears on the off-centre recommended seat (#44 question 5): an off-centre MLP breaks the mirror symmetry of every pair relative to the side walls.

## 7. Rules of thumb in circulation (question 6)

| Rule | What it says | Origin | Evidence |
|---|---|---|---|
| "38%" | MLP about 38% of the room length from the front (or back) wall | Wes Lachot, who calls it a starting point, not a rule (LACHOT) | His explanation is axial-mode peaks and nulls along the length; no study found. One reading says it assumes speakers at the front wall (AH-38, **community practice**). The app already uses it as a seed (GLOSSARY "Auto-place") |
| "Rule of thirds" | Speakers a third of the way in from the front wall (and side walls), or the listener a third of the room length from a wall | No owner found. Stereophile calls it the received wisdom and a decent place to start (STEREOPHILE *(excerpt)*); an audiophile forum says it dates back at least to the 1980s | None found. It keeps sources and seats off the room's middle and the walls, where low-order modes peak or null |
| "L/R at 1/3 of the width" | Each front speaker a third of the width from its side wall | Same folklore as above | Textbook mode shapes (**ours**): at 1/3 of the width, the first width mode is at half its maximum, the second at half (opposite sign), and the third at its maximum, not a null. So it avoids the first-mode null at the center line and the side-wall pressure maximum, but it is not a null for every mode. Magazine write-ups that claim otherwise were not followed further |
| Cardas "Golden Cuboid" | Woofer 0.276 × width from the side wall and 0.447 × width from the wall behind | George Cardas (CARDAS) | Coefficients seen only in a forum quotation; **UNVERIFIED**. Derived from a 10 × 16 × 26 ft reference room, for stereo |
| "Close to the wall or far from it" | Front baffle < about 0.6 m from the wall behind, or > about 1.5–2.2 m | Genelec, ADAM (section 2.1) | Quarter-wave notch physics; manufacturer guidance, not a study |

## 8. Comparison: Dolby versus real-room practice

| Channel group | Dolby's guidance | Real-room practice (and source) | Conflicts |
|---|---|---|---|
| Front L/R | 22°–30° azimuth (sheets), 30° nominal, 22°–40° (IG fig.3); ear height 1.2 m; equidistant with C; toe in at the MLP | Close to the front wall (< 0.6 m, Genelec; 0.3–1 m, KEF) or flush/baffle wall (Genelec; AVS **community practice**); spread about as wide as the seating, beside the screen (KEF; THX; `screen-and-front-stage.md`); L and R equidistant and mirrored (Genelec, ADAM, D-MIX) | Dolby's equidistance circle around an MLP 2–3 m from the front wall pulls L/R well into the room, which lands them in the 0.5–1.5 m zone the monitor makers avoid. The angle and "near the wall" can only both hold if the MLP distance follows from the speaker width, not the other way round |
| Center | 0°, just above or below the screen | Behind an AT screen at ear height (BS.775), otherwise just above or below (BS.775, Dolby); same distance as L/R or delayed (BS.775, D-MIX) | None on angle; Dolby's circle puts C nearer the wall than L/R, which BS.775 and D-MIX both handle by delay |
| Side surrounds (Ls/Rs) | 90°–110° (7.x), 110°–120° (5.x); ear height, at most 1.25 × front height; equidistant or delayed; no dipoles | On or near the side walls at the Dolby azimuth, delay-aligned (D-MIX; AVS **community practice**); to the sides of the listeners (Toole); BS.775 100°–120° "not critical"; above ear height (KEF, WP up to 0.6 m) | Height: IG's 1.25 × is stricter than WP, KEF and the reported BS.775 15°. Position: Dolby's circle puts them inside the room (the #49 result); practice puts them at the wall. Dipoles: THX's history versus Dolby's "not recommended" |
| Rear surrounds (Lrs/Rrs) | 135°–150°; same height rules | On the back wall or the rear of the side walls, delay-aligned (D-MIX *(excerpt)*; AVS **community practice**); THX Ultra2 put two direct radiators close together at the back (SV-THX) | Dolby's circle leaves the back of the room empty (#49); practice uses the back wall, which often makes the rear pair the farthest speakers and needs the most delay |
| Overheads | 30°–55° elevation (45°), spacing ≈ L/R, ceiling ≥ 2.4 m, aim narrow speakers at the MLP | Same angles; angled in-ceiling speakers in low rooms (AH-ATMOS **community practice**); RP22 height layer from about 25° elevation | No real conflict. RP22's 25° floor sits below Dolby's 30° minimum (RP22 tables not seen) |
| MLP | one central seat; no position given | 38% seed (Lachot); D-MIX puts the mix position at 30%–70% of the center-to-rear-surround depth; BS.1116 at least 1.5 m from side and back walls (reported) | Dolby is silent; the others are starting points, not rules |

## 9. Recommendations for the auto-place rule ADR (#44)

Options, not a decision. In each, the azimuth stays Dolby's (graded as today); what changes is where along that azimuth a speaker goes.

**A. Keep the circle (today's rule), add a minimum radius.** Keep equidistance; only enlarge the radius so speakers sit nearer the walls.
- For: closest to Dolby's IG wording and to BS.775's arc; no delay explanation needed in the UI; tests barely change.
- Against: no home source asks for it (section 4); in long rooms the rear of the room stays empty and L/R stay mid-room (#49). It cannot satisfy the front-wall distance practice of section 2.1.

**B. Walls first, delay compensation for the rest.** Each listener-level speaker goes along its Dolby azimuth until it meets the clearance line of the nearest wall: L/R/C on (or a set distance from) the front wall, Ls/Rs on the side walls, Lrs/Rrs on the back wall or the rear of the side walls. Distances then differ, and the UI shows the receiver distance (delay) per speaker.
- For: matches the manufacturers (close to the wall), Dolby's own "or use delay compensation" (IG p.6, p.15), D-MIX's "equal path or signal delay", and AVS practice. Fixes #49 directly. In the #49 room it is barely unequal: with 0.3 m clearance and the MLP 2.28 m from the front wall, the fronts are about 1.98 m away and Ls at 115° meets the side-wall clearance line at about 2.15 m (0.17 m, 0.5 ms mismatch), while a 7.1 Lrs at 143° meets the side-wall line at about 3.24 m (1.26 m, 3.7 ms) (**ours**).
- Against: L and R may end up unequal when the MLP is off-centre, which HANSCHKE-2023 shows moves the image even after calibration; needs a rule for "the wall is too far for the angle" (the speaker goes on a stand at a maximum distance, or the angle moves within its range). Needs a new number for front-wall distance, and none of the sources agree on one (Genelec < 0.6 m, KEF 0.3–1 m).

**C. Hybrid: equidistant front stage, walls for the surrounds.** L, C and R on an arc (or C delayed on a straight line, as BS.775 allows) at a radius set by the front wall distance; surrounds and rear surrounds on the side and back walls with delay.
- For: keeps the front pair equidistant and symmetric, the one equidistance rule that studio sources keep (D-MIX; Genelec) and that HANSCHKE-2023 supports; surrounds follow home practice; fixes the empty back of the room.
- Against: two rules to explain; the front radius still needs a choice (from the front-wall distance, the screen width, or the MLP).

**D. Front stage fixed by the screen and wall, MLP derived from it.** Put L/R near the front wall at the screen edges or a chosen width, then find the MLP depth that puts them inside 22°–30°, and blend it with the seat score.
- For: matches how rooms are built (the screen and front wall come first); keeps L/R both near the wall and in range.
- Against: couples auto-place to the recommended seat and to the screen object (#42), so it is the largest change; the 38% seed and the seat score would compete with it.

**Cross-cutting choices the ADR has to make (each needs a number we could not source):**
1. Front-wall distance for L/R: a cited band (Genelec < 0.6 m; KEF 0.3–1 m) or our assumption.
2. The acceptable distance mismatch that the UI flags: no home source gives one in metres; the receiver range (< 6 m, DENON) is far too loose to be a quality limit, and HANSCHKE-2023 gives only a perceptual effect.
3. Surround height: Dolby IG's 1.25 × (strict) or WP's +0.6 m; RP22's listener-level margin was not seen.
4. Whether L/R must stay mirrored about the room's center line when the recommended seat is off-centre (section 6).

## 10. Gaps, inconsistencies and what we could not verify

1. **No document was opened in this session** (proxy refused all fetches). Every *(excerpt)* claim should be checked against its document by someone who can open it, before it becomes typed reference data. Highest priority: the BS.775-3/-4 text (arc, delay, surround height), RP22's placement tables, and Genelec's guide.
2. **BS.775-4 (2022)** supersedes the -3 edition that the Dolby IG and this note rely on; what changed is **UNVERIFIED**.
3. **BS.1116** wall distances (1 m to walls, 1.5 m listener to side and back walls) are known only through EBU Tech Review 274; **UNVERIFIED**.
4. **Toole's book** (TOOLE-SR) was not read; its positions on surround height, toe-in for several seats, and symmetry are known only through forum quotations and a review, so they are **UNVERIFIED**. Toole's Harman papers were seen only as fragments.
5. **RP22** levels, the "listener level" margin, adjacent-speaker angle limits and overhead spacing were not seen. The 25°–40° (30° optimal) layer figure may be Auro-3D's, not RP22's.
6. **THX**: no current THX home placement document was found; the dipole history comes from magazine write-ups.
7. **Cardas** coefficients come from a forum quotation of Cardas.
8. **No numeric home-theater tolerance** for distance mismatch, for left/right asymmetry, or for toe-in was found in any primary source.
9. **Rule of thirds**: no originator or study found.
10. **ADAM** gives two different minimum wall distances (0.5 m-or-closer in the blog, at least 400 mm in a manual).
