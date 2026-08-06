# @geoalgeria/ecoles — sources (schools)

> **Canonical package:** `@geoalgeria/ecoles` (domain-named, per `.agents/NAMING.md`).
> **Source:** OpenStreetMap — credited in `metadata.source` + README, discoverable via
> **keywords** (`schools`, `ecoles`, `education`, `primaire`, `cem`, `lycee`).

Existing-sectors extension surfaced during the 2026-06-28 landscape sweep
(`research/_landscape/`): schools are the highest civic-value layer by reach but
**Wikidata-poor** (~17 geocoded), so — unlike `mosquees`/`sante`, which anchor on
Wikidata — this is an **OpenStreetMap-only** build. No geocoded official anchor is
open: the Ministry of National Education portal (`men.gov.dz`) DNS-fails, so OSM is
the sole path, published with honest partial-coverage framing.

## Source — OpenStreetMap (Overpass), sole source

Public, unauthenticated Overpass API. Query (see `packages/ecoles/scripts/fetch.mjs`):

```
[out:json][timeout:300];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
(
  node["amenity"="school"](area.dz);        way["amenity"="school"](area.dz);        relation["amenity"="school"](area.dz);
  node["amenity"="kindergarten"](area.dz);  way["amenity"="kindergarten"](area.dz);  relation["amenity"="kindergarten"](area.dz);
);
out center tags;
```

Live sizing (2026-07-03): **11,633** `amenity=school` + **242** `amenity=kindergarten`
→ **11,830** after de-dup. Endpoints tried in order: `overpass-api.de`,
`overpass.kumi.systems`, `maps.mail.ru`. The raw pull is captured to
`sources/ecoles/osm.json` at build time (committed, per `sources/README.md`;
offline rebuild via `npm run fetch -- --cache`).

## Method

1. **Cycle classification** — from `isced:level` and the FR/AR name. Order (most
   specific first): préscolaire (`maternelle`/`روضة`/`amenity=kindergarten`) →
   secondaire (`lycée`/`ثانوية`/`technicum`) → moyen (`CEM`/`collège`/`متوسطة`) →
   higher-ed/vocational strays → primaire (`ابتدائية`/`primary`). A bare
   "école"/"مدرسة" with no cycle word is classified `primaire` by Algerian
   convention; anything unresolved is `autre`. Names are accent-folded (é→e) and
   Arabic-normalized (hamza/alef/harakat) before matching. 93% of *named* schools
   resolve to a specific cycle.
2. **Kind** — establishment type, orthogonal to cycle: `regular` (11,640) or one
   of the special-purpose kinds `langues`/`coranique`/`conduite`/`formation`
   (which carry cycle `autre`) and `special` (adapted/special-needs, keeps its
   cycle). Detected from precise FR/AR name patterns (e.g. `قرانية` not bare
   `قران`, to avoid the surname المقراني). 190 non-regular.
3. **Sector** — `public`/`private` only from an explicit signal (`operator:type`,
   or a privé/خاص name); else `null`.
4. **Enrichment** — `isced_levels` (OSM `isced:level` normalized to a sorted list,
   2,037 records) and a single-line `address` from `addr:*` tags (2,625). Names
   are strictly script-routed (name_ar always Arabic, name_fr always Latin).
5. **De-dup** — the same school mapped as both a node and a building outline is
   collapsed (identical name within ~40 m; plus an exact-coordinate pass).
6. **Admin linkage** — OSM carries no Algerian codes, so `wilaya`/`wilaya_ar`/
   `wilaya_code`/`commune`/`commune_code` are attached by nearest-centroid join
   against the flagship `geoalgeria` commune set (wilaya effectively exact,
   commune best-effort).

## Coverage framing

11,855 mapped against the **29,702** educational institutions the Ministry of
National Education reports on `education.gov.dz` ("Education in numbers"
homepage block, 2024-2025 school-year figures alongside 11,275,424 students;
retrieved 2026-08-06) → **39.9%**. This replaces the earlier ~28,000
order-of-magnitude estimate with the ministry's own exact aggregate; same
honest-denominator role. A community-maintained OSM extract, not an official
registry; uneven by wilaya.

## Refresh, 2026-08-06 (rentrée 2026 campaign, Stage B)

Fresh live pull for the rentrée re-release:

- Mirror: `overpass-api.de` (first mirror 504'd once, second attempt succeeded);
  `timestamp_osm_base` **2026-08-06T14:37:32Z**, same-day fresh, no mirror drift.
- **11,855 schools** (was 11,830 on 2026-07-03): de-dup 41 same-name-within-40m
  + 3 exact-coincident; 8,635 named; all 69 wilayas.
- Id churn: **11,829 of 11,830 kept** (carryOverIds), 26 added, 1 dropped
  (`16-00454` "École pour Enfants Ali Remili", Ben Aknoun: no longer in the
  extract, either deleted upstream or merged into a sibling record by de-dup).
- Precision: 2,843 exact / 9,012 approximate (was 2,841 / 8,989).
- Cycle tallies stable: primaire 4,019 (-1), moyen 2,378 (+1), secondaire
  1,576 (+2), préscolaire 268 (=), autre 3,614 (+23; most of the growth is
  new unnamed/uncycled records, consistent with the known `autre` bucket).
- Commune join now runs under the point-in-polygon wilaya-containment guard
  (generators fix, data PR #158): a commune match can no longer cross a
  wilaya boundary.

## Next (roadmap)

Shrink the `autre` bucket (unnamed + no-cycle-word, ~31%) and lift coverage past
~40% — needs a geocoded official MEN source (still DNS-failing) or a targeted OSM
import. Private-school sub-layer where `operator:type=private` grows. See
`.agents/ROADMAP.md`.
