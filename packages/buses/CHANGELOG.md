# @geoalgeria/buses

## 2.1.1

### Patch Changes

- 76dfd0d: Declare the exact per-package licence terms in the manifest and the LICENSE file.

## 2.1.0

### Minor Changes

- 05e17e5: Accept ETUSA Line identity from an evidenced OpenStreetMap operator match, not
  only from the retained 50-Line registry. That registry is a single crowdsourced
  list of Lines 1-99 and omits the 6xx/7xx suburban network entirely, so 23 Lines
  that OSM carries with an operator or Wikidata tag were being dropped. Each
  publishes with source "osm" and no termini, since a relation's from/to names one
  direction's endpoints rather than the Line's published termini.

  Also joins ETUSA refs on a canonical form, which restores geometry to published
  Lines 3 and 6: OSM writes them zero-padded and the exact-string match silently
  denied them their shapes.

  Widens BusStation to the stops OSM maps as ways. Their coordinate is the way's
  derived centre, so they publish geo_method "osm_way_center" and approximate
  precision rather than claiming a node position they do not have.

  Cross-wilaya routes remain excluded.

- 0308a2a: Reconcile ETUS Tiaret with its extracted official Line payload, publish all five official ETUSTO Lines (three with reusable OSM shapes), add five ETUS Béjaïa Lines with typed stop counts and transcribed service hours, add four ETUS M'Sila Lines from official route pages and diagrams, add eight ETUS Sidi Bel Abbès Lines with complete directional departure lists from supplied official HTML, and add five official ETUS Setif Lines with a verified reusable OSM shape for Line 101. Published Line provenance now identifies Operator sources first and uses OSM only where it supplies reusable geometry.
- b3746f5: Add ETO Oran with Line 83 (Station El Hamri to HPC 41, Ain El Beida), the one
  numbered route among six ETO published as drawings on its official page and
  the project owner supplied. The five destination-named services (Ain El Turck,
  1800 logements Sidi El Bachir, 1430 logements, Mohamed Boudiaf, Tafraoui via
  the airport) are kept as evidence with their via points, not given invented
  refs. Directory-only; the drawings are validation-only geometry.
- 186a9c5: Add ETUL Laghouat Lines 02, 04, 05 and 07 from two supplied official operating
  programs. The Lines are directory-only; dated duty allocations, service times,
  vehicle numbers and an ambiguous ADL route code remain evidence-only.
- 23c4df9: Add ETUS Ain Defla: 16 official Lines across Ain Defla city, Khemis Miliana and
  El Attaf, transcribed from the Operator's 2025 route artwork and Eid al-Adha
  service program supplied by the project owner. Line AD-2 (Hai Mazouni to the
  gare routiere) carries reusable OSM geometry reconciled to that identity; the
  other Lines are directory-only until public geometry appears. Wilaya 44 joins
  the map through AD-2's Stations.
- 354eac0: Add ETUS Annaba: the six Lines the Operator numbers in its Eid al-Adha 2026
  service program (05, 25, 26, 30, 33, 41), transcribed with bilingual termini
  from artwork supplied by the project owner. Nineteen unnumbered services are
  kept as evidence rather than given invented refs. Directory-only: wilaya 23's
  OSM relations carry no identity to match.
- ccc9ebf: Add ETUS Oum El Bouaghi Lines 01–05 with bilingual termini, transcribed from
  numbered Operator diagrams supplied by the project owner. The diagrams' major
  Stations and distances remain source evidence; the Lines are directory-only
  because no reusable public geometry was established.
- 24518b5: Add ETUS Tlemcen: the ten Lines of its Eid al-Adha 2026 service program
  (2A, 2B, 2C, 03, 4B, 4C, 4E, 11, 44, H) with bilingual termini, transcribed
  from artwork supplied by the project owner. Directory-only: the wilaya 13 OSM
  routes are a private corridor pair and university shuttles, none carrying an
  ETUS ref.
- 14aa4bf: Keep the three ETUSA suburban Lines that cross out of Alger: 604 Dergana to
  Reghaia (El Kerrouche) and 630 Hammedi to El Harrach, both matching the AOTU-A
  network plan termini, and 747 Zeralda to Ain Tagourait, carrying the same
  evidenced operator tag. ETUSA's remit is urban and suburban Alger, so these are
  its runs, not another operator's; cross-wilaya routes of any other operator stay
  excluded. Their Stations in Boumerdes and Tipaza are placed by point-in-wilaya.
- ce1509f: Give every Operator its verified official links: `website_url` and `facebook_url`
  on BusOperator, null when not verified rather than guessed. Lines sourced from an
  Operator's Facebook announcement (Setif, Ain Defla) now carry that page as
  `source_url` instead of leaking the internal source key. Add first-party-verified
  Facebook pages for Béjaïa, Sidi Bel Abbès, Laghouat and ETUSTO.
- bb24c0b: Add the reviewed first urban/suburban multi-Operator release: 59 Lines, 42 OSM shapes,
  75 Directions, 1,046 Stations, and 1,878 source-ordered Station memberships across
  ETUSA, ETUS Tiaret, and ETUS Mostaganem.

## 2.0.0

### Major Changes

- e84384a: Data v2 — one canonical record contract across every sector package (breaking schema overhaul).

  Every sector package now shares a single record shape defined by the new `@geoalgeria/schema` dependency, replacing the hand-written, drifted `types/index.d.ts` per package. Read [`packages/schema/MIGRATING.md`](https://github.com/yasserstudio/geoalgeria/blob/main/packages/schema/MIGRATING.md) before adopting `2.0.0`.

  - **Breaking record shape**: `wilaya_code` is a zero-padded **string** (`"16"`, not `16`); commune linkage is `commune_code` (string ONS code) + `commune`; coordinates are `lat`/`lng`; external ids collapse into `refs: { osm, wikidata, … }`; `id` is an opaque string unique within its file (no more global `{sector}:{WW}-{seq}` form). Every record ships in **JSON, CSV and GeoJSON**.
  - **Breaking `geo_precision`**: strictly `exact | approximate | null`, **null if and only if** the record has no coordinate; the old method vocabulary moved to a new `geo_method` field under the same null-iff rule. `exact` now requires ≥3 decimals and a point unique within its file — 409 records that could not carry that claim were downgraded to `approximate`.
  - **Honest metadata**: real per-source `retrieved` dates; licence URLs only where the source is genuinely open, `conditionsOfAccess` prose otherwise. A root `index.json` catalog and a `schema.org/Dataset` descriptor ship alongside the data.
  - **Data fixes**: the capital-coordinate 9-cycle swap repaired; 30+11 mislinked records relinked; emploi communes recovered; 972 previously-dropped tourisme values restored.

  Not part of this release: the core `geoalgeria` dataset and `@geoalgeria/telecom` predate this contract and stay on their current v1 versions until migrated.

## 1.0.0

Algeria's urban bus networks — line-level data, starting with ETUSA (Alger).

### Added

- 50 ETUSA (Établissement de transport urbain et suburbain d'Alger) bus lines from
  fr.wikipedia — termini, stop counts (44/50), communes served, and metro/tram/gare
  stations served en route
- Multi-operator design: `operator`/`network` on every line; more cities/operators
  to be added under the same schema
- `wilaya_code` (16, Alger) joins the geoalgeria model
- Export formats: JSON, CSV, with TypeScript types and helper accessors
- Scope note: **line-level attributes only** — per-stop and per-line geometry
  (OSM `route=bus`) is deferred to v1.1 (ETUSA-tagged OSM route coverage is thin).
  Covers 50 of ~122 ETUSA passenger lines.
