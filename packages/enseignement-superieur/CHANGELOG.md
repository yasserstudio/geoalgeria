# Changelog

## 2.1.0

### Minor Changes

- eec5cee: **Migration.** Two published ids are retired in this release: `00069` (Ecole Nationale Supérieure de Technologie) and `00085` (Ecole Supérieure des Sciences appliquées d'Alger ex EP ST Alger). Both forward to `00189`, Ecole nationale supérieure des technologies avancées (Alger), which carries that establishment now, in the package's new `data/retired-ids.json`. Neither id is ever reused. A consumer holding either one resolves it in a single hop through that ledger's `migrations` map, which also carries the decree the retirement rests on.

  Sixteen more ids are retired without a forward: the military schools the Ministry of National Defence supervises (`00094` `00095` `00096` `00097` `00098` `00099` `00100` `00101` `00102` `00104` `00105` `00110` `00111` `00115` `00116` `00118`). By the Owner's decision of 29 October the project publishes no military location, so these records leave the package. Their ids stay reserved and are never reused; a consumer holding one should drop it.

  Add the 12 higher-education institutions MESRS's BAC 2026 placement file holds and its university-network listing omits, publish the current name of the 2 the listing still carries under an older one, and settle the ENSTA succession the listing has not caught up with: 171 institutions from 177 (187 before the 16 military schools leave).

  **A second MESRS publication, because the first one is unreachable.** www.mesrs.dz did not answer from the build machine on 27 and 28 October, so nothing here claims a new retrieval of the network listing: that source's `retrieved` stays 2026-08-03, the date of the committed listing captures, and `last_retrieved` in `refresh-schedule.json` stays with it, a package being only as fresh as its stalest source. `updated` (and so the dataset descriptor's `dateModified`) does move to 2026-10-28, because the data itself moved on that date. What was read instead is another of the ministry's own publications, _Moyennes minimales BAC 2026 (suite à la première phase)_, the 350-page file that names every establishment the ministry places new bacheliers into, each by the ministry's own establishment code. Committed from it is a rights-safe projection of its institution rows, `sources/enseignement-superieur/bac-2026.json`: 248 rows of establishment code and official French name, never the per-filière minimum averages and never the PDF, with the PDF's URL, SHA-256, byte count and page count recorded in the capture manifest.

  **The projection is the authority for those names, not the seed.** `scripts/bac-2026.mjs` refuses any name in `scripts/seeds/bac-2026.json` that does not fold to the row the ministry published under that code, so the seed restores the French accents and capitalisation the all-caps source drops and can never introduce a name of its own. One misspelling in the ministry's file is corrected under a declared exception that quotes its row verbatim and is checked against the capture character for character, so the correction lapses the moment the ministry fixes it.

  **11 new institutions**, ids `00178` to `00188`. Université des sciences médicales d'Alger; the Sidi Abdellah schools for mathematics, autonomous systems, nanosciences and nanotechnologies, and cyber security; the Annaba school of management sciences; the Adrar school of Saharan agriculture; the Khenchela school of forestry; the Saïda école normale supérieure, the thirteenth and the only one the package did not already carry; the Mohamed Lakhdar Hamina national institute of cinema at Koléa, under the Ministry of Culture; and the school of youth-work sciences and technologies in Algiers, the first establishment here under the Ministry of Youth, which `SupervisoryMinistry` now admits.

  **2 renames, both keeping their id.** `00089` is now Ecole nationale supérieure des technologies et d'ingénierie (Annaba), from Ecole Supérieure des Technologies Industrielles de Annaba ex EP ST Annaba. `00093` is now Ecole nationale supérieure d'agriculture saharienne d'El Oued, from L'Ecole supérieure de l'agriculture saharienne - El Oued. A rename moves a name and never a join key: both records keep their website, which is what their id is pinned to, and the build refuses the rule if the listing has since changed that name itself.

  **ENSTA, the succession the listing has not caught up with.** Establishment `P05` in the placement file is the Ecole nationale supérieure des technologies avancées, created by décret exécutif 22-314 of 12 September 2022. Décret exécutif 22-398 of 21 November 2022 then dissolved the Ecole nationale supérieure de technologie and the Ecole supérieure en sciences appliquées d'Alger and transferred their property, rights, obligations, personnel and resources to it (both decrees in Journal officiel n° 78, 2022). The ministry places bacheliers into `P05` alone, while the 2026-08-03 network listing still lists both predecessors, so those two were not peers of a new school but the same establishment before the decree. Publishing all three would have been three records for one school. Instead the two leave the listing, ENSTA is added as `00189`, and `00069` and `00085` are retired and forwarded to it. The rule lives in the `successions` block of `scripts/seeds/bac-2026.json` and asserts both old names, so a listing that has since caught up fails the build rather than silently dropping records MESRS still publishes.

  **ENSTA's coordinate is its own seat campus, on two independent sources.** The school publishes its seat as "Cité Diplomatique, ex Centre biomédical, Dergana - Bordj El Kiffan, Alger", and OpenStreetMap carries exactly one object at that address: `way/245174987`, `amenity=college`, `addr:street=Cité Diplomatique`, `addr:city=Dergana`, whose `name` tag still reads the dissolved ENST (an OpenStreetMap edit owed upstream). That object is one source: Nominatim, api.openstreetmap.org and Overpass all read the same database, and Wikidata's ENSTA item had no `P625` when the record was added. Under `docs/adr/0001` one source is not enough for `exact`, so the second is the Owner's reading under rule 6: the pin of the school's Google Maps entry, 60 m from the OSM object, inside the 500 m ceiling and outside the 50 m copy radius. As with Beni-Abbes, a reading off a proprietary map only confirms: the coordinate that ships is OpenStreetMap's, and the reading is recorded in the seed as `owner_confirmation`, which the build checks against both thresholds. The commune is Bordj El Kiffan, the one the school's own address names, and not the Bordj El Bahri the nearest-centre join gives: the point lies inside Bordj El Kiffan's OpenStreetMap outline, 194 m from the Bordj El Bahri border, and Bordj El Bahri's centre is only the nearer of the two (1,761 m against 6,601 m), so the seed names the commune and the build keeps it inside the point's wilaya. The school's second site, the ex-ESSA building the school publishes as Bab El Oued, does not become a second record: one establishment is one record, and the decree's seat is Dergana.

  **Ids no longer follow the sort position.** The generator numbered records 1..N in sort order, so inserting one institution mid-sequence would have renumbered every record after it and repointed every published join key. Ids are now carried on the stable key each record already had (its website host, or the Arabic name for the 48 establishments MESRS publishes without a site), through the shared `carryOverIds` contract, and a genuinely new record is minted above every id the package has ever used. 175 of the 177 published ids are unchanged; the 2 the ENSTA succession retires are the only exceptions, and they are forwarded, not dropped.

  **Coordinates.** 5 of the 11 carry a real per-campus point, each an OpenStreetMap object cited in the seed with its id, version and timestamp, and each confirmed by a second, independent Vote, the Owner's reading under `docs/adr/0001` rule 6: the Université des sciences médicales d'Alger (96 m, the Ziania campus), the Sidi Abdellah schools of mathematics (28 m) and of nanosciences and nanotechnologies (40 m), and the Annaba school of management sciences (29 m). The four Sidi Abdellah schools were checked one by one. One has no OSM building, so it sits on its commune rather than on the shared tech-pole point that would have looked exact and proved nothing. For two more, the Owner's map readings disagreed with OpenStreetMap on which building is which: the nanosciences reading lands on the building OSM names for autonomous systems, and the autonomous-systems reading where OSM maps no building. By the Owner's verdict the readings are right, so the nanosciences school ships on that building (its OSM names an edit owed upstream) and the autonomous-systems school, with no open object at its reading, ships on the Owner's pin itself (`docs/adr/0001` rule 6 as amended on 29 October, below). The École supérieure d'agriculture saharienne of Adrar (`P73`) ships on the location its own website publishes (below). The other 5, the pole school with no building among them, land on their commune's or wilaya's flagship centroid with the reason recorded per record. ENSTA, the twelfth record the file supplied, is on its own seat campus, read above. The build now refuses a campus point from the placement file that carries no second Vote. Across the package: 136 campus-precise from 67, 5 commune from 15, 30 wilaya from 95, and 0 of 171 records outside their declared wilaya.

  **A precision pass: 29 records move to their own campus, on two independent Votes.** Every `approximate` record was checked for a campus point under `docs/adr/0001`: `exact` needs two independent open sources within 2 km of each other, and Nominatim, api.openstreetmap.org and Overpass are all OpenStreetMap, one source. A first pass, offline against the committed 2026-08-03 OpenStreetMap capture, found a candidate campus for 36 records and none for 81. A second pass re-read each candidate's OSM object live and looked for the institution's own Wikidata item and its `P625`: for **9** the two agree (55 m to 512 m apart, none within the 50 m copy radius, none referenced to OpenStreetMap or to a proprietary map, each statement's references read from the capture), so each moves from its commune or wilaya centre to its OSM campus point, which is the coordinate that ships: `00031` `00054` `00063` `00064` `00068` `00081` `00095` `00103` `00111` (`00095` and `00111` have since left the package with the other military schools). Sétif 1 (`00042`)'s only Wikidata coordinate is stated in Google Maps, which is no open source, so it casts no Vote. Three of them are Arabic-only institutions that could only sit on a wilaya centre until now. Two change commune with the move, `00063` to Oued Smar and `00064` to Guerrouaou, each by containment in the commune's OpenStreetMap outline. A **10th**, the Ecole normale supérieure de Bouzaréah (`00165`), moves on the Owner's reading 46 m from its OSM campus, after the Owner decided that an Owner reading is never a Copied claim (`docs/adr/0001`, "Rule 6 in detail", added with this release). Three more move the same way on the Owner's readings: ENSTP (`00073`, 107 m from its Kouba building, not the Zeralda one), the ENS of Constantine (`00166`, 95 m, at Ali Mendjeli in El Khroub) and USTO (`00057`, 23 m; Wikidata's point there is a town-level coordinate 3.9 km away). Five more move on the Owner's readings of 29 October: Université d'Alger 1 (`00004`, 19 m from the Faculté centrale), ENP (`00060`, École nationale polytechnique, 64 m, El Harrach), ENP Constantine (`00062`, 20 m, El Khroub), EPAU (`00077`, École polytechnique d'architecture et d'urbanisme, 50 m, whose commune becomes Oued Smar by containment) and ESBA (`00108`, École supérieure des beaux-arts, 89 m, Alger Centre). The reading for ESCF Constantine (`00082`, École supérieure de comptabilité et de finance) lands 10 km from its only OSM candidate, in Constantine city where OSM maps no building for it, so it ships on the Owner's pin itself. Nine more move on the Owner's later readings of 29 October, each within 500 m of its OSM campus: Université de Tissemsilt (`00050`, 126 m), ESI Sidi Bel Abbès (`00080`, École supérieure d'informatique, 2 m), ENSERDD Batna (`00092`, École nationale supérieure des énergies renouvelables, environnement et développement durable, 29 m), the Aïn Benian school of hotel and restaurant management (`00107`, 109 m), the paramedical institutes INFSPM M'Sila (`00131`, 99 m) and INFSPM Tiaret (`00136`, 89 m), ENS Kouba (`00167`, 39 m), and the university centres of El Bayadh (`00174`, 64 m) and Illizi (`00175`, 201 m), and the École supérieure de management de Tlemcen (`00084`, 94 m). Sétif 1 (`00042`) moves to the OSM building named "Rectorat" at the El Bez campus, 10 m from the Owner's reading, on the Owner's decision that it is Sétif 1's rectorate. Of the Wikidata decisions, six candidates stay queued because Wikidata's point is within 50 m of the OSM one (a copy proves nothing), and the rest for want of a second source. Of the 136 `exact` records, 32 stand on two Votes, 3 on an Owner pin alone, 12 on the location the institution publishes itself and 24 on a single open lead; the other 65 rest on a single Nominatim geocode and are left for a separate pass. The 71 records without one are the Review queue, `research/enseignement-superieur/precision-review-2026-10-28.json`, and every verdict is in `second-source-votes-2026-10-28.json` next to it.

  **Arabic names are cited or absent.** 8 of the 11 carry one read from the institution's own site or from Wikidata, named per record; the 3 whose site did not answer and which have no Wikidata item ship `name_ar: null` rather than a translation.

  **Provenance per record and per source.** The metadata now declares the placement file as a source of its own, `bac-2026`, with its own retrieval date and a `snapshot` naming the PDF's URL, SHA-256 and byte count, and every record says which publication its identity came from: `bac-2026` on the 12 the file supplied, `mesrs+bac-2026` on the 2 it renamed, `mesrs` on the rest. Neither source's `retrieved` is typed into the config: the build reads each from its own committed capture, so a listing pull can never leave the published date stale. `00187`'s Arabic name drops the trailing `(الجزائر)` it carried, which is Wikidata's country disambiguator on the label and not part of the name, and reads as the wrong place for an institute at Koléa in Tipaza.

  This regeneration also reconciles the package's wilaya-centre placements to the flagship's reviewed centres, which had moved since the data was last built. Measured: **93 records move**, every one of them a `geo_method: wilaya` record borrowing its wilaya's centre. 70 move more than 500 m, 60 more than 1 km and 36 more than 3 km; 14 move 100 m or less, 3 of them under a metre; the median move is 1.4 km. The largest is **5,517 m**, shared by the 36 records placed on Algiers' centre, which left the sea east of the port for the Grande Poste (36.7325, 3.08722 to 36.776335, 3.058211). No campus-precise point and no commune-centre placement moved. One record changes its commune label, `00017` from Chetma to Biskra, without its coordinate moving.

  **Type mix.** Grande école 94 (102), université 59 (58), école normale supérieure 13 (12), centre universitaire 5. By sector: 152 public (158) and 19 licensed private, 34 of the public ones under another ministry (48). Still 51 wilayas.

  **Owner pins now ship where no open object exists (`docs/adr/0001`, "Rule 6 amended", 29 October).** By the Owner's decision, a point the Owner reads off Google Maps ships as the record's coordinate when no open object lies within 500 m of it; where one does, the open point still ships. Three records use it in this release: ESCF Constantine (`00082`), the ENS des systèmes autonomes (`00183`) and INFSPM Béjaïa (`00133`, Institut national de formation supérieure paramédicale, in Béjaïa city; OpenStreetMap's only candidate is 20.5 km away in Aokas). Each is recorded as `owner_pin` in its seed. These three points come from a proprietary map, not from an open source, and are not covered by the open licence of the rest of the data.

  **Locations the institutions publish themselves now ship (Owner decision of 25 October: an operator-published location is verified).** Twelve institutions show their own location on their website, as an embedded map or a map link, and each now ships on it with the page recorded in its seed as `operator_location`: `00067` ENSJSI (École nationale supérieure de journalisme et des sciences de l'information), `00083` ESGEN Koléa, `00088` ESSAIA (École supérieure des sciences de l'aliment et des industries agroalimentaires), `00112` ENSTTIC Oran, `00114` ENSCRBC Tipaza, `00120` ISG Dely Ibrahim, `00122` HIS Bordj El Kiffan, `00150` ISMAS, `00153` EFTG, `00160` MDI Alger, `00170` ENS Ouargla and `P73` (`00179`) ESAS Adrar. Five of them agree with an independent open map object within 500 m.

  **A single open lead now ships where nothing confirms it (Owner decision of 29 October).** 24 records with one open campus lead and a clear identity (a website or exact-name tie) move to it, the same standing as the Nominatim geocodes: 23 Overture Maps Places rows (Meta-sourced, CDLA-Permissive-2.0, attribution Overture Maps Foundation; committed as `sources/enseignement-superieur/overture-places.json` and declared as the metadata source `overture`) and one OpenStreetMap object (`00145`, INFSPM Mascara). Each is recorded as `single_open_source` in its seed, one Vote, never two. ENS Mostaganem (`00169`) stays on its wilaya: its only lead is the parent university's main campus.

  **The Owner's pin pass of 30 October: 29 more institutions get a real campus point.** The Owner read a Google Maps entry for each of the 35 records still placed on a commune or wilaya centre and pinned it; every pin was then checked against the record's own name, against the wilaya and commune the pin falls in, and against OpenStreetMap within 500 m. 29 verified. **10** of them have an open OpenStreetMap object within 500 m of the pin, so the open point ships and the pin is its second Vote under `docs/adr/0001` rule 6: `00093` (the El Oued campus the Saharan-agriculture school sits on), `00126` INFSPM Adrar, `00135` INFSPM Béchar, `00139` INFSPM Saïda, `00143` INFSPM Constantine, `00146` INFSPM Ouargla, `00147` INFSPM Oran 1, `00149` the Annaba midwife institute, `00163` ENS Béchar and `00188` ENS Saïda. Each object was re-read live from api.openstreetmap.org on 30 October for its version, timestamp and point, and the seed records the measured distance, which the build re-measures. The other **19** have no open object within 500 m, so the Owner's pin itself ships (rule 6 as amended on 29 October): `00048` Université de Tindouf, `00072` ENSSP, `00089` ENSTI Annaba, `00090` ESGEE Oran, `00117` the Ghofrane institute, `00121` the El Guerrara institute of human and applied sciences, `00123` the Ibn Rochd institute, `00124` the national higher institute of music, `00127` INFSPM Blida, `00129` INFSPM Tébessa, `00134` INFSPM Biskra, `00137` INFSPM Jijel, `00138` INFSPM Sétif, `00151` EMTO Tizi Ouzou, `00155` the Ouled Fayet optics institute, `00157` the Numidia institute of technology, `00169` ENS Mostaganem, `00180` ENSCS and `00181` ENSF Khenchela. Those 19 points come from a proprietary map, not from an open source, and are not covered by the open licence of the rest of the data; an open object that later places one of them replaces it.

  Three readings were not taken as the record's own identity although OpenStreetMap had an object within 500 m, because the object names something else: the shared Sidi Abdellah tech-pole outline for `00180`, as for `00183` before it; the Faculté de médecine d'Oran for `00090`; and, for `00151`, the "Institut International de Management" node 8 m away, which is INSIM, the group whose Tizi Ouzou campus hosts EMTO and not EMTO itself. Five records change their commune label by containment in the committed OpenStreetMap outline rather than by the nearest centre: `00072` to Hydra, `00090` to Oran, `00093` to El-Oued, `00126` to Adrar and `00169` to Mostaganem. The 6 pins the pass did not verify changed nothing: those records keep their published point.

  **Across the package after this pass:** 165 campus-precise of 171 from 136, 1 commune from 5 and 5 wilaya from 30, and 0 records outside their declared wilaya. 42 of the 165 campus points stand on two independent Votes and 22 on an Owner pin alone. The Review queue, `research/enseignement-superieur/precision-review-2026-10-28.json`, is down to the 6 records still without a point of their own.

### Patch Changes

- f1a05b8: These packages now work in a bundled app: esbuild and Vite can follow the data path.

  Before this release, `import { stations } from "@geoalgeria/ferroviaire"` (and the same for every package here) built fine and then threw `ENOENT ... /data/stations.json` on the first call. The JSON was read at run time from a path joined off `import.meta.url`; esbuild and Vite inline the module without relocating that read, so it went looking for the data next to the generated bundle. Node and Next.js with Turbopack were never affected, which is why this took until now to surface.

  Each package now reaches its data through a generated `loaders.cjs`: one `require` of a literal path per data file, inside a function. A bundler can trace a literal path, and the `require` stays lazy, so importing the package still parses nothing until you call a loader. Every call still answers with a fresh copy, as it always did, so a caller that sorts what it gets cannot reorder another caller's records.

  Nothing is different for you: same exports, same arguments, same return values, same TypeScript types, and not one record of data changed. Verified by packing each real tarball and running it three ways, under plain Node, an esbuild bundle and a Vite 8 SSR bundle (rolldown), with the three required to agree. Those are the three that are checked, and the only ones claimed.

  Turbopack is the one bundler that cannot be checked that way, because it needs a `next build`. It already served these packages before the fix, and the fix gives it a graph it has not seen before (an ESM index importing a CommonJS loader whose JSON arrives by literal `require`), so the proof for it is the geoalgeria.com preview build released in the same batch, which loads `@geoalgeria/gares-routieres` through its index on a live page.

## 2.0.6

### Patch Changes

- 91055e8: No published name uses an en dash as a separator any more.

  476 name values carried one, and each now reads with a spaced hyphen: `Université
de Blida 1 - Saad Dahlab`, `Dar El Baroud - musée de site de Ténès`, `Aéroport de
Constantine - Mohamed Boudiaf`. It is the same substitution the em dash already
  took, for the same reason: the character is a typographic habit of the page the
  name was read from, not a fact about the place, and someone keying or searching
  the name has no way to type it. Nothing else about any name changes, and no claim
  is made about a house separator.

  Where they were: 315 in `@geoalgeria/culture`, 106 in
  `@geoalgeria/enseignement-superieur`, 29 in `@geoalgeria/aviation` (14 airport
  names and 15 route endpoints, which the route GeoJSON resolves `from_name` and
  `to_name` from), 23 in `@geoalgeria/sante`, 2 in `@geoalgeria/cliniques` and 1 in
  `@geoalgeria/ferroviaire`. Ids, coordinates, codes, counts and every `name_ar`
  that did not carry one are unchanged.

  A name cannot open or close on a separator either, there being nothing on the
  other side of it: the Relizane psychiatric hospital in `@geoalgeria/sante`, whose
  upstream name ends on the dash, now ends on its own last word. A hyphen glued to
  the word beside it is part of that word and stays.

  A dash between two digits is a range rather than a separator, so it is left
  exactly as it stands: three `@geoalgeria/sports` facilities name an eponym's
  years, `Stade Mohammed Dahbi Chraa (1933 – 2020)`, and that package is not
  touched here.

  Neither dash can come back. The shared writer folds every name it emits, the
  fetchers that read raw OpenStreetMap names fold them as they clean them, and the
  gate `pnpm validate` runs over every published record now reports both
  characters, `@geoalgeria/livraison` included, which was outside it.

## 2.0.5

### Patch Changes

- 924b092: Rebuild 14 sector packages on the 189 corrected commune centres, and join the commune by containment in its OpenStreetMap outline instead of by distance: 46 coordinates moved, 8,036 commune links re-derived, 697 wilaya moves, and not one published id changed.

  `geoalgeria` corrects 189 commune centres in this same release. Every package here derives from those values, so none of it was right until it was rebuilt against them. Three separate things were wrong.

  **46 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. Moved: `@geoalgeria/sante` 19, `@geoalgeria/formation-professionnelle` 15, `@geoalgeria/industrie-pharmaceutique` 8, `@geoalgeria/enseignement-superieur` 2 and `@geoalgeria/agriculture` 2. Precision is unchanged and still honest: these are commune-level placements, and they now name the commune's current centre.

  **The join itself was wrong, not just its inputs, and it took two passes to fix.** `commune`, `commune_code` and `wilaya_code` were stamped by **unrestricted nearest commune centroid**, which makes every commune centre an attractor for everything around it, so moving 189 centres pushed 58 published records into a wilaya whose polygon does not contain them at all: mosque `31-0390`, at `[-0.414678, 35.547628]`, is inside OpenStreetMap's commune 3111 Oued Tlelat in wilaya 31 and read Zahana in wilaya 29.

  The first replacement pinned the candidate communes to the wilaya whose **shipped polygon** contains the point. That is wrong wherever a shipped polygon is, and the shipped wilaya 55 polygon was about 50 km short of the decree boundary (`yasserstudio/geoalgeria.com#171`, which rebuilds it in this same release): it moved 79 records out of El-Hadjira (5507) and El Alia (5513) into N'goussa (3003) in wilaya 30. Mosque `55-0051` at `[5.513943, 32.615544]` is inside OpenStreetMap's El-Hadjira relation 6542937 and read N'goussa, 56.1 km from the centre it was given; pharmacy `55-00012`, whose address says الحجيرة, and library `55-library-02`, whose name ends "El Alia", went the same way.

  The rule is now `scripts/lib/commune-resolver.mjs`, the commune outline decides first and globally, and the wilaya comes from the commune registry rather than from a polygon this repository already knows is wrong:

  1. a coordinate with fewer than three decimals is too coarse to re-join, so the published commune stands (`kept_low_precision`, 42 records). The patrimoine portal's whole-degree placeholders are why `19-bcp-08` at `[6, 36]` stays in wilaya 19 instead of being re-attributed to wilaya 43.
  2. a commune OpenStreetMap ships no relation for cannot be contradicted by geometry, so the published commune stands (`kept_no_outline`, 186 records): Souk Oufella (630), Bir Touta (1634), Collo (2110) and Dhayet Bendhahoua (4703), whose territory is still inside the commune they were split out of, so containment says the neighbour and containment is wrong. School `16-01308` is 1.85 km from Bir Touta's centre and 6.14 km from Douira's.
  3. any commune whose OpenStreetMap `admin_level=8` outline contains the point wins outright (`commune_outline`, 40,623 records), with an overlap resolved in favour of the commune the record already named.
  4. only where no outline holds the point does distance decide, among the communes of the wilaya whose shipped polygon does, plus any outline-less commune within 10 km (`wilaya_nearest`, 34 records).
  5. a point no wilaya polygon holds keeps its published commune (`kept_outside_wilaya_polygons`, 1 record). The national fallback that used to run there while reporting `published_wilaya_nearest` is deleted.

  A record moves commune only where containment supports the move or the point has demonstrably left its old commune's outline.

  **8,036 `commune` links moved and 697 `wilaya_code` with them**, and this time every package that relabels is named. Per package, links and wilaya moves: mosquees 4,931 and 624, ecoles 1,931 and 28, pharmacies 500 and 11, cliniques 295 and 1, ferroviaire 189 and 18, culture 123 and 10, ooredoo 51 and 3, djezzy 12 and 0, gares-routieres 4 and 0. `@geoalgeria/formation-professionnelle` relabels no commune but moves 2 wilayas, and it is the one package the rebuilt wilaya 55 and 47 polygons change: CFPA El Mansoura (`01818`, commune المنصورة) reads 47 instead of 58 and CFPA El Hadjira (`01905`, commune الحجيرة) reads 55 instead of 30. Neither carries a `commune_code`, so the clause that decides them is the wilaya-polygon fallback, which is exactly the clause #171 corrects. Across those nine packages, records inside the OpenStreetMap outline of the commune they name go from **80.2% to 99.9%** (40,654 of the 40,695 rows whose commune has an outline); per package: djezzy and gares-routieres 100%, cliniques, ecoles and mosquees 99.9%, culture, ooredoo and pharmacies 99.8%, ferroviaire 99.7%. The 41 still outside are the rows clauses 1, 2 and 5 keep plus a handful inside the reduced outline's own error at a commune seam, and each is listed in `research/_wilaya-containment/record-exceptions.json`. `test/record-in-declared-wilaya.test.mjs` now holds every published record to its commune outline first and to the wilaya polygon only where there is no outline to ask; it finds 360 violations, all 360 pre-existing and **0 created by this release**. It was 396 before #171 rebuilt the wilaya 55 and 47 polygons from their member communes: 36 rows in packages this release does not touch stop being violations, 28 of them declaring wilaya 55 and 8 declaring wilaya 47, and not one row was added. Several records agree with their own source address where the nearest centre never did: Djezzy's "Barika-centre, Barika, Batna" and SOGRAL's "Commune El Hadjeb Biskra".

  Two warning counts fall, both measured per tree rather than quoted. `scripts/validate-packages.mjs` warns when a point is outside the display-grade polygon of the wilaya it declares, which `quality/accuracy-review` counts as `outside_declared_wilaya`: **1,159 on `main`, 572 before #171, 447 here**. Its neighbour `inside_adjacent_wilaya` reads **960, 373, 248**. 127 of the 572 were wilaya 55 and 47 rows this repository drew in the wrong wilaya, and #171 ends every one of them without creating a new warning. Of the 447 left, 118 are inside the OpenStreetMap outline of the commune they name, so it is the shipped polygon that is wrong about them and not the record, and every one of those is a display-grade seam on a border #171 does not redraw.

  **No published id was retired, renumbered or minted.** Ids are public join keys, so a coordinate correction is not the release that churns them, and it was verified per package before and after with a fresh recomputed diff: 196, 1,913, 1,083, 128, 11,858, 177, 692, 1,932, 74, 171, 20,759, 572, 3,807 and 695, each the same set in the same order. Three packages would have churned and did not. `@geoalgeria/sante` replays, but its MSP capture re-pairs FR/AR posts once corrected commune names land and retires published ids, so its coordinates moved through `scripts/sync-commune-centroid-dependents.mjs` instead, as in the previous batch. `@geoalgeria/ooredoo` and `@geoalgeria/ferroviaire` had no carry-over at all: their ids are `{wilaya}-{seq}` assigned from the commune join, so the stores and stations that changed wilaya re-sequenced 43 and 18 published ids and retired `20-004`, `31-034` and eighteen station ids on the first replay. Both generators now pin each record back to the id it shipped under, keyed on the operator's own store id and on the station's Wikidata or OSM id; it is the pattern nine other packages here already used. A record that re-joins therefore keeps its id, which is why a mosque id can read `26-0114` while its `wilaya_code` reads `10`.

  **Record counts, names, types, contacts and hours are untouched in every package**, checked field by field against `main`: only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them. Ten of the fourteen were rebuilt by re-running their own generator against its committed capture, offline (`sante` before `cliniques`, which reads sante's data to exclude the hospital tier); the four that cannot replay offline were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

  `@geoalgeria/protection-civile` and `@geoalgeria/buses` are not in this release: neither has a stale borrowed centre and neither moved a commune link.

  This release depends on the wilaya-membership correction in the same batch (`yasserstudio/geoalgeria.com#171`), which rebuilds the wilaya 30/55 and 47/58 polygons from their own member communes. Every generator here was replayed on top of it, so the fallback clause that reads those polygons answers from the corrected geometry.

  Refs yasserstudio/geoalgeria.com#170.

## 2.0.4

### Patch Changes

- 0df7cb4: Rebuild 13 sector packages on the corrected commune centres: 45 coordinates moved, 1,178 commune links re-derived.

  `geoalgeria` corrects 56 commune centres in this same release, by 0.75 km to 217 km. Every package here derives from those values, so none of it was right until they were rebuilt against them. Two separate things were stale.

  **45 coordinates were a repudiated commune centre.** These records have no point of their own: they borrow their commune's centre and say so in `geo_method`. The copy does not follow the original. `@geoalgeria/sante`'s _EPH El Harrach (Hassan Badi)_ shipped at the old El Harrach value, 51.5 km from the hospital and inside wilaya 35; the 23 Algiers institutions of `@geoalgeria/agriculture` sat on the Alger Centre point that was in the sea. Moved: sante 7, agriculture 23, formation-professionnelle 10 (including the CFPAs of Melbou, Mazagran, Marsa Ben M'Hidi and Chelghoum Laid), enseignement-superieur 3 (ENP, ENSA and EPAU, all at El Harrach) and industrie-pharmaceutique 2 (SAIDAL El Harrach, BIO OSTEO). Precision is unchanged and still honest: these are commune-level placements, they now name the commune's current centre.

  **1,178 `commune_code` links moved, and 270 `wilaya_code` with them.** `commune` and `commune_code` are stamped by nearest commune centroid, so a centre that moves 25 km stops being the nearest for everything around where it was and starts being it around where it is. Re-derived: mosquees 720, ecoles 266, pharmacies 105, cliniques 39, culture 29, ooredoo 13, djezzy 3 and protection-civile 3. Wilaya moved for 254 mosques, 10 cultural places and 6 pharmacies.

  **Record counts, names, types, contacts and ids are untouched in every package.** Only `lat`/`lng`, `commune`, `commune_code` and `wilaya_code` changed, plus the `metadata.json` fields derived from them (sante's bbox reaches 37.065 now that Chetaibi is on the coast). Ten of the thirteen were rebuilt by re-running their own generator against its committed capture, offline; the other three cannot replay offline and were patched by `scripts/sync-commune-centroid-dependents.mjs`, which reproduces the same reads of the flagship and nothing else.

  **This release is also the first rebuild since the JORA name corrections of 2.1.0**, which no dependent had picked up either. That accounts for a further 3,031 `commune` labels now matching the flagship spelling (`Ain Madhi` to `Aïn Madhi`, `Hassi R'mel` to `Hassi R'Mel`), 258 `commune_code` and 47 `wilaya_code` from the same earlier pass, and one vocational centre in Ouamri that is placed for the first time because its commune name now resolves.

  **A guard keeps the class out.** `pnpm validate` now checks every record that declares a commune-level placement against the flagship: 1,151 of them, and a coordinate that is not the current centre of the commune it names fails the build. It is a table of the bound `geo_method` values, not a guess, because three commune-flavoured methods in this repository are deliberately not a flagship centre (the Ooredoo 5G per-commune points, and the wilaya-mean placements of industrie-pharmaceutique and enseignement-superieur).

  Closes yasserstudio/geoalgeria.com#169.

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

## 2.0.3

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.0.2

### Patch Changes

- 4f1ed49: ESI's commune corrected to Oued Smar (user report): the campus point was right, the label was not. The nearest-centroid join had labelled the École nationale supérieure d'informatique with neighbouring Bab Ezzouar, whose commune centre is closer than Oued Smar's own; the school's published address is BP 68M, 16270 Oued Smar. A new curated seed (scripts/seeds/commune-labels.json) re-labels campus-precise records without moving the point, never across a wilaya boundary. Also fixes the build dates on --cache replays: a replay now reproduces the committed updated/retrieved dates instead of claiming a fresh retrieval that never happened.

## 2.0.1

### Patch Changes

- 4b678f5: August 2026 re-verification against the MESRS listings (unchanged upstream since
  June) and a campus-precision pass: 6 institutions move from centroid to exact
  campus coordinates (Oran 1, Naama, Constantine 3, Skikda 20 Août 1955, ESSA
  Tlemcen, ENSSEA Koléa) via Nominatim retries plus a new conservative OSM
  campus matcher (`scripts/geocode-osm.mjs`, exact-name matches only). Campus
  precision: 61 -> 67 of 177. Raw listings and the OSM campus pull are now
  committed captures under `sources/enseignement-superieur/`, and every build
  script replays offline with `--cache`. New reconciliation dossier
  (`research/enseignement-superieur/SOURCE.md`) documents what the 177 records
  are versus the ministry's "117 etablissements" aggregate.

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 1.1.0

Algeria's higher-education network — 177 from the MESRS, now with private & other-ministry institutions.

### Added

- 19 licensed private institutions and 48 establishments under other ministries
  (Santé 25, Défense 16, Culture 4, Poste 2, Travail 1) that MESRS supervises
  pedagogically — sourced from the ministry's Arabic listing, which the English
  page omits (110 → 177 institutions)
- New fields: `name_ar` (Arabic name; also backfilled for the public network via
  website join — 164/177 records), `sector` (`public` / `private`), and
  `supervisory_ministry`
- New helper `institutionsBySector("public" | "private")`

### Improved

- `name` is now nullable, so the Arabic-only private/other-ministry institutions
  ship with `name_ar` (use `name ?? name_ar` for a display label)

## 1.0.0

### Added

- Algeria's higher-education network — 110 institutions from the Ministry of Higher Education (MESRS), with official websites, type, wilaya/commune
  linkage and coordinates
- Four institution types: 58 universities, 35 grandes écoles, 12 écoles normales
  supérieures, and 5 centres universitaires, across 51 wilayas
- Every institution carries its official `.dz` website, as listed by the ministry
- Wilaya and commune reconciled to the geoalgeria flagship (69-wilaya scheme);
  coordinates are OpenStreetMap-derived and labelled per record with
  `geo_precision` (`campus` / `commune` / `wilaya`)
- Export formats: JSON, CSV, GeoJSON
- npm package with typed helper accessors (`institutions()`, `institutionById()`,
  `institutionsByWilaya()`, `institutionsByType()`, `metadata()`)
