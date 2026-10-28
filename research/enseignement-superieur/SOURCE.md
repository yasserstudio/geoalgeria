# @geoalgeria/enseignement-superieur — sources & reconciliation

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
  `P05 ECOLE NATIONALE SUPERIEURE DES TECHNOLOGIES AVANCEES ALGER`. Left open at
  this point, resolved below.
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

## What the 188 is (vs the ministry's "117 établissements")

mesrs.dz/fr/agregats-2/ (2024-2025 figures) says **117 établissements**:
55 universités + 13 centres universitaires + 40 ENS + 9 écoles nationales
supérieures. Our package ships **188**. The two numbers count different things:

| Slice of the package | Count | In the ministry's 117? |
| --- | --- | --- |
| Public MESRS network (EN listing) | 110 | yes — this is its universe |
| Institutions the BAC 2026 placement file supplied | 11 | partly — MESRS network establishments the listing omits, plus 2 under other ministries |
| Private licensed institutions (AR listing) | 19 | no |
| Other-ministry establishments (AR listing + BAC 2026): Santé 25, Défense 16, Culture 5, Poste/Télécoms 2, Travail 1, Jeunesse 1 | 50 | no |

Within the public network vs their 117 the residual gap is **category
accounting, not missing records**: the agregats page's 40 "ENS" bucket folds in
the écoles normales that the network listing presents inside regional groupings
we classify by name (our split: 59 universités, 111 grandes écoles, 13 ENS, 5
centres universitaires). The ministry's own aggregates are not internally
consistent either (an older cut says 106), so the **enumerable listings we ship
are the source of truth**, and the aggregate is used only as an
order-of-magnitude cross-check.

## Known gaps (tracked, deliberate)

- **67 records have no French name** (the AR-listing extras are published in
  Arabic only). `name` is null, `name_ar` carries the official name. Follow-up:
  source FR names per institution (their own sites / JORA licensing decrees).
  The BAC 2026 file names six of them in French (`D02` to `D07`), so a later
  pass can close part of this gap from the committed projection.
- **3 of the 11 institutions the BAC 2026 file supplied ship `name_ar: null`**
  (their sites did not answer and they have no Wikidata item). A translation is
  never published in their place.
- **Coordinate precision** is split (`geo_precision`): campus-geocoded vs
  commune/wilaya-centroid fallback; the AR-listing extras resolve from
  embedded location text and are centroid-precision by construction.
  72 campus, 20 commune, 96 wilaya.
- **The network listing itself is stale.** www.mesrs.dz has not answered since
  2026-08-03, so it omits the 11 establishments the placement file names and
  still lists two schools that décret exécutif 22-398 dissolved in 2022
  (`P05` above). Re-run `fetch` without `--cache` once it answers, and re-triage
  the placement file against it.
- **Résidences universitaires (ONOU)**: scouted 2026-08-03, NO-GO — ONOU
  publishes aggregates only (467 résidences, no directory). If mapped, it will
  be OSM-sourced with the 467 as the honest denominator, as a separate layer.
