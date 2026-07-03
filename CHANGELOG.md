# GeoAlgeria — project changelog

Project-level (umbrella) versions for GeoAlgeria as a whole. Each entry is the
state of the datasets at that tag (`vX.Y.Z`). Individual npm packages keep their
own SemVer in `packages/<pkg>/CHANGELOG.md`; this file tracks the project.

Bumps: **major** = breaking change to the project's shape (a package removed/renamed,
schema break) · **minor** = a new dataset/package or a substantial data expansion ·
**patch** = corrections and small refreshes.

## 1.8.0 — 2026-07-03

Added a new dataset: Algeria's schools, the largest openly-geocoded school layer for the country.

- **Schools** (`@geoalgeria/ecoles`, new): 11,830 schools and kindergartens across all 69 wilayas, extracted from OpenStreetMap (ODbL) — classified by cycle (4,032 primaire, 2,377 moyen/CEM, 1,574 secondaire/lycée, 268 préscolaire; the rest `autre`), with bilingual French/Arabic names (8,640 named), a `sector` flag where the map signals it (313 public, 48 private), and commune/wilaya linkage by nearest-centroid join. Cycle is inferred from `isced:level` and the FR/AR name — a CEM names itself متوسطة/collège, a lycée ثانوية/lycée — with a bare "école"/"مدرسة" classified `primaire` by Algerian convention; 93% of named schools resolve to a specific cycle. Framed honestly as a partial OSM extract (~11.8k mapped against the ~28,000 of the national network), not an official registry.

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/sports`, `/enseignement-superieur`, `/tourisme`, `/formation-professionnelle`, `/djezzy`, `/mosquees`, `/sante`, `/culture`, `/agriculture`, `/ecoles`, `/gares-routieres`, `/ferroviaire`, `/buses`, `/transport`.

## 1.7.0 — 2026-07-01

Added a new **Transport** sector — four packages — plus `@geoalgeria/agriculture` (shipped since 1.6.0).

- **Intercity bus stations** (`@geoalgeria/gares-routieres`, new): 74 SOGRAL gares routières across 51 wilayas — official names, addresses, surface areas and coordinates (74/74 geocoded; Touggourt and Djanet fixed via OpenStreetMap, Guelma via its commune centroid), with wilaya/commune linkage that reconciles SOGRAL's legacy 48-wilaya codes to the current 69-wilaya scheme (Law 26-06). Source: SOGRAL (`live.sogral.com`).
- **Rail & urban transit** (`@geoalgeria/ferroviaire`, new): 692 nodes across 50 wilayas — 427 rail + 190 tram + 41 metro + 24 aerial-tramway + 10 gondola. A Wikidata (CC0) + OpenStreetMap (ODbL) composite with operators SNTF/SETRAM/SEMA, `line` membership, bilingual French/Arabic names and commune/wilaya linkage.
- **Urban bus networks** (`@geoalgeria/buses`, new): 50 ETUSA (Alger) bus lines — termini, stop counts, and the communes and transit stations each line serves (line-level v1; from fr.wikipedia, CC BY-SA). Multi-operator design, ready to add more cities.
- **Transport umbrella** (`@geoalgeria/transport`, new): one install that re-exports `aviation` + `ferroviaire` + `gares-routieres` + `buses`.
- **Agriculture institutions** (`@geoalgeria/agriculture`, new since 1.6.0): 196 institutions across 58 wilayas from the Ministry of Agriculture (MADR) — services directorates (DSA), forest conservations, research/training institutes, chambers of agriculture, public offices and groups; bilingual, geocoded to commune/wilaya centroid.

Transport packages are domain-named — the operator is the *source* (in `keywords`/`metadata`), not the package name (ANAC's airports ship as `aviation`, not `anac`).

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/sports`, `/enseignement-superieur`, `/tourisme`, `/formation-professionnelle`, `/djezzy`, `/mosquees`, `/sante`, `/culture`, `/agriculture`, `/gares-routieres`, `/ferroviaire`, `/buses`, `/transport`.

## 1.6.0 — 2026-06-29

Added a new dataset: Algeria's cultural atlas from the Ministry of Culture.

- **Cultural places** (`@geoalgeria/culture`, new): 1,083 cultural places across 66 of Algeria's 69 wilayas — protected cultural property (580), libraries (257), museums (48), theatres (45) and museums of the Moudjahid (13), plus cultural establishments: maisons de culture (51), culture directorates (33), cinemas (20), cultural centres (15), arts schools (15) and palais de culture (6). From the Ministry of Culture's *Cartes du Patrimoine Culturel Algérien* portal, 100% bilingual French/Arabic, every place geocoded (`geo_precision: source_point`), with a `has_virtual_tour` flag (22 places) and commune/wilaya linkage. Places the portal still files under pre-2019 wilaya codes are rescoped to the current 69-wilaya scheme (Law 26-06) by nearest-commune geography.

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/sports`, `/enseignement-superieur`, `/tourisme`, `/formation-professionnelle`, `/djezzy`, `/mosquees`, `/sante`, `/culture`.

## 1.5.0 — 2026-06-27

Added a new dataset: Algeria's public health establishments from the Ministry of Health.

- **Health establishments** (`@geoalgeria/sante`, new): 695 public health establishments across the 58 wilayas with health directorates — 270 EPH (public hospitals), 292 EPSP (proximity-health), 108 EHS (specialized hospitals), 20 CHU (university hospitals) and 5 other public hospitals, from the Ministry of Health registry (sante.gov.dz). Bilingual French/Arabic (563 with both names), official `type` and `sector`, with commune/wilaya linkage. 600 geocoded via OpenStreetMap (121) and Wikidata (3), the rest to commune centroid; every record labelled with `source` and `geo_precision`. Names + type + wilaya are official; coordinates are best-effort.

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/sports`, `/enseignement-superieur`, `/tourisme`, `/formation-professionnelle`, `/djezzy`, `/mosquees`, `/sante`.

