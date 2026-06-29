# CNRA Atlas Archéologique Algérien — official heritage source

**Discovered 2026-06-28** (user surfaced it). This is the official, geocoded
anchor for a future `@geoalgeria/patrimoine` (cultural-heritage) package — the
MJS-GeoServer-style goldmine, but for the *culture* sector.

## What it is

- **Owner:** Centre National de Recherche en Archéologie (**CNRA**), an EPST
  under the **Ministère de la Culture** (created by decree 2005). Authoritative.
- **Site:** `http://cnra.dz/atlas/` — WordPress (Newspaper theme) + **WP Google
  Map Gold** plugin. The full atlas lives on one page: `/atlas/latlas/`
  (FR) and `/atlas/ar/...` (AR mirror).
- **Coverage:** geocoded heritage points across ~35 wilayas (Alger, Oran,
  Constantine, Tlemcen, Béjaïa, Batna, Sétif, Tizi Ouzou, Guelma, Annaba,
  Skikda, Biskra, Béchar, Adrar, Laghouat, Djelfa, Chlef, Médéa, M'Sila, Mila,
  Boumerdès, Ghardaïa, Ouargla, El Oued, Tébessa, Khenchela, Oum El Bouaghi,
  Souk Ahras, El Tarf, Tipaza, Aïn Defla, BBA, Mostaganem, Mascara, Tiaret…).

## Record types (the plugin's category taxonomy)

| Cat id | Type | ~Count (from /latlas/ markers) |
|---|---|---|
| 433 | **04 Patrimoine mondial** (UNESCO) | **7** — Tassili n'Ajjer, Vallée du M'Zab, Tipasa, Timgad, Kalâa des Beni Hammad, Djémila, Casbah d'Alger |
| 434 | **03 Musées archéologiques** | **~29** (Cirta, Zabana, Bardo, Cherchell, Hippone, Sétif, Timgad, Djémila, Tébessa…) |
| 435 | **01 Sites** | dozens (archaeological sites, ksour, Roman cities) |
| 436 | **02 Monuments** | dozens (forts, mosquées, mausolées, palais, portes…) |
| 451 | **05 Secteurs sauvegardés** | **~21** (vieilles villes, ksour, Casbah, M'Zab…) |
| 450 | **06 Périodes** (cross-tag) | Préhistoire / Antique / Médiévale / Ottomane / Mix |
| 439 | Parc | few |

Total markers on `/latlas/` ≈ **180–200+** (one combined map `#map1`).

## Each record carries (extractable fields)

- `title` — French name (some AR names in the AR mirror page).
- `location.lat` / `location.lng` — **real coordinates**.
- `post_categories` — comma string = **type + wilaya + period**
  (e.g. `"Alger, Monuments, Ottoman"`, `"Sétif, Antique, Sites"`).
- `categories[]` — structured: type id (435/436/434/433/451) + period id (440–449).
- `post_link` — canonical CNRA page for the item (has long FR description + gallery).

## Extraction recipe (no API needed — inline JSON, mirrors the djezzy pattern)

1. GET `http://cnra.dz/atlas/latlas/` (follow http→https; site 301-loops from
   some hosts/CI — use a real browser UA or agent-browser; the user's machine
   reaches it fine).
2. The map data is an inline `jQuery("#map1").maps({ … "places":[ … ] … })` call.
   Regex/slice out the argument object and `JSON.parse` the `places` array.
3. Per place → `{ name, lat, lng, type, period, wilaya, source_url }`.
4. Derive `type` (site/monument/musée/unesco/secteur-sauvegardé) and `period`
   from the category ids; wilaya from `post_categories` first token.
5. AR names: repeat for the `/atlas/ar/…` page and pair by slug/coords.
6. Spatial-join lat/lng → flagship commune/wilaya (same as mosquees/sante).

Raw HTML of `/latlas/` should be cached here as `atlas-latlas.html` once
fetchable (couldn't fetch from this sandbox — TLS/redirect blocked).

## Why this changes the heritage plan

Earlier recon scoped heritage as a **Wikidata(211)+OSM composite framed vs. an
official count**. CNRA flips it: now there's an **official, geocoded, type+period
+wilaya-classified registry** to anchor on (use Wikidata/OSM only to enrich AR
names + fill gaps). Build pattern = djezzy (inline JSON) × sante (official
registry + composite geocoding). Strong, high-civic-value culture-sector launch.
