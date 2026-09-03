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


## Operator-source check, 2026-09-03

Reviewed before deciding which OSM-only routes outside Alger to publish. Web and
official-site sources only; every operator Facebook page found is login-walled to
a fetcher and exposed nothing but its title.

- **[seen]** ETUSA 604 (Dergana - Reghaia El Kerrouche) and 630 (Hammedi - El
  Harrach) appear with matching termini in the AOTU-A/ETUSA plan-derived
  600-series list; 747 (Zeralda - Ain Tagourait) does not appear in the 700-series
  list but carries the same ETUSA operator and network tags in OSM. Source:
  [fr.wikipedia 600-699](https://fr.wikipedia.org/wiki/Lignes_de_bus_ETUSA_de_600_%C3%A0_699),
  [fr.wikipedia 700-799](https://fr.wikipedia.org/wiki/Lignes_de_bus_ETUSA_de_700_%C3%A0_799).
  The same list corroborates 601, 606, 643, 701 and 707 among the OSM-identified Alger Lines.
  etusa.dz exposes no line list (only "186 lignes"); aotu-alger.dz/etusa.html fails TLS.
  **Decision: keep 604, 630, 747.**
- **[seen]** ETUAD Ain Defla: official page exists at facebook.com/ETUS44 (login-walled);
  no site, no line list; tracking apps only. OSM relations X and 2 carry operator=ETUAD
  but no from/to. **Resolved the same day:** the project owner read the ETUS44 page and supplied the
  Operator's 2025 route artwork and Eid service program; 16 Lines transcribed, AD-2 matched to
  OSM 16022861 (`sources/buses/etus-ain-defla-lines.json`). Both Aïn Defla apps were
  audited statically the same day, see [AIN-DEFLA-APP-AUDIT.md](./AIN-DEFLA-APP-AUDIT.md):
  the official app's static API host is dead and the third-party app is a Traccar login wall.
- **[seen]** Tlemcen: etus-tlemcen.dz has no line list (30 buses, 2017 ridership only);
  facebook.com/etustlemcen13 login-walled. OSM A42/B42 are tagged Prive; the Chetouane
  routes are university shuttles. **Decision: exclude the OSM routes.** Resolved 2026-09-03 the Aïn Defla way:
  the project owner supplied the Operator's Eid al-Adha 2026 program; ten Lines (2A, 2B, 2C, 03, 4B, 4C, 4E,
  11, 44, H) transcribed directory-only (`sources/buses/etus-tlemcen-lines.json`).
- **[seen]** Bechar: ETUSB exists (etus-bechar.dz, DNS dead at check time); OSM Line 1
  Bechar - Kenadsa in both directions with 26 stops but no operator tag. **Decision: not yet.**
  Lead: ETUSB site when it returns.
- **[seen]** Oran: fr.wikipedia "Reseau de bus d'Oran" (Ministry of Interior + GuideOran)
  lists line 39 Palais des Sports (M'dina Jdida) - Hai Nedjma; OSM "Line 39" has
  to=Medina Jdida, 0 stop members, no operator. **Decision: not yet.** Lead: that table.
- **[seen]** Annaba, resolved 2026-09-03 the Aïn Defla way: the project owner read the ETUS Annaba page and
  supplied its Eid al-Adha 2026 service program; six numbered Lines (05, 25, 26, 30, 33, 41) transcribed,
  nineteen unnumbered services kept as evidence (`sources/buses/etus-annaba-lines.json`). Directory-only:
  wilaya 23 OSM relations carry no identity.
- **[seen]** Ghardaia (ETU-G, press only; OSM ref 32 named "Bus 1"), Khenchela, Batna
  (ETUB, press only), Annaba (facebook page 100063517660926, login-walled; OSM routes have
  no ref, name or stops), Ouled Djellal: no official line list found. **Decision: exclude.**
- **[seen]** Bejaia OSM cluster is Sidi Aich private routes, not ETUS Bejaia. **Decision: exclude.**
- **[inferred]** Publishing untagged routes as "operator not stated" would change what the
  dataset claims to be. Not done. Revisit per operator when an official list surfaces.
