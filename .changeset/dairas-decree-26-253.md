---
"geoalgeria": minor
---

The daira lists of 21 wilayas now come from the decree that fixes them, not from press readings: 551 dairas, 142 of them official.

**The text.** Executive decree n° 26-253 of 15 July 2026, published in the *Journal Officiel* n° 52 of 21 July 2026 (French edition, decree on pages 9 to 10, annex on 10 to 16), modifies and supplements decree n° 91-306 of 24 August 1991 fixing the list of communes each chef de daïra administers. It is the first post-reform text that states daira membership. Its annex tabulates **wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28, 32 and 59 to 69** and names **142 dairas** and their 404 communes; nine `(sans changement ...)` notes leave the other 48 wilayas under their 91-306 list. The notes and the tables cover wilayas 1 to 69 exactly, which the extraction asserts rather than assumes.

**So the total is composed, and stays this dataset's own.** 142 dairas are the decree's, for the 21 wilayas it tabulates. The remaining **409** are the 91-306 lists as this package already holds them, for the 48 wilayas the decree leaves alone. **551** is the sum, and no published post-reform text states a national total, so the docs go on calling 551 the dataset's count and never an official figure. The claim that 564 is "the official" number is gone from the three package READMEs; it was this table's own pre-1.1.2 row count.

**What the decree changed, wilaya by wilaya.** Ten of the annexed wilayas already agreed with it row for row (3, 5, 7, 13, 14, 17, 28, 61, 63, 69), which is the strongest confirmation the daira table has had. The rest:

- **59 Aflou**: `Hadj Mechri` is dropped and `Oued Morra` seats a daira. Sebgag and Sidi Bouzid join Aflou, Hadj Mechri and Taouiala join Brida, El Beïdha joins Gueltat Sidi Saad, Oued Morra and Oued M'Zi form the new daira. Still 5.
- **60 Barika**: `Azil Abdelkader` and `Tilatou` are dropped and `Djezzar` seats a daira: Djezzar, Abdelkader Azil and Ouled Ammar under it, Tilatou under Seggana. 4 to **3**, which `data/wilayas.csv` already said.
- **62 Bir El Ater**: El Ogla El Melha moves to Bir El Ater, Ferkane to Negrine. Still 2.
- **64 Ksar Chellala**: `Rechaiga` and `Zmalet El Emir Abdelkader` are dropped and `Hamadia` seats a daira with Hamadia, Bougara and Rechaiga; the commune Zmalet El Emir Abdelkader joins Ksar Chellala. 3 to **2**.
- **65 Aïn Ouessara**: `Bouira Lahdab` is dropped and `Had Sahary` seats a daira with Had Sahary, Aïn Fekka and Bouira Lahdab. Benhar moves to Birine, El Khemis to Sidi Ladjel. Still 4, and the wilaya's own nested list in `wilayas.json` already read this way.
- **66 Messaad**: `Amourah`, `Sed Rahal` and `Selmana` are dropped and `Faïdh El Botma` seats a daira with Faïdh El Botma, Oum Laadham and Amourah; Sed Rahal, Selmana, Guettara and Deldoul all sit under Messaad. 4 to **2**, which `data/wilayas.csv` and the nested list already said.
- **67 Ksar El Boukhari**: `Boghar` is dropped and `Ouled Antar` seats the same three communes; the daira `Chellalet El Adhaoura` is renamed `Chelalet El Adhaoura`. Still 6.
- **12 Tébessa and 68 Bou Saâda**: seat spellings only, `El Ma Labiodh` to `El Ma Labiod` and `Aïn El Melh` to `Aïn El Meleh`, each the name law 26-06 gives the seat commune. Counts unchanged. **26 Médéa and 32 El Bayadh** agree on membership and differ only in printing `El Azizia` and `Bougtoub`, the spellings law 26-06 replaced with Al Azizia and Bougtob, so nothing changes there either.

46 commune records change daira in every carrier that repeats the linkage: the three split files, `algeria.json`, `csv/communes.csv`, `geojson/communes.geojson`, `sql/full.sql` and all three `ecommerce/` shapes.

**Ids do not move.** A seat the decree keeps keeps its id, including through the three renames above, so a consumer holding `118` still holds El Ma Labiod. The six seats it creates take fresh ids 565 to 570 rather than filling a gap. The ten it drops are reserved in a new `data/retired-ids.json` with the reason for each, alongside the nine ids retired before it existed, and `pnpm validate` refuses to let any of them become live again. The table is left in the order it already had; the new rows join their own wilaya's run.

**What is not applied.** The decree fixes daira membership, not the commune register, so eighteen printed commune names that differ from ours are recorded and left alone: fifteen differ only by accents, and three beyond them are carried as an explicit alias table. Those three (`Béni Yaagoub` for our Ben Yaagoub, `El Azizia` for Al Azizia, `Bougtoub` for Bougtob) are spellings **law 26-06 of 4 April 2026 already replaced**, each with its article and item in `scripts/lib/jo-2026-corrections.mjs`, so the later decree reprinting them is not a reason to undo that. A daira therefore takes its seat commune's name as this dataset spells it, unless the row we hold folds onto that name, in which case our spelling stands: the annex drops accents in a seat cell its own commune column keeps.

The annex as printed is in `research/_dairas/decree-26-253.json`, with the extraction and the ruled-cell reading it needs in `research/_dairas/`. The PDF is not committed and joradp.dz declines automated fetches, so it is recorded as an owner-supplied artifact with its size and SHA-256. `test/dairas-decree-26-253.test.mjs` pins every annexed wilaya's daira list, seat by seat and commune by commune, to that extract.

Refs yasserstudio/geoalgeria.com#211.
