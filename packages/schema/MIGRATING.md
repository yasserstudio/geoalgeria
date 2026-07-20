# Migrating a dataset package to schema v2

The repeatable recipe every `@geoalgeria/*` data package follows to adopt the v2
contract. Worked reference: **`@geoalgeria/pharmacies`** (see its `scripts/fetch.mjs`).

The migration is done in the **generator** (`scripts/fetch.mjs` / build script), not by
hand-editing data — then the outputs are regenerated. A package with no generator
(agriculture, formation-professionnelle, industrie-pharmaceutique, tourisme, core
`dataset`) needs a small transform script first (tracked under P3).

## Steps

1. **Declare the dependency.** Only the generator uses the schema package, and `scripts/` is
   not published, so it is a **dev** dependency — in the package's `package.json`:
   ```json
   "devDependencies": { "@geoalgeria/schema": "workspace:^" }
   ```
   Then `pnpm install` (symlinks the workspace package). Nothing under `files[]` may import
   it — see step 6.

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
     point, so `"ungeocoded"` / `"none"` would be a false claim. The validator enforces
     that iff on `geo_method` as well, so a geocoded record must name its method.
   - External ids (`osm_id`, `wikidata`, `msp_id`, …) → collapse into `refs: { osm, wikidata, msp }`.
   - `source` → a short key that matches a `metadata.sources[].key`.
   - Drop denormalized `wilaya`/`wilaya_ar` name fields — derivable from `wilaya_code`.
   - Keep domain-specific extras (phone, operator, type/type_label_*, capacity, …) as-is.
   - `id` — an **opaque string, unique within its file** (decision 10). Keep whatever stable
     form the package already shipped (`"01-001"`, `"16-eph-01"`, `"00042"`, `"daad"`, `"1"`);
     consumers must treat it as opaque and scope it by file. It is *not* globally unique, and
     not unique across files even within one package.
     **A per-file prefix is required when the package's `index.js` merges several files into
     one collection** — `banques.all()`, `emploi.agencies()`, `mobilis.all()`, `tourisme.all()`.
     Those files share one id namespace, so an id that is only file-unique silently collapses
     records in any id-keyed lookup built from the merged array. Prefix each file with a
     constant naming that file (`ag-`, `pdv-`, `lodging-`, `attraction-`, `historic-`,
     `thermal-spring-`, `park-`); a constant prefix also preserves the file's committed id
     sort order. Apply it in the generator, not by editing data — `validate-packages.mjs`
     enforces per-file uniqueness always and joint uniqueness across those merged sets.

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

6. **Update the types.** `types/index.d.ts` must be **self-contained** — declare the canonical
   fields locally rather than importing `GeoRecord`/`DatasetMetadata`. `types/` is published
   in `files[]` but `@geoalgeria/schema` is not in `release.yml`'s publish list, so a shipped
   declaration that imports it makes the package uninstallable. Declare `geo_precision` as
   `"exact" | "approximate" | null`, make `geo_method` and `lat`/`lng` nullable exactly where
   the data allows, and give enum-like fields string-literal unions. Worked references:
   `sante`, `poste`, `mobilis`. `validate-packages.mjs` compares every declared property name
   against the shipped JSON key set in both directions and fails on a mismatch.

7. **README** field table / examples — align in the docs pass (P6), not per-package.

## What "passing" looks like
- `validate-packages.mjs <pkg>` prints `OK` and the run ends `PASSED`.
- `commune_code`-prefix warnings for wilayas 49–69 are expected until the P3 commune
  reconciliation; they are non-blocking.
- No **errors** (bad wilaya_code type, dup id, out-of-Algeria coord, bad geo_precision,
  metadata shape).
