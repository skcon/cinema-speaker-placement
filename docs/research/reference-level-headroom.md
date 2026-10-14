# Reference level, SPL headroom and speaker types

Researched 2026-10-14 for issue #13 (speaker group specs and headroom indicator). This file lists where the headroom estimate's reference level and formulas come from, and which parts are ours. Values the app chooses itself are marked **ours** and live in `src/domain/reference.ts` with a note saying so.

## 1. Sources

| Key | Title | URL | Status |
|---|---|---|---|
| IG | Dolby Atmos Home Theater Installation Guidelines, r3.1 (see `dolby-speaker-placement.md` section 1) | https://www.dolby.com/siteassets/technologies/dolby-atmos/atmos-installation-guidelines-121318_r3.1.pdf | **Read** (p.6, p.15; text extracted from the local copy) |
| ATSC-A52 | ATSC glossary, "Low frequency effects (lfe) channel", citing ATSC A/52 (Digital Audio Compression (AC-3)) | https://atsc.org/atsc-glossary/low-frequency-effects-lfe-channel | Glossary page **read**; A/52 itself not read |
| FLORIAN-2000 | B. Florian, "The Misunderstood 0.1 LFE Channel in 5.1 Digital Surround Sound", *Secrets of Home Theater and High Fidelity*, April 2000 | https://hometheaterhifi.com/volume_7_2/feature-article-misunderstood-lfe-channel-april-2000.html | **Read**. A magazine article, not a standard: used for background only |

SMPTE RP 200 (the cinema calibration practice FLORIAN-2000 describes) and Dolby's own LFE note were **not found or read**: the old dolby.com LFE PDF answered 404. Nothing is cited from them.

## 2. Reference level

- **Dolby's home calibration** (IG p.15): every full-range speaker is calibrated to the same C-weighted SPL at the central listening position, 79 dB to 82 dB SPL(C) "depending on the room size", with pink noise at an RMS level of −20 dBFS. The subwoofer is calibrated so redirected bass plays at the same level as in the speakers' pass bands.
- **Full-scale peaks**: the test signal is 20 dB below digital full scale (by the definition of dBFS), so the loudest a channel is asked to play is the calibration level plus 20 dB: 99-102 dB SPL at the MLP. A full-scale sine is 3 dB below a full-scale square wave's RMS, so "plus 20 dB" is the usual round figure, not an exact crest-factor result.
- **LFE** (ATSC-A52, via the ATSC glossary): the LFE channel "is intended to be reproduced at a level +10 dB with respect to the fbw channels". So its peaks are 10 dB above a full-range channel's.
- **Cinema reference** (FLORIAN-2000, background): 85 dB at −20 dB pink noise per screen channel, so 105 dB peaks per channel and a 115 dB LFE peak. The article itself says a home system need not reach that.
- **What the app encodes**: the **reference level** is the calibration level, 82 dB SPL(C) per channel (the industry meaning: the level the system is calibrated to). The **reference peak** is 82 dB + 20 dB = **102 dB per channel** at the MLP, and 102 + 10 = **112 dB** for the Subwoofers. **Ours**: taking the top of Dolby's 79-82 dB range (the stricter check), and checking the Subwoofers against the LFE alone (bass the receiver redirects from the speakers is not added).

## 3. SPL at the MLP (textbook, plus our assumptions)

- **Formula** (textbook free-field point source, inverse-square law): SPL = sensitivity + 10·log10(P) − 20·log10(d), with sensitivity in dB SPL at 1 W and 1 m, P in watts and d in meters. Each doubling of power adds 3 dB; each doubling of distance takes 6 dB away. Several sources add as a power sum, 10·log10(Σ 10^(L/10)).
- **Headroom** = SPL at the MLP with the full amplifier power − the reference peak level. A speaker group's headroom is its weakest channel's (the farthest speaker).
- **Ours**:
  - One amplifier power per channel for every Speaker (user story 16), taken as continuous power into the speaker's rated load.
  - Free field: no room gain (which makes a real room louder, mostly in the bass) and no power compression (which makes loud speakers quieter than the formula).
  - Distances under 0.5 m count as 0.5 m (the near field, where the 1 m sensitivity does not scale).
  - Status: **enough** from 3 dB headroom (a doubling of power to spare), **tight** from 0 dB, **short** below.
  - Overhead speakers are not placed yet (#8), so they get no headroom.

## 4. Subwoofer headroom (ours)

The specs hold no subwoofer sensitivity (user story 18 asks for driver size, RMS and peak power), and **no verifiable source** relating driver size and enclosure to sensitivity was found. The rough rule is ours:

- 88 dB at 1 W / 1 m for a sealed 12 in driver,
- plus 20·log10(diameter / 12 in), the cone area ratio in dB,
- plus 3 dB for a ported enclosure,
- driven at its RMS power on purpose: the peak power is not used yet, the conservative case (short peaks may get more from the amplifier),
- several subwoofers added as a power sum (+3 dB per doubling). In-phase subwoofers near each other can add up to 3 dB more at the lowest frequencies, so this is the conservative case too.

The UI labels this as a very rough estimate.

## 5. Bookshelf and tower (ours, after Dolby's ear height)

- Dolby wants every listener-level speaker at the same height, typically 1.2 m, seated ear height (IG p.6). So auto-place puts both types' acoustic center (the tweeter) at 1.2 m: a bookshelf on a stand, a tower on the floor. The type does not change the graded angles.
- **How we read "Bookshelf/tower sets default height and woofer position"** (issue #13): the *default height* is the tweeter's, and it is ear height for both types, as IG p.6 asks of every listener-level speaker. A type-dependent tweeter height (a tower's tweeter often sits nearer 1 m) would contradict Dolby's single ear height and has no cited value, so the type sets only how the speaker is mounted (stand or floor) and where its woofer is.
- **Ours**: the woofer, which radiates in the boundary-interference range (below about 500 Hz), sits 0.15 m below the tweeter in a bookshelf and 0.8 m below it in a tower (so at 0.4 m above the floor at ear height), never lower than 0.1 m. The boundary-interference model uses the woofer's position, so a tower's floor reflection is shorter and its notch higher than a bookshelf's.
- Default specs for every speaker group are ours: a bookshelf speaker with 88 dB sensitivity (with 100 W, the default room reads "tight": it just reaches reference peaks), and 100 W of amplifier power per channel, typical of home theater gear, not a measured product. Accepted ranges (70-110 dB sensitivity, 1-5,000 W) are our typo limits, not cited.
