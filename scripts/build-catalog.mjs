#!/usr/bin/env node
// Generate the repo catalog — one root index.json listing every published
// dataset, plus a schema.org/DCAT `Dataset` descriptor per package — from the
// packages' own committed metadata.json. Nothing here invents a number: every
// count, bbox, licence and date is copied out of the file the package's own
// generator wrote, through @geoalgeria/schema's buildManifest / buildDcat.
//
// Why it exists: the catalog is the entry point for the Public API (#4) and for
// Google Dataset Search / AI answer engines, which read a dataset's metadata and
// never see the README that qualifies it.
//
// Where the artifacts live:
//   index.json                            — repo root, not published to npm (the
//                                           root package is private); served from
//                                           GitHub raw / jsDelivr / geoalgeria.com.
//   packages/<pkg>/dataset-metadata.json  — package root, shipped in files[] so
//                                           consumers and crawlers get it from the
//                                           npm tarball and the CDN. Same name and
//                                           place as the core `geoalgeria`
//                                           package's hand-written descriptor.
// Neither lives under data/, so the validatePackageFiles gate (which walks data/
// for derived .csv/.geojson) is unaffected; the files[] requirement for the
// descriptor is enforced by --check below instead.
//
// Usage: node scripts/build-catalog.mjs           write the catalog
//        node scripts/build-catalog.mjs --check   fail if the committed catalog
//                                                 differs from current data

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest, buildDcat } from "../packages/schema/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/yasserstudio/geoalgeria";
const HOMEPAGE = "https://geoalgeria.com";
const read = (p) => JSON.parse(readFileSync(p, "utf-8"));

// Packages that do not meet the v2 metadata contract, listed by name so a new one
// cannot fall through unnoticed (see the guard in collect()). Both are real,
// published datasets, so they belong in the catalog — with the figures their own
// files actually carry, and schema_version null so the entry says it is not v2.
//
//   telecom  — bespoke nested coverage/<tech>/ shape, no canonical metadata.json;
//              its numbers come from data/metadata.json's coverage["5G"] block.
//   dataset  — the core `geoalgeria` package: administrative divisions, not
//              GeoRecords. It ships no data/metadata.json at all and keeps its own
//              hand-written dataset-metadata.json, which this script does not touch.
const V1_HOLDOUTS = {
  telecom: () => {
    const m = read(join(ROOT, "packages", "telecom", "data", "metadata.json"));
    const c = m.coverage["5G"];
    return {
      package: "@geoalgeria/telecom",
      schema_version: null,
      title_en: "Algeria 5G coverage points",
      record_count: c.total,
      geocoded_count: c.total,
      geocoded_pct: 100,
      wilayas_covered: c.wilayas_covered,
      bbox: null,
      license: m.license,
      updated: m.generated_at,
    };
  },
  dataset: () => {
    const a = read(join(ROOT, "packages", "dataset", "data", "algeria.json"));
    const d = read(join(ROOT, "packages", "dataset", "dataset-metadata.json"));
    const communes = a.reduce((n, w) => n + w.communes.length, 0);
    return {
      package: "geoalgeria",
      schema_version: null,
      title_en: "Algeria administrative divisions (wilayas, dairas, communes)",
      record_count: communes,
      geocoded_count: communes,
      geocoded_pct: 100,
      wilayas_covered: a.length,
      bbox: null,
      license: d.license,
      updated: d.dateModified,
    };
  },
};

const NOTE =
  "Every figure is copied from the package's own metadata.json — nothing is computed here. " +
  "`coverage` appears only where the package states an estimated universe, and always carries " +
  "the note saying which universe it divides by. Entries with schema_version null predate the " +
  "v2 data contract (see each package's README).";

/** Real download URLs for the entity files a package actually ships. */
function distributions(pkg, meta) {
  const dir = join(ROOT, "packages", pkg, "data");
  const cdn = (p) => `https://cdn.jsdelivr.net/npm/${meta.package}/data/${p}`;
  const entities = meta.entities ? meta.entities.map((e) => e.file) : defaultEntityFiles(dir);
  const out = [];
  for (const file of entities) {
    const base = file.replace(/\.json$/, "");
    out.push({ name: `${base} (JSON)`, format: "application/json", url: cdn(file) });
    if (existsSync(join(dir, "csv", `${base}.csv`)))
      out.push({ name: `${base} (CSV)`, format: "text/csv", url: cdn(`csv/${base}.csv`) });
    if (existsSync(join(dir, "geojson", `${base}.geojson`)))
      out.push({ name: `${base} (GeoJSON)`, format: "application/geo+json", url: cdn(`geojson/${base}.geojson`) });
  }
  return out;
}

