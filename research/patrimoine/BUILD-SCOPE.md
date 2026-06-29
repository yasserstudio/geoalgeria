# @geoalgeria/patrimoine — build scope (data pulled live 2026-06-28)

Scope for the cultural-heritage package, anchored on **Cartes du Patrimoine
Culturel Algérien** (`cartes.patrimoineculturelalgerien.org`, Ministry of Culture).
The full dataset was **pulled live from the sandbox** (the source is a reachable
`.org`, unlike every `.dz` source) — counts below are real, not estimated.

## Headline
- **950 unique geocoded heritage places**, 5 typed layers, **48 wilayas**.
- **100% carry exact source coordinates** → `geo_precision: "source_point"` for all
  950 (no geocoding pass needed; OSM/Wikidata are *optional* enrichment only). This is
  a stronger geo base than `sante` (600/695, mostly commune-centroid).
- Bilingual: **194 FR+AR**, 651 AR-only, 105 FR-only (FR & AR are *disjoint node sets*
  on the portal → merged by **coordinate proximity ≤150 m, same-layer preferred**).

### Live pull (snapshot 2026-06-28), after AR+FR spatial union
| layer | total | bilingual | ar-only | fr-only |
| --- | --- | --- | --- | --- |
| protected-cultural-property | 585 | 124 | 382 | 79 |
| library | 259 | 36 | 216 | 7 |
| museum | 48 | 19 | 15 | 14 |
| theatre | 45 | 14 | 26 | 5 |
| museum-moudjahid | 13 | 1 | 12 | 0 |
| **total** | **950** | **194** | **651** | **105** |

