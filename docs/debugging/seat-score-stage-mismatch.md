# Felsökning: poängen för MLP stämmer inte med den ritade scenen

Hemuppgift 3, del A (The 4Ds). Utförd av Claude Code på uppdrag av repots ägare. Underlag: `develop` vid v1.3.1 (e8dcf93). Buggen: #147.

## 1. Problemet

Efter Auto-place hamnar MLP exakt på det rekommenderade sätet, och appen säger "Your MLP is at the recommended seat". Med _Speakers follow the seat_ avslagen får samma position dock 79/100 mot rekommendationens 91/100, avståndsvarningen visas aldrig och Auto-place-knappen är avstängd. Med reglaget påslaget står det 91. Rum: 5 × 3 m, layout 2.1, 2 subwoofers. Mätt i 432 rum: 50 avvikelser, alla 2.1.

## 2. Hur jag beskrev det (Delegation och Description)

En separat agent fick bara en beskrivning och mätningar, ingen kod och inga egna misstankar. Kontext: vad appen gör; att 1.3.1 släpptes dagen innan; vad som ändrades (reglaget, rekommendation oberoende av MLP, L/R 26° till 29°, hårt avståndsfilter); symptomet; siffrorna ovan; att länkkodningen verkade orelaterad. Fråga: _"Analysera det här felet och formulera tre hypoteser om rotorsaken, ordnade efter sannolikhet. För varje hypotes: förklara mekanismen och ange konkreta verifieringssteg."_ Steg 2 ställdes efter mitt val, och då fick agenten läsa koden (read-only).

## 3. Agentens hypoteser

1. Två poängvägar poängsätter olika högtalarscener.
2. Basjämnheten skiljer sig (subwoofers).
3. Tillståndsordning eller tolerans i Auto-place.

## 4. Vald hypotes och varför

Hypotes 1, som agenten också rangordnade först. Skälen var mina egna: med reglaget på avviker 0 av 432 rum trots identiska högtalare, så den vägen kan inte poängsätta det som ritas. Dessutom visste jag från ADR 0005 (#48) att kandidater poängsätts med en scen symmetrisk kring mittlinjen. Hypotes 2 och 3 prövades ändå.

## 5. Vad som faktiskt var fel

`install(seat)` poängsätter scenen installerad kring sätets projektion på mittlinjen, men `placeAll` (det som ritas) installerar kring MLP själv, och `compareMlp` med reglaget av använder den ritade scenen. På mittlinjen sammanfaller de, utanför gör de inte det. I exemplet ligger L på y = 2,44 (1,03 m från sätet) och R på y = 1,25 (3,08 m) mot den poängsatta scenen med båda på y = 1,28. Därav 0,793 mot 0,912, och sätet ligger bara 1,006 m bakom frontscenen mot kravet 1,5 m. Orsaken finns redan i v1.2.0; reglaget gör den bara synlig. Samma mekanism ger i standardrummet (5.1.2, MLP dragen till x = −0,4 m) poängen 0,585 mot 0,814 för den ritade scenen. Ingen rättning gjord: den kräver ett designbeslut, se #147 (tre alternativ, A rekommenderas).

## 6. Vad agenten fick rätt och vad den missade

- **Rätt:** hypotes 1; geometrin utifrån siffrorna (vinklarna −13,4° och +44,6° stämde); rätt rader i koden; rättade själv sin steg 1-riktning (det är reglaget på som poängsätter en scen som inte finns).
- **Vilseledande:** steg 1 sa att avståndet 1,03 m till L förklarade avståndsfelet. Fel: närmaste högtalare är 1,03 m bort (kravet är 0,5 m), det är kravet på 1,5 m bakom frontscenen som slår. Gissningen att "bara 2.1 syns" som urvalsfel var också fel: det är en mätt egenskap, övriga layouter rekommenderar alltid mittlinjen.
- **Förkastat med experiment:** subwoofers (samma positioner oavsett scen), tillståndsordning (Auto-place idempotent, 0 av 320).
- **Min egen miss:** första svepet gav 510 falska fel på länkkodningen, eftersom jag jämförde strikt och länkar avrundar till millimeter. Idempotenstestet gav 54 av 54.
- **Lärdom:** hypoteserna var bra men tre detaljer var fel. Bekräftelsen i riktiga appen (Playwright) gav de exakta texterna.
