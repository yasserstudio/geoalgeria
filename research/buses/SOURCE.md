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
- **Line-level attributes only — no geometry, no coordinates.** For a geocoded
  dataset, pull OSM route relations (`route=bus`, `operator=ETUSA`/`network=ETUSA`)
  for polylines, and geocode termini/stops via OSM/Wikidata.
- **Partial coverage:** 50 of ~122 lines (only the 1–99 page, and only lines with
  a template). Many attribute fields (length, duration, depot, ridership) are blank
  on Wikipedia.
- `communes_served` / `stations_served` are FR display names with parentheticals;
  reconcile to geoalgeria communes at build time. `stations_served` cross-links to
  `ferroviaire` (metro/tram) and `sogral` (Caroubier gare routière) nodes.

## Scope & structure
`@geoalgeria/buses` = a **multi-operator** package: each operator is a source
(ETUSA first), all normalized to a shared line schema (`line`, `terminus1/2`,
`stops`, `communes_served`, …) + an operator field. Because it's line/route data
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
