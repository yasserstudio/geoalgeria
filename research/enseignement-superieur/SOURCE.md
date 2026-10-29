# @geoalgeria/enseignement-superieur: sources & reconciliation

> **Canonical package:** `@geoalgeria/enseignement-superieur`.
> **Sources:** two MESRS publications, both captured to
> `sources/enseignement-superieur/` (committed; `--cache` replays offline): the
> ministry's university-network listings (EN + AR), and its BAC 2026 placement
> file. Coordinates are an OSM/Nominatim enrichment, seeded in
> `scripts/seeds/coordinates.json` (network) and in `scripts/seeds/bac-2026.json`
> (the institutions the placement file supplied), cross-checked against the
> flagship wilaya (see `scripts/fetch.mjs` header).

## Sources

| Capture | URL | What it provides |
| --- | --- | --- |
| `mesrs-en` | mesrs.dz/en/university-network/ | the public MESRS network: official FR name + own website per institution (110 anchors as of 2026-08-03) |
| `mesrs-ar` | mesrs.dz/reseau-universitaire-ar/ | Arabic names for the network, plus the institutions the EN page omits: licensed **private** institutions and higher-education establishments under **other ministries** (Défense, Santé, Culture, Poste/Télécoms, Travail, Jeunesse) that MESRS supervises pedagogically |
| `bac-2026` | esi.dz/…/BAC-2026-Fichier-des-moyennes-minimales-apres-phase-1.pdf | *Moyennes minimales BAC 2026 (suite à la première phase)*, the ministry's placement file: every establishment it places new bacheliers into, by the ministry's own establishment code. 248 institution rows projected, retrieved 2026-10-28 |

Both listings are plain WordPress HTML, no WAF. Fetched 2026-08-03: they were
**unchanged since the 2026-06-23 collection** (the regenerated dataset was
byte-identical apart from the retrieved stamp). **www.mesrs.dz did not answer**
from the build machine on 2026-10-27/28, so the listing captures still carry
2026-08-03 and the package is rebuilt from them with `--cache`.
`refresh-schedule.json` holds the row that says so, and `last_retrieved` stays
the older of the two source dates, 2026-08-03, because a package is only as
fresh as its stalest source.

The placement file is a 350-page PDF. It is **not committed** (rights): what is
committed is a projection of its institution rows, `code` and official French
name only, never the per-filière minimum averages. The PDF's own URL, SHA-256
(`ca4b24e6…`), byte count (2,382,999) and page count are in the capture manifest
and in `metadata.sources["bac-2026"].snapshot`, so the evidence stays auditable
without redistributing the document. The projection is the **authority** for the
names it supplies: `scripts/bac-2026.mjs` refuses any name in
`scripts/seeds/bac-2026.json` that does not fold to the ministry's own row for
that code.

## Reconciling the BAC 2026 file against the package (2026-10-28)

The placement file states the network **as it stands today**, which the
2026-08-03 listing does not, so it is the file that finds what the listing has
gone stale on. This is how its 248 projected rows were triaged, in the order a
replay should redo it.

**First, what the projection already drops.** The PDF's offer rows carry kinds of
code the projection does not keep: the paramedical `R` codes (INFSPM/INFSSF,
which are not higher-education establishments) and the `F` pseudo-codes (a twin
offer of an establishment already coded elsewhere), alongside the per-filière
average columns. 248 institution rows remain.

**Then, by the ministry's own code letter:**

| Codes | Rows | What they are | Records |
| --- | --- | --- | --- |
| `B` | 54 | **ENS annexes.** Every one is named `ANNEXE <place> (ECOLE NORMALE SUPERIEURE DE <x>)` or `<university> (ECOLE NORMALE SUPERIEURE DE <x>)`: an ENS offer hosted on another establishment's site, not an establishment | none of their own; the hosting establishment and the ENS are both already records |
| `Z` | 54 | **UFC centres**, all named `CENTRE DE FORMATION CONTINUE <wilaya>`: the regional centres of the single Université de la Formation Continue | none of their own; the UFC is `00031` |
| `C` `D` `E` `H` `P` `U` `W` | 140 | **establishments** | see below |