Artifacts (committed to research, the build's input/proof):
`research/patrimoine/pull-2026-06-28.json` (merged 950) ·
`research/patrimoine/pull-2026-06-28.raw-by-node.json` (1144 raw per-node).

## v2 — full "Carte culturelle" (1,090) — user-approved scope 2026-06-28
The portal's `/{lang}/map_all` ("Carte culturelle") combined view is a **richer superset**
than the 5 thematic maps. Pulled live (FR 403 / AR 1013) and unioned (AR+FR, ≤150 m): it adds
**140 cultural *establishments/venues*** not in the 950 heritage set. User chose **"include all,
tagged"** → canonical dataset is now **`research/patrimoine/patrimoine-cultural-2026-06-28.json`
= 1,090 records, 11 layers, 48 wilayas, 100% bilingual** (names + wilaya names).

| new layer | n | | new layer | n |
| --- | --- | --- | --- | --- |
| cultural-house (Maison de la culture) | 51 | | cinema (salle/cinémathèque) | 20 |
| cultural-directorate (Direction de la culture / office) | 33 | | arts-school (école BA / conservatoire) | 15 |
| cultural-center (CNRPAH, Bastion 23, Village des artistes…) | 15 | | cultural-palace (Palais de la culture) | 6 |

- The 95 new bilingual gaps (79 AR→FR + 16 FR→AR, templated establishment names) were translated
  by hand; 0 gaps remain. Working lists: `translate/need_{fr,ar}_v2.json`, source `mapall-new-establishments-2026-06-28.json`.
- **`has_virtual_tour: boolean`** — enriched from `/{lang}/map360` (23 places with 360° tours; 22 distinct flagged by nearest-coord).
- **Data-quality fix:** the base 950 had `wilaya_name_*` filled in only one language per record
  (722 empties) + one mis-coded "El Oued"/30 record. Backfilled both names for **all 1,090** from a
  canonical code→{FR,AR} table (codes 01–48). `wilaya_code` authoritative from the portal.
- map_all extraction note: name = popup `<p>…</p>`; **type from `tuple[4]` class** here
  (`embassy`→directorate, `video`→cinema, `house`→cultural-house, `palace-2`→cultural-palace,
  `school`/`presentation`→arts-school, `home`/`homecenter`→cultural-center) — unlike the thematic
  maps where type came from the map slug.

## Source & extraction (confirmed)
Drupal 7 + **getlocations**. 5 maps at `/{lang}/map/{slug}` (`fr`+`ar`):
`biens-culturels-protégés`, `bibliothèques`, `musées`, `théâtres`, `musées-du-moudjahid`.
Each page embeds `Drupal.settings.getlocations.key_1.latlons` = array of tuples:
```
[ lat, lng, marker_id, "Name\n{NN- Wilaya}\n", "various <typeclass>", "nid",
  "<a href=\"/{lang}/lieu/{wilaya-slug}/{node_id}\">…popup…</a>", "" ]
```
- name = tuple[3] line 1; wilaya = tuple[3] line 2 (`NN- Name`).
- **node_id = parse the `/lieu/.../{id}` link in tuple[6]** (NOT tuple[2]=marker, NOT
  tuple[5]=literal "nid"). FR & AR use different node_ids for the same place → union by coords.
- Extraction = balance the `[...]` after `"latlons":` (string-aware), `JSON.parse`. No auth.
- Map type from the **layer (which map)**, not `tuple[4]` (its class strings are quirky,
  e.g. moudjahid markers tagged `riparianhabitat`).

## Record schema (mirrors `sante` conventions)
```ts
export type CulturalType =
  // heritage (5 thematic maps)
  | "protected-cultural-property" | "museum" | "museum-moudjahid" | "theatre" | "library"
  // establishments/venues (map_all)
  | "cultural-house" | "cultural-palace" | "cultural-center"
  | "cultural-directorate" | "cinema" | "arts-school";

export interface CulturalSite {
  id: string;              // "{wilaya_code}-{type}-{seq}", e.g. "16-museum-01"
  name: string;            // FR preferred, else AR
  name_fr: string | null;
  name_ar: string | null;
  type: CulturalType;
  has_virtual_tour: boolean; // 360° tour on the portal (/map360)
  type_label_fr: string;   // e.g. "Bien culturel protégé"
  type_label_ar: string;   // e.g. "ممتلك ثقافي محمي"
  wilaya: string;          // FR
  wilaya_ar: string;
  wilaya_code: number;     // integer 1..69 (validator requires int in [1,69])
  commune: string | null;        // spatial-join to flagship geoalgeria communes
  commune_code: number | null;
  lat: number;             // always present (source_point)
  lng: number;
  source: "patrimoineculturel" | "patrimoineculturel+osm" | "patrimoineculturel+wikidata";
  geo_precision: "source_point";
  wikidata: string | null; // optional enrichment
  osm_id: string | null;   // optional enrichment
  node_id_fr: number | null;
  node_id_ar: number | null;
  url: string;             // /lieu/{wilaya-slug}/{node_id}
}
```
Type FR/AR labels: protected → "Bien culturel protégé" / "ممتلك ثقافي محمي";
museum → "Musée" / "متحف"; museum-moudjahid → "Musée du Moudjahid" / "متحف المجاهد";
theatre → "Théâtre" / "مسرح"; library → "Bibliothèque" / "مكتبة";
cultural-house → "Maison de la culture" / "دار الثقافة";
cultural-palace → "Palais de la culture" / "قصر الثقافة";
cultural-center → "Centre culturel" / "مركز ثقافي";
cultural-directorate → "Direction de la culture" / "مديرية الثقافة";
cinema → "Salle de cinéma" / "قاعة سينما"; arts-school → "École d'art" / "مدرسة الفنون".

## Build pipeline (`packages/patrimoine/scripts/fetch.mjs`)
1. For each of 5 slugs × {fr, ar}: GET `/{lang}/map/{slug}`, extract `latlons`, parse tuples.
2. Union AR+FR by node coordinate proximity (≤150 m, prefer same layer) → carry both names + node_ids.
3. **Spatial-join** each (lat,lng) to the flagship `geoalgeria` commune polygons →
   authoritative `commune` + `commune_code` + `wilaya`/`wilaya_code` (more reliable than the
   source's wilaya string; keep source wilaya as a cross-check). Reconciles the 2019 wilayas
   (codes 49–58 absent in source) automatically by geography.
4. Assign `id = {wilaya_code}-{type}-{seq}`. `geo_precision="source_point"`, `source="patrimoineculturel"`.
5. *(optional)* enrich: match Wikidata (CC0) heritage QIDs + OSM (ODbL) `historic=*` within ~150 m →
   set `wikidata`/`osm_id`, bump `source`. Not required for v1 (coords already exact).
6. Emit `data/patrimoine.json` + `data/csv/patrimoine.csv` + `data/geojson/patrimoine.geojson`
   + `data/metadata.json` (`patrimoine`, `by_type`, `by_geo_precision`, `wilayas_covered`,
   `geocoded`, `bilingual`, notes, `generated_at`).
- **fetch.mjs runs in-sandbox/CI** (source reachable) — unique among packages; no manual paste.

## Integration checklist (launch)
- `packages/patrimoine/`: package.json, index.js, types/index.d.ts, README.md/.fr/.ar, LICENSE, CHANGELOG, scripts/fetch.mjs, data/*.
- Add `patrimoine` to `scripts/validate-packages.mjs` PACKAGES table (json+csv+geojson, required `["id","name","wilaya_code"]`).
- Mirror into `packages/dataset` umbrella (+ its table) so the validator's mirror-drift check passes.
- README ecosystem table (#81), `geoalgeria.com/data` + `/data/docs`, app map layer (separate repo), changeset, v1.0.0.

## Open decisions (small)
1. **6 multi-layer places** (e.g. Hippone = protected+museum): keep primary = protected, add `also_in: []`? Or duplicate per layer? → propose primary + `also_in`.
2. **~20 markers with no `/lieu/` link** (mostly fr_musees): drop (current) or keep with synthetic id + null url? → propose drop, note in coverage.
3. **150 m union threshold**: 209 FR matched AR; loosening to 500 m adds ~19 more matches but risks false merges in dense medinas → keep 150 m.
4. Package name `@geoalgeria/patrimoine` (✓ matches roadmap) vs `culture` umbrella → keep `patrimoine` (single authoritative source = source-package rule).

## Effort
Low–Medium. Data is pulled, parsed, unioned, and validated to clean coords today;
remaining work is the package scaffold + spatial-join to communes + format emit + the
standard launch integration. No blocked sources, no geocoding pass.
