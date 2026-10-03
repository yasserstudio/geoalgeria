# Changelog

## 2.2.0

### Minor Changes

- f6a2a0e: The daira lists of 21 wilayas now come from the decree that fixes them, not from press readings: 551 dairas, 142 of them official.

  **The text.** Executive decree n° 26-253 of 15 July 2026, published in the _Journal Officiel_ n° 52 of 21 July 2026 (French edition, decree on pages 9 to 10, annex on 10 to 16), modifies and supplements decree n° 91-306 of 24 August 1991 fixing the list of communes each chef de daïra administers. It is the first post-reform text that states daira membership. Its annex tabulates **wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28, 32 and 59 to 69** and names **142 dairas** and their 404 communes; nine `(sans changement ...)` notes leave the other 48 wilayas under their 91-306 list. The notes and the tables cover wilayas 1 to 69 exactly, which the extraction asserts rather than assumes.

  **So the total is composed, and stays this dataset's own.** 142 dairas are the decree's, for the 21 wilayas it tabulates. The remaining **409** are the 91-306 lists as this package already holds them, for the 48 wilayas the decree leaves alone. **551** is the sum, and no published post-reform text states a national total, so the docs go on calling 551 the dataset's count and never an official figure. The claim that 564 is "the official" number is gone from the three package READMEs; it was this table's own pre-1.1.2 row count.

  **What the decree changed, wilaya by wilaya.** Ten of the annexed wilayas already agreed with it row for row (3, 5, 7, 13, 14, 17, 28, 61, 63, 69), which is the strongest confirmation the daira table has had. The rest:

  - **59 Aflou**: `Hadj Mechri` is dropped and `Oued Morra` seats a daira. Sebgag and Sidi Bouzid join Aflou, Hadj Mechri and Taouiala join Brida, El Beïdha joins Gueltat Sidi Saad, Oued Morra and Oued M'Zi form the new daira. Still 5.
  - **60 Barika**: `Tilatou` is dropped and `Azil Abdelkader` is reseated on `Djezzar`, keeping both its communes and taking the commune Djezzar from Seggana: Djezzar, Abdelkader Azil and Ouled Ammar under it, Tilatou under Seggana. 4 to **3**, which `data/wilayas.csv` already said.
  - **62 Bir El Ater**: El Ogla El Melha moves to Bir El Ater, Ferkane to Negrine. Still 2.
  - **64 Ksar Chellala**: `Zmalet El Emir Abdelkader` is dropped and `Rechaiga` is reseated on `Hamadia`, keeping Hamadia and Rechaiga and taking Bougara; the annex leaves the commune Zmalet El Emir Abdelkader under Ksar Chellala, where this dataset already held it. 3 to **2**.
  - **65 Aïn Ouessara**: `Bouira Lahdab` is reseated on `Had Sahary`, keeping Had Sahary and Bouira Lahdab and taking Aïn Fekka from Sidi Ladjel. Benhar moves to Birine, El Khemis to Sidi Ladjel. Still 4, and the wilaya's own nested list in `wilayas.json` already read this way.
  - **66 Messaad**: `Amourah`, `Sed Rahal` and `Selmana` are dropped and `Faïdh El Botma` seats a daira with Faïdh El Botma, Oum Laadham and Amourah; Sed Rahal, Selmana, Guettara and Deldoul all sit under Messaad. 4 to **2**, which `data/wilayas.csv` and the nested list already said.
  - **67 Ksar El Boukhari**: `Boghar` is reseated on `Ouled Antar`, the same three communes under another of them; the daira `Chellalet El Adhaoura` is renamed `Chelalet El Adhaoura`. Still 6.
  - **12 Tébessa and 68 Bou Saâda**: seat spellings only, `El Ma Labiodh` to `El Ma Labiod` and `Aïn El Melh` to `Aïn El Meleh`, each the name law 26-06 gives the seat commune. Counts unchanged. **26 Médéa and 32 El Bayadh** agree on membership and differ only in printing `El Azizia` and `Bougtoub`, the spellings law 26-06 replaced with Al Azizia and Bougtob, so nothing changes there either.

  40 commune records change daira in every carrier that repeats the linkage: the three split files, `algeria.json`, `csv/communes.csv`, `geojson/communes.geojson`, `sql/full.sql` and all three `ecommerce/` shapes.

  **Ids do not move, and a reseat is not a retirement.** A seat the decree keeps keeps its id, including through the three renames above, so a consumer holding `118` still holds El Ma Labiod. Four dairas carry on under another of their own communes as seat, and those keep their ids too: **525** is now Djezzar, **537** Hamadia, **541** Had Sahary and **549** Ouled Antar. An id belongs to the body of communes a daira administers, not to the commune it is named after, so retiring one of these and minting a new number for the same communes would be a renumbering, which this dataset never does.

  Which seats those are is not a judgement call in the plan. `scripts/lib/decree-26-253.mjs` records the 91-306 membership of every daira the annex unseats and derives the rule: **an annex daira inherits the id of the one unseated daira of its wilaya that supplies a majority of its communes**; a grouping no unseated daira is the majority of is genuinely new, and an unseated daira nothing inherits is retired. `scripts/fix-dairas-26-253.mjs` refuses to run on a plan that mints or retires where the rule says an id travels, and the tests pin all four cases.

  So **two** seats are new and take fresh ids 565 and 566 rather than filling a gap: `Oued Morra` in 59, whose two communes both come from Aflou, and `Faïdh El Botma` in 66, which takes one commune from each of three dropped dairas. **Six** dairas are dropped for good and reserved in a new `data/retired-ids.json` with the reason for each (524, 528, 538, 543, 545, 546), alongside the nine ids retired before it existed, and `pnpm validate` refuses to let any of them become live again. The table is left in the order it already had; the two new rows join their own wilaya's run.

  **What is not applied.** The decree fixes daira membership, not the commune register, so eighteen printed commune names that differ from ours are recorded and left alone: fifteen differ only by accents, and three beyond them are carried as an explicit alias table. Those three (`Béni Yaagoub` for our Ben Yaagoub, `El Azizia` for Al Azizia, `Bougtoub` for Bougtob) are spellings **law 26-06 of 4 April 2026 already replaced**, each with its article and item in `scripts/lib/jo-2026-corrections.mjs`, so the later decree reprinting them is not a reason to undo that. A daira therefore takes its seat commune's name as this dataset spells it, unless the row we hold folds onto that name, in which case our spelling stands: the annex drops accents in a seat cell its own commune column keeps.

  The annex as printed is in `research/_dairas/decree-26-253.json`, with the extraction and the ruled-cell reading it needs in `research/_dairas/`. The PDF is not committed and joradp.dz declines automated fetches, so it is recorded as an owner-supplied artifact with its size and SHA-256. `test/dairas-decree-26-253.test.mjs` pins every annexed wilaya's daira list, seat by seat and commune by commune, to that extract.

  Refs yasserstudio/geoalgeria.com#211.

