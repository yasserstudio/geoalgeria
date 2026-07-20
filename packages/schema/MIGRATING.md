# Migrating a dataset package to schema v2

The repeatable recipe every `@geoalgeria/*` data package follows to adopt the v2
contract. Worked reference: **`@geoalgeria/pharmacies`** (see its `scripts/fetch.mjs`).

The migration is done in the **generator** (`scripts/fetch.mjs` / build script), not by
hand-editing data — then the outputs are regenerated. A package with no generator
(agriculture, formation-professionnelle, industrie-pharmaceutique, tourisme, core
`dataset`) needs a small transform script first (tracked under P3).

## Steps

1. **Declare the dependency.** In the package's `package.json`:
   ```json
   "dependencies": { "@geoalgeria/schema": "workspace:^" }
   ```
   Then `pnpm install` (symlinks the workspace package).

2. **Shape records to the canonical `GeoRecord`.** Add a `toV2(rows)` pass that maps the
   package's internal shape to the contract. Field rules:
   - `wilaya_code` → zero-padded **string** `"01".."69"` (use `wcode` from schema).
   - `commune_code` → **string**, 4-digit ONS code (`String(code).padStart(4, "0")`), or `null`.
     First 2 digits should equal `wilaya_code`; mismatches for new wilayas 49–69 are a known
     upstream staleness (a **warning**, fixed in P3 — do not paper over them).
   - `lat`/`lng` → numbers or **both** `null`. Never one set and the other null.
   - `geo_precision` → **`"exact" | "approximate"`** on a geocoded record, **`null`** when
     `lat`/`lng` are null (the validator enforces the iff, both directions). Put the
     source-specific method (e.g. `"osm_node"`, `"commune_centroid"`) in `geo_method` —
     and set `geo_method` to `null` too on an ungeocoded record: no method produced a
     point, so `"ungeocoded"` / `"none"` would be a false claim.
   - External ids (`osm_id`, `wikidata`, `msp_id`, …) → collapse into `refs: { osm, wikidata, msp }`.
   - `source` → a short key that matches a `metadata.sources[].key`.
   - Drop denormalized `wilaya`/`wilaya_ar` name fields — derivable from `wilaya_code`.
   - Keep domain-specific extras (phone, operator, type/type_label_*, capacity, …) as-is.
   - `id` — keep the existing stable `{wilaya}-{seq}` form (unique within the dataset).

3. **Emit via the schema helpers.** Import `{ toCSV, toGeoJSON, buildMetadata }` from
   `@geoalgeria/schema`; delete any inlined copies. Column order for CSV should lead with the
   canonical fields, then domain extras.

4. **Build canonical metadata.** Replace the hand-built metadata object with
   `buildMetadata({ package, records, sources, license, updated, estimatedUniverse, coverageNote, titles })`.
   Spread it and append domain-specific stats (e.g. `named`, `with_phone`). `buildMetadata`
   stamps `schema_version: "2.0.0"` — which is what flips the CI validator to the v2 gate.

5. **Regenerate & validate.**
   ```
   node packages/<pkg>/scripts/fetch.mjs --cache   # (or the build script)
   node scripts/validate-packages.mjs <pkg>        # must PASS; warnings are OK
   ```

6. **Update the types.** `types/index.d.ts`: `import type { GeoRecord, DatasetMetadata }`
   and `extends` them with the package's specific fields (see pharmacies).

7. **README** field table / examples — align in the docs pass (P6), not per-package.

## What "passing" looks like
- `validate-packages.mjs <pkg>` prints `OK` and the run ends `PASSED`.
- `commune_code`-prefix warnings for wilayas 49–69 are expected until the P3 commune
  reconciliation; they are non-blocking.
- No **errors** (bad wilaya_code type, dup id, out-of-Algeria coord, bad geo_precision,
  metadata shape).