**The 140 establishment rows**, each checked against the package by name:

- **11 name an institution the listing omits entirely** → added as `00178` to
  `00188`, one seed entry each in `scripts/seeds/bac-2026.json` under
  `additions`, with its Arabic name cited or left null and its placement decided
  under `docs/adr/0001`.
- **2 name an institution the listing carries under an older name** → renamed in
  place, keeping their ids and their websites (`00089` from `P12`, `00093` from
  `P74`), under `renames`. Each rule asserts the old name too, so it fails loudly
  if the ministry updates its own listing.
- **1 is not an establishment at all**: `C99 RECRUTEMENT NATIONAL`, an
  administrative row for nationally-recruited places. Deliberately no record.
- **1 is a succession the listing has not caught up with**:
  `P05 ECOLE NATIONALE SUPERIEURE DES TECHNOLOGIES AVANCEES ALGER`. ENSTA was
  created by décret exécutif 22-314 (12 September 2022) and décret exécutif
  22-398 (21 November 2022) dissolved both ENST and ESSA Alger into it,
  transferring their property, rights, obligations, personnel and resources. The
  placement file lists only `P05`, so the two listed records were this one
  establishment's predecessors rather than its peers: they leave, ENSTA is added
  as `00189`, and `00069` and `00085` are retired and forwarded to it in
  `packages/enseignement-superieur/data/retired-ids.json`. The rule is the
  `successions` block in `scripts/seeds/bac-2026.json`, and it asserts both old
  names, so a listing that has caught up fails the build rather than silently
  dropping records it still publishes.
- **the other 125 resolve to a record the package already ships.** More than one
  row per establishment is normal, because the ministry splits an establishment's
  offers: the veterinary institutes inside Batna 1 (`E39`), Constantine 1
  (`E47`) and Tiaret (`U41`), the university annexes written `+A. <place>`
  (`U14`, `U32`, `U46`), and single faculties written in parentheses (`E52`,
  `E53`). Several rows are acronyms or abbreviations no name fold can match
  mechanically and were read by hand: `C01 USTHB` → `00053`,
  `W90 USTO ORAN I.S.T.A` → `00057`, `C31 UNIV. TAMANGHASSET` → `00045`,
  `E14 UNIV. MSILA` → `00033`, `E18 UNIV. SCI ISLAMIQUES EMIR (E.A.K)` →
  `00054`. The four Culture establishments and the two Poste/Télécoms ones
  (`D02` `D03` `D04` `D05` `D06` `D07`) match Arabic-only records (`00113`,
  `00112`, `00114`, `00150`, `00124`, `00108`), which no French-name fold can
  reach.

**What the file is not used for.** It carries no address, no coordinate and no
Arabic name, so it never places a record and never supplies one's Arabic name.
It also does not override the listing wholesale: a row whose establishment the
package already ships is left alone unless a seed rule names it, because the
listing is the enumerable source for websites and the placement file publishes
none.

## What the 187 is (vs the ministry's "117 établissements")

mesrs.dz/fr/agregats-2/ (2024-2025 figures) says **117 établissements**:
55 universités + 13 centres universitaires + 40 ENS + 9 écoles nationales
supérieures. Our package ships **187**. The two numbers count different things:

| Slice of the package | Count | In the ministry's 117? |
| --- | --- | --- |
| Public MESRS network (EN listing, less the 2 records ENSTA succeeded) | 108 | yes, this is its universe |
| Institutions the BAC 2026 placement file supplied | 12 | partly: MESRS network establishments the listing omits, plus 2 under other ministries. One of the 12 is ENSTA, which succeeded 2 of the listed records above |
| Private licensed institutions (AR listing) | 19 | no |
| Other-ministry establishments (AR listing + BAC 2026): Santé 25, Défense 16, Culture 5, Poste/Télécoms 2, Travail 1, Jeunesse 1 | 50 | no |