- ca001f1: `created` now reads 2026 for wilayas 59 to 69, the year they became official.

  **Migration.** `created` is the year a wilaya became official, that is the year the law creating it took effect. The 11 wilayas of Law n° 26-06 (_Journal Officiel_ n° 25 of 5 April 2026) shipped as `"2025"`, the year the reform was **announced** (2025-11-16), while every README, the JO citation and the app's own pages said April 2026. They now read `"2026"`. A consumer that compares the field to a literal must update it: `w.created === "2025"` becomes `w.created === "2026"`, and a numeric read of `wilayas.json` moves from `2025` to `2026`. The TypeScript union is now `"original" | "2019" | "2026"`, so the old literal stops type-checking instead of silently missing the 11 newest wilayas. Wilayas 1 to 48 (`"original"`, `1984` in `wilayas.json`) and 49 to 58 (`"2019"`) are unchanged: Law 19-12 took effect in 2019, so that cohort already followed this meaning.

  All five carriers move together: `data/algeria.json`, `data/wilayas.json`, `data/wilayas.csv`, `data/csv/wilayas.csv` and `data/sql/full.sql`. `wilayas.json` also corrects `metadata.reforms[].year` for that reform from 2025 to 2026, so a reform's year again matches the `created` of the wilayas it added; its `announced: "2025-11-16"` keeps the 2025 fact where it belongs.

  **The meaning is now written down**, because the value is only correct relative to it: the JSDoc on `Wilaya.created`, `WilayaDetailed.created` and `Reform.year`, the field table in `data/README.md`, and a **Creation year** entry in the repository's `CONTEXT.md` glossary. `llms.txt` and `dataset-metadata.json` stop calling it the "2025 territorial reform", which is where that drift came from, and the validator's accepted set replaces 2025 with 2026. A new guard, `test/wilaya-created-year.test.mjs`, pins the cohort by code range in all five carriers, asserts that no carrier still holds a 2025, and asserts that the documented meaning is present in the types, the schema doc and the glossary.

  Refs yasserstudio/geoalgeria.com#198.

### Patch Changes

