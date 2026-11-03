# Demo, träff 5 (max 3 minuter)

Hemuppgift 4, steg 5. Struktur: vad är byggt (live), hur AI hjälpte konkret (ett exempel), vad jag gör annorlunda nästa gång.

## Förbered innan

- Öppna appen: https://skcon.github.io/cinema-speaker-placement/
- Ha den här länken redo i en flik. Det är mitt rum, 4,5 × 3 × 2,6 m med 5.1.4, efter Auto-place. Alla högtalare är gröna och Response score är 77/100.
  https://skcon.github.io/cinema-speaker-placement/?config=N4IgbiBcDMA0IGMD2A7AZgSwOZVAVyhAFsBTAFwCcMER4LcQAbKAFgDoBWeAdyjhAAWUAExsAbAF94jAJ4MAJs0ggObAIxsWtEAGcoaqSByRQaBjoAODMoQBGSJAGsdAkozPwdJKAA4fEwxoTXStgm2V7Jxc3D11vSD8Az3pgy2s7B2dXd20vX39DCj1U0NBwkEismNz4xMMkc1K4-KTdRoZ4uIBDRhJ5bXl+yAAGNmhhlgB2AE5ZufnZsTpeGGHh+AsVsTX64uAAwy6VtTX4MiCQNEYum3gADwaE9eIGAFkAGQAFBjuoZ7kYGxhj4liAAF76NjCVo6DBQFB4RiMOiPUA6cKgFbCeBDUbTQw6IIIpHwNAESAAbQAuvAkKFqQcgA
- Ha en flik med GitHub Actions (Release-workflowen) och en med ärende #149 (specen för 1.4.0).
- Stäng allt annat. Zooma webbläsaren så att rumsvyn syns tydligt.

## Manus

### 0:00–1:30: Vad är byggt (live)

1. **(10 s)** "Det här är Cinema Speaker Placement: en gratis webbapp som planerar ett hemmabio för ljud, inte utseende. Den gör Dolbys placeringstabeller till konkreta positioner i ditt eget rum."
2. **(25 s)** Standardrummet: byt layout till **7.1.4** och tryck **Auto-place**. "Högtalarna placeras enligt Dolbys vinklar. Gröna betyder inom Dolbys ideala intervall, och varje värde har en källa."
3. **(20 s)** Dra lyssningsplatsen (MLP). "Med *Speakers follow the seat* på följer högtalarna med. Rekommenderat säte står still."
4. **(20 s)** Klicka på en surround-högtalare. "Kurvan visar nu bara den kanalen, med egen Response score. Klicka bort, så är det hela systemet."
5. **(15 s)** Slå på **Seat-score heatmap** och hovra över en ruta. "Varje plats får ett värde och en förklaring. Randiga rutor är för nära en högtalare eller vägg."
6. **(10 s)** Öppna förberedda länken. "Hela planen ligger i länken. Den här är mitt eget rum, alla gröna."

### 1:30–2:30: Hur AI hjälpte konkret (ett exempel)

"Ett konkret exempel. Jag sa till agenten att Auto-place gav fel i mitt rum: lyssningsplatsen hamnade på högtalarna och flera högtalare var röda. Agenten började inte gissa i koden. Den körde mitt exakta rum, 4,5 × 3 × 2,6 m, mot både den släppta koden och den gamla.

Den hittade två saker. Den första var att sajten fortfarande körde version 1.2.0, eftersom min v1.3.0-tagg pekade på fel commit. Felet jag såg var alltså redan rättat, men aldrig deployat. Den andra var en verklig bugg som fanns kvar: takhögtalarna fram hamnade på 27° i smala rum, där Dolby kräver 30–60°.

Sedan fick jag frågor en i taget med rekommenderade svar, och av dem blev en spec och nio ärenden. Agenterna jobbade parallellt i egna grenar, och inget slogs ihop förrän CI var grönt." (Visa #149 eller Actions-fliken om tiden räcker.)

### 2:30–3:00: Vad jag gör annorlunda nästa gång

"Tre saker. Ett: automatisera deployen från början. En manuell tagg på fel commit gjorde att jag testade gammal kod utan att veta om det. Nu taggar och deployar pipelinen själv när release-PR:en slås ihop. Två: verifiera i den riktiga, deployade appen tidigare, inte bara i tester. Tre: färre parallella agenter på samma filer. Det sparade tid, men krävde mycket omtestning när ändringarna möttes."

## Om tiden inte räcker

Hoppa över steg 5 (heatmap) och läs exemplet kortare. Avsnittet om AI-exemplet är det viktigaste att få med.