/** Single-entity packages don't list `entities` — take the one data/*.json file. */
const defaultEntityFiles = (dir) =>
  readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "metadata.json");

/** Every package directory that ships data, split into v2 and declared holdouts. */
function collect() {
  const v2 = [];
  const holdouts = [];
  for (const pkg of readdirSync(join(ROOT, "packages")).sort()) {
    const metaPath = join(ROOT, "packages", pkg, "data", "metadata.json");
    const hasData = existsSync(join(ROOT, "packages", pkg, "data"));
    if (!hasData) continue; // dataless umbrellas (transport, pharma) and schema itself
    if (V1_HOLDOUTS[pkg]) {
      holdouts.push({ pkg, meta: V1_HOLDOUTS[pkg]() });
      continue;
    }
    if (!existsSync(metaPath))
      throw new Error(
        `packages/${pkg}: ships data/ but no data/metadata.json, and is not a declared ` +
          `V1_HOLDOUT — add it to the contract or name it in build-catalog.mjs`,
      );
    const meta = read(metaPath);
    if (meta.schema_version !== "2.0.0")
      throw new Error(
        `packages/${pkg}: schema_version ${JSON.stringify(meta.schema_version)} is not "2.0.0" ` +
          `and the package is not a declared V1_HOLDOUT`,
      );
    v2.push({ pkg, meta });
  }
  // `dataset` ships data/ but keeps its metadata elsewhere; it is a declared holdout.
  return { v2, holdouts };
}

/** The full catalog: the root index plus one descriptor per v2 package. */
function build() {
  const { v2, holdouts } = collect();
  const index = buildManifest(
    [...v2, ...holdouts].map(({ meta }) => meta).sort((a, b) => (a.package < b.package ? -1 : 1)),
    { note: NOTE },
  );
  const descriptors = v2.map(({ pkg, meta }) => ({
    pkg,
    path: join(ROOT, "packages", pkg, "dataset-metadata.json"),
    json: buildDcat(meta, { homepage: HOMEPAGE, repo: REPO, distributions: distributions(pkg, meta) }),
  }));
  return { index, descriptors, v2 };
}

const ser = (o) => JSON.stringify(o, null, 2) + "\n";
const INDEX_PATH = join(ROOT, "index.json");

// `generated` is deliberately absent from the written artifact: a timestamp would
// differ on every run and the drift check below would fail on the clock rather
// than on the data. Freshness is per-dataset (`updated`), which is real.
const { index, descriptors, v2 } = build();

if (process.argv.includes("--check")) {
  // Two drift classes with two different remedies. Regenerating fixes a missing or
  // stale artifact; it does nothing at all for a files[] that omits the descriptor,
  // because this script does not write package.json. Printing one command for both
  // sends the reader round a loop that cannot succeed.
  const REMEDY = {
    artifact: "node scripts/build-catalog.mjs",
    files: 'add "dataset-metadata.json" to files[] in the package.json(s) above, by hand',
  };
  const drift = [];
  const cmp = (path, want) => {
    if (!existsSync(path)) drift.push({ cls: "artifact", msg: `${path.slice(ROOT.length + 1)} is missing` });
    else if (readFileSync(path, "utf-8") !== want)
      drift.push({ cls: "artifact", msg: `${path.slice(ROOT.length + 1)} is stale` });
  };
  cmp(INDEX_PATH, ser(index));
  for (const d of descriptors) cmp(d.path, ser(d.json));
  // The descriptor is only discoverable if npm actually publishes it.
  for (const { pkg } of v2) {
    const files = read(join(ROOT, "packages", pkg, "package.json")).files || [];
    if (!files.includes("dataset-metadata.json"))
      drift.push({
        cls: "files",
        msg: `packages/${pkg}/package.json: files[] omits "dataset-metadata.json" — npm would not publish it`,
      });
  }
  if (drift.length) {
    console.error(`\nFAILED: the committed catalog does not match the data (${drift.length}):`);
    for (const d of drift) console.error(`  - ${d.msg}`);
    for (const cls of Object.keys(REMEDY))
      if (drift.some((d) => d.cls === cls)) console.error(`\nFix: ${REMEDY[cls]}`);
    process.exit(1);
  }
  console.log(`  OK: catalog in sync (index.json + ${descriptors.length} dataset descriptors)`);
} else {
  writeFileSync(INDEX_PATH, ser(index));
  for (const d of descriptors) writeFileSync(d.path, ser(d.json));
  console.log(`  wrote index.json (${index.datasets.length} datasets) + ${descriptors.length} dataset-metadata.json`);
}