- 924b092: 189 more commune centres corrected from OpenStreetMap, and the standing guard becomes containment.

  2.1.1 corrected 56 centres, and said in the same breath what it could not see: a sweep against the 69 wilaya polygons can only find a centre that leaves its own wilaya, and 68 was all it could nominate. So every one of the **1,541** centres was compared with the `admin_centre` (chef-lieu) node of its own OpenStreetMap `admin_level=8` relation, and then tested against that relation's unsimplified boundary. 1,537 matched a relation; the four that do not exist in OpenStreetMap at all are Souk Oufella (630), Bir Touta (1634), Collo (2110) and Dhayet Bendhahoua (4703).

  **215 stored centres were outside their own commune**, which no rule here could have found: the wilaya outlines are simplified to a 3.4 km median vertex gap and a wilaya is enormous, so a centre can be tens of kilometres from its own town, in the wrong commune, and still sit comfortably inside the right wilaya.

  **189 of them move.** A centre is decided wrong when that relation's `admin_centre` node is inside the commune, inside the declared wilaya and is this commune's seat, and the stored point is either outside the commune's own boundary or the seat mangled. The largest are Sidi Slimane (3221) 108.7 km, Akabli (119) 107.9 km, Rahia (426) 64.4 km, Inghar (5302) 60.8 km and Fenoughil (115) 59.3 km. Wilaya 1 (Adrar) is a recognisable class on its own: Ouled Ahmed Timmi, Tamest and Fenoughil held a **positive** longitude where the chef-lieu is west of Greenwich, and Tit held Timekten's longitude to four decimals. Others keep their latitude exactly and lose only the longitude, or the reverse, which is the bad name-based join this project has diagnosed before.

  **Two of the audit's own rules were too narrow, and a review widened them.** The first was strict key equality on the seat node's name, which excluded twelve rows whose evidence the repository already held: the relation and its `admin_centre` node carry the **same `wikidata` item**, which is OpenStreetMap stating outright that the node is that commune's seat (Hanif/Ahnif, Illilten/Souk El Had, Inghar/In Ghar and nine more), and Rahia differs from "El Rahia" by the definite article alone. The second was containment itself, which cannot see a **dropped minus** inside a commune large enough to hold both values: Fenoughil shipped `[0.3, 27.602777]` for a seat at `[-0.30211, 27.606097]`, 59.3 km away and inside its own commune either way. Both rules are now `scripts/lib/seat-evidence.mjs` with unit tests, the mangled-ordinate one runs as a standing guard over all five representations with no exceptions list, and over all 1,537 rows it finds exactly two values mangled.

  Every row carries its own source in `research/_commune-centres/corrections-2026-09-29.json`: the OSM relation id, the `admin_centre` node id, the relation's `ref:ONS`, the Overpass `timestamp_osm_base` (2026-09-29T12:54:47Z), how the node was shown to be this commune's seat, and the containment verdicts that decided it. New values are the node coordinate rounded to 6 decimals, the package's existing resolution, and all five representations change together (`communes_w*.json`, `algeria.json`, `geojson/communes.geojson`, `csv/communes.csv`, `sql/full.sql`).

  **The licence carve-out grows with them.** 56 + 189 + the 6 relation centroids of 2.1.0 is **251 OpenStreetMap-derived commune centres**, so `LICENSE`, `NOTICE`, `dataset-metadata.json`, `data/geojson/communes.metadata.json`, `data/geojson/wilaya-boundaries.metadata.json`, `data/README.md`, `llms.txt` and the READMEs in all three locales now say 251, and 1,290 for the centres that carry no recorded source and over which no ODbL claim is made. The package declares `SEE LICENSE IN LICENSE`, because its data is under three sets of terms that no SPDX expression states.

  **The standing guard changed rule, not just threshold.** The 1 km seat-distance guard that shipped with 2.1.1 needed 496 pinned exceptions, because it was not measuring an error: our centre and the OSM node are two hand-placed claims about one town and the median disagreement is 402 m. It is replaced by containment: **every commune centre must lie inside its own commune**, in all five representations, with 27 documented exceptions (each a centre still outside its commune on incomplete evidence, with the evidence test it fails) and 4 communes that have no usable OpenStreetMap geometry to be inside of. The commune outlines are a committed, reduced file rather than a live query, and the reduction is proved: the build refuses to write unless all 1,541 verdicts match the verdict from the unsimplified geometry. The distance to the seat survives as a report, `research/_commune-centres/seat-distance-2026-09-29.md`, whose bands after this batch are 668 over 300 m, 307 over 1 km and a 218 m median.

  Refs yasserstudio/geoalgeria.com#170.

