# Roadmap

Open work on the data side. The app has its own roadmap at
[`geoalgeria.com/docs/ROADMAP.md`](https://github.com/yasserstudio/geoalgeria.com/blob/main/docs/ROADMAP.md);
items here are the ones whose work lives in **this** repo, even when the symptom
shows up in the app.

Every item states what it costs and what is genuinely unknown, so nothing here
reads as further along than it is.

---

## Contract

- [ ] **`@geoalgeria/telecom` still predates the v2 contract.** Its
  `data/metadata.json` carries no `schema_version` at all and it is absent from
  the `MIGRATIONS` config in `scripts/lib/v2-transforms.mjs`, so it never went
  through the v2 pass every other package did. Coverage polygons are not a
  `GeoRecord` collection, which is why it was skipped and why the migration is a
  design question rather than a mechanical one: decide whether coverage is a
  relation file (like `routes.json`) or its own shape, then migrate.
  _(logged 2026-07-28)_

## Aviation

- [ ] **Scheduled flight duration per route.** Asked for on the route card and
  refused, correctly: there is no duration field, and **0 of 122** routes in
  `research/_flight-routes/route-dataset.json` carry one. The great-circle
  duration check used during verification was computed and discarded. Deriving a
  duration from distance would put a fabricated number beside sourced ones. Wants
  scheduled block times collected per route from a citable source.
  _(logged 2026-07-28)_

- [ ] **64 routes are `listed` rather than `verified`,** and some pairs are
  one-directional (an outbound leg with no recorded return). `listed` means a
  published table names the carrier serving the pair without confirming Air
  Algérie operates it. Open-ended collection work with no natural finish line;
  better run as background than as a track.
  _(logged 2026-07-28)_

- [ ] **Carriers beyond Air Algérie.** v1 is deliberately one operator, which the
  app's title and copy now have to caveat, since other carriers do fly nonstop
  from Algeria. Widening it is mostly a collection question: the app's route card
  already falls back to a bare code for any carrier with no mark on file.
  _(logged 2026-07-28)_

## Core dataset (geoalgeria)

- [ ] **The package ships 1,528 of Algeria's 1,541 communes.** The 13 absent
  ones are communes of the 2026 wilayas (10, 15, 23, 25, 31, 46, 51, 55, 64,
  66, 68) that share a name with a commune elsewhere in the country; sourced
  records with Wikidata QIDs exist from the 2026-07-29 reconciliation (the app
  repo's algeria.json rows were repaired from them; this package still needs
  the additions plus a version bump and README count updates in all locales).
  Open sub-questions: Menaa's wilaya assignment (Medjedel daira's transfer to
  wilaya 68 is unconfirmed against the decree) and 4 missing postal codes.
  _(logged 2026-07-29)_

- [ ] **`code_commune` duplicates are ingestion corruption, not a scheme.**
  34 duplicated code groups (79 rows); in 33 of them every colliding row also
  shares one identical postal_code, the signature of a forward-fill bug in the
  original ingestion. The code is the pre-2026 ONS code and was never meant to
  collide. Needs a per-row re-derivation against an ONS table, and the same
  pass should settle the postal-code wilaya-prefix inconsistency (some new-
  wilaya communes carry new-prefix postals, some keep the parent's).
  _(logged 2026-07-29)_

- [ ] **4 communes disagree with the app file by tens of km** (Souama w15,
  Sidi Demed w67, M'fatha w67, Ouled Sidi Brahim w68): same name and wilaya,
  coordinates ~1 degree apart. Which side is right is unresolved; verify
  against Wikidata/OSM before touching either.
  _(logged 2026-07-29)_

## Releases

- [ ] **Umbrella release tag for the current state.** Per-package releases have
  kept up; the project-level tag has not. Manual, and worth doing at the next
  meaningful group of bumps rather than on its own.
  _(logged 2026-07-22)_

---

## Recently closed

- **Foreign airport names, in every language**: shipped in the pending 2.3.0.
  Every route endpoint carries `name_en` / `name_ar` from Wikidata (IATA-matched,
  coordinate-checked, air-base homonyms excluded), and the foreign `name` field
  now carries the Wikidata French label instead of OurAirports English. Pipeline:
  `research/_flight-routes/localize_endpoint_names.py`. Closed 2026-07-29.
- **Dated-snapshot framing**: shipped in the pending 2.3.0 as
  `metadata.routes_as_of`, stamped from the research dataset's `as_of` (set only
  by a real verification pass, currently 2026-07-27). Closed 2026-07-29.

- **`gares-routieres` geo precision**: verified, nothing to fix. The 2 records
  behind the note (33-03 Illizi, 65-01 Ain Oussara) were already downgraded to
  `geo_precision: "approximate"` by the 409-record sweep (`99f6f27`,
  2026-07-20); `geo_method: "exact"` was kept on purpose per that commit
  (method records how the point was obtained; only the precision claim was
  wrong). The note predated the sweep. Verified 2026-07-29.

- **Em-dash sweep of the package READMEs**: done. Grepping every
  `packages/*/README*.md` for the character returns nothing, so the sweep tracked
  since 2026-07-23 has already landed. Verified 2026-07-28.
