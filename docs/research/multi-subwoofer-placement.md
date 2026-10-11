# Multiple subwoofers in a rectangular room: primary-source notes

Researched 2026-10-11 for issue #10 (Subwoofers 1-4 with multi-sub auto-place). Dolby gives no subwoofer position (`docs/research/dolby-speaker-placement.md` section 6), so the arrangements come from Todd Welti's work at Harman. The only primary source whose full text could be read is Harman's own white paper by Welti (key `HW-SUBS` below), which says it is the presentation version of his AES 112th Convention paper 5602. The AES papers themselves are paywalled; for those only the official abstracts were read, from archived copies of their AES E-Library pages (the live pages sit behind a bot check). Everything below is paraphrased. Positions in the white paper are drawn in figures, not given as numbers, so they were read off page images rendered from the PDF. Anything not confirmed in a source is marked **UNVERIFIED**.

## Conventions used in this file

- **Room fractions**: positions are given as fractions of the room's inside dimensions, matching the app's room coordinates (`src/domain/room.ts`): `x/W` across the room from the **left** wall (0 = left wall, 0.5 = center line, 1 = right wall, seen from the MLP facing the front wall) and `y/L` from the **front** wall (0 = front wall, 1 = back wall). A subwoofer "at a wall" sits on that wall's line; how far its cabinet stands off the wall is not given by the source (see Gaps).
- **Front wall in the figures**: the white paper's room figures never name a front wall. Every seat in them is drawn as a head with a nose mark pointing at the top wall, so this file reads the **top wall as the front wall**. That reading is ours (see Gaps, item 2).
- **Citation keys**: `HW-SUBS slide N (p.M)` means the slide numbered N in the white paper, on page M of the PDF (the PDF has 30 pages with up to three slides each and the author's notes beside them). Slide numbers are printed on the slides.

## 1. Sources

| Key | Title | URL | Date / version | Status | Local file |
|---|---|---|---|---|---|
| HW-SUBS | T. Welti (Harman International), "Subwoofers: Optimum Number and Locations", Harman white paper (slides with notes, 80 slides on 30 pages) | https://www.harman.com/Documents/multsubs.pdf | No printed date. The PDF's creation-date field is malformed ("19102…", a Y2K-style year) and reads as 2002-10-29; Word file name "whitepaper10.doc". Fetched 2026-10-11 (server Last-Modified 2022-05-04). | **Full text read** | `multsubs.pdf` |
| AES-5602 | T. Welti, "How Many Subwoofers are Enough?", AES 112th Convention, Paper 5602 | https://aes2.org/publications/elibrary-page/?id=11355 (archived copy read: http://web.archive.org/web/20211202060546/https://www.aes.org/e-lib/browse.cfm?elib=11355) | April 2002 | Abstract only (paywalled) | none |
| JAES-2006 | T. Welti and A. Devantier (Harman International, Northridge, CA), "Low-Frequency Optimization Using Multiple Subwoofers", J. Audio Eng. Soc. vol. 54 no. 5, pp. 347–364 | https://aes2.org/publications/elibrary-page/?id=13680 (archived copy read: http://web.archive.org/web/20240223013223/https://www.aes.org/e-lib/browse.cfm?elib=13680) | May 2006 (publication date May 15, 2006) | Abstract only (paywalled) | none |

HW-SUBS slide 77 (p.29) says some additional details are in "the AES preprint version of this paper", AES 112th convention #5602. Its first paragraph of notes (slide 3, p.1) matches the AES-5602 abstract almost word for word. So HW-SUBS and AES-5602 are the same study, and HW-SUBS is the citable, readable version.

Related work that was **not read** (titles from search results and the existing Dolby research file; **UNVERIFIED**): A. Devantier and T. Welti, "In-Room Low Frequency Optimization", AES 115th Convention Paper 5942 (2003); T. Welti, "Optimal Configurations for Subwoofers in Rooms Considering Seat to Seat Variation and Low Frequency Efficiency", AES 133rd Convention Paper 8748 (2012). Their AES pages could not be opened (bot check) and no archived copy was found.

## 2. What each source shows

### HW-SUBS (Welti white paper, the source of every arrangement in this file)

**Question and assumptions.** Whether many subwoofers beat one, how many are enough, and where they should go (slide 5, p.2). Limiting assumptions (slide 6, p.2): a rectangular room, subwoofers along the walls, the system equalized, the subwoofers driven coherently (bass management: one low-frequency channel sent to every subwoofer, slide 11, p.4), maximum output a secondary goal, and the response over a seating area rather than at one seat. The notes add that the conclusions are not valid for rooms that are not rectangular (p.2).

**Model.** A Matlab room model using the closed-form modal solution of the wave equation for a rectangular room, plus the direct sound from each subwoofer (slides 16–17, p.6). The modelled subwoofers used measured power responses of a 12-inch subwoofer (notes to slide 38, p.13).

**Test room and seats.** Most simulations use a virtual 20 ft × 24 ft × 9 ft room (about 6.1 × 7.3 × 2.7 m), matching a real listening room used in Investigation 6, with a 6 ft × 6 ft grid of 16 seats spaced 2 ft apart (slide 23, p.8; notes, p.10). The figure draws the 20 ft walls at the top and bottom and the 24 ft walls at the sides, so in this file's terms W = 20 ft and L = 24 ft, and the seat grid is centered in the room (slide 23, p.8).

**Metrics.** (slides 22, 26–27, pp.8–10)
- **Std** (the primary one): equalize so that the spatial average over all seats is flat, take the standard deviation of each seat's equalized response, and average those over the seats. Lower is better. The example plot covers 20–80 Hz at 1/20-octave smoothing (slide 26, p.9).
- **Max-Min** and **Max-Ave**: the largest peak-to-dip spread and the largest peak above the average, averaged over the seats, to catch single prominent features (notes, p.9).
- **LF factor**: total low-frequency energy from 20–80 Hz, normalized for the number of subwoofers by subtracting 20·log10(n) (slide 27 and notes, p.10). Higher means more output per subwoofer.
- Goals in order: first minimize seat-to-seat variation, then the variation of the spatial average (assumed equalized flat), with output secondary; imaging is not considered, as subwoofers are taken as not localizable below 80 Hz (slides 9–10, pp.3–4).

**Investigation 3, brute-force optimization of 1 to 4 subwoofers** (slides 46–52, pp.16–18). Subwoofer locations were constrained to the walls at 2 ft intervals, and the configuration with the lowest Std counted as optimum (notes, p.16). The optimum for each count is drawn in a room schematic on slides 47–50:

| Subwoofers | Optimum as drawn | Positions (x/W, y/L) | Std / Max-Min / Max-Ave / LF factor (dB) | Citation |
|---|---|---|---|---|
| 1 | middle of the front wall | (0.5, 0) | 3.9 / 17.2 / 6.5 / 21.0 | HW-SUBS slide 47 (p.16) |
| 2 | middle of the front wall and middle of the back wall | (0.5, 0), (0.5, 1) | 1.3 / 4.6 / 2.3 / 19.7 | HW-SUBS slide 48 (p.17) |
| 3 | middle of the front wall, and middle of the left and right side walls | (0.5, 0), (0, 0.5), (1, 0.5) | 2.7 / 13.5 / 5.8 / 15.5 | HW-SUBS slide 49 (p.17) |
| 4 | middle of each of the four walls | (0.5, 0), (1, 0.5), (0.5, 1), (0, 0.5) | 0.9 / 4.2 / 2.0 / 13.8 | HW-SUBS slide 50 (p.17) |

- The schematics are not to scale (the 20 × 24 ft room is drawn nearly square) and carry no numbers. In each, the drawn subwoofers sit centered on their walls, and the side subwoofers on slides 49 and 50 sit level with the middle of the centered seat grid. The midpoints (10 ft along a 20 ft wall, 12 ft along a 24 ft wall) lie on the 2 ft search grid.
- The text names the midpoint result outright for 2 and 4 subwoofers: the notes to slide 51 (p.18) call the wall midpoints the optimum locations, at least by Std, and so do the conclusions on slide 75 (p.28), below. For 1 and 3 subwoofers the midpoint positions come from the figures only.
- Findings (slide 52, p.18): the best results came with four subwoofers; two were almost as good, with better low-frequency support; symmetrical locations seemed best. Four gave the best results but significantly less normalized output than two, and more than four were not fully optimized for lack of time (notes, p.18).
- Note the trend in slide 51's chart (p.18): the 3-subwoofer optimum scores worse than the 2-subwoofer optimum on Std, Max-Min and Max-Ave (2.7 vs 1.3 dB Std). The paper does not discuss this beyond preferring symmetrical layouts.

**Investigation 2, rule-of-thumb layouts** (slides 39–45, pp.14–16).
- Four subwoofers each 1/4 of the room width and length in from the walls, that is at (0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75), gave a nearly flat, uniform set of responses below 80 Hz that one parametric EQ band could fix (slides 40–41, p.14). The notes explain that this layout cancels odd-order axial modes and the first even-order one, and that floor-ceiling axial modes are not cancelled but matter less (p.14).
- Two layouts that both "should" cancel odd-order axial modes behaved very differently: one subwoofer in each of two diagonally opposite corners scored Std 2.6, Max-Min 13.1 (slide 43, p.15), while one at each of the front and back wall midpoints scored Std 1.3, Max-Min 4.6 (slide 44, p.15). The point made is that rules of thumb may help but give unintuitive results, as tangential modes matter (slide 45, p.16).

**Investigation 4, 20 "practical" configurations of up to 18 subwoofers** (slides 53–59, pp.18–21). The candidate locations included ITU-R BS.775-1 5.1 positions (notes, p.18). The configurations are drawn as Matlab plots on slides 54–55 (pp.19–20). No obvious trend toward better metrics with more subwoofers, and output per subwoofer falls as more of them sit away from the corners (slides 57–58, p.21). The best three (slide 59, p.21): #10 one in each corner, #11 one at each wall midpoint (lowest Std, Max-Min and Max-Ave), #12 the four 1/4 positions above. #10 was almost as good as #11 with strong low-frequency support (notes, p.21). Configuration #6 (front and back wall midpoints) also scored among the best (notes, p.21). The only 3-subwoofer configurations in this set put all three on the front wall (#8, #9; slide 54, p.19), so the 3-subwoofer optimum of slide 49 was never re-tested here.

**Investigation 5, other room proportions** (slide 60, p.22). Configurations 1–20 were duplicated **to scale** in five rooms (the test room, 1:2:4, 1:2:3, 1:1.25:1.6 and a random 1:2.22:2.89). Std and LF factor stayed surprisingly consistent across them, which the author puts down to averaging over many seats. This is the source's support for carrying a layout to another room as fractions of the room's dimensions. Which room dimension each ratio term maps to is not stated.

**Investigation 6, a real room** (slides 61–65, pp.22–25). Measurements in the real 20 × 24 × 9 ft room (a fairly live room, RT60 0.85 s at 500 Hz; microphones at seated ear height) agreed well with the model, which the author takes as justification for the modelled results (notes, pp.24–25). The real-room configurations (#21–37) differ from the modelled set (p.23).

**Investigation 7, seats moved back and center seats weighted ×2** (slides 66–68, pp.25–26). With the seating moved toward the rear and the center seats counted double, two and four subwoofers at the wall midpoints were still the best configurations overall, while four in the corners lost some of its advantage (notes, p.26).

**Investigation 8, no equalization** (slides 69–71, pp.26–27). Without equalization the metrics are much worse, but one subwoofer at each wall midpoint (#11) was still best (notes, p.26).

**Conclusions** (slides 72–75, pp.27–28). They assume a rectangular room and a seating area in the center or center-rear of the room (slide 72). No obvious correlation between the number of subwoofers and the result for practical numbers, and no justification for more than four (slide 73). Four subwoofers gave the best results of any configuration tried; two are very nearly as good, with very good low-frequency support (slide 74). Best placements (slide 75): one at each wall midpoint is best on Std, Max-Ave and Max-Min but weak on low-frequency output; two at opposing wall midpoints perform very nearly as well as four with a much better LF factor; one in each corner has good low-frequency support but does not perform quite as well as the four midpoints. Considering cost and looks, two at wall midpoints is preferred.

### AES-5602 (official abstract)

The abstract poses the question (whether many subwoofers at different locations excite room modes in a more balanced way over a listening area) and says the investigation looked at whether a large number of subwoofers is advantageous and which configurations work best. It gives no positions. Full text not read.

### JAES-2006 (official abstract)

At low frequencies, standing waves cause large response variations at the listening locations, and the response differs from seat to seat, so the system cannot be equalized effectively. Multiple subwoofers can reduce the seat-to-seat variation significantly, so that equalization works better. The paper describes three methods to reduce seat-to-seat variation, one of them a new approach based on simple signal processing, aimed at equalizing over a seating area rather than one seat, with results for several listening rooms. The abstract gives **no positions**. Any arrangement attributed to this paper (for example in forum or blog summaries) is **UNVERIFIED** here, and none is encoded from it.

## 3. What the app encodes from this (issue #10)

One arrangement per subwoofer count, from HW-SUBS Investigation 3, as room fractions:

| Subwoofers | Positions (x/W, y/L) | Citation |
|---|---|---|
| 1 | front-wall midpoint (0.5, 0) | HW-SUBS slide 47 (p.16) |
| 2 | front- and back-wall midpoints (0.5, 0), (0.5, 1) | HW-SUBS slide 48 (p.17); text slide 75 (p.28) |
| 3 | front-wall midpoint and both side-wall midpoints (0.5, 0), (0, 0.5), (1, 0.5) | HW-SUBS slide 49 (p.17) |
| 4 | all four wall midpoints (0.5, 0), (1, 0.5), (0.5, 1), (0, 0.5) | HW-SUBS slide 50 (p.17); configuration #11, slide 59 (p.21); text slide 75 (p.28) |

The wall stand-off and height of the cabinets are not in the source and have to be our own modelling assumptions.

## 4. Gaps, caveats and what the sources do not specify

1. **Positions come from schematics.** For every count the white paper draws the optimum in a not-to-scale figure without coordinates. "Midpoint" is the reading of the figures, backed by the text for 2 and 4 subwoofers (notes to slide 51, slide 75) and by the 2 ft search grid containing the midpoints. For 1 and 3 subwoofers there is no text backing beyond the figures.
2. **Which wall is the front.** The figures don't label a front wall; this file takes the top wall as front because every drawn seat faces it. With the seat grid centered front to back, the room model is mirror-symmetric, so a subwoofer at the back-wall midpoint would score the same as one at the front-wall midpoint for the 1- and 3-subwoofer optima. That symmetry argument is our inference, not stated in the source.
3. **One room for the 1–4 optima.** Investigation 3 optimized only the 20 × 24 × 9 ft room with a centered 16-seat grid. Investigation 5 shows configurations 1–20 holding up across room proportions when scaled to the room, which covers the 1-subwoofer front-midpoint (#3), 2-subwoofer front/back midpoints (#6) and 4 midpoints (#11) layouts, but **not** the 3-subwoofer front-plus-sides layout of slide 49. Carrying that one to other rooms as fractions is **UNVERIFIED**.
4. **Three subwoofers score worse than two.** In the source's own numbers the best 3-subwoofer layout is clearly worse than the best 2-subwoofer one (slide 51). The source still publishes it as the 3-subwoofer optimum, but a user with three subwoofers might be better served by a different layout; the source offers no other 3-subwoofer recommendation.
5. **Wider-than-long rooms.** The test room is longer (24 ft) than wide (20 ft), and the 2-subwoofer optimum uses the shorter front and back walls. Whether the opposing side walls would win in a room wider than it is long is not addressed (Investigation 5 doesn't say how its ratios were oriented). **UNVERIFIED** either way.
6. **One seat versus a seating area.** All metrics average over a seating area in the center (or, in Investigation 7, center-rear) of the room. The app analyzes one MLP, by default 38% of the room length from the front wall. The source gives no single-seat recommendation.
7. **Not given:** how far a subwoofer stands off its wall (only "along the walls"), its height or driver height in the model, enclosure type of the modelled subwoofer beyond "measured 12-inch subwoofer power responses", and any room-size limits beyond the five ratios of Investigation 5.
8. **Corners as an alternative.** Four corners (#10) is almost as good as four midpoints and has better output (slides 59, 75), and the four 1/4 positions (#12) are among the best three too. The app encodes only the midpoint optima above; these alternatives are recorded here for later tickets (seat score, #13).
9. **Paywalled papers not read.** The full texts of AES-5602 and JAES-2006, and everything in AES 5942 and 8748, were not read. Their arrangements, if different, are **UNVERIFIED** and not used. A widely repeated summary of JAES-2006 ("over 100,000 configurations", "four at the wall midpoints best") comes from secondary sites only and is **UNVERIFIED**.