- 91ff643: Correct the licence terms: the mirrored postal data under `data/poste/` is not MIT. LICENSE and NOTICE now state MIT for the code and the compilation, ODbL 1.0 ((c) OpenStreetMap contributors) for the 69 wilaya boundary polygons and the 251 OpenStreetMap-derived commune centre coordinates, and Algérie Poste's own terms (Data © Algérie Poste; redistributed for reference) for `data/poste/`. Three sets of terms have no SPDX expression, so the manifest declares `SEE LICENSE IN LICENSE` and `dataset-metadata.json` carries prose `conditionsOfAccess` instead of a licence URL. `dateModified` refreshed.
- 8450994: Wilaya 55 was drawn 48% short: three communes' territory moves to the wilaya each one declares, and wilaya 55's phantom sixth daira goes.

  The 2026-09-27 commune-centre sweep reported three communes whose stored centre was outside its own wilaya polygon and whose OpenStreetMap chef-lieu node was outside it too, which is the pattern that accuses the outline rather than the point. It was the outline. **El Alia (5513) and El-Hadjira (5507) are communes of Touggourt (55)** and 9,049 km2 of them was drawn as Ouargla (30), 51 to 53 km from where wilaya 55 stopped; **Mansoura (4713) is a commune of Ghardaïa (47)** and 4,783 km2 of it was drawn as El Meniaa (58).

  **OpenStreetMap is the stale source here, and re-pulling reproduces the defect.** Touggourt was carved out of Ouargla and El Meniaa out of Ghardaïa by law 19-12 in 2019; OpenStreetMap has the new `admin_level=4` relations and never shrank the parents, exactly as it never shrank Tlemcen when El Aricha left it in 2026 (the correction of 2.0.5). The commune relations still read the pre-2019 numbering: El Alia is tagged `ref:ONS=3020` and El-Hadjira `3014`, both Ouargla codes. Membership is not an OpenStreetMap question. Law 26-06 (JORA n° 25, 5 April 2026) re-states the commune list of the ten wilayas the 2019 reform created, presidential decree 26-206 (JORA n° 40, 3 June 2026) fixes their names and chef-lieux, the ONS _code géographique 2021_ reads wilaya 55 for 5513 and 5507 and 47 for 4713, and so does every commune table this package ships. So the polygons follow the communes.

  **Areas, against the published figures.** Touggourt 9,775 to **18,831 km2** (published 17,428), Ouargla 144,496 to **135,440** (145,805), Ghardaïa 21,218 to **26,008** (24,395), El Meniaa 63,353 to **58,563**. Each pair's total is unchanged to within 0.05 km2 (154,271.096 to 154,271.130 for 30 and 55, 84,571.067 to 84,571.018 for 47 and 58), the union of all 69 is unchanged to the same, no third wilaya gains or loses anything, and every one of the 2,346 pairs of the 69 now measures under 0.01 km2 of overlap, GEOS agreeing at zero. The moved parts are the communes' own OpenStreetMap `admin_level=8` outlines (ODbL 1.0, © OpenStreetMap contributors, Overpass `timestamp_osm_base` 2026-09-29T13:04:54Z), recorded with the 34 member outlines of the four wilayas in `research/_wilaya-boundaries/commune-outlines-2026-09-29.json` and simplified to 550 m before the transfer so the redrawn features keep the file's own vertex spacing (median 3.4 km, p25 2.1 km, p75 5.7 km; 7,759 vertices to 7,797). Two zero-width spikes that predate this correction, in wilayas 18 and 31, were removed in the same pass because they read as ring self-intersections; a spike encloses no area, so no border moves. Apart from those, every other feature is byte-identical.

  **The rule that would have caught it now guards it.** Each of the four polygons is checked against the union of its own member communes' outlines and has to agree within 2%: wilaya 55 was 9,775 km2 against 18,843 km2 of member communes, a shortfall no coordinate check could see, and the three pinned exceptions in the commune-centre guard are gone rather than re-pinned.

  **El Alia's daira, the linkage half of the same report.** It was filed under a daira named `Ouargla` inside wilaya 55, which is the name of the wilaya 55 was carved out of and of no daira it has, and 5513 was the only commune holding it. It belongs to **El Hadjira**, whose seat commune is El-Hadjira (5507). Three readings agree: the daira's own commune list, the wilaya-55 rosters in `@geoalgeria/jeunesse` and `@geoalgeria/sports` (which between them file every wilaya-55 record under Touggourt, Temacine, Megarine, El Hadjira or Taibet and never under an `Ouargla` one), and `data/wilayas.csv`, which already said `dairas_count` 5 for wilaya 55 while `data/wilayas.json` said 6.

  **So the phantom row goes, taking the daira table from 556 rows to 555.** It is removed rather than left holding zero communes, its id (512) is not reused and the rows after it do not move, wilaya 55 reads 5 dairas in both `wilayas.json` and `wilayas.csv`, and the two now agree row for row, with no per-wilaya disagreement. The decree pass shipping in this same release then reads wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28, 32 and 59 to 69 from executive decree n° 26-253 and lands the table on **551** rows, which is the number `package.json`, `dataset-metadata.json`, `llms.txt`, `data/README.md`, `wilayas.json` `metadata.total_dairas`, the `sql/full.sql` header and the READMEs in all three locales state. A test now requires every stated total to equal the number of daira records, so no carrier can drift from it again. That total is stated as the dataset's own count, never as an official one: no post-2026 daira total has been published, and the 564 the README used to call official included 9 phantom dairas produced by 13 duplicate commune records, which is what v1.1.2 recorded.

  Refs yasserstudio/geoalgeria.com#171.

