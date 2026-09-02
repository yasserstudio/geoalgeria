# Bus coverage and next-Wilaya expansion priorities

Reviewed on 2026-09-02 from the committed `@geoalgeria/buses` package and its
retained official-source/OSM research artifacts. This is a research decision
note; it does not promote data.

`seen` means directly present in a cited committed file. `inferred` means a
recommended action derived from those observations.

## Current directory and map coverage

- **[seen]** The published working tree currently has **85 Lines across eight
  Operators/Wilayas**: Alger 50, Sidi Bel Abbès 8, Tiaret 7, Tizi Ouzou 5,
  Béjaïa 5, Sétif 5, M'Sila 4, and Mostaganem 1. Source:
  [`packages/buses/data/lines.json`](../../packages/buses/data/lines.json),
  [`packages/buses/data/operators.json`](../../packages/buses/data/operators.json).
- **[seen]** **47 of the 85 Lines have drawable shapes**: Alger 33, Tiaret 7,
  Tizi Ouzou 3, Sétif 3, and Mostaganem 1. Béjaïa, M'Sila, and Sidi Bel Abbès
  are directory/timetable coverage only at present. Sétif Lines 105 and 106A
  are also directory-only. Source:
  [`packages/buses/data/lines.json`](../../packages/buses/data/lines.json),
  [`packages/buses/data/shapes.json`](../../packages/buses/data/shapes.json).
- **[seen]** The committed Station layer contains 1,290 Stations and the Line
  membership file contains 2,105 memberships. Source:
  [`packages/buses/data/stations.json`](../../packages/buses/data/stations.json),
  [`packages/buses/data/station-memberships.json`](../../packages/buses/data/station-memberships.json).
- **[seen]** The national research summary was regenerated on 2026-09-02 and
  now agrees with the package totals and all eight represented Wilayas. Source:
  [`research/buses/national/README.md`](./national/README.md).

## User-supplied official sources

### M'Sila

- **[seen]** The official ETUS M'Sila capture exposes exactly four Line pages,
  and all four are already in the package: 11, 12, 16, and 17. The supplied
  `/page/la-ligne-10` URL is misleading: the captured page title/content is
  **Line 17**, not a fifth Line 10. Source:
  [`research/buses/osm/operator-sources/etus-msila-home.html`](./osm/operator-sources/etus-msila-home.html),
  [`research/buses/osm/operator-sources/etus-msila-line-17.html`](./osm/operator-sources/etus-msila-line-17.html),
  [official page](https://etus-msila.dz/page/la-ligne-10).
- **[seen]** M'Sila publishes route diagrams as raster images, but the current
  package has no M'Sila shape or ordered Station membership. Source:
  [`research/buses/osm/operator-sources/etus-msila-line-17-diagram.png`](./osm/operator-sources/etus-msila-line-17-diagram.png),
  [`packages/buses/data/lines.json`](../../packages/buses/data/lines.json).
- **[inferred]** Treat M'Sila as a **geometry-enrichment** task, not a new-Wilaya
  task. Request an authorized vector/GTFS export or map the four Lines in OSM;
  do not convert the diagrams into authoritative geometry without a reuse grant.

### Sidi Bel Abbès

- **[seen]** The supplied official HTML has already yielded eight timetable
  Lines: 3B, 09, 11, 16, 25, 26, 27, and 28. None has a shape. Source:
  [`research/buses/promote-sidi-bel-abbes-supplied-html.mjs`](./promote-sidi-bel-abbes-supplied-html.mjs),
  [`packages/buses/data/lines.json`](../../packages/buses/data/lines.json).
- **[inferred]** The supplied `gps.etus22.dz` share link should be evaluated as
  a **live-vehicle lead**, not assumed to be a passenger-Line geometry feed.
  Before integration, capture endpoint receipts, confirm what the share token
  authorizes, obtain republication permission, and keep expiring tokens out of
  committed files. Source lead: [official GPS portal](https://gps.etus22.dz:8082/).
- **[inferred]** Sidi Bel Abbès is the highest-value existing-Wilaya geometry
  gap because its timetable data is already structured. Acquire Lines 3B, 09,
  11, 16, 25, 26, 27, and 28 from an authorized vector source or fresh OSM
  route relations.

### Tiaret

- **[seen]** Tiaret is already map-enabled with seven Lines (26–32), seven
  shapes, and Station memberships. The retained OSM audit actually contains
  eight Tiaret geometry candidates, all with Station members, so one candidate
  remains to reconcile against the published seven. Source:
  [`packages/buses/data/lines.json`](../../packages/buses/data/lines.json),
  [`research/buses/osm/READINESS.md`](./osm/READINESS.md).
- **[inferred]** Reconcile that eighth OSM candidate first. Use the supplied
  `gps.etus-tiaret.dz` portal only to validate current service/vehicle-to-Line
  assignment unless the Operator provides an explicit reusable route export;
  live traces are not authoritative scheduled Line shapes. Source lead:
  [official GPS portal](https://gps.etus-tiaret.dz/).

## Next concrete geometry priorities

1. **[inferred] Sidi Bel Abbès — fill the largest structured shape gap.** Eight
   official timetable Lines already exist; obtain vector paths and ordered
   Stations for those exact refs. This improves the map without inventing new
   Line identity.
2. **[inferred] M'Sila — vectorize through an authorized source.** Four official
   Line identities and diagrams exist, but neither reusable vectors nor ordered
   Station data are committed.
3. **[inferred] Béjaïa — resolve licensing and identity.** Five official Line
   pages expose fetchable Google My Maps KML, but no open reuse licence was
   found, and nine Béjaïa OSM candidates do not safely match the official refs.
   Use the official KML for validation only until permission is obtained; do a
   manual termini/ref reconciliation against OSM. Source:
   [`research/buses/SOURCE.md`](./SOURCE.md),
   [`research/buses/osm/READINESS.md`](./osm/READINESS.md).
4. **[inferred] Aïn Defla — identity audit.** Two ETUAD OSM
   relations have complete paths and 3/5 Station members, but both remain
   `needs_identity`; they are not ready for automatic promotion. Verify Line X
   and Line 2 termini with an Operator-owned source. Source:
   [`research/buses/osm/candidate-lines.json`](./osm/candidate-lines.json).
5. **[inferred] Oran — establish a publishable static network before any live
   pilot.** The operator tracker is an authorization lead, not a Line dataset.
   Request current Line identities, termini, shapes, and reuse terms; do not
   derive a public network from authenticated vehicles or exposed tokens.

## Promotion gate

- **[inferred]** A new Wilaya should enter the production package only after
  Operator identity, Line ref/termini, reusable geometry rights, and ordered
  Station evidence are each explicit. Live GPS, raster diagrams, and app-store
  claims are validation leads, not substitutes for those four gates.
- **[inferred]** Sétif's safe promotion is complete: Lines 101, 104, and 106B
  have reviewed shapes, while 105 and 106A correctly remain directory-only.
  No further Wilaya is ready for automatic promotion today. Sidi Bel Abbès,
  M'Sila, and Béjaïa need geometry/licensing work; Aïn Defla needs identity;
  Oran needs an authorized static network source before a live pilot.