Within the public network vs their 117 the residual gap is **category
accounting, not missing records**: the agregats page's 40 "ENS" bucket folds in
the écoles normales that the network listing presents inside regional groupings
we classify by name (our split: 59 universités, 110 grandes écoles, 13 ENS, 5
centres universitaires). The ministry's own aggregates are not internally
consistent either (an older cut says 106), so the **enumerable listings we ship
are the source of truth**, and the aggregate is used only as an
order-of-magnitude cross-check.

## Coordinate precision pass (2026-10-28)

The rule is `docs/adr/0001`: a record moves to `exact` only where two
independent open sources agree within 2 km and are not a Copied claim within
50 m of each other. Nominatim, api.openstreetmap.org and Overpass all read the
same OpenStreetMap database, so they are one source between them; the second
has to be a Wikidata `P625` or the institution's own site.

**Two passes, the same day.** The first could reach none of OpenStreetMap,
Nominatim, Overpass, Wikidata or the institutions' sites, so it matched every
approximate record against the committed Overpass capture
`sources/enseignement-superieur/osm-campuses.json` (1,265
`amenity=university|college` elements, retrieved 2026-08-03): one source, so
every match became a single-source Claim in the Review queue. Once the network
was opened, the second pass (`second-source-votes.mjs`, from the captures
`fetch-second-sources.mjs` wrote) re-read each candidate's OSM object live from
api.openstreetmap.org and looked for the institution's own Wikidata item (tied
by its `P856` website host, the OSM `wikidata` tag, or a strict name match)
and its `P625`. Overpass and the institutions' `.dz` sites still did not
answer.

**Second-source pass: 38 records** (the queue as it then stood, 34, plus the 4
BAC 2026 additions still `exact` on one OSM object), from the committed
captures `sources/enseignement-superieur/osm-campus-objects.json` and
`wikidata-campuses.json`, decided offline and byte for byte into
`research/enseignement-superieur/second-source-votes-2026-10-28.json`:

| Verdict | Records |
| --- | --- |
| Promoted: OSM and Wikidata agree within 2 km, outside 50 m | 9 |
| Copied claim: Wikidata within 50 m of the OSM point | 7 |
| Disagree: Wikidata over 2 km from every OSM Claim (`00057` USTO, 3,942 m) | 1 |
| No second source (7 have a Wikidata item with no `P625`; `00042`'s only `P625` is stated in Google Maps) | 21, the 4 BAC additions among them |

The 9 promoted, each now in `scripts/seeds/second-source.json` on the live OSM
point with its `wikidata_confirmation`, which the build re-measures:

| id | Institution | Ships | Wikidata (tie) | Apart | Commune (by outline) |
| --- | --- | --- | --- | --- | --- |
| `00031` | Université de la Formation Continue | OSM `node/5658830621` v1 | Q135914996 (website) | 55 m | Dely Ibrahim |
| `00054` | Université des sciences islamiques Emir Abdelkader de Constantine | OSM `node/8539621407` v2 | Q5372520 (website) | 344 m | Constantine |
| `00063` | Ecole nationale supérieure agronomique- Khalef Abdellah alias Kasdi Merbah | OSM `way/97658307` v19 | Q21512516 (website) | 98 m | Oued Smar |
| `00064` | Ecole nationale supérieure d’hydraulique - Arbaoui Abdellah | OSM `way/191229595` v14 | Q30261759 (website) | 67 m | Guerrouaou |
| `00068` | Ecole nationale supérieure de management | OSM `way/390654568` v3 | Q104713296 (name) | 57 m | Kolea |
| `00081` | Ecole Supérieure de Commerce-Mouloud Kacem Naït Belkacem | OSM `way/390654567` v3 | Q16507829 (website) | 58 m | Kolea |
| `00095` | المدرسة العسكرية المتعددة التقينات (برج البحري، ولاية الجزائر) | OSM `way/96606361` v11 | Q3578051 (osm_wikidata_tag) | 512 m | Bordj El Bahri |
| `00103` | المدرسة العليا للضمان الاجتماعي (بن عكنون، ولاية الجزائر). | OSM `way/561830853` v6 | Q135975682 (name) | 86 m | Ben Aknoun |
| `00111` | المدرسة الوطنية التحضيرية لدراسة مهندس (الرويبة، ولاية الجزائر) | OSM `way/96600252` v7 | Q3578165 (osm_wikidata_tag) | 272 m | Rouiba |

**References are read, not assumed.** The Wikidata capture holds each `P625`
statement's references (`P143` imported from, `P248` stated in, `P854`,
`P4656`). A statement referenced to OpenStreetMap is a Copied claim whatever the
distance; one referenced to a proprietary map is not captured at all, only the
fact that it exists, because Google content never enters this repository
(`docs/adr/0001`). Five such Google Maps statements were found, Sétif 1's
(`00042`) among them: it had been counted as a Vote in the first decision of
the day, was caught by the independent review, and `00042` is back on its
wilaya centre, queued with its three OSM campuses. Of the 9 Votes that stand,
four cite English or French Wikipedia (`P143`), one the 2017 GRID research-
organisation release (`P248` Q30141628, CC0), and four carry no reference.
`test/enseignement-superieur-second-source.test.mjs` ties every seeded
confirmation to this decision and the decision to the captures. Each shipped
point lies at least 131 m inside its commune outline.
Two communes change with the move: `00063` to Oued Smar (from El Harrach, whose
centre is nearer; the campus is inside Oued Smar's outline, 163 m from the
border) and `00064` to Guerrouaou (from Soumaa). Identity rests on a name match, not a website, for `00068`
(Wikidata's `P856` is `ensmanagement.dz`, the record's `ensm.dz`) and `00103`
(the record's own website is a page on ASAL's site), and on the OSM `wikidata`
tag for `00095` and `00111`, whose Wikidata website is the defence ministry's.

**The queue** is `research/enseignement-superieur/precision-review-2026-10-28.json`,
written offline and byte for byte by `precision-review.mjs` next to it. All 98
approximate records (87 `wilaya`, 11 `commune`) are in it exactly once:

| Outcome | Records |
| --- | --- |
| Queued, one candidate for the campus (single source) | 16 |
| Queued, several candidates for the campus (ambiguous) | 0 |
| No open candidate in the capture | 82 |