## 1.4.0 — 2026-06-25

Added two new datasets: Algeria's mosques (a Wikidata + OpenStreetMap composite) and the Djezzy boutique network.

- **Mosques** (`@geoalgeria/mosquees`, new): 20,759 mosques across all 69 wilayas — a Wikidata (CC0) + OpenStreetMap (ODbL) composite giving near-complete national coverage against the ~18,449 counted by the Ministry of Religious Affairs. Per-record provenance (`source`, `wikidata` QID, `osm_id`): 13,200 Wikidata-only, 5,897 matched in both, 1,662 OpenStreetMap-only; 15,138 Arabic and 7,874 French names, denomination where known, and commune/wilaya linkage.
- **Djezzy boutiques** (`@geoalgeria/djezzy`, new): 128 Djezzy (Optimum Telecom Algérie) boutiques across 63 wilayas from the Djezzy store locator — each geocoded, with store code, category, address, opening hours, opening code and commune/wilaya linkage.

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/sports`, `/enseignement-superieur`, `/tourisme`, `/formation-professionnelle`, `/djezzy`, `/mosquees`.

## 1.3.0 — 2026-06-23

Added a new sports dataset and substantially expanded two existing ones, all from official ministries.

- **Sports facilities** (`@geoalgeria/sports`, new): 5,141 facilities across 58 wilayas — stadiums, pools, proximity fields, athletics tracks, courts and more (27 types) from the Ministry of Youth and Sports GIS, each with capacity, PMR accessibility, operational status, built/land area and coordinates.
- **Youth establishments** (`@geoalgeria/jeunesse` 2.0.0): rebuilt from that same official GIS — 2,334 establishments (was 2,076) across 58 wilayas, now with French and Arabic names plus capacity, address, surfaces, year and operational status. Breaking: names are now French (read `name_ar` for the Arabic name).
- **Higher education** (`@geoalgeria/enseignement-superieur` 1.1.0): 110 → 177 institutions — added the 19 licensed private and 48 other-ministry establishments MESRS supervises pedagogically (from the ministry's Arabic listing), with new `name_ar`, `sector` and `supervisory_ministry` fields.

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/sports`, `/enseignement-superieur`, `/tourisme`, `/formation-professionnelle`.

## 1.2.0 — 2026-06-20

Added two new datasets/packages since 1.1.0.

- **Youth & sports institutions** (`@geoalgeria/jeunesse`): 2,076 institutions across 50 wilayas — maisons de jeunes, complexes sportifs, salles polyvalentes, auberges de jeunes, cultural centers and more (Ministry of Youth and Sports), each with its Arabic name, type, commune/daïra/wilaya and coordinates.
- **Higher education** (`@geoalgeria/enseignement-superieur`): 110 institutions across 51 wilayas — 58 universities, 35 grandes écoles, 12 écoles normales supérieures and 5 centres universitaires (MESRS), each with its official website, type, and wilaya/commune linkage. Coordinates are OpenStreetMap-derived (ODbL) and labelled per record (`geo_precision`).

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`, `/jeunesse`, `/enseignement-superieur`.

## 1.1.0 — 2026-06-18

Added a new dataset/package since 1.0.0.

- **Delivery carriers** (`@geoalgeria/livraison`): a 16-carrier registry, 411 geocoded stop-desks across 61 wilayas, and per-carrier coverage. Stop-desks come from the carriers that publish open agency data — the Yalidine + Guepex relay plus the Anderson, Noest and Maystro networks (each geocoded from its agency cards' Google Maps links).

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`, `/livraison`.

## 1.0.0 — 2026-06-16

First tagged release of the project as a whole — the state of every dataset today.

- Administrative divisions: 69 wilayas, 564 dairas, 1,541 communes (bilingual FR/AR, postal codes, coordinates), current to Law 26-06 (JO n° 25, 5 April 2026) and the 2019 reform (Law 19-12).
- Algérie Poste: 3,908 post offices, 2,026 ATMs.
- Employment (ANEM): 331 agencies (58 AWEM + 273 ALEM).
- Mobilis network: 165 agencies + 12,180 points of sale.
- Telecom 5G: 1,681 sites (Djezzy, Mobilis, Ooredoo).
- Civil airports: 33 (ANAC).
- Banks: 21 licensed banks + 8 financial institutions + 1,704 branches across 67/69 wilayas.

Packages: `geoalgeria`, `@geoalgeria/poste`, `/emploi`, `/mobilis`, `/telecom`, `/aviation`, `/banques`.