## 2.1.1

### Patch Changes

- 48c080d: Alger Centre was in the sea and Bethioua inside the Arzew LNG complex: 56 commune centres corrected from OpenStreetMap.

  Two reported defects turned out to be one class. **Alger Centre (16)** shipped at `[3.0909, 36.76846]`, in the water east of the port of Algiers, about 3 km from the Grande Poste; **Bethioua (31)** shipped at `[-0.2596, 35.805837]`, inside the Arzew industrial complex, 0.75 km east of the town. Both are real Algerian coordinates inside the national bounding box, which is why no range or bbox check ever saw them.

  Sweeping **all 1,541 commune centres** against the 69 wilaya polygons this package already ships found **68 outside their own wilaya**, from 10 m to 188 km. The wilaya outlines are display-grade and simplified to a 3.4 km median vertex gap, so they cannot tell a bad point from a simplification artefact on their own. Each of the 68 was therefore decided against a second, unsimplified source: its own OpenStreetMap `admin_level=8` commune relation, fetched with full geometry. A stored point outside the commune's own OSM boundary, whose `admin_centre` node is inside that boundary and inside the declared wilaya, is a coordinate error.

  That split **55 errors from 13 artefacts**, and Bethioua is the 56th correction, admitted on its own evidence: its stored latitude is byte-identical to the `admin_centre` node and only the longitude is displaced.

  **56 commune centres move**, by 0.75 km to 217 km. The largest are Ksabi (52) 217 km, Tousnina (14) 121 km, Oultem (68) 88 km, Hannacha (26) 86 km, Boudria Beniyadjis (18) 74 km, Ain Diss (04) 72 km, Bir Dheheb (12) 69 km and El Harrach (16) 51 km. Five more were independently reported as offshore and are all in this set: Rais Hamidou (16), which was 15 km out in the bay, Melbou (06), Tichy (06), El Ancor (31) and Alger Centre itself. Every row carries its own source in `research/_commune-centres/corrections-2026-09-27.json`: the OSM relation id, the `admin_centre` node id, the relation's `ref:ONS` and the Overpass `timestamp_osm_base` of the pull, so any single value can be re-checked without re-running the sweep. New values are the node coordinate rounded to 6 decimals, the package's existing resolution.

  This matters past the table. `attachCommune()` and the same inlined pattern across seven sector packages stamp `commune` and `commune_code` onto OpenStreetMap features by **nearest commune centroid**, so a centre 25 km from its town is an attractor that claims facilities near a place it does not belong to. The same class of row produced 30 of this project's known mislinks before they were repaired.

  All five representations change together, `communes_w*.json`, `algeria.json`, `geojson/communes.geojson`, `csv/communes.csv` and `sql/full.sql`, and a new guard keeps the class out: no commune centre may sit more than **500 m** outside its own wilaya polygon, in any of those five files, with the three reviewed exceptions pinned by name and measured distance. 500 m is the loosest line that still fails an Alger Centre and the tightest that does not fail a legitimately coastal commune.

  **The licence carve-out now covers commune centres, not just boundaries.** These values come from OpenStreetMap, so the package's ODbL 1.0 carve-out is extended to cover them: `license` becomes `MIT AND ODbL-1.0`, and `LICENSE`, a new `NOTICE`, the READMEs in all three locales and `data/geojson/communes.metadata.json` state that the 69 wilaya boundary polygons and **62 commune centre coordinates** are ODbL 1.0, (c) OpenStreetMap contributors, while the compilation of wilayas, dairas, communes, names, postal codes and administrative codes stays MIT. 62, not 56: the 6 centres replaced in 2.1.0 came from the same `admin_level=8` relations, as relation centroids. Only 6, because 2.1.0 repaired one commune of each placeholder pair: Si Mahdjoub (2644) and El Achir (3407) still carry the pre-2.1.0 placeholder byte for byte and were never OpenStreetMap-sourced. The carve-out follows the values rather than a file, so it covers them in all five representations. The other 1,479 commune centres and the 69 wilaya capitals carry no recorded source, are not OpenStreetMap-derived, and no ODbL claim is made over them. Reusing either carved-out part means attributing OpenStreetMap contributors and keeping derived databases under a compatible licence.

  The 13 hits that were not point errors are listed in `research/_commune-centres/review-2026-09-27.json` rather than silently tolerated. Three of them say something about the boundaries instead: El Alia and El-Hadjira, both declared in Touggourt (55), sit 53 km and 51 km outside the wilaya 55 polygon with their chef-lieu nodes outside it too, and Mansoura (47) sits 5 km outside wilaya 47. Coordinates are unchanged for all 13.

  Commune centres that are wrong while staying inside the right commune, Bethioua's own class, are not addressed by the sweep and need a separate audit against every commune's `admin_centre` node.

