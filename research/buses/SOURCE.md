# @geoalgeria/buses — urban bus networks (Algeria)

> **Canonical package:** `@geoalgeria/buses` (domain-named, per `.agents/NAMING.md`)
> — a **multi-operator** umbrella for Algeria's urban/suburban bus networks, the way
> `ferroviaire` holds SNTF/SEMA/SETRAM. Operators are *sources*, discoverable via
> **keywords** (`etusa`, `bus`, `autobus`, `ligne`, `transport-urbain`, `alger`, `dz`).
> Sibling — not the same as `gares-routieres` (SOGRAL intercity bus **stations** /
> terminals = infrastructure, like `aviation` is airports). `buses` = the **networks/
> lines** run by operators.

Transport sector, domain-named. First operator staged: **ETUSA**.

## Operator #1 — ETUSA (Alger)
**ETUSA** — *Établissement public de transport urbain et suburbain d'Alger*
(ar: مؤسسة النقل الحضري وشبه الحضري لمدينة الجزائر) — public operator of surface
transport in Greater Algiers: **urban bus lines** + the Algiers **téléphériques**.
Created 1959 as RSTA; formerly ran the tram/metro before SETRAM/SEMA. Surfaced by
the user 2026-07-01.

> **More operators to add later** (the reason for the `buses` umbrella): other
> cities' public urban operators (e.g. Oran, Constantine, Annaba) + private
> networks. Each becomes another source folder/file here, same schema.

## Network facts (fr.wikipedia, snapshot 2022–2026)
- **122 passenger bus lines** (27 Feb 2022) + separate student / enterprise-staff
  fleets. Fleet **802 buses** (2022): 340 passenger + 300 student + 157 staff +
  misc; +100 Tirsam buses received Mar 2026 (+2 Scania Fencer electric trials).
- Line heads concentrate on **3 hubs**: Place du 1er Mai, Place des Martyrs,
  Place Maurice Audin (37 of 64 core lines terminate at one of these).
- Also operates the Algiers **téléphériques** (Palais de la Culture / Oued Kniss,
  El Madania, Mémorial / Jardin d'Essai, Notre-Dame d'Afrique / Bologhine) — these
  overlap `ferroviaire`'s Wikidata aerial-tram + gondola nodes.

## Sources
1. **fr.wikipedia "Lignes de bus ETUSA de 1 à 99"** — structured
   `{{Ligne de transport en commun}}` templates. **50 lines defined** (of the 1–99
   range). Fields: `ligne_nom`, `terminus1/2`, `duree`, `nb_arrets`,
   `materiel_roulant`, `depot_nom`, `desserte` (villes + stations/gares +
   téléphériques). Parse via MediaWiki API `action=parse&prop=wikitext`.
   - `https://fr.wikipedia.org/wiki/Lignes_de_bus_ETUSA_de_1_à_99`
   - **Additional line series likely exist (100+) + a main "Lignes de bus ETUSA"
     index** — this capture covers 1–99 only.
2. **fr.wikipedia "Entreprise de transport urbain et suburbain d'Alger"** — company
   facts (fleet, network size, history, hubs). Intro carries AR name.
3. **No official ETUSA open data.** Site `etusa.dz`; no known JSON/GTFS feed.
   Community source ⇒ Wikipedia is **CC BY-SA** (attribution required), not official.

## OpenStreetMap feasibility snapshot — 2026-09-01

`collect-osm.mjs` now captures every Algeria `type=route + route=bus` relation
through the Overpass API in resumable batches. The local artifacts live in
`research/buses/osm/`; `COVERAGE.md` is the human-readable audit. Every raw
response has a receipt in `osm/raw/manifest.json` with its query, endpoint,
retrieval time, OSM timestamp, and hash. Because public mirrors can have
different replication lag, the derived snapshot is explicitly a non-atomic
collection interval rather than one OSM revision.

- **215 directional OSM relations**. A controlled operator/ref/termini pass
  groups these into **147 candidate Lines**: 83 operator-backed urban/suburban,
  two long inter-wilaya candidates, one shorter cross-wilaya review item, eight
  taxi exclusions, and 53 unresolved candidates.
- **202 relations (94%)** carry complete, map-drawable member-way geometry.
- **1,979 unique station members** are referenced; 166 relations carry at least
  one, so station completeness is materially weaker than geometry coverage.
- **109 ETUSA-matched relations / 66 candidate Lines**; 36 of the existing
  package's 50 Wikipedia refs match an OSM ETUSA ref.
- Only **7 relations** carry interval or duration. Service hours exist on 64,
  but there is no departure timetable or live-vehicle feed.
- **12 relations are explicitly taxi-labelled despite `route=bus`**, and seven
  cross a wilaya boundary. Both are review flags, not publishable scope labels.

The full candidate snapshot remains research evidence only. Reviewed subsets
have since been promoted into the package and app: the current release contains
85 operator-backed Lines, 47 matched OSM shapes, 83 Directions, and 1,290
Stations across eight Operators. A candidate is not promoted merely because it
has drawable geometry. OSM data is ODbL; operator pages/apps remain validation
or partnership leads unless they expose a lawful reusable feed.