Each queued entry carries the OSM element, the tags that make the tie (the
element's own website host where it has one, else a strict name match), the
commune whose OSM outline contains it, its distance to the published point, and
what second source would settle it; its second-source verdict is in the votes
file. Hand decisions (ties rejected because the element's name contradicts its
website, a parent university's host, a former name, another record's campus)
sit in tables in the script, each with its reason.

**Owner confirmations (`docs/adr/0001` rule 6 and "Rule 6 in detail").** The
Owner read eleven campus points off Google Maps on 2026-10-28, and seven more on
2026-10-29. A reading off a
proprietary map is a Claim that may only confirm an open Candidate within
500 m, and the open coordinate is the one that ships; an Owner reading is never
a Copied claim, so the 50 m copy radius does not apply to it (decided the same
day, when ENS Bouzaréah's 46 m agreement would otherwise have counted for
nothing). Each is recorded with the record as `owner_confirmation` (point,
distance, date, reader, source): in its `place` in `scripts/seeds/bac-2026.json`
for a BAC 2026 record, in `scripts/seeds/second-source.json` for any other.
`scripts/fetch.mjs` refuses one past the ceiling or whose stated distance is not
the measured one.

| id | Institution | Open Candidate | Owner reading | Outcome |
| --- | --- | --- | --- | --- |
| `00189` | ENSTA | OSM `way/245174987`, the Dergana seat | 60 m | `exact`, the OSM point ships |
| `00178` | Université des sciences médicales d'Alger | OSM `way/29190325`, the Ziania campus | 96 m | stays `exact`, now on two Votes |
| `00165` | ENS de Bouzaréah | OSM `way/249379127` (`website=ensb.dz`), read live: v6, 2023-10-24 | 46 m | `exact` from `commune`, the OSM point ships |
| `00184` | ENS en mathématiques (`P08`, Sidi Abdellah) | OSM `way/1318064031` | 28 m (over 100 m from the pole's other buildings) | stays `exact`, now on two Votes |
| `00185` | ES des sciences de gestion de Annaba (`P23`) | OSM `node/7866678785` | 29 m | stays `exact`, now on two Votes |
| `00182` | ENS des nanosciences et nanotechnologies (`P10`, Sidi Abdellah) | OSM `way/1318066776`, by the Owner's verdict (OSM names it for `P09`) | 40 m | stays `exact`, moved 40 m to that building, on two Votes |
| `00073` | ENSTP, Ecole nationale supérieure des travaux publics (Kouba) | OSM `way/43331770` (not the Zeralda object, 19.6 km away) | 107 m | `exact` from `commune`, the OSM point ships |
| `00166` | ENS de Constantine (Assia Djebar) | OSM `node/5322170362` (`website` tie; the other object is 11 km away) | 95 m | `exact` from `wilaya`, commune El Khroub by outline |
| `00057` | USTO, Université des sciences et de la technologie d'Oran | OSM `way/71138773` | 23 m | `exact` from `commune`; Wikidata's town-level point 3.9 km away votes for no candidate |
| `00183` | ENS des systèmes autonomes (`P09`, Sidi Abdellah) | none: no OSM object at the reading (the pole outline is 169 m away) | (no object) | **demoted** to the Maalma centre |
| `00004` | Université d'Alger 1 (Benyoucef Benkhedda) | OSM `way/29082561`, the Faculté centrale (`website` tie) | 19 m | `exact` from `wilaya`, the OSM point ships |
| `00060` | ENP, École nationale polytechnique (El Harrach) | OSM `way/97658302` | 64 m | `exact` from `commune`, the OSM point ships |
| `00062` | ENP Constantine (Malek Bennabi) | OSM `node/5440413392` | 20 m | `exact` from `wilaya`, commune El Khroub by outline |
| `00077` | EPAU, École polytechnique d'architecture et d'urbanisme | OSM `way/426908488` | 50 m | `exact` from `commune`, commune Oued Smar by outline (was El Harrach) |
| `00108` | ESBA, École supérieure des beaux-arts (Alger) | OSM `way/475383562` (`website` tie) | 89 m | `exact` from `wilaya`, the OSM point ships |
| `00082` | ESCF Constantine, École supérieure de comptabilité et de finance | OSM `way/1145579833`, El Khroub | 10.1 km (the reading is in Constantine city) | stays queued: the reading supports no open object |
| `00042` | Université Sétif 1 (Ferhat Abbas) | OSM `way/1263457366` "Rectorat" at El Bez, by the Owner's decision that it is Sétif 1's rectorate (an earlier reading was 584 m from the El Bez campus object `way/185615558`, over the ceiling) | 10 m | `exact` from `wilaya`, commune Setif by outline |

For `P09` and `P10` the two maps first disagreed on which Sidi Abdellah
building is which: the nanosciences reading landed 40 m from the building OSM
names, in English, Arabic and by its website, for the autonomous-systems school,
and the autonomous-systems reading where OSM maps no building at all. A reading
nearer another school's object than its own singles none out (rule 4), so both
were first demoted. The Owner then decided, the same day, that the readings are
right and the OSM name tags are wrong: `P10` ships on `way/1318066776` (the OSM
point, its stale names an edit owed upstream), and `P09`, with no open object at
its reading, stays on the Maalma centre this release, as `P11` at the same pole
does. Both readings are kept in `scripts/seeds/bac-2026.json`. Since this pass
`scripts/fetch.mjs` refuses a BAC 2026 campus point that carries no second
Vote.

**ENSTA (`00189`)**'s commune was decided by containment, not by the nearest
centre: its point lies inside Bordj El Kiffan's committed OSM outline, 194 m from
the Bordj El Bahri border (about four times the outline's ~50 m simplification
tolerance), and Bordj El Bahri's centre is only the nearer one (1,761 m against
6,601 m). The seed's `place.commune` carries it, and the build refuses a named
commune outside the point's wilaya. The capture also holds `way/1267564230`,
named with ENSTA's Arabic name in the singular, at the ex-ESSA second site the
school publishes as Bab El Oued (its OSM point falls on the Casbah side of that
boundary, 96 m from it): a site the record does not publish, recorded in the
seed's `osm_search` note.

**Two Votes and one.** 24 of the 89 `exact` records now stand on two
independent Votes: the 9 above, and ENSTA, `00178`, `00165`, `P08`, `P10`, `P23`, `00073` (ENSTP),
`00166` (ENS Constantine), `00057` (USTO), `00004` (Alger 1), `00060` (ENP), `00062` (ENP Constantine),
`00077` (EPAU), `00108` (ESBA) and `00042` (Sétif 1) on the Owner's readings. The other 65 rest on a single Nominatim geocode and
are reviewed in a separate follow-up pass (private tracker #336).

**Re-run.** `NODE_USE_ENV_PROXY=1 node research/enseignement-superieur/fetch-second-sources.mjs`
refreshes the two captures (behind the build proxy Node needs that variable),
then `node research/enseignement-superieur/second-source-votes.mjs` and
`precision-review.mjs` re-decide offline. A record whose second Vote lands within
2 km of its OSM Claim, and not within 50 m of it (an Owner reading within 500 m,
however close), moves to `exact` through `scripts/seeds/second-source.json`, or
through its `place` in `scripts/seeds/bac-2026.json` for a BAC 2026 record; that
seed takes precedence over `coordinates.json` and `overrides.json`.

## Known gaps (tracked, deliberate)

- **67 records have no French name** (the AR-listing extras are published in
  Arabic only). `name` is null, `name_ar` carries the official name. Follow-up:
  source FR names per institution (their own sites / JORA licensing decrees).
  The BAC 2026 file names six of them in French (`D02` to `D07`), so a later
  pass can close part of this gap from the committed projection.
- **3 of the 12 institutions the BAC 2026 file supplied ship `name_ar: null`**
  (their sites did not answer and they have no Wikidata item). A translation is
  never published in their place.
- **Coordinate precision** is split (`geo_precision`): campus-geocoded vs
  commune/wilaya-centroid fallback; the AR-listing extras resolve from
  embedded location text and are centroid-precision by construction.
  89 campus, 11 commune, 87 wilaya; the 98 approximate records are in the
  2026-10-28 Review queue above.
- **The network listing itself is stale.** www.mesrs.dz has not answered since
  2026-08-03, so it omits the 12 establishments the placement file names and
  still lists the two schools that décret exécutif 22-398 dissolved in 2022
  (`P05` above). Re-run `fetch` without `--cache` once it answers, and re-triage
  the placement file against it; the `successions` rule will fail loudly if the
  listing has dropped the two predecessors by then.
- **Résidences universitaires (ONOU)**: scouted 2026-08-03, NO-GO: ONOU
  publishes aggregates only (467 résidences, no directory). If mapped, it will
  be OSM-sourced with the 467 as the honest denominator, as a separate layer.
