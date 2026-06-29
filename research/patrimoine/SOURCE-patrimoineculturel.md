# @geoalgeria/patrimoine — PRIMARY source: Cartes du Patrimoine Culturel Algérien

⭐ **This supersedes the CNRA Atlas as the anchor for `@geoalgeria/patrimoine`.**
Surfaced by the user 2026-06-28 ("I found a gold mine"). Sized **live from the
sandbox** (unlike CNRA, which 301-loops) — counts below are real, not estimated.

## Why it wins over CNRA Atlas
| | This portal | CNRA Atlas |
| --- | --- | --- |
| Reachable from sandbox/CI | **yes** (nginx, Drupal 7, HTTP 200, `.org`) | no (301-loop / 000) |
| Size | **~851 points** (AR) / 320 (FR) | ~180–200 |
| Typed layers | 5 (protected / museums / moudjahid-museums / theatres / libraries) | similar |
| Bilingual | **yes**, AR catalog is *fuller* | FR + AR pages |
| Extraction | inline `getlocations` JSON, no auth | inline WP-Map-Gold JSON |
→ CNRA Atlas drops to a **cross-check / enrichment** source.

## Endpoints (all inline getlocations JSON, no auth)
- **5 thematic maps** `/{lang}/map/{slug}` → heritage layers (the original 950).
- **`/{lang}/map_all`** "Carte culturelle" = fuller superset. Filter by `?field_wilaya_tid=All&term_node_tid_depth=<tid>`:
  `55` Biens culturels protégés (FR 200/AR 505), `98` Établissements culturels (FR 204/AR 508),
  no filter = all (FR 403/AR 1013). Adds 6 establishment layers (maisons/palais de culture, directions,
  cinémas, écoles d'art, centres). Type from **tuple[4] class** here (not the map slug).
- **`/{lang}/map360`** = 23 places with 360° virtual tours → `has_virtual_tour` flag.
→ Combined local dataset = **`patrimoine-cultural-2026-06-28.json` (1,090, 11 layers)**.

## Site
- `https://cartes.patrimoineculturelalgerien.org/` (FR) · `/ar` (AR).
- **خريطة التراث الثقافي الجزائري / Cartes Patrimoine Culturel Algérien** — Algeria's
  official cultural-heritage map portal (Ministry of Culture sphere). Drupal 7 +
  **getlocations** module. No API key, no login.

## Thematic maps (route = `/{lang}/map/{slug}`)
| slug (URL-encoded) | layer | AR | FR |
| --- | --- | --- | --- |
| `biens-culturels-prot%C3%A9g%C3%A9s` | protected cultural property (classified monuments + sites) | **506** | 201 |
| `mus%C3%A9es` | museums | 39 | 43 |
| `mus%C3%A9es-du-moudjahid` | museums of the Moudjahid (war/independence) | 13 | 12 |
| `the%C3%A2tres` | theatres | 41 | 21 |
| `biblioth%C3%A8ques` | libraries | **252** | 43 |
| **TOTAL** | | **851** | 320 |

Live snapshot 2026-06-28 (`"datanum":N` per map). AR ≫ FR for protected property
and libraries → **pull both languages and union by `nid`** for the fullest set.

## Extraction = inline `getlocations` JSON (djezzy/CNRA pattern, cleaner)
Each map page embeds `jQuery.extend(Drupal.settings, {… "getlocations":{"key_1":{…
"datanum":N, "latlons":[ <tuple>, … ] }}})`. Each tuple:

```
[ lat, lng, marker_id,
  "Title\n{NN- Wilaya}\n",          // line 2 = wilaya code + name
  "type classes",                    // e.g. "various museum_art" — built-in typology
  "nid",
  "<a href=\"/{lang}/lieu/{wilaya-slug}/{nid}\">…popup html…</a>" ]
```
So every record yields: name, **real lat/lng**, wilaya (from title line 2), a **type**
(class string), a stable **nid**, and a detail-page URL. Recipe: GET the map page,
slice the `latlons` array out of the `Drupal.settings` JSON, `JSON.parse`, map fields.
No pagination problem — `latlons` holds the *full* set even though the visible list is paged
(verified: biens FR `datanum:201` = 201 `"nid"` tuples).

- Per-place detail: `/{lang}/lieu/{wilaya-slug}/{nid}` (e.g. `/fr/lieu/42-tipaza/66` = Tipasa).
- Per-wilaya index: `/{lang}/wilaya/{NN}` for all **58** wilayas.
- Ajax endpoints also exist (`/getlocations_markers`, `/getlocations_cb`) but the inline
  `latlons` array is sufficient and simpler.

## Build pipeline (proposed — when greenlit)
1. For each of the 5 slugs × {fr, ar}: GET `/{lang}/map/{slug}`, extract `latlons`.
2. Per tuple → `{nid, name_{lang}, lat, lng, wilaya (parse "NN- Name"), type (class), layer (slug), source_url(/lieu/)}`.
3. **Union AR+FR by `nid`**; attach `name_fr` + `name_ar`; keep one coord (they match).
4. Map `layer` → clean types: protected-site / museum / museum-moudjahid / theatre / library.
   `geo_precision: exact` (real coords). Enrich gaps with CNRA Atlas + Wikidata (CC0) + OSM.
5. Spatial-join coords → flagship commune/wilaya; provenance `patrimoineculturelalgerien.org`.
   FR+AR names, README trio, metadata.json frames the 5 layers + per-wilaya coverage. changeset.

## Roadmap impact
Anchoring `patrimoine` here also **absorbs three other roadmap rows**: archaeological/
public **museums** (39–43 + 13 moudjahid), **theatres** (cultural-venues), and **libraries**
(252 official — no longer an OSM-only play). One official, bilingual, ~850-point culture package.
