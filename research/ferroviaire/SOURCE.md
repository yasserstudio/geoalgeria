# @geoalgeria/ferroviaire — sources (rail & urban transit)

Front-runner next build (transport sector, mode-named sibling to `aviation`).
Three complementary sources — official anchor + curated structure + geometry.

## 1. SNTF official network map (authoritative anchor)
- `sntf-reseau-ferre-national.png` (saved here) — "Réseau Ferré National" from
  **SNTF** (Société Nationale des Transports Ferroviaires).
- **Line-status taxonomy** (the value Wikidata lacks): `ligne existante` /
  `projet en cours de réalisation` / `ligne en étude` / `ligne à lancer en
  étude` / `étude de rectification de tracé`. Plus markers: port, aéroport,
  mine de fer, mine phosphate.
- Image only (no coords) — use to (a) tag each line's status, (b) cross-check
  the station/node universe. If SNTF later exposes a data/GTFS endpoint, prefer it.

## 2. fr.wikipedia "Liste de gares en Algérie" (curated structure)
- `https://fr.wikipedia.org/wiki/Liste_de_gares_en_Algérie`
- **~382 table rows, ~1,385 `Gare de…` links**, grouped **by line**, with wilaya.
- Reachable from sandbox via MediaWiki API (parse wikitext):
  `https://fr.wikipedia.org/w/api.php?action=parse&page=Liste de gares en Algérie&prop=wikitext&format=json`
  → parse the per-line tables for the station↔line↔wilaya mapping.

## 3. Wikidata SPARQL (geometry — the geocoding base)
- 2026-06-28 sweep: **645 distinct geocoded transit nodes** (rail 397 + tram 179
  + metro 32 + underground 15 + aerial-tram 11 + gondola 10 + bus 10), FR 99.7%
  / AR 59%, with **line membership (P81)**. Endpoint `query.wikidata.org/sparql`.
- Classes: `wd:Q55488` (+ subclasses) for rail; tram `Q2175765`, metro
  `Q928830`, underground `Q22808403`, aerial-tram `Q44696264`, gondola
  `Q1576693`, bus station `Q494829`. Filter `wdt:P17 wd:Q262`, coord `wdt:P625`.
- **Fresh pull 2026-07-01** (`wikidata-transit-raw.json`, saved here): **695 nodes**
  — 397 railway station + 179 tram stop + 32 metro + 30 (unlabelled rail subclass
  `Q123498578`) + 15 underground + 11 gondola + 11 aerial-tram + 10 bus + misc.
  name_fr 693/695, name_ar 410/695, line (P81) on 561/695. Reachable from this
  machine (real network), not just the sandbox.

## 4. SETRAM — authoritative tram-station names (urban transit)
- **SETRAM** (Société d'Exploitation des Tramways) operates all Algerian tramways.
  Site `setram.dz`; the point-of-sale pages list the official station set per
  network: `GET https://www.setram.dz/pos/{code}` → `<h5 class="h5-swiper">` names.
- **7 networks, 172 stations** (`setram-tram-stations.json`, saved here):
  **ALG** Alger 37 · **ORN** Oran 27 · **STF** Sétif 26 · **MGM** Mostaganem 24 ·
  **SBA** Sidi Bel Abbès 22 · **CST** Constantine 20 · **ORG** Ouargla 16.
  Codes: `ALG/ORN/CST/SBA/ORG/STF/MGM`. Also `/schedules`, `/category` (tarifs),
  `/nos-reseaux/{code}` (per-network facts, e.g. Alger 37 stations / 23 km).
- **Names + network membership only — no coordinates.** Use SETRAM as the
  authoritative *name/line anchor* for tram nodes and geocode via Wikidata/OSM
  (179 WD tram stops ≈ the 172 SETRAM stations). FR names authoritative; AR via the
  `setram.dz/language/ar` variant if needed.

## 5. SEMA / EMA — Métro d'Alger (metro operator + line status)
- **SEMA** (Société d'Exploitation du Métro d'Alger, subsidiary of **EMA** —
  Entreprise Métro d'Alger) runs the only metro. Site `metro-eldjazair.dz`.
- Authoritative facts (`sema-metro-alger.json`, saved here): **19 operational
  stations · 16.8 km · 10 communes (wilaya 16) · ~150,000 pax/day · opened 2011**.
  Static pages expose only the 5 commercial-agency stations (Place des Martyrs,
  Tafourah–Grande Poste, Bachdjarah, Aïn Naâdja, El Harrach Centre); full station
  geodata comes from Wikidata/OSM.
- **Line-status use:** Wikidata carries ~32 Algiers metro nodes but only **19 are
  operational** — the rest are extensions under construction/planned (El Harrach →
  Aéroport, Aïn Naâdja → Baraki, Place des Martyrs → Chevalley/Bab El Oued). SEMA's
  count filters the operational set and gives metro its own status dimension.

## Build pipeline (proposed)
1. Wikidata → base records `{name_fr, name_ar, lat, lng, type, line, wikidata}`.
2. Wikipedia list → fill/confirm **line grouping + wilaya** for stations missing it.
3. SNTF map → stamp each **line's status** (existing / under-construction / study).
4. **SETRAM** → anchor the **tram** universe (172 official names ×7 networks);
   match to Wikidata/OSM tram nodes for geometry, stamp `network` + `operator`.
5. OSM Overpass (`railway=station|halt|tram_stop`, `station=subway`) → fill
   coords/names for stations absent from Wikidata; dedupe ≤150 m (mosquees pattern).
6. Spatial-join coords → flagship commune/wilaya. Provenance per record
   (`wikidata` / `osm` / `wikidata+osm` / `setram`). metadata.json frames vs SNTF network.
- For **metro**, filter to SEMA's 19 operational stations (stamp the rest
  under-construction/planned) — SEMA count is the truth vs Wikidata's ~32.
- Operators to credit: SNTF (heavy rail) + **SEMA/EMA** (Métro d'Alger) +
  **SETRAM** (trams: Alger/Oran/Constantine/Sétif/Ouargla/Sidi Bel Abbès/
  Mostaganem) + télécabines.
