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

- [ ] **Foreign airport names, in every language.** `route-endpoints.json` carries
  one `name` per airport and it is French, so the app renders "Aéroport d'Alger"
  inside an Arabic card. The 13 Algerian origins are worked around with app-side
  strings; the **50 foreign endpoints** are not, and should not be, since names
  belong in the data. Wants `name_en` / `name_ar` on the endpoint records, then a
  minor bump. Bounded, and the highest-value item on this list.
  _(logged 2026-07-28)_

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

- [ ] **Dated-snapshot framing.** Routes churn seasonally, unlike every other
  dataset here, so the package should carry a validity window rather than reading
  as evergreen. Affects the descriptor, not the records.
  _(logged 2026-07-27)_

## Releases

- [ ] **Umbrella release tag for the current state.** Per-package releases have
  kept up; the project-level tag has not. Manual, and worth doing at the next
  meaningful group of bumps rather than on its own.
  _(logged 2026-07-22)_

---

## Recently closed

- **`gares-routieres` geo precision**: verified, nothing to fix. The 2 records
  behind the note (33-03 Illizi, 65-01 Ain Oussara) were already downgraded to
  `geo_precision: "approximate"` by the 409-record sweep (`99f6f27`,
  2026-07-20); `geo_method: "exact"` was kept on purpose per that commit
  (method records how the point was obtained; only the precision claim was
  wrong). The note predated the sweep. Verified 2026-07-29.

- **Em-dash sweep of the package READMEs**: done. Grepping every
  `packages/*/README*.md` for the character returns nothing, so the sweep tracked
  since 2026-07-23 has already landed. Verified 2026-07-28.
