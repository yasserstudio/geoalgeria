# @geoalgeria/cliniques: sources (clinics & proximity-care facilities)

> **Canonical package:** `@geoalgeria/cliniques` (domain-named, per `.agents/NAMING.md`).
> **Source:** OpenStreetMap, credited in `metadata.sources` + README, discoverable via
> **keywords** (`clinics`, `cliniques`, `polyclinique`, `sante`, `healthcare`).

The health sector has two disjoint tiers, and this package is the second one:

- **registry tier** (`@geoalgeria/sante`): 695 public establishments (CHU, EPH,
  EHS, EPSP) from the Ministry of Health. Official, closed, enumerable.
- **community tier** (this package): the proximity structures and private
  clinics that no open register lists. OSM is the only path to them.

The tiers describe different populations of place and must never be summed. The
generator enforces the split at classification time: every record that reads as a
registry establishment is excluded with a logged count.

## Source: OpenStreetMap (Overpass), sole source

Public, unauthenticated Overpass API. Query (see `packages/cliniques/scripts/fetch.mjs`):

```
[out:json][timeout:300];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
(
  node["amenity"="clinic"](area.dz);       way["amenity"="clinic"](area.dz);       relation["amenity"="clinic"](area.dz);
  node["healthcare"="clinic"](area.dz);    way["healthcare"="clinic"](area.dz);    relation["healthcare"="clinic"](area.dz);
  node["healthcare"="centre"](area.dz);    way["healthcare"="centre"](area.dz);    relation["healthcare"="centre"](area.dz);
  node["amenity"="hospital"](area.dz);     way["amenity"="hospital"](area.dz);     relation["amenity"="hospital"](area.dz);
  node["healthcare"="hospital"](area.dz);  way["healthcare"="hospital"](area.dz);  relation["healthcare"="hospital"](area.dz);
);
out center tags;
```

`amenity=doctors` is deliberately **not** queried: that is the private-practice
cabinet universe, out of scope.

**Why hospitals are queried but never shipped.** Algerian mappers routinely file
a polyclinique or a salle de soins under `amenity=hospital` and name it مستشفى.
The hospital selectors are the only way to reach those clinic-class records; the
actual hospitals are then dropped by the classifier. An element matching several
selectors comes back once per match, so the pull is de-duplicated by osm type/id
before anything else.

Live sizing (2026-08-08): **2,936** elements (1,424 node / 1,501 way / 11
relation), `timestamp_osm_base` **2026-08-08T15:00:36Z**, mirror `overpass-api.de`
(first attempt 504'd, second succeeded). Sanity floor `OSM_MIN` = 2000; a mirror
returning less is treated as partial and the next one is tried. The raw pull is
captured to `sources/cliniques/osm.json` at build time (committed, per
`sources/README.md`; offline rebuild via `npm run fetch -- --cache`).

## Method

1. **Classification**: over the normalized FR+AR name (Latin accents folded,
   Arabic hamza/alef/harakat folded), in this order:
   1. `chu` and the named registry tiers (`EPH`, `EHS`, "établissement public
      hospitalier") exclude unconditionally;
   2. `paramedical` (école paramédicale) and `cabinet` exclude;
   3. the facility types match: `polyclinique` → `salle_de_soins` →
      `centre_sante`;
   4. the **bare** word hôpital/hospital/مستشفى then excludes;
   5. `maternite`;
   6. the EPSP administrative entity excludes;
   7. everything left is `clinique`.
   Steps 3 and 4 are split on purpose. The bare word is used colloquially for
   proximity structures, and 10 records name themselves both ways (e.g.
   `way/414758997` "Polyclinique des consultations spécialisées Boudghène" with
   `name:ar=مستشفى بودغن`; `node/4449247890` "المستشفى الجواري متعدد الخدمات" with
   `name:fr=Polyclinique`). An explicit polyclinique/مستوصف/centre de santé word
   settles what the place is; without the split those 10 real proximity
   facilities would be dropped as hospitals they are not. Conversely a
   mother-child hospital (مستشفى الأمومة والتوليد) carries no facility word, so
   step 4 still drops it before `maternite` can claim it.
   Step 6 is last so a facility that merely names its parent EPSP
   ("Polyclinique EPSP", "قاعة العلاج الخلوفي جيلالي (EPSP)") keeps its own type.
2. **Sector**: `public` from `operator:type`, or structurally for
   `polyclinique`/`salle_de_soins` (public structures by definition in the
   Algerian system); `private` from `operator:type=private` or a privé/خاصة name;
   `مصحة` is checked **last** and only as a fallback, because it is also just the
   word for "clinic" and appears in public names (المصحة الجوارية المتعددة الخدمات).
   Otherwise `null`: most cliniques are private in practice, but the map does not
   say so.
3. **Enrichment**: `speciality` (`healthcare:speciality`, 190), `address` from
   `addr:*` (699), `phone` (125), `opening_hours` (192), `emergency` (`true` on
   the 91 tagged `emergency=yes`, never `false`). Names are strictly
   script-routed (name_ar always Arabic, name_fr always Latin).
4. **De-dup**: the same facility mapped as both a node and a building outline is
   collapsed (identical name within ~40 m, then an exact-coordinate pass).
5. **Admin linkage**: OSM carries no Algerian codes, so linkage uses the shared
   boundary-safe `attachCommune` from `scripts/lib/build-utils.mjs`: `wilaya_code`
   by point-in-polygon against the 69 wilaya boundaries, then `commune`/
   `commune_code` as the nearest centroid **within that wilaya**. The join cannot
   cross a wilaya boundary.

## First build, 2026-08-08

- **2,936** elements pulled → **801** excluded → 2,135 classified in → **2,059**
  after de-dup (76 same-name-within-40m, 0 exact-coincident).
- Excluded: `hopital` 416, `unnamed_hospital` 242, `epsp_entity` 107,
  `cabinet` 18, `chu` 16, `paramedical` 2.
- Types: `clinique` 1,257 · `polyclinique` 419 · `salle_de_soins` 210 ·
  `centre_sante` 140 · `maternite` 33.
- Sector: 643 public, 64 private, 1,352 unasserted.
- 1,780 named / 279 unnamed; 66 wilayas (54 In Guezzam, 62 Bir El Ater and
  63 El Aricha have no mapped facility).
- Precision: 1,189 exact (surveyed node) / 870 approximate (building centroid).

## Coverage framing

No coverage percentage is published, and `estimatedUniverse` is `null` on
purpose. The Ministry of Health's published counts describe the registry tier
this package excludes, and no public register enumerates private clinics or the
proximity structures at facility level. Dividing by either would produce a
number that does not describe these records. The README says so in all three
locales instead of inventing a denominator.

## Next (roadmap)

The `clinique` residual (1,257) still mixes genuinely different things: private
clinics, dialysis and imaging centres, medical laboratories, school-health units.
A sub-type pass would need either richer `healthcare:speciality` tagging upstream
or a reviewed list. Coverage growth depends on OSM contributions; the wilayas at
zero are the obvious first target.