`analyze-candidates.mjs` produces the ignored `candidate-lines.json`, GeoJSON,
`readiness.json`, and `READINESS.md` audit files from that local snapshot. A
candidate label is deliberately weaker than a publication decision: geometry,
identity, station coverage, operator scope, and reuse rights remain separate.

### Local review artifact

Run:

```sh
pnpm review:buses
```

This builds the standalone offline atlas at
`research/buses/osm/artifact/index.html`. The generated HTML stays in the
ignored research cache, while its tracked source lives in
`research/buses/artifact/`. It embeds the current candidate Lines, Line
geometry, Station members, Operator and Wilaya filters, individual OSM relation
links, and a source-access inventory. It is a review surface only and does not
promote any candidate into `@geoalgeria/buses`.

## Operator and discovery source access — 2026-09-01

`collect-operator-sources.mjs` captured 23 public responses into the ignored
local evidence cache, with retrieval timestamps, byte counts, content types,
and SHA-256 hashes:

- **ETUS Béjaïa:** five official line pages embed five fetchable Google My Maps
  KML exports. Each contains one LineString geometry and only 2–5 waypoint Points,
  so this is useful path/termini evidence but not a full stop inventory. No open
  reuse license was found, so the KML is validation-only and is not copied into
  the package.
- **ETUSTO (Tizi Ouzou):** the official passenger page exposes five line refs
  and termini (1, 7, 1A, 9, 6), plus a 05:30–19:25 service window and 15 DA fare.
  Its Line maps are raster images, and no open reuse license was found.
- **ETUS Oran:** `/api/server` publicly exposes Traccar server metadata, while
  device and position resources require operator access. It is a partnership
  lead, not a public live-data feed.
- **Sétif, Constantine, Annaba, Jijel, Skikda and Ouargla:** the supplied
  third-party Play listings advertise live positions, but no reusable public
  endpoint or reuse grant was identified. The second Ouargla app additionally
  advertises schedules and Line information, but those remain app claims rather
  than a public feed. The assessed listings are retained as timestamped, hashed
  discovery evidence in the ignored cache.
- **[DzairTransport](https://www.dzairtransport.com/):** the public Algiers journey-planning page still exposes a
  departure/destination interface, but the site itself warns that the web
  version is no longer updated and redirects users to Android. It is a legacy
  comparison source, not a freshness source; its assessed page is also retained
  in the ignored evidence cache. A bounded public station-search probe returned
  10 suggestions with station code, name, commune and transport mode, but no
  coordinates; the response is cached as endpoint-shape evidence, not a dataset.

The official Béjaïa refs/termini do not match the nine current Béjaïa OSM
candidate relations closely enough for an automatic operator assignment. Those
OSM relations remain unresolved instead of being relabelled from numeric refs
alone.

## Cleaned data — `etusa-lines-clean.json` (50 lines)
Parser: `parse-etusa.mjs` (kept here). Per line:
```jsonc
{
  "line": "1",
  "terminus1": "El Harrach",
  "terminus2": "Place Aïssat Idir, via Haï El Badr",
  "duration_min": null,
  "stops": 16,                       // nb_arrets (44/50 lines have it)
  "rolling_stock": null,
  "depot": null,
  "passengers_year": null,
  "communes_served": ["El Harrach","Bachdjerrah","Hussein Dey (Gare routière du Caroubier)", "..."],
  "stations_served": ["El Harrach Centre","Haï El Badr","Cité Amirouche","Les Fusillés","..."],
  "opened": null, "closed": null
}
```

## Data-quality notes
- The **Wikipedia seed** is line-level only and has no geometry or coordinates.
  The separate 2026-09-01 OSM research snapshot now supplies feasibility
  geometry and station members, but it is not yet reconciled or published.
- **Partial coverage:** 50 of ~122 lines (only the 1–99 page, and only lines with
  a template). Many attribute fields (length, duration, depot, ridership) are blank
  on Wikipedia.
- `communes_served` / `stations_served` are FR display names with parentheticals;
  reconcile to geoalgeria communes at build time. `stations_served` cross-links to
  `ferroviaire` (metro/tram) and `sogral` (Caroubier gare routière) nodes.

## Scope & structure
`@geoalgeria/buses` = a **multi-operator** package: each operator is a source
(ETUSA first), all normalized to a shared line schema (`line`, `terminus1/2`,
`stops`, `communes_served`, …) + an operator field. Because it's Line data
(not points), it needs an OSM-geometry step (`route=bus` relations) the point
packages don't — a **later, heavier build** than `gares-routieres`/`ferroviaire`.
Téléphériques (ETUSA-run) are guided transport → likely fold into `ferroviaire`
(aerial-tram/gondola), not `buses`.

## Build pipeline (proposed — when greenlit; do **not** build yet)
1. Parse all ETUSA line series (1–99 done → +100s + index) → line attributes.
2. OSM: pull `route=bus` relations for ETUSA → geometry (GeoJSON LineStrings) +
   ordered stops; match to the Wikipedia line list by number/termini.
3. Geocode termini + `stations_served` via OSM/Wikidata; reconcile communes.
4. Add the téléphériques (shared with `ferroviaire` aerial-tram/gondola nodes).
5. Emit lines (GeoJSON) + a stops layer + metadata; credit ETUSA + OSM + Wikipedia.

Roadmap home: **Transport** sector, alongside `ferroviaire`, `sogral`, `ports`,
`frontieres`.
