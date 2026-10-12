# Low-frequency response at the MLP: room modes and the target curve

Researched 2026-10-12 for issue #11 (response chart: room modes at the MLP). This file lists where the room-mode model's formulas and parameters come from, and what was and wasn't found for the house curve. The textbooks below were **not re-read** for this ticket: the formulas are standard results stated in them, cited by chapter, with pages **UNVERIFIED**. Values the app chooses itself are marked **ours** and live in `src/domain/reference.ts` with a note saying so.

## 1. Sources

| Key | Title | URL | Status |
|---|---|---|---|
| MHA | F. A. Everest & K. C. Pohlmann, *Master Handbook of Acoustics* (McGraw-Hill), room-modes chapter | (book; see also `docs/research/dolby-speaker-placement.md` section 8, item 1) | Cited by chapter, pages **UNVERIFIED** |
| KUTTRUFF | H. Kuttruff, *Room Acoustics* (Spon / CRC Press), chapter 3, "Wave theory of room acoustics" | (book) | Cited by chapter, pages **UNVERIFIED** |
| AES-8994 | S. Olive, T. Welti, E. McMullin (Harman International), "Listener Preferences for In-Room Loudspeaker and Headphone Target Responses", AES 135th Convention, Paper 8994, October 2013 | https://aes2.org/publications/elibrary-page/?id=17042 | Paywalled. The E-Library page answered 403 to our fetch; the abstract was read only through search-engine summaries |

## 2. Room modes (what the app encodes)

1. **Mode frequencies** (MHA; KUTTRUFF ch. 3): for a rigid-walled rectangular room of length L, width W and height H, the normal modes are at f = (c/2)·√((nL/L)² + (nW/W)² + (nH/H)²) for whole numbers nL, nW, nH ≥ 0, not all zero. One non-zero index is an **axial** mode (f = n·c/(2L) along that dimension), two a **tangential** mode, three an **oblique** mode.
2. **Speed of sound** c = 343 m/s, air at about 20 °C (MHA; also `dolby-speaker-placement.md` section 8, item 1).
3. **Mode shape**: the pressure of mode (nL, nW, nH) at a point is the product cos(nL·π·y/L)·cos(nW·π·x'/W)·cos(nH·π·z/H), with x' measured from the left wall (KUTTRUFF ch. 3).
4. **Modal sum** (KUTTRUFF ch. 3): the pressure at the receiver from a point source is, up to a constant, Σ ψ(source)·ψ(receiver) / (K·(ω² − ωₙ² − 2jδωₙ)), with K the mode's normalisation (V/8 times 2 for every zero index) and δ its damping constant.
5. **Damping and modal bandwidth** (KUTTRUFF ch. 3; MHA): the damping constant relates to the reverberation time T by δ = 3·ln(10)/T ≈ 6.91/T, and a mode's half-power bandwidth is B = δ/π ≈ 2.2/T Hz.

**Model choices that are ours** (in `src/domain/reference.ts`):

- **Reverberation time 0.5 s** at low frequencies for every mode, which gives every mode a bandwidth of about 4.4 Hz. Real rooms differ per mode and per room; no source gives a value for "a home theater".
- **Rigid walls, no wall absorption per surface**: damping is one number for every mode.
- **The (0, 0, 0) term is left out**: it is the uniform pressure change of a sealed room (room gain below the lowest mode), which real, leaky rooms show only partly. Below the lowest mode the estimate is therefore not reliable.
- **Modes are summed up to 1.5 × the highest charted frequency** (300 Hz for a 200 Hz chart); higher modes add little in the charted band.
- **Every subwoofer is a point source of equal strength, driven in phase** (one bass-managed channel, as in Welti's studies, `multi-subwoofer-placement.md`). Driver size, power, enclosure and the crossover don't change the curve yet (#12 adds enclosure roll-off and the crossover).
- **Level**: the model has no absolute level. The estimated response is shifted so its average deviation from the target curve is 0 dB, like setting the subwoofer level to the target.

## 3. Target curve

- **Flat with a ±3 dB band**: the default, from the v1 spec (issue #2, user story 41). The ±3 dB width is the spec's product choice, not a cited standard.
- **House curve: ours.** No verifiable published curve shape was found. AES-8994's abstract (as summarized by search engines) reports that listeners, on average, preferred an in-room loudspeaker response with more bass and treble than a flat one, with large differences between listeners. A widely repeated forum summary of the same paper gives a bass boost of about 6.6 dB below about 105 Hz; that figure could not be checked against the paper and is **UNVERIFIED**, so the app does not cite it as a standard.
  The app's house curve is our assumption, shaped after the spec's wording (user story 42, "bass boost below about 100 Hz"): a smooth shelf rising to +6 dB at the lowest frequencies, half of it (+3 dB) at 100 Hz, level = 6 / (1 + (f / 100)²) dB. It is labelled "our assumption" in the code, not a standard.
