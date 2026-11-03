# CV-punkt

Hemuppgift 4, steg 4. Formatet från kursen: _Designade och utvecklade [vad] med [teknikstack] med hjälp av agentdriven utveckling (Claude Code). Projektet [löser vilket problem] och är tillgängligt på [URL]._

## CV-punkten

Designade och utvecklade en webbapp för planering av hemmabioljud med TypeScript, React, Three.js och GitHub Actions med hjälp av agentdriven utveckling (Claude Code). Projektet omvandlar Dolbys placeringsriktlinjer och en förenklad rumsakustisk modell till en konkret, delbar högtalarplan för användarens eget rum och är tillgängligt på https://skcon.github.io/cinema-speaker-placement/.

## Kortare variant

Designade och utvecklade en webbapp (TypeScript, React, Three.js) med agentdriven utveckling (Claude Code) som placerar hemmabiohögtalare enligt Dolbys riktlinjer och uppskattar rummets basrespons; live på https://skcon.github.io/cinema-speaker-placement/.

## Fakta att stödja punkten med (kontrollerbara i repot)

- Sju releaser (v0.1.0 till v1.4.0), alla med changelog och GitHub-ärenden.
- Domänlogiken är ren TypeScript med cirka 3 000 automatiska tester. Ett Playwright-flöde körs i CI på varje pull request.
- CI/CD med GitHub Actions: varje PR testas, och när en PR märkt `release` slås ihop till `main` testas, byggs och deployas appen till GitHub Pages och releasen taggas automatiskt.
- Arbetssätt: spec-driven (specar och ärenden från intervjuer med agenten, arkitekturbeslut som ADR:er, en gemensam ordlista). Agenterna arbetade parallellt i egna grenar, och varje PR granskades och slogs ihop efter grön CI.
- Ingen backend: hela konfigurationen ligger i en delbar länk.

## Varför formuleringen ser ut så här

- **Konkret om vad, inte om AI.** Problemet och resultatet står först. Claude Code nämns som metod, inte som huvudsak.
- **Ingen överdrift.** Akustiken är en förenklad uppskattning, inte en mätning eller simulering (det säger även appen).
- **Verifierbart.** Länken går till den deployade appen; siffrorna ovan kan kontrolleras i repot.