- 4deabd3: Replace em dashes in source names and citations with plain separators.

  - Every source `name` reads `Operator: descriptor`, where it used to carry a
    U+2014 em dash, in `data/metadata.json` and in the `dataset-metadata.json`
    descriptor built from it.
  - The schema.org/DCAT `citation` entries join a source name and its licence with
    a comma: `OpenStreetMap: schools & kindergartens in Algeria, ODbL 1.0 (© OpenStreetMap contributors)`.
  - Coverage notes, package `description`s, the `types/index.d.ts` documentation and
    the `index.js` headers carry a colon, comma or semicolon in place of the dash.

  No count, coordinate, licence or date changes. Consumers that match a source name
  or a citation string literally need to update the separator; anything keyed on
  `sources[].key` is unaffected. `pnpm validate` now fails on an em dash in
  published metadata, so it cannot come back through a generator.

## 2.1.0

### Minor Changes

- 5fc1b8e: Correct 2 wilaya and 178 commune names against the Official Journal, repair six placeholder coordinates, and publish the former spellings so search still finds them.

  Reported by [@djamel2288](https://github.com/djamel2288) in issue #221, then audited in full against both editions of the law rather than only the lines the report named.

  **Names.** Wilaya 65 is `Aïn Ouessara`, not `Aïn Oussera`: presidential decree 26-206 (JORA n° 40 of 3 June 2026, art. 1, item 65, p. 5) reads "Wilaya de Aïn Ouessara avec chef-lieu la ville de Aïn Ouessara". Wilaya 28 is `M'Sila`, not `M'sila`. Law 26-06 (JORA n° 25 of 5 April 2026) re-states the commune list of ten existing wilayas and creates eleven more, so all 404 commune names it prints were compared with the dataset in French (F2026025.pdf) and in the authoritative Arabic edition (A2026025.pdf): 143 French and 63 Arabic readings differed and now follow the law, among them `Lemcene` to `Lemsane`, `El Haoudane` to `Deux Bassins`, `Tletat Ed Douair` to `Eddouair`, `Mezerana` to `Mezghenna` and `Azil Abedelkader` to `Abdelkader Azil`. Eight Arabic readings are deliberately not taken: the Arabic edition writes a final yaa as alef maqsura and omits hamzas inconsistently, so those forms are typesetting rather than spelling, and they are listed with their reason in `scripts/lib/jo-2026-corrections.mjs`.

  **Former names stay searchable.** The new `data/name-history.json` carries all 210 replaced spellings with the text that replaced each one, including two published variants of the Aïn Ouessara name (`Aïn Oussara`, `Ain Oussera`), `findCommune()` matches them, and the repo's own commune joins resolve them, so an address stored before a correction still lands on the right record. No commune code, daira id, e-commerce id or SQL row id moved.

  **Coordinates.** Six communes shared one of two placeholder points: `Belarbi` (22) and `Makhda` (29) both sat at 35.15, 0.15; `El Hamdania` and `El Haoudane` (26), `Ouled Bouachra` and `Si Mahdjoub` (26), and `El Achir` and `El Euch` (34) each shared one neighbour's point. Every replacement is the centroid of the OpenStreetMap admin_level=8 relation whose `ref` tag is that commune's own ONS code (© OpenStreetMap contributors, ODbL 1.0). No other commune coordinate duplicates another.

  **Daira.** `Deux Bassins` (2653) moves from daira `Ouzera` to `Tablat`: its point lies inside the OpenStreetMap boundary of Daïra Tablat (relation 4461829). Ouzera now lists 4 communes and Tablat 4.

  **Atlas labels.** `algeria.geojson` and the three delivery-zone tables labelled wilayas 59 to 69 alphabetically against numeric codes, so ten wilayas carried another wilaya's name over the right point; a dozen older labels had also lost their accents. Every label is now rebuilt from the wilaya's own row.

## 2.0.2

### Patch Changes

- 68a06ac: Correct reviewed current-Wilaya assignments for the Annaba airport, Algérie Poste offices and ATMs, and Ministry of Youth and Sports establishments while preserving differing Source codes and keeping the flagship Poste mirror synchronized.

## 2.0.1

### Patch Changes

- 76dfd0d: Confirm the MIT licence field against the new licence-terms validator rule.
- 8014c6e: Add `@geoalgeria/normalize` to the family at 1.0.0, the package that owns search-key generation.

  - **`@geoalgeria/normalize`** ships `conservativeKey`, the strict fold every GeoAlgeria index must reproduce byte for byte: Arabic presentation forms back to base letters, alef variants and hamza on waw or yaa to the plain letter, tatweel and the Arabic combining marks removed, Latin accents folded from precomposed and decomposed spellings alike, Arabic-Indic and Eastern Arabic-Indic digits to ASCII, apostrophe and hyphen variants and punctuation as word separators, whitespace collapsed and case folded to lower. Taa marbuta and alef maqsura stay as written; those belong to the loose tier.
  - It also ships `looseKey`, the Conservative key plus exactly two equivalences (alef maqsura with yaa, taa marbuta with haa) so a looser match can be ranked below an exact one; `tokenize`, the word split both keys are joined from and the index must agree with; and `searchKeys`, which returns both keys, the tokens and `looseDiffers` from one pass, the call the Content release generator makes.
  - `rules` is the reviewed table, frozen and public: every fold with its stable Rule id (`ar.taa-marbuta-haa`, `latn.extended-a`), its class, its script, the exact codepoint sequences it maps from and to, the sentence it asserts about the script, and a review record naming who reviewed it and when. The two declined rules are in it with the fold they decline: the Arabic definite article is never stripped, and no Latin transliteration of an Arabic name is generated. The rationales are listed in all three READMEs so a reader of the language can argue with one.
  - `explain(text)` returns the keys plus `applied`, the Rule ids that fired for that input in the order they ran, so a loose match can say what made it loose and a ranking can place it below an exact one. It is the key path with the record switched on, not a second implementation.
  - The data repository's `pnpm validate` gates the table: a Rule cannot enter without a review record and a corpus case proving it, a case cannot claim a Rule that is not in the table, an id names one Rule, and the table order must match the committed reviewed order.
  - `NORMALIZE_VERSION` is the semver major the Content manifest records for the release it was built with, and the Golden corpus ships as an importable fixture at `@geoalgeria/normalize/fixtures`, 64 cases covering every Rule, so every consumer proves the same keys from the same inputs. The subpath is in the `exports` map and in the `files` array, so it resolves from an installed tarball and not only from a checkout, and a package test holds the map, the array and the files on disk together.
  - The same subpath ships `matchCases`, 17 cases carrying the class a query and a name produce: `exact`, `prefix`, `loose` or `none`, decided from the keys and their tokens alone. `prefix` is a word-boundary rule, written out in the type declaration and in all three READMEs: every query word but the last equals the name's word at the same position and the last query word is a prefix of the name's word there, so a query may stop part way through the word it is still typing and only there. No classifier is exported; a consumer writes those fifteen lines and proves them against the fixture, which is what keeps the four-way decision the same in every product. Ranking stays private in the products' shared core.
  - A pull request that touches the key path, `packages/normalize/src/**`, `packages/normalize/fixtures/corpus.js` or `packages/normalize/index.js`, must carry a changeset declaring `"@geoalgeria/normalize": major`, or CI fails it. Keys are baked into every published catalog and an installed catalog is never migrated record by record, so a key change rebuilds and re-downloads every catalog on every device. The check is path-based and deliberately blunt: a documentation-only edit to one of those files still needs the major, and `CONTRIBUTING.md` records that as the accepted cost. Until the package's first version is on npm the guard also passes on a 404 from the registry, because there is no published catalog to invalidate; that path closes by itself at the first release. A 404 is the only answer that opens it: a registry that could not be reached fails the check closed, because a timeout is not a statement that the package does not exist.
  - The key path owns its codepoint tables and has no runtime dependencies, so a Node or Hermes upgrade cannot change a published catalog's keys. Code only, plain MIT, no dataset metadata.

## 2.0.0

### Major Changes

- 64b10a1: Replace duplicated and missing `code_commune` values with the 1,541 unique codes from the official ONS 2021 Code Géographique National. Cascade the corrected foreign keys through every linked dataset, preserve Algérie Poste's differing provider-native values, enforce the SQL and repository-wide FK contracts, retain the 2021 mother-wilaya prefix for communes promoted in later reforms, and document the code contract.

### Patch Changes

- 64b10a1: Move Tabelbala and its daïra from Béchar to Béni Abbès across all administrative carriers while preserving public ids, and update linked cultural, rail, and mosque records to the corrected current wilaya.

## 1.3.0

### Minor Changes

- 8a67b74: Commune postal codes are now office-derived: each commune's code comes from its own Algérie Poste offices (baridimap), fixing 187 rows that carried positional or colliding values (Akbou 06001, Bab Ezzouar 16024, Reggane 01004; zero duplicate codes remain). Communes with no resolvable office now carry no code rather than a fabricated one.

## 1.2.0

### Minor Changes

- 9a309c6: The commune table is complete: 1,528 to 1,541, Algeria's official count. The 13 that were missing are the name-twin communes of the reform wilayas (10, 15, 23, 25, 31, 46, 51, 55, 64, 66, 68), each sharing a name with a commune elsewhere in the country, which is how they were lost. Every one is Wikidata-sourced and coordinate-verified, and lands field-identical to the rows the site already serves, so package and app agree. Dairas: 555 to 556, with Zmalet El Emir Abdelkader (wilaya 64) added and 13 `commune_count` values recomputed. Five of the new rows carry `postal_code: null` and five carry `code_commune: null`, where no citable value exists; both fields were already typed nullable, so nothing about the contract changes. Sources and per-record confidence: `research/_communes-reconcile/`.

## 1.1.4

### Patch Changes

- 33507ee: Add four sibling packages to the family, each shipping at 1.0.0:

  - **`@geoalgeria/industrie-pharmaceutique`** — 171 approved pharmaceutical manufacturers (120 medicine/PP + 48 device/DM + 3 mixte) from the Ministry of Pharmaceutical Industry fabrication register, geocoded to commune/wilaya centroid.
  - **`@geoalgeria/pharmacies`** — 3,790 pharmacies (officines) across 67 wilayas from OpenStreetMap (ODbL), geocoded.
  - **`@geoalgeria/ooredoo`** — 572 Ooredoo stores (EO/CSO/ESO) with real coordinates from the operator locator API; completes the telecom retail trio with mobilis + djezzy.
  - **`@geoalgeria/pharma`** — umbrella re-exporting industrie-pharmaceutique + pharmacies in one install.

  The first two plus the umbrella form a new Pharma sector.

## 1.1.3

### Patch Changes

- 78854df: Refresh the package list — all 22 datasets

  - Docs-only patch: the README package tables (EN/FR/AR) now list the full monorepo — adds `@geoalgeria/culture`, `/agriculture`, `/ecoles` and the transport sector (`/gares-routieres`, `/ferroviaire`, `/buses`, `/transport`), which shipped after 1.1.2.
  - No data change: the 69 wilayas / 555 daïras / 1,528 communes and all coordinates, codes and postal data are unchanged.

## 1.1.2

### Patch Changes

- c511d83: Fix commune data integrity and strict-`nodenext` TypeScript resolution.

  - Data: removed 13 duplicate commune records that were each listed under two wilayas — a commune's real entry plus a copy mislabeled under an unrelated wilaya (e.g. Oran's "Aïn El Türk" also appearing under Bouira) — along with the 9 phantom dairas they created. Communes 1,541 → 1,528, dairas 564 → 555. Eight further `code_commune` collisions involving genuinely distinct communes remain and are flagged for an authoritative ONS-sourced reconciliation.
  - Types: `types/index.d.ts` now compiles under strict `nodenext`. The public types live in a `declare namespace algeriaGeodata` that merges with the value, resolving the `export =` / TS2309 conflict; reach them as `geo.Wilaya` (e.g. `import geo = require("geoalgeria")`).
  - Packaging: the `.` `exports` entry is now types-first.

