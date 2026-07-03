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
`overpass.kumi.systems`, `maps.mail.ru`. The raw pull is cached to
`research/ecoles/osm-raw.json` at build time (not committed — ~2 MB, reproducible
via `npm run fetch`).

## Method

1. **Cycle classification** — from `isced:level` and the FR/AR name. Order (most
   specific first): préscolaire (`maternelle`/`روضة`/`amenity=kindergarten`) →
   secondaire (`lycée`/`ثانوية`/`technicum`) → moyen (`CEM`/`collège`/`متوسطة`) →
   higher-ed/vocational strays → primaire (`ابتدائية`/`primary`). A bare
   "école"/"مدرسة" with no cycle word is classified `primaire` by Algerian
   convention; anything unresolved is `autre`. Names are accent-folded (é→e) and
   Arabic-normalized (hamza/alef/harakat) before matching. 93% of *named* schools
   resolve to a specific cycle.
2. **Sector** — `public`/`private` only from an explicit signal (`operator:type`,
   or a privé/خاص name); else `null`.
3. **De-dup** — the same school mapped as both a node and a building outline is
   collapsed (identical name within ~40 m).
4. **Admin linkage** — OSM carries no Algerian codes, so `wilaya`/`wilaya_ar`/
   `wilaya_code`/`commune`/`commune_code` are attached by nearest-centroid join
   against the flagship `geoalgeria` commune set (wilaya effectively exact,
   commune best-effort).

## Coverage framing

~11.8k mapped against the ~28,000 establishments of the national school network
(primaire + moyen + secondaire, MEN, approximate) → ~40%. A community-maintained
OSM extract, not an official registry; uneven by wilaya.

## Next (roadmap)

Shrink the `autre` bucket (unnamed + no-cycle-word, ~31%) and lift coverage past
~40% — needs a geocoded official MEN source (still DNS-failing) or a targeted OSM
import. Private-school sub-layer where `operator:type=private` grows. See
`.agents/ROADMAP.md`.
