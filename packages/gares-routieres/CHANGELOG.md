# @geoalgeria/gares-routieres

## 2.2.1

### Patch Changes

- 21fcaa1: Four stations get their commune corrected. Their coordinates were always right.

  GHERDAIA is the new gare at Bouhraoua, the northern entrance of Ghardaïa on
  the RN1, and it published as "Dhayet Bendhahoua". EL OUED published as
  "Bayadha", BLIDA as "Ouled Yaich", DJAMAA as "Sidi Amrane". None is a
  corrupted coordinate: this is the commune join's own failure mode. Communes
  carry no polygons in this repo, so `attachCommune` assigns the nearest commune
  centre within the containing wilaya, and a station sitting between two centres
  can land on the wrong one. GHERDAIA's point is 6.46 km from Dhayet
  Bendhahoua's centre and 6.57 km from Ghardaïa's; a 110 m margin renamed the
  wilaya capital's station. EL OUED's margin was 200 m, BLIDA's 200 m.

  Every correction is confirmed twice over: OSM's admin_level-8 boundary places
  each point in the corrected commune, and each source record already said so
  itself (GHERDAIA's address reads "Bouheraoua commune de ghardaia", BLIDA's
  "Cité Ramoul Blida", DJAMAA's "cité 19 Mars 1962 Djamaa", and every city
  field names the corrected commune). An OSM sweep of every knife-edge join
  found four more disputes (BISKRA, ALGER, ALI MENDJILI, BOUHNIFIFIA), but
  there OSM contradicts the source's own city field too, so they stay as
  joined until better evidence exists.

  GHERDAIA was reader-reported on r/algeria the day the departures map went
  public, by someone who knows the geography: the station was being offered to
  travellers under the name of a commune whose town sits 8 km away.

  All four stations keep their wilaya, so all four ids (`47-01`, `39-01`,
  `09-01`, `57-01`) are unchanged. Coverage stays at 74 stations and 52 wilayas.

## 2.2.0

### Minor Changes

- 3d183a8: Six more stations come home.

  Tindouf was not alone. SEBDOU, MAGHENIA, EL OUED, AIN SEFRA, NAAMA and
  RELIZANE all shipped with a corrupted source longitude, and because wilaya and
  commune are derived from the point, each was published from the wrong wilaya
  under the name of whatever commune it landed in. SOGRAL's EL OUED was 542 km
  away and labelled "Krakda"; RELIZANE was "Marsat El Hadjadj"; MAGHENIA was
  "Faidja". In every case the record's own `refs.sogral`, `official_name` and
  `address` already said where the station is, and only the coordinate disagreed.

  Four are the Tindouf defect exactly: a longitude that lost its sign. Where OSM
  has the gare mapped it sits at the source's own latitude with the longitude
  negated, which is what confirms the diagnosis rather than merely fitting it:
  MAGHENIA (way 1214562347), AIN SEFRA (way 307745928), NAAMA (way 304431817).
  SEBDOU is the same flip, uncorroborated only because no gare is mapped at
  Sebdou at all. The other two carry a longitude unrelated to the station:
  EL OUED resolves to OSM way 433835302, whose Arabic name is this record's own
  `official_name`, and RELIZANE to way 293130423 "Gare routière Ouest Relizane",
  600 m from the Bendaoud its address names.

  Every corrected station's derived wilaya now agrees with the wilaya encoded in
  its `refs.sogral`, which was not used to make the fix.

  Because the id encodes the wilaya, six records are re-identified:
  `14-01` → `13-02` (SEBDOU), `14-03` → `13-03` (MAGHENIA), `32-02` → `39-01`
  (EL OUED), `69-01` → `45-02` (AIN SEFRA), `69-02` → `45-03` (NAAMA), and
  `31-01` → `48-01` (RELIZANE). All six old ids are retired and can never be
  reassigned. No other station's id changes. Coverage stays at 74 stations and
  52 wilayas: wilayas 39 and 48 gain their first station, 31 and 69 lose theirs.

## 2.1.0

### Minor Changes

- 78886d3: Tindouf comes home, and every station gains its MAHATATI agency id.

  Station 33-01 TINDOUF shipped with a sign-flipped source longitude (+8.125
  for a station at 8.13°W), which also derived the wrong wilaya and commune
  (33/Illizi) from the wrong point. The coordinate is now OSM-verified (node
  4593158192), the station sits in Tindouf (wilaya 37, commune 3701) as its own
  refs and address always said, and coverage grows to 52 wilayas. Because the
  id encodes the wilaya, the record is re-identified as 37-01; 33-01 is retired
  in the new data/retired-ids.json and can never be reassigned. No other id
  changes: the generator now pins committed ids through carryOverIds.

  New: refs.mahatati_agency, the per-station MAHATATI departure-agency id
  (73 of 74 stations; In Saleh is not a departure agency), staged from the
  public MAHATATI departure-station list. refs.sogral is now documented as a
  town-level id shared by twin stations (Annaba and Sidi Brahim, the three
  Constantine gares): never treat it as a station key.

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

Algeria's intercity bus stations — 74 SOGRAL gares routières, geocoded and typed.

### Added

- 74 intercity bus stations across 51 wilayas from **SOGRAL** (EPE SOGRAL Spa),
  the state operator of Algeria's gares routières, via its live registry
  (`live.sogral.com/api/live/agencies`)
- Official name, gare name, postal address, coordinates (74/74 geocoded),
  and total/built surface areas per station
- `wilaya_code`/`commune`/`commune_code` attached by nearest-centroid join
  against the geoalgeria commune model — which also reconciles SOGRAL's legacy
  48-wilaya codes to the 58/69 model (e.g. Touggourt, Djanet)
- 3 broken upstream coordinates fixed: Touggourt & Djanet from OpenStreetMap,
  Guelma from its commune centroid (`geo_precision: "approx"`)
- `sogral_id` + `sogral_code` cross-links kept for provenance
- Export formats: JSON, CSV, GeoJSON, with TypeScript types and helper accessors