## 1.1.1

### Patch Changes

- Docs: value-led READMEs, official source citation for the 69-wilaya reform (Law n° 26-06, Journal Officiel n° 25 of 5 April 2026), and fixed post-restructure links/badges. No data changes.

## [1.1.0] - 2026-06-08

### Changed

- Replaced synthetic commune postal codes with **real Algérie Poste codes** for
  ~1,440 communes (sourced from baridimap.poste.dz). Previously only ~88 matched
  reality; every commune now maps to a real Algérie Poste office code.
- Normalized wilaya 65 to **"Aïn Oussera"** (wilaya, daira, and commune) to match
  Algérie Poste and common usage.

### Added

- `data/poste/` — **3,908 post offices** and **2,026 ATMs** (real postal codes,
  bilingual names, coordinates, commune/wilaya linkage) from Algérie Poste, in
  JSON, CSV, and GeoJSON.
- `postOffices`, `atms`, and `getPostOfficesByCommune()` JS API, with `PostOffice`
  and `Atm` TypeScript types.

## [1.0.0] - 2025-05-05

### Added

- 69 wilayas (original 48 + 2019 reform wilayas 49–58 + 2025 reform wilayas 59–69)
- 1,541 communes with bilingual names (FR/AR), postal codes, daira assignments
- 1,541 commune coordinates (98.7% coverage)
- 564 dairas as first-class entities
- Multiple export formats: JSON, CSV, GeoJSON, SQL
- E-commerce optimized flat dataset
- TypeScript type definitions
- npm package with helper functions
- Validation script + GitHub Actions CI
- Contributing guide with issue/PR templates
