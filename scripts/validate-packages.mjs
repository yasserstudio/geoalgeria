#!/usr/bin/env node
// Validate the scoped data packages (@geoalgeria/poste, /mobilis, /emploi,
// /telecom, /aviation, /banques, /livraison, /jeunesse, /sports,
// /enseignement-superieur, /tourisme, /formation-professionnelle, /djezzy,
// /mosquees, /sante, /cliniques, /culture, /agriculture, /ecoles, /gares-routieres,
// /ferroviaire, /buses)
// for integrity and cross-format consistency. The flagship
// `geoalgeria` dataset has its own Python validator
// (packages/dataset/scripts/validate.py); this is the single Node gate for every
// scoped package so they're all guarded on every commit and before every publish.
//
// Every package shares the flat `data/<name>.json` shape (table-driven below);
// livraison keeps a dedicated validator for its mixed entity kinds, sharing the
// same error accumulator + helpers.
//
// Usage: node scripts/validate-packages.mjs [poste|mobilis|emploi|aviation|banques|livraison|jeunesse|sports|enseignement-superieur|tourisme|formation-professionnelle|djezzy|mosquees|sante|cliniques|culture|agriculture|ecoles|gares-routieres|ferroviaire|buses]
//        (no arg = validate all)
//
// Checks, per dataset:
//   - JSON parses to a non-empty array
//   - record count === the matching field in metadata.json
//   - CSV row count (minus header) === record count
//   - GeoJSON feature count === records with valid coordinates
//   - zero duplicate `id`
//   - every `wilaya_code` is an integer in [1, 69]
//   - required identity fields present and non-empty on every record
// Plus a mirror-drift check: dataset/data/poste/*.json must equal packages/poste.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
// v2 contract enforcement — required of every package outside V1_HOLDOUTS (see below).
import {
  validateRecords as validateV2Records,
  validateMetadata as validateV2Metadata,
  loadBoundaries,
  pointInWilaya,
  pointInGeometry,
  wilayaNeighbours,
  buildMetadata,
  WILAYA_CODES,
} from "../packages/schema/index.js";
// Each package's own stats() lives here, beside its provenance config. The
// validator re-runs it so the published stats block is checked against the
// shipped records rather than trusted.
import { MIGRATIONS } from "./lib/v2-transforms.mjs";
import { canonicalCommuneCodes } from "./lib/commune-index.mjs";
import { licenceTermsErrors } from "./lib/licence-terms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (msg) => {
  errors.push(msg);
  console.error(`  FAIL: ${msg}`);
};

// Packages that are deliberately still v1, by name. Everything else must declare
// schema_version "2.0.0".
//
// This list exists because the gate is inverted. It used to read
// `const isV2 = meta.schema_version === "2.0.0"`, and every v2 check hung off it —
// so a package whose metadata lacked the key was not "v1", it was unvalidated. The
// generators still emit v1 metadata, which makes that fail-open reachable: re-running
// any packages/*/scripts/fetch.mjs rewrites its metadata without schema_version, and
// the same edit that reverts the package also switches off the checks that would
// catch the revert. CI stays green over v1 data. The migration is complete, so v2 is
// now the assumed state and a missing or wrong version is an error.
//
// Empty since telecom's v2 migration: every data-shipping package satisfies the
// canonical contract. `dataset` (the core geoalgeria package) needs no entry — it
// ships no data/metadata.json at all (dataset-metadata.json is a schema.org
// descriptor), never reaches this gate, and is validated by
// packages/dataset/scripts/validate.py.
const V1_HOLDOUTS = new Set([]);

/**
 * Does this package have to satisfy the v2 contract? Fails the build when it should
 * and doesn't, rather than quietly skipping every downstream v2 check.
 *
 * Returns false after failing, so v1-shaped data does not then cascade hundreds of
 * contract errors on top of the one that explains them — the build is already red.
 */
function requireV2(pkg, meta) {
  const declared = meta.schema_version;
  if (V1_HOLDOUTS.has(pkg)) {
    if (declared === "2.0.0")
      fail(
        `${pkg}/metadata.json: declares schema_version "2.0.0" but ${pkg} is listed in ` +
          `V1_HOLDOUTS — it migrated, so drop it from that list to switch its v2 checks on`,
      );
    return false;
  }
  if (declared !== "2.0.0") {
    fail(
      `${pkg}/metadata.json: schema_version is ${JSON.stringify(declared ?? null)}, expected "2.0.0" — ` +
        `the package reverted to v1 metadata (a generator re-run overwrites it), or it is a new ` +
        `v1 holdout that belongs in V1_HOLDOUTS. All v2 contract checks are skipped until this is fixed`,
    );
    return false;
  }
  return true;
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));
// A coordinate is "present" iff it is a finite number (or numeric string).
// Note `Number("") === 0`, so empty strings must be rejected explicitly —
// otherwise blank coords would count as geocoded and the GeoJSON-count check
// (features === records-with-coords) would silently diverge.
const toNum = (v) => (v === "" || v == null ? NaN : Number(v));
const hasCoord = (r) => Number.isFinite(toNum(r.lat)) && Number.isFinite(toNum(r.lng));

// ---------------------------------------------------------------------------
// Geo-in-boundary validation (v2 scope addition #1).
//
// @geoalgeria/schema has implemented point-in-wilaya since P1 and validateRecords
// has accepted opts.boundaries since P1 — but nothing ever passed them, so the
// check was dead for every package. It could not be switched on either: the only
// wilaya geometry in this repo was dataset/geojson/wilayas.geojson, 69 *Point*
// features, over which loadBoundaries indexes nothing and pointInWilaya answers
// "inside" for everything. Wiring that would have produced a false green.
//
// The polygons now ship here (dataset/geojson/wilaya-boundaries.geojson, OSM/ODbL
// — see its .metadata.json). loadBoundaries throws on an empty or partial index,
// and this file refuses to run without them, so the check cannot go quiet again.
const BOUNDARIES_FILE = join(ROOT, "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson");
let boundaryFc, BOUNDARIES;
try {
  boundaryFc = readJson(BOUNDARIES_FILE);
  BOUNDARIES = loadBoundaries(boundaryFc);
} catch (e) {
  console.error(
    `FAILED: cannot load the wilaya boundaries from packages/dataset/data/geojson/wilaya-boundaries.geojson — ${e.message}\n` +
      `The geo-in-boundary check is not optional: skipping it would report every package clean over data nothing looked at.`,
  );
  process.exit(1);
}
if (BOUNDARIES.size !== WILAYA_CODES.length) {
  console.error(`FAILED: boundaries index has ${BOUNDARIES.size} wilayas, expected ${WILAYA_CODES.length}`);
  process.exit(1);
}

// Which wilayas border which — see wilayaNeighbours() in @geoalgeria/schema for why
// adjacency, not distance, is what separates a coarse-geometry warning from a
// mislink. The same helper backs test/commune-in-boundary.test.mjs, so the two
// gates cannot answer differently about the same pair of wilayas.
let NEIGHBOURS;
try {
  NEIGHBOURS = wilayaNeighbours(boundaryFc);
} catch (e) {
  console.error(`FAILED: ${e.message}`);
  process.exit(1);
}

/** Metres from (lng,lat) to the nearest edge of a Polygon/MultiPolygon (report detail only). */
function metresToGeometry(lng, lat, geom) {
  const R = 6371000,
    D = Math.PI / 180,
    k = Math.cos(lat * D);
  const px = lng * k * D * R,
    py = lat * D * R;
  let best = Infinity;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys)
    for (const ring of poly)
      for (let i = 1; i < ring.length; i++) {
        const ax = ring[i - 1][0] * k * D * R,
          ay = ring[i - 1][1] * D * R,
          bx = ring[i][0] * k * D * R,
          by = ring[i][1] * D * R;
        const dx = bx - ax,
          dy = by - ay,
          l2 = dx * dx + dy * dy;
        const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
        const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        if (d < best) best = d;
      }
  return best;
}

// Per-package tally: geocoded records checked, records outside their declared
// wilaya, and the subset that landed in a non-adjacent wilaya (the mislinks).
const GEO_TALLY = new Map();

function tallyBoundaries(pkg, label, rows) {
  const t = GEO_TALLY.get(pkg) || { checked: 0, outside: 0, mislinked: [] };
  for (const r of rows) {
    if (typeof r.wilaya_code !== "string" || !BOUNDARIES.has(r.wilaya_code)) continue;
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    t.checked++;
    if (pointInWilaya(r.lng, r.lat, r.wilaya_code, BOUNDARIES)) continue;
    t.outside++;
    const inside = [...BOUNDARIES].filter(([, g]) => pointInGeometry(r.lng, r.lat, g)).map(([c]) => c);
    // No containing wilaya at all = just outside the national outline (coast, desert
    // frontier). Median 153 m — that is the geometry, not the record.
    if (!inside.length || inside.some((c) => NEIGHBOURS.get(r.wilaya_code).has(c))) continue;
    t.mislinked.push({
      label,
      id: r.id,
      name: r.name ?? r.name_fr ?? r.name_ar ?? null,
      declared: r.wilaya_code,
      actual: inside.join("+"),
      km: metresToGeometry(r.lng, r.lat, BOUNDARIES.get(r.wilaya_code)) / 1000,
      geo_method: r.geo_method ?? null,
    });
  }
  GEO_TALLY.set(pkg, t);
}

// Ceiling on the mislink rate, per package, taken from the measured distribution
// (2026-07-20, all 61,334 geocoded records in the repo) and not from a round guess:
//
//   formation-professionnelle 2.69% │ emploi 0.61 · culture 0.55 · banques 0.16 ·
//   ferroviaire 0.14 · mosquees 0.11 · tourisme 0.05 · ecoles 0.03 · 14 others 0.00
//
// The band 0.62–2.68% is empty: one package sits 4.4x above every other. Same shape
// as the capital guard's 10 km ceiling (68 values under 6.74 km, the defect at 22.5).
// 1.0% leaves 64% headroom over the worst clean package and sits 2.7x under the
// offender. NOTE the raw "outside its wilaya" rate does NOT support a ceiling — it
// runs 0.00, 0.66, 0.70 … 5.15, 5.60, 6.13, 7.29, 9.16, 11.73 with no gap anywhere,
// and its top entry (agriculture, 11.73%) is the cleanest package in the repo by
// this measure: all 23 of its outliers sit outside the national outline, median
// 999 m, none in another wilaya at all. A rate ceiling on "outside" would have
// failed the wrong package.
const MISLINK_CEILING_PCT = 1.0;

// Previously shipped mislinks are a ratchet, not an exemption: each relinked
// package is now pinned at 0, so any non-adjacent mislink that reappears
// fails the build hard (== check below), rather than warning under the 1% ceiling.
const KNOWN_MISLINKS = { "formation-professionnelle": 0, culture: 0, ferroviaire: 0, emploi: 0, banques: 0, tourisme: 0 };

function reportBoundaries(full) {
  const rows = [...GEO_TALLY].filter(([, t]) => t.checked > 0).sort((a, b) => b[1].mislinked.length - a[1].mislinked.length);
  const visited = new Set(rows.map(([pkg]) => pkg));
  let checked = 0,
    outside = 0,
    mislinked = 0;
  for (const [pkg, t] of rows) {
    checked += t.checked;
    outside += t.outside;
    mislinked += t.mislinked.length;
    const rate = (100 * t.mislinked.length) / t.checked;
    const line =
      `${pkg}: ${t.outside}/${t.checked} outside their wilaya (${((100 * t.outside) / t.checked).toFixed(2)}%), ` +
      `${t.mislinked.length} in a non-adjacent wilaya (${rate.toFixed(2)}%)`;
    const allowed = KNOWN_MISLINKS[pkg];
    if (allowed !== undefined) {
      if (t.mislinked.length !== allowed)
        fail(
          `${line} — recorded debt is ${allowed}. ` +
            (t.mislinked.length > allowed
              ? `New mislinks have shipped; fix them, do not raise the number.`
              : `The debt shrank — ratchet KNOWN_MISLINKS down to ${t.mislinked.length} in scripts/validate-packages.mjs.`),
        );
      else if (allowed > 0) console.log(`  ⚠ ${line} — over the ${MISLINK_CEILING_PCT}% ceiling, pinned as known debt`);
      else console.log(`  OK: ${line} — pinned at 0`);
    } else if (rate > MISLINK_CEILING_PCT) {
      fail(`${line} — over the ${MISLINK_CEILING_PCT}% mislink ceiling`);
    } else if (t.mislinked.length) {
      console.log(`  ⚠ ${line}`);
    } else {
      console.log(`  OK: ${line}`);
    }
    for (const m of t.mislinked.sort((a, b) => b.km - a.km).slice(0, 5))
      console.log(
        `      ${m.label} id=${m.id} declared=w${m.declared} actual=w${m.actual} ` +
          `${m.km.toFixed(1)} km outside w${m.declared} geo_method=${m.geo_method}` +
          (m.name ? ` — ${m.name.slice(0, 40)}` : ""),
      );
    if (t.mislinked.length > 5) console.log(`      … ${t.mislinked.length - 5} more`);
  }
  // The loop above iterates GEO_TALLY and looks KNOWN_MISLINKS up, so it never
  // iterates KNOWN_MISLINKS itself: a package rename, a PACKAGES typo, or the
  // package going fully ungeocoded drops its debt entry without a word, and the
  // ratchet quietly stops ratcheting. A recorded debt that was never visited is
  // therefore an error in its own right. Only meaningful on a full run — a
  // single-package run legitimately visits one package.
  if (full)
    for (const pkg of Object.keys(KNOWN_MISLINKS))
      if (!visited.has(pkg))
        fail(
          `KNOWN_MISLINKS records ${KNOWN_MISLINKS[pkg]} mislink(s) for "${pkg}", but no geocoded ` +
            `record of that package was checked — it was renamed, dropped from PACKAGES, or lost ` +
            `its coordinates. Remove the entry deliberately or restore the package; do not leave ` +
            `a debt no run can pay down.`,
        );

  console.log(
    `  ${checked} geocoded records checked against 69 polygons — ${outside} outside their declared wilaya ` +
      `(${((100 * outside) / checked).toFixed(2)}%, warnings: the outlines are display-grade), ${mislinked} mislinked`,
  );
}

// data/<dataset>.json + its metadata key, csv mirror, optional geojson mirror.
// geojson:null means the dataset is intentionally ungeocoded (e.g. Mobilis PDV).
const PACKAGES = {
  poste: [
    {
      json: "postoffices.json",
      metaKey: "postoffices",
      csv: "csv/postoffices.csv",
      geojson: "geojson/postoffices.geojson",
      required: ["id", "name", "wilaya_code"],
    },
    {
      json: "atms.json",
      metaKey: "atms",
      csv: "csv/atms.csv",
      geojson: "geojson/atms.geojson",
      required: ["id", "name", "wilaya_code"],
    },
  ],
  mobilis: [
    {
      json: "agences.json",
      metaKey: "agences",
      csv: "csv/agences.csv",
      geojson: "geojson/agences.geojson",
      required: ["id", "name", "wilaya_code"],
    },
    {
      json: "pdv.json",
      metaKey: "pdv",
      csv: "csv/pdv.csv",
      geojson: null, // ungeocoded by design (metadata.pdv_geocoded === 0)
      required: ["id", "name", "wilaya_code"],
    },
  ],
  telecom: [
    {
      json: "5g-djezzy.json",
      metaKey: "5g-djezzy",
      csv: "csv/5g-djezzy.csv",
      geojson: "geojson/5g-djezzy.geojson",
      required: ["id", "operator", "technology", "wilaya_code"],
    },
    {
      json: "5g-mobilis.json",
      metaKey: "5g-mobilis",
      csv: "csv/5g-mobilis.csv",
      geojson: "geojson/5g-mobilis.geojson",
      required: ["id", "operator", "technology", "wilaya_code"],
    },
    {
      json: "5g-ooredoo.json",
      metaKey: "5g-ooredoo",
      csv: "csv/5g-ooredoo.csv",
      geojson: "geojson/5g-ooredoo.geojson",
      required: ["id", "operator", "technology", "wilaya_code"],
    },
  ],
  djezzy: [
    {
      json: "boutiques.json",
      metaKey: "boutiques",
      csv: "csv/boutiques.csv",
      geojson: "geojson/boutiques.geojson",
      required: ["id", "name", "wilaya_code"],
    },
  ],
  ooredoo: [
    {
      json: "stores.json",
      metaKey: "ooredoo",
      csv: "csv/stores.csv",
      geojson: "geojson/stores.geojson",
      required: ["id", "name", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  emploi: [
    {
      json: "awem.json",
      metaKey: "awem",
      csv: "csv/awem.csv",
      geojson: "geojson/awem.geojson",
      required: ["id", "name", "wilaya_code"],
    },
    {
      json: "alem.json",
      metaKey: "alem",
      csv: "csv/alem.csv",
      geojson: "geojson/alem.geojson",
      required: ["id", "name", "wilaya_code"],
    },
  ],
  aviation: [
    {
      json: "airports.json",
      metaKey: "airports",
      csv: "csv/airports.csv",
      geojson: "geojson/airports.geojson",
      required: ["id", "name", "icao", "wilaya_code"],
    },
    {
      // A RELATION, not a GeoRecord collection: a route links two airports, so
      // it has two endpoints and a path rather than one point. `records: false`
      // skips only the GeoRecord contract; counts, CSV, GeoJSON and unique ids
      // are still enforced.
      json: "routes.json",
      metaKey: "routes",
      csv: "csv/routes.csv",
      geojson: "geojson/routes.geojson",
      required: ["id", "from", "to", "carrier", "status", "evidence", "source"],
      records: false,
    },
  ],
  mosquees: [
    {
      json: "mosquees.json",
      metaKey: "mosquees",
      csv: "csv/mosquees.csv",
      geojson: "geojson/mosquees.geojson",
      // name is intentionally nullable (many OSM mosques are unnamed), so the
      // required set guards identity + geocoding rather than name.
      required: ["id", "source", "wilaya_code", "lat", "lng"],
    },
  ],
  jeunesse: [
    {
      json: "institutions.json",
      metaKey: "institutions",
      csv: "csv/institutions.csv",
      geojson: "geojson/institutions.geojson",
      required: ["id", "type_code", "wilaya_code", "lat", "lng"],
    },
  ],
  ecoles: [
    {
      json: "ecoles.json",
      metaKey: "ecoles",
      csv: "csv/ecoles.csv",
      geojson: "geojson/ecoles.geojson",
      // name is intentionally nullable (many OSM schools are unnamed) and sector
      // is often unknown, so the required set guards identity + cycle + kind + geocoding.
      required: ["id", "source", "cycle", "kind", "wilaya_code", "lat", "lng"],
    },
  ],
  sante: [
    {
      json: "sante.json",
      metaKey: "sante",
      csv: "csv/sante.csv",
      geojson: "geojson/sante.geojson",
      // lat/lng are intentionally nullable (the MSP carries no coordinates;
      // some localities don't resolve), so the required set guards identity +
      // type + wilaya, not geocoding.
      required: ["id", "name", "type", "wilaya", "wilaya_code", "msp_id"],
    },
  ],
  sports: [
    {
      json: "facilities.json",
      metaKey: "facilities",
      csv: "csv/facilities.csv",
      geojson: "geojson/facilities.geojson",
      required: ["id", "type_code", "wilaya_code", "lat", "lng"],
    },
  ],
  "enseignement-superieur": [
    {
      json: "institutions.json",
      metaKey: "institutions",
      csv: "csv/institutions.csv",
      geojson: "geojson/institutions.geojson",
      required: ["id", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  banques: [
    {
      json: "banks.json",
      metaKey: "banks",
      csv: "csv/banks.csv",
      geojson: null, // registry of institutions, not geocoded points (HQ wilaya only)
      required: ["id", "acronym", "name_fr", "wilaya_code"],
    },
    {
      json: "institutions.json",
      metaKey: "institutions",
      csv: "csv/institutions.csv",
      geojson: null,
      required: ["id", "acronym", "name_fr", "wilaya_code"],
    },
    {
      json: "branches.json",
      metaKey: "branches",
      csv: "csv/branches.csv",
      geojson: "geojson/branches.geojson",
      required: ["id", "bank_id", "name", "wilaya_code"],
    },
  ],
  tourisme: [
    {
      json: "lodging.json",
      metaKey: "lodging",
      csv: "csv/lodging.csv",
      geojson: "geojson/lodging.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
    {
      json: "attractions.json",
      metaKey: "attractions",
      csv: "csv/attractions.csv",
      geojson: "geojson/attractions.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
    {
      json: "historic.json",
      metaKey: "historic",
      csv: "csv/historic.csv",
      geojson: "geojson/historic.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
    {
      json: "thermal-springs.json",
      metaKey: "thermal_springs",
      csv: "csv/thermal-springs.csv",
      geojson: "geojson/thermal-springs.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
    {
      json: "parks.json",
      metaKey: "parks",
      csv: "csv/parks.csv",
      geojson: "geojson/parks.geojson",
      required: ["id", "name", "category", "wilaya_code"],
    },
  ],
  "formation-professionnelle": [
    {
      json: "establishments.json",
      metaKey: "establishments",
      csv: "csv/establishments.csv",
      geojson: "geojson/establishments.geojson",
      required: ["id", "name", "type", "wilaya_code"],
    },
  ],
  culture: [
    {
      json: "culture.json",
      metaKey: "culture",
      csv: "csv/culture.csv",
      geojson: "geojson/culture.geojson",
      required: ["id", "name", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  agriculture: [
    {
      json: "agriculture.json",
      metaKey: "agriculture",
      csv: "csv/agriculture.csv",
      geojson: "geojson/agriculture.geojson",
      required: ["id", "name", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  "industrie-pharmaceutique": [
    {
      json: "industrie-pharmaceutique.json",
      metaKey: "industrie-pharmaceutique",
      csv: "csv/industrie-pharmaceutique.csv",
      geojson: "geojson/industrie-pharmaceutique.geojson",
      required: ["id", "name", "role", "nature", "wilaya_code", "lat", "lng"],
    },
  ],
  pharmacies: [
    {
      json: "pharmacies.json",
      metaKey: "pharmacies",
      csv: "csv/pharmacies.csv",
      geojson: "geojson/pharmacies.geojson",
      // name is intentionally nullable (many OSM pharmacies are unnamed), so the
      // required set guards identity + geocoding rather than name.
      required: ["id", "source", "wilaya_code", "lat", "lng"],
    },
  ],
  "protection-civile": [
    {
      json: "protection-civile.json",
      metaKey: "protection-civile",
      csv: "csv/protection-civile.csv",
      geojson: "geojson/protection-civile.geojson",
      required: ["id", "name", "statut", "wilaya_code", "lat", "lng"],
    },
  ],
  cliniques: [
    {
      json: "cliniques.json",
      metaKey: "cliniques",
      csv: "csv/cliniques.csv",
      geojson: "geojson/cliniques.geojson",
      // name is intentionally nullable (279 clinic-tagged OSM points are unnamed)
      // and sector is often unknown, so the required set guards identity + type
      // + geocoding.
      required: ["id", "source", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  "gares-routieres": [
    {
      json: "stations.json",
      metaKey: "stations",
      csv: "csv/stations.csv",
      geojson: "geojson/stations.geojson",
      required: ["id", "name", "wilaya_code", "lat", "lng"],
    },
  ],
  ferroviaire: [
    {
      json: "stations.json",
      metaKey: "stations",
      csv: "csv/stations.csv",
      geojson: "geojson/stations.geojson",
      required: ["id", "type", "wilaya_code", "lat", "lng"],
    },
  ],
  buses: [
    {
      json: "lines.json",
      metaKey: "lines",
      csv: "csv/lines.csv",
      // Line-level only (no per-stop geometry yet) — every record is ungeocoded,
      // so there is nothing to mirror. A 0-feature FeatureCollection is
      // indistinguishable from a failed download in QGIS/Mapbox, so ship none.
      geojson: null,
      required: ["id", "name", "operator", "wilaya_code"],
    },
    {
      json: "stations.json",
      metaKey: "stations",
      csv: "csv/stations.csv",
      geojson: "geojson/stations.geojson",
      required: ["id", "wilaya_code", "lat", "lng"],
    },
  ],
};

// Cross-file id uniqueness. `id` is unique within its file (v2 decision 10), which is
// only enough where a consumer reads one file at a time. A package whose index.js
// merges several data files into ONE collection publishes a joint namespace: a
// duplicate id across those files silently collapses records in any id-keyed lookup
// built from the merged array. Enforce joint uniqueness across exactly those sets.
//
// Derived from each package's export surface, not from "is it multi-file":
//   banques.all()      = banks + institutions        (branches is a separate collection)
//   emploi.agencies()  = awem + alem
//   mobilis.all()      = agences + pdv
//   tourisme.all()     = the five layer files (tagged with `layer`, ids untouched)
// Excluded on purpose: poste (postOffices/atms never merge), livraison (carriers/
// stopdesks/coverage are different entity kinds).
const MERGED_ID_NAMESPACES = {
  banques: ["banks.json", "institutions.json"],
  telecom: ["5g-djezzy.json", "5g-mobilis.json", "5g-ooredoo.json"],
  emploi: ["awem.json", "alem.json"],
  mobilis: ["agences.json", "pdv.json"],
  tourisme: ["lodging.json", "attractions.json", "historic.json", "thermal-springs.json", "parks.json"],
};

function validateMergedIds(pkgs) {
  for (const pkg of pkgs) {
    const files = MERGED_ID_NAMESPACES[pkg];
    if (!files) continue;
    const owner = new Map(); // id -> file that claimed it first
    const collisions = new Map(); // "a.json x b.json" -> count
    let total = 0;
    for (const file of files) {
      let arr;
      try {
        arr = readJson(join(ROOT, "packages", pkg, "data", file));
      } catch (e) {
        fail(`${pkg}/${file}: cannot read for the merged-id check — ${e.message}`);
        continue;
      }
      total += arr.length;
      for (const r of arr) {
        const id = String(r.id);
        const first = owner.get(id);
        if (first === undefined) owner.set(id, file);
        else {
          const k = `${first} x ${file}`;
          collisions.set(k, (collisions.get(k) || 0) + 1);
        }
      }
    }
    const dups = total - owner.size;
    if (dups > 0) {
      fail(
        `${pkg}: ${dups} id(s) collide across the files merged by index.js (${files.join(" + ")}) — ` +
          [...collisions].map(([k, n]) => `${k}: ${n}`).join(", "),
      );
    } else {
      console.log(`  OK: ${pkg} — ${owner.size} ids unique across ${files.length} merged files`);
    }
  }
}

// Count CSV data records (excluding the header), honouring RFC-4180 quoted
// fields: newlines inside double-quoted values do not start a new record, and
// blank lines (including trailing ones) are ignored. A naive split("\n") would
// over-count any address/name field that contains an embedded newline.
function csvRowCount(path) {
  const text = readFileSync(path, "utf-8");
  let rows = 0;
  let inQuotes = false;
  let lineHasContent = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      lineHasContent = true;
    } else if (!inQuotes && c === "\n") {
      if (lineHasContent) rows++;
      lineHasContent = false;
    } else if (c !== "\r") {
      lineHasContent = true;
    }
  }
  if (lineHasContent) rows++;
  return rows - 1; // minus header
}

function validateDataset(pkg, spec) {
  const dataDir = join(ROOT, "packages", pkg, "data");
  const jsonPath = join(dataDir, spec.json);
  const label = `${pkg}/${spec.json}`;

  let arr;
  try {
    arr = readJson(jsonPath);
  } catch (e) {
    return fail(`${label}: invalid JSON — ${e.message}`);
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    return fail(`${label}: expected a non-empty array`);
  }

  // Every populated commune_code is a foreign key into the flagship commune
  // table. Format-only validation allowed thousands of stale-but-well-formed
  // values to survive an ONS crosswalk repair, breaking code-keyed joins while
  // every individual package still passed.
  const orphaned = arr.filter(
    (record) => record?.commune_code != null && !canonicalCommuneCodes.has(record.commune_code),
  );
  if (orphaned.length) {
    const sample = orphaned
      .slice(0, 5)
      .map((record) => `${record.id}:${JSON.stringify(record.commune_code)}`)
      .join(", ");
    fail(
      `${label}: ${orphaned.length} commune_code foreign key(s) are absent from the canonical commune set` +
        (sample ? ` (sample ${sample})` : ""),
    );
  }

  // count vs metadata
  let meta = {};
  try {
    meta = readJson(join(dataDir, "metadata.json"));
  } catch (e) {
    fail(`${pkg}/metadata.json: cannot read — ${e.message}`);
  }
  // v2 packages carry canonical metadata: multi-file packages track per-file counts in
  // entities[], single-file packages use record_count. v1 uses the package-named key.
  const isV2 = requireV2(pkg, meta);
  let expected, expectedKey;
  if (isV2 && spec.records === false) {
    // Not in entities[]: that array totals record_count, and a relation is not
    // part of that total. It carries its own count in the stats block instead.
    expected = meta[spec.metaKey];
    expectedKey = spec.metaKey;
  } else if (isV2) {
    const entity = (meta.entities || []).find((e) => e.file === spec.json);
    if (entity) { expected = entity.count; expectedKey = `entities[${spec.json}]`; }
    else { expected = meta.record_count; expectedKey = "record_count"; }
  } else {
    expected = meta[spec.metaKey];
    expectedKey = spec.metaKey;
  }
  if (expected !== arr.length) {
    fail(`${label}: count ${arr.length} ≠ metadata.${expectedKey} ${expected}`);
  }

  // A RELATION file is not a collection of GeoRecords. `routes.json` describes
  // links BETWEEN records, so it has two endpoints and a path rather than one
  // point, and the GeoRecord contract (lat/lng/geo_precision/geo_method, one
  // point per row) simply does not apply. Everything else still does: counts,
  // the CSV mirror, the GeoJSON mirror, unique ids. The existing escape hatches
  // were per-package, and exempting all of aviation would have switched off the
  // v2 checks on airports.json too, which is a real GeoRecord set.
  const isRelation = spec.records === false;
  if (isRelation) {
    const ids = arr.map((r) => r.id);
    if (ids.length !== new Set(ids).size)
      fail(`${label}: duplicate id(s) in a relation file`);
  }

  // v2 contract: enforce the canonical GeoRecord + metadata shape via @geoalgeria/schema.
  if (isV2 && !isRelation) {
    const { errors: v2errs, warnings: v2warn } = validateV2Records(arr, {
      requireName: spec.required.includes("name"),
      boundaries: BOUNDARIES,
    });
    for (const m of v2errs) fail(`${label} [v2]: ${m}`);
    tallyBoundaries(pkg, label, arr);
    const metaRes = validateV2Metadata(meta);
    for (const m of metaRes.errors) fail(`${pkg}/metadata.json [v2]: ${m}`);
    const warnCount = v2warn.length + metaRes.warnings.length;
    if (warnCount) console.log(`  ⚠ ${label} [v2]: ${warnCount} warning(s)`);
  }

  // csv mirror
  const csvPath = join(dataDir, spec.csv);
  if (!existsSync(csvPath)) {
    fail(`${label}: missing CSV mirror ${spec.csv}`);
  } else {
    const rows = csvRowCount(csvPath);
    if (rows !== arr.length) {
      fail(`${label}: CSV rows ${rows} ≠ JSON records ${arr.length}`);
    }
  }

  // geojson mirror === records with coordinates. For a relation every row is a
  // path, so every row has a feature.
  const withCoord = isRelation ? arr.length : arr.filter(hasCoord).length;
  if (spec.geojson) {
    const gPath = join(dataDir, spec.geojson);
    if (!existsSync(gPath)) {
      fail(`${label}: missing GeoJSON mirror ${spec.geojson}`);
    } else {
      const features = readJson(gPath).features;
      if (!Array.isArray(features)) {
        fail(`${label}: ${spec.geojson} has no FeatureCollection "features" array`);
      } else if (features.length !== withCoord) {
        fail(
          `${label}: GeoJSON features ${features.length} ≠ records with coordinates ${withCoord}`,
        );
      }
    }
  }

  // Legacy per-record checks (v1 only). v2 packages are covered by validateV2Records
  // above, whose multilingual-name rule (name|name_fr|name_ar) would otherwise conflict
  // with the v1 required-"name" check below and false-fail Arabic-only-named records.
  if (!isV2) {
    // duplicate ids
    const ids = arr.map((r) => r.id);
    const dups = ids.length - new Set(ids).size;
    if (dups > 0) fail(`${label}: ${dups} duplicate id(s)`);

    // wilaya_code range + required fields (sample-reported, not per-row spam)
    let badWilaya = 0;
    let missingField = 0;
    for (const r of arr) {
      const w = Number(r.wilaya_code);
      // require a plain integer string/number (rejects booleans, "16.0", arrays
      // that Number() would otherwise coerce to an in-range integer)
      if (!/^\d+$/.test(String(r.wilaya_code)) || w < 1 || w > 69) badWilaya++;
      for (const f of spec.required) {
        if (r[f] === undefined || r[f] === null || r[f] === "") missingField++;
      }
    }
    if (badWilaya > 0) {
      fail(`${label}: ${badWilaya} record(s) with wilaya_code outside [1,69]`);
    }
    if (missingField > 0) {
      fail(
        `${label}: ${missingField} missing required field(s) (${spec.required.join(", ")})`,
      );
    }
  }

  console.log(
    `  OK: ${label} — ${arr.length} records${spec.geojson ? `, ${withCoord} geocoded` : " (ungeocoded)"}`,
  );
  return arr;
}

// ---------------------------------------------------------------------------
// metadata.json's derived numbers, recomputed from the records that produced them.
//
// validateDataset compared `record_count` and the GeoJSON feature count, and
// nothing else. `geocoded_count`, `precision`, `wilayas_covered` and `bbox` were
// four published numbers no gate ever looked at — and build-catalog.mjs copies all
// four into index.json and into every dataset-metadata.json, where bbox becomes
// the schema.org spatialCoverage box that Google Dataset Search reads.
//
// Demonstrated before this check existed: setting packages/aviation/data/metadata.json
// to precision {exact:1, approximate:32} (real 33/0), geocoded_count 7 (real 33),
// wilayas_covered 3 (real 31) and bbox [0,0,1,1] left `validate-packages.mjs aviation`
// PASSING. The only gate that noticed was the catalog drift check — whose printed
// remedy is to regenerate the catalog *from* the corrupt metadata, i.e. to publish
// bbox [0,0,1,1] to Google.
//
// Recomputed with @geoalgeria/schema's buildMetadata — the same function the
// generators use to write these blocks — so the check cannot drift from the writer.
// Multi-file packages are compared once, over the union of their entities.
function validateDerivedMetadata(pkg, records) {
  const metaPath = join(ROOT, "packages", pkg, "data", "metadata.json");
  if (!existsSync(metaPath) || !records.length) return;
  let meta;
  try {
    meta = readJson(metaPath);
  } catch {
    return; // already reported by validateDataset
  }
  if (meta.schema_version !== "2.0.0") return; // v1 metadata has no derived block

  // entities[] is the per-file breakdown record_count claims to total.
  if (Array.isArray(meta.entities)) {
    const sum = meta.entities.reduce((n, e) => n + (e.count || 0), 0);
    if (sum !== meta.record_count)
      fail(
        `${pkg}/metadata.json: entities[] sum ${sum} ≠ record_count ${meta.record_count} — ` +
          `the catalog publishes record_count`,
      );
  }

  const want = buildMetadata({
    package: meta.package,
    records,
    sources: meta.sources || [],
    license: meta.license,
    updated: meta.updated,
    estimatedUniverse: meta.estimated_universe ?? null,
  });

  // The per-package `stats` block (with_iata, by_source, by_type, named, …) is
  // merged into metadata AFTER buildMetadata, so buildMetadata cannot reproduce
  // it and this loop never saw it. Those fields are published and consumer-typed
  // exactly like the derived ones: aviation could ship by_source {anac: 36} over
  // records that are 33/3 and the gate stayed green. Re-run the package's own
  // stats() over the shipped records and compare.
  const stats = MIGRATIONS[pkg]?.meta?.stats;
  if (typeof stats === "function") Object.assign(want, stats(records));

  // Key order is not meaningful in a count map: tourisme merges five files, so
  // by_type comes out in a different insertion order than the concatenated
  // records give, with identical counts. Arrays keep their order (bbox is
  // positional); object keys are sorted before comparing.
  const canon = (v) =>
    Array.isArray(v)
      ? v.map(canon)
      : v && typeof v === "object"
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
        : v;
  const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
  const derived = ["record_count", "geocoded_count", "geocoded_pct", "precision", "wilayas_covered", "bbox"];
  for (const key of [...derived, ...Object.keys(typeof stats === "function" ? stats(records) : {})]) {
    if (meta[key] === undefined) continue; // not declared → nothing published to disagree with
    if (same(meta[key], want[key])) continue;
    fail(
      `${pkg}/metadata.json: ${key} is ${JSON.stringify(meta[key])} but the ${records.length} ` +
        `shipped record(s) give ${JSON.stringify(want[key])} — regenerate the metadata, ` +
        `do not edit the number (build-catalog.mjs republishes it verbatim)`,
    );
  }
}

// dataset/data/poste is a mirror of @geoalgeria/poste — guard against drift.
//
// The whole tree, not just the JSON. poste/scripts/fetch.mjs emits all seven
// files (json + csv/ + geojson/ + metadata.json) to both destinations from one
// run, so anything less than a full-tree compare is not a mirror check. It used
// to compare `*.json` alone, and the v2 migration regenerated packages/poste
// without re-running that emit: the JSON went v2 while the mirror's csv/,
// geojson/ and metadata.json stayed on the v1 columns, ids and row order from
// 86c918d. `geoalgeria` therefore published v2 JSON beside v1 CSV/GeoJSON of
// the same records, and CI stayed green throughout.
//
// Compares bytes, and walks both sides so an extra or missing file is caught
// too — a re-copy that forgets a file must not read as "in sync".
function walkFiles(dir, base = dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, base, out);
    else out.push(p.slice(base.length + 1));
  }
  return out.sort();
}

// route-endpoints.json is published and typed (name/name_en/name_ar
// non-optional) but fits neither spec shape: it is not a GeoRecord set (no
// wilaya_code on foreign airports) and not a counted relation (no CSV mirror).
// This gate keeps the type claims honest: every endpoint fully named, iata
// unique, every routes.json terminal present, and the routes_as_of stamp real.
function validateRouteEndpoints() {
  const dataDir = join(ROOT, "packages", "aviation", "data");
  const label = "aviation/route-endpoints.json";
  let eps, routes, meta;
  try {
    eps = readJson(join(dataDir, "route-endpoints.json"));
    routes = readJson(join(dataDir, "routes.json"));
    meta = readJson(join(dataDir, "metadata.json"));
  } catch (e) {
    return fail(`${label}: cannot read — ${e.message}`);
  }
  let missing = 0;
  for (const e of eps) {
    for (const f of ["iata", "name", "name_en", "name_ar", "lat", "lng", "country"]) {
      if (e[f] === undefined || e[f] === null || e[f] === "") missing++;
    }
  }
  if (missing > 0) fail(`${label}: ${missing} missing required field value(s)`);
  const iatas = new Set(eps.map((e) => e.iata));
  if (iatas.size !== eps.length) fail(`${label}: duplicate iata`);
  const unresolved = routes.flatMap((r) => [r.from, r.to]).filter((c) => !iatas.has(c));
  if (unresolved.length) fail(`${label}: routes reference absent endpoint(s) ${[...new Set(unresolved)].join(", ")}`);
  if (meta.routes && !/^\d{4}-\d{2}-\d{2}$/.test(meta.routes_as_of ?? ""))
    fail(`aviation/metadata.json: routes present but routes_as_of is not a YYYY-MM-DD date`);
  console.log(`  OK: ${label} — ${eps.length} endpoints, fully named (fr/en/ar), all route terminals resolve`);
}

function validateMirror() {
  const sourceDir = join(ROOT, "packages", "poste", "data");
  const mirrorDir = join(ROOT, "packages", "dataset", "data", "poste");
  if (!existsSync(mirrorDir)) {
    fail("mirror: dataset/data/poste is missing entirely");
    return;
  }
  const sourceFiles = walkFiles(sourceDir);
  const mirrorFiles = new Set(walkFiles(mirrorDir));

  for (const file of sourceFiles) {
    mirrorFiles.delete(file);
    const mirror = join(mirrorDir, file);
    if (!existsSync(mirror)) {
      fail(`mirror: dataset/data/poste/${file} is missing`);
      continue;
    }
    if (!readFileSync(join(sourceDir, file)).equals(readFileSync(mirror))) {
      fail(
        `mirror: dataset/data/poste/${file} drifted from @geoalgeria/poste — re-copy from packages/poste/data/${file}`,
      );
    }
  }
  // Anything left is in the mirror but not in the source.
  for (const extra of mirrorFiles)
    fail(`mirror: dataset/data/poste/${extra} has no counterpart in packages/poste/data`);

  if (!errors.some((e) => e.startsWith("mirror:")))
    console.log(`  OK: mirror dataset/data/poste in sync (${sourceFiles.length} files, byte-identical)`);
}

// npm's `files` patterns are literal: "data/**/*.json" does NOT match ".geojson".
// A package that generates CSV/GeoJSON mirrors but forgets the matching glob
// therefore publishes JSON only — and nothing catches it, because the mirrors are
// committed and every check above passes on the working tree, not on the tarball.
// (banques, livraison and buses each shipped that way.) Assert the two stay in sync.
const DERIVED = [
  [".csv", "data/**/*.csv"],
  [".geojson", "data/**/*.geojson"],
  [".sql", "data/**/*.sql"], // core dataset only (v2 decision #7)
];

/** Extensions of every file committed under a package's data/ directory. */
function derivedExtensions(dir) {
  const found = new Set();
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name));
      else found.add(e.name.slice(e.name.lastIndexOf(".")));
    }
  };
  walk(dir);
  return found;
}

function validatePackageFiles(pkgs) {
  for (const pkg of pkgs) {
    const dataDir = join(ROOT, "packages", pkg, "data");
    if (!existsSync(dataDir)) continue;
    let files;
    try {
      files = readJson(join(ROOT, "packages", pkg, "package.json")).files || [];
    } catch (e) {
      fail(`${pkg}/package.json: cannot read — ${e.message}`);
      continue;
    }
    const exts = derivedExtensions(dataDir);
    const missing = DERIVED.filter(([ext, glob]) => exts.has(ext) && !files.includes(glob));
    if (missing.length) {
      fail(
        `${pkg}/package.json: data/ ships ${missing.map(([e]) => e).join(" + ")} but files[] omits ${missing
          .map(([, g]) => `"${g}"`)
          .join(" + ")} — npm would publish neither`,
      );
    } else {
      console.log(`  OK: ${pkg} files[] covers its derived data`);
    }
  }
}

function validateRetiredIds(pkgs) {
  for (const pkg of pkgs) {
    const dataDir = join(ROOT, "packages", pkg, "data");
    const ledgerPath = join(dataDir, "retired-ids.json");
    if (!existsSync(ledgerPath)) continue;
    let document;
    try {
      document = readJson(ledgerPath);
    } catch (error) {
      fail(`${pkg}/retired-ids.json: cannot read — ${error.message}`);
      continue;
    }
    const ids = document?.ids;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id)) {
      fail(`${pkg}/retired-ids.json: ids must be an array of non-empty strings`);
      continue;
    }
    if (new Set(ids).size !== ids.length) {
      fail(`${pkg}/retired-ids.json: duplicate id(s)`);
    }
    if (JSON.stringify(ids) !== JSON.stringify([...ids].sort())) {
      fail(`${pkg}/retired-ids.json: ids must be sorted`);
    }

    const live = new Set();
    for (const file of readdirSync(dataDir)) {
      if (!file.endsWith(".json") || file === "metadata.json" || file === "retired-ids.json") continue;
      let value;
      try {
        value = readJson(join(dataDir, file));
      } catch {
        continue; // the dataset validator reports malformed JSON with context
      }
      if (Array.isArray(value)) {
        for (const record of value) if (record?.id != null) live.add(String(record.id));
      }
    }
    const reused = ids.filter((id) => live.has(id));
    if (reused.length) {
      fail(
        `${pkg}/retired-ids.json: retired id(s) are live again: ${reused.slice(0, 5).join(", ")}`,
      );
    } else {
      console.log(`  OK: ${pkg} — ${ids.length} retired ids remain reserved`);
    }
  }
}

// types/index.d.ts ↔ shipped JSON.
//
// Every data package publishes `types/` in files[], so its .d.ts IS the public
// API for TypeScript consumers — and nothing ever checked it against the data.
// The v2 migration renamed and added fields in 22 packages and updated five
// declarations, so the rest kept describing v1: `metadata().airports` typed
// `number` and `undefined` at runtime, `id: number` against `"00001"` strings,
// `wilaya_name`/`type_code`/`osm_id` fields that no record carries, and no
// `geo_method` anywhere. All of it type-checks; all of it is wrong.
//
// A .d.ts is not executable, so this checks the two things that can be checked
// mechanically — which names are declared, and whether a declaration admits null:
//   - every key in the JSON is declared            (undeclared field)
//   - every key the .d.ts declares itself occurs   (declared-but-absent)
//   - every non-optional key is on EVERY record    (required but sometimes missing)
//   - every key that is ever null admits null      (`lat: number` over null coords)
//   - a string-literal union covers every value    (`type: "a"|"b"` over a "c")
// The second rule applies to inherited keys too. It used to exempt them, because
// @geoalgeria/pharmacies extended the shared GeoRecord, which describes the family
// and so declares fields any one dataset may not carry. No published declaration
// imports the schema package any more — it is unpublished, so a .d.ts that did
// would not resolve for consumers — and every remaining `extends` names a base
// local to its own package, which has no licence to declare a field its data
// lacks. Local `type` aliases are expanded before the null test, so
// `geo_precision: GeoPrecision` counts as nullable exactly when that alias
// includes null.
//
// Excluded: the core `geoalgeria` dataset (administrative divisions, not
// GeoRecords; validate.py owns it).
const TYPED = {
  agriculture: { "agriculture.json": "AgricultureInstitution" },
  aviation: { "airports.json": "Airport", "routes.json": "Route" },
  banques: { "banks.json": "Institution", "institutions.json": "Institution", "branches.json": "Branch" },
  buses: { "lines.json": "BusLine", "stations.json": "BusStation" },
  cliniques: { "cliniques.json": "Clinique" },
  culture: { "culture.json": "CulturalSite" },
  djezzy: { "boutiques.json": "Boutique" },
  ecoles: { "ecoles.json": "Ecole" },
  emploi: { "awem.json": "Awem", "alem.json": "Alem" },
  "enseignement-superieur": { "institutions.json": "Institution" },
  ferroviaire: { "stations.json": "Station" },
  "formation-professionnelle": { "establishments.json": "Establishment" },
  "gares-routieres": { "stations.json": "Station" },
  "industrie-pharmaceutique": { "industrie-pharmaceutique.json": "PharmaManufacturer" },
  jeunesse: { "institutions.json": "Institution" },
  livraison: { "carriers.json": "Carrier", "stopdesks.json": "StopDesk", "coverage.json": "CarrierCoverage" },
  mobilis: { "agences.json": "Agence", "pdv.json": "Pdv" },
  mosquees: { "mosquees.json": "Mosquee" },
  ooredoo: { "stores.json": "OoredooStore" },
  pharmacies: { "pharmacies.json": "Pharmacy" },
  poste: { "postoffices.json": "PostOffice", "atms.json": "Atm" },
  "protection-civile": { "protection-civile.json": "ProtectionCivileUnit" },
  sante: { "sante.json": "HealthEstablishment" },
  telecom: { "5g-djezzy.json": "CoverageSite", "5g-mobilis.json": "CoverageSite", "5g-ooredoo.json": "CoverageSite" },
  sports: { "facilities.json": "Facility" },
  tourisme: {
    "lodging.json": "Lodging",
    "attractions.json": "Attraction",
    "historic.json": "Historic",
    "thermal-springs.json": "ThermalSpring",
    "parks.json": "Park",
  },
};
const TYPES_EXEMPT = new Set(["dataset"]);

/** name → { ext: string[], props: Map<name, {optional}> } for every interface in a .d.ts. */
function parseInterfaces(src) {
  const out = new Map();
  const re = /\binterface\s+([A-Za-z0-9_]+)\s*(?:extends\s+([^{]+?))?\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    const ext = (m[2] || "").split(",").map((s) => s.trim()).filter(Boolean);
    let depth = 1;
    let i = re.lastIndex;
    for (; i < src.length && depth > 0; i++) depth += src[i] === "{" ? 1 : src[i] === "}" ? -1 : 0;
    const body = src.slice(re.lastIndex, i - 1);
    // Members at brace depth 0 only, so an inline nested object (refs: { osm: string })
    // contributes `refs` and not `osm`.
    const props = new Map();
    let d = 0;
    for (const line of body.split("\n")) {
      const pm = d === 0 && line.match(/^\s*(?:readonly\s+)?["']?([A-Za-z_][A-Za-z0-9_]*)["']?(\?)?\s*:(.*)$/);
      if (pm) props.set(pm[1], { optional: !!pm[2], type: pm[3] });
      for (const c of line) d += c === "{" ? 1 : c === "}" ? -1 : 0;
    }
    out.set(name, { ext, props });
  }
  return out;
}

/** Flatten an interface's own + inherited members, or report the first unresolved parent. */
function flatten(name, ifaces, seen = new Set()) {
  const it = ifaces.get(name);
  if (!it || seen.has(name)) return { missing: name };
  seen.add(name);
  const props = new Map();
  for (const parent of it.ext) {
    const inh = flatten(parent, ifaces, seen);
    if (inh.missing) return { missing: inh.missing };
    for (const [k, v] of inh.props) props.set(k, { ...v, inherited: true });
  }
  for (const [k, v] of it.props) props.set(k, { ...v, inherited: false });
  return { props };
}

/** Keys seen on at least one record, keys seen on every record, keys ever null. */
function keySets(rows) {
  const ever = new Set();
  const nullable = new Set();
  const always = new Set(Object.keys(rows[0] || {}));
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      ever.add(k);
      if (v === null) nullable.add(k);
    }
    for (const k of [...always]) if (!Object.prototype.hasOwnProperty.call(r, k)) always.delete(k);
  }
  return { ever, always, nullable };
}

/** `export type X = …;` aliases, so a field typed by alias can be tested for null. */
function typeAliases(src) {
  const out = new Map();
  for (const m of src.matchAll(/^\s*(?:export\s+)?type\s+([A-Za-z0-9_]+)\s*=\s*([\s\S]*?);\s*$/gm))
    out.set(m[1], m[2]);
  return out;
}

/** A declared type with local aliases substituted in and comments stripped. */
function expandType(type, aliases) {
  let t = String(type).replace(/;.*$/, "");
  for (let i = 0; i < 5; i++) {
    const next = t.replace(/\b[A-Za-z0-9_]+\b/g, (w) => (aliases.has(w) ? `(${aliases.get(w)})` : w));
    if (next === t) break;
    t = next;
  }
  return t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").trim();
}

/** The literal set of a type that is nothing but string literals (plus null/undefined), else null. */
function literalUnion(expanded) {
  const lits = [...expanded.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  if (!lits.length) return null;
  const rest = expanded.replace(/"[^"]*"/g, "").replace(/null|undefined/g, "").replace(/[|()\s]/g, "");
  return rest ? null : lits;
}

function validateTypes(pkgs) {
  for (const pkg of pkgs) {
    if (TYPES_EXEMPT.has(pkg)) continue;
    const typesPath = join(ROOT, "packages", pkg, "types", "index.d.ts");
    const dataDir = join(ROOT, "packages", pkg, "data");
    if (!existsSync(dataDir) || !existsSync(typesPath)) continue;
    const files = TYPED[pkg];
    if (!files) {
      fail(`${pkg}: ships data/ + types/index.d.ts but has no entry in TYPED — add its record interfaces`);
      continue;
    }

    let src = readFileSync(typesPath, "utf-8");
    // A declaration that inherits from the shared contract needs it parsed too.
    if (/^import\s[^\n]*@geoalgeria\/schema/m.test(src))
      src += "\n" + readFileSync(join(ROOT, "packages", "schema", "types", "index.d.ts"), "utf-8");
    const ifaces = parseInterfaces(src);
    const aliases = typeAliases(src);

    let problems = 0;
    const check = (file, iname, rows) => {
      const { props, missing } = flatten(iname, ifaces);
      if (missing) {
        problems++;
        return fail(`${pkg}/types: ${file} maps to interface ${iname}, but ${missing} is not declared there`);
      }
      const { ever, always, nullable } = keySets(rows);
      const undeclared = [...ever].filter((k) => !props.has(k));
      const absent = [...props].filter(([k]) => !ever.has(k)).map(([k]) => k);
      const notAlways = [...props].filter(([k, v]) => !v.optional && ever.has(k) && !always.has(k)).map(([k]) => k);
      const notNullable = [];
      const badEnum = [];
      for (const [k, v] of props) {
        const t = expandType(v.type || "", aliases);
        if (nullable.has(k) && !/\bnull\b/.test(t)) notNullable.push(k);
        const lits = literalUnion(t);
        if (!lits) continue;
        const unknown = [...new Set(rows.map((r) => r[k]).filter((x) => typeof x === "string"))]
          .filter((x) => !lits.includes(x));
        if (unknown.length) badEnum.push(`${k} (${unknown.map((x) => JSON.stringify(x)).join(", ")})`);
      }
      if (undeclared.length) {
        problems++;
        fail(`${pkg}/${file}: ${undeclared.length} field(s) ship but ${iname} does not declare them — ${undeclared.join(", ")}`);
      }
      if (absent.length) {
        problems++;
        fail(`${pkg}/${file}: ${iname} declares ${absent.length} field(s) that no record carries — ${absent.join(", ")}`);
      }
      if (notAlways.length) {
        problems++;
        fail(`${pkg}/${file}: ${iname} declares ${notAlways.join(", ")} as required, but some records omit it — mark optional`);
      }
      if (notNullable.length) {
        problems++;
        fail(`${pkg}/${file}: ${iname} declares ${notNullable.join(", ")} as non-nullable, but records carry null — add "| null"`);
      }
      if (badEnum.length) {
        problems++;
        fail(`${pkg}/${file}: ${iname} declares a string-literal union that the data escapes — ${badEnum.join("; ")}`);
      }
    };

    for (const [file, iname] of Object.entries(files)) {
      let rows;
      try {
        rows = readJson(join(dataDir, file));
      } catch (e) {
        problems++;
        fail(`${pkg}/${file}: cannot read for the types check — ${e.message}`);
        continue;
      }
      check(file, iname, rows);
    }
    try {
      check("metadata.json", "Metadata", [readJson(join(dataDir, "metadata.json"))]);
    } catch (e) {
      problems++;
      fail(`${pkg}/metadata.json: cannot read for the types check — ${e.message}`);
    }
    if (!problems)
      console.log(`  OK: ${pkg} types match the shipped data (${Object.keys(files).length + 1} files)`);
  }
}

// The manifest `license` field, the LICENSE file and the data terms in
// dataset-metadata.json are three statements of the same fact, and until ticket
// #120 nothing compared them: every manifest said "MIT" while most packages
// redistribute data that is not MIT. The class table and the rule live in
// scripts/lib/licence-terms.mjs; a new licence needs an entry there.
function validateLicenceTerms(pkgs) {
  for (const pkg of pkgs) {
    const dir = join(ROOT, "packages", pkg);
    const manifestPath = join(dir, "package.json");
    const licencePath = join(dir, "LICENSE");
    if (!existsSync(manifestPath)) continue;
    if (!existsSync(licencePath)) {
      fail(`${pkg}: has no LICENSE file, so its data terms are unstated`);
      continue;
    }
    let manifest;
    try {
      manifest = readJson(manifestPath);
    } catch (e) {
      fail(`${pkg}/package.json: cannot read for the licence check, ${e.message}`);
      continue;
    }
    const metadataPath = join(dir, "dataset-metadata.json");
    let metadata = null;
    if (existsSync(metadataPath)) {
      try {
        metadata = readJson(metadataPath);
      } catch (e) {
        fail(`${pkg}/dataset-metadata.json: cannot read for the licence check, ${e.message}`);
        continue;
      }
    }
    const problems = licenceTermsErrors({
      name: pkg,
      manifest,
      metadata,
      licenceText: readFileSync(licencePath, "utf-8"),
      members: Object.keys(manifest.dependencies ?? {}).filter((d) => d.startsWith("@geoalgeria/")),
    });
    for (const problem of problems) fail(problem);
    if (!problems.length) console.log(`  OK: ${pkg} declares ${JSON.stringify(manifest.license)} and its LICENSE says so`);
  }
}

// livraison has three datasets of different shapes: only `stopdesks` is geocoded and
// carries wilaya_code; `carriers` (registry) and `coverage` (per-carrier presence) have
// no wilaya_code, so they can't use the wilaya_code-enforcing table validator. Dedicated
// validator, sharing the same fail()/readJson/csvRowCount/hasCoord helpers.
function validateLivraison() {
  const dataDir = join(ROOT, "packages", "livraison", "data");
  const inAlgeria = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

  let meta;
  try {
    meta = readJson(join(dataDir, "metadata.json"));
  } catch (e) {
    return fail(`livraison/metadata.json: cannot read — ${e.message}`);
  }
  // v2 contract: stopdesks.json is the package's only true GeoRecord file (carriers/
  // coverage have no wilaya_code, so they stay outside the strict contract). Required,
  // not dormant — mirrors validateDataset's requireV2 gate.
  const isV2 = requireV2("livraison", meta);

  // carriers (registry — no coordinates, no wilaya_code)
  let carriers = [];
  try {
    carriers = readJson(join(dataDir, "carriers.json"));
  } catch (e) {
    fail(`livraison/carriers.json: invalid JSON — ${e.message}`);
  }
  if (!Array.isArray(carriers) || !carriers.length) fail("livraison/carriers.json: expected a non-empty array");
  if (meta.carriers !== carriers.length) {
    fail(`livraison/carriers.json: count ${carriers.length} ≠ metadata.carriers ${meta.carriers}`);
  }
  const carrierIds = new Set(carriers.map((c) => c.id));
  if (carrierIds.size !== carriers.length) fail("livraison/carriers.json: duplicate carrier id(s)");
  if (carriers.some((c) => !c.id || !c.name)) fail("livraison/carriers.json: record(s) missing id/name");
  const carriersCsv = join(dataDir, "csv", "carriers.csv");
  if (!existsSync(carriersCsv)) fail("livraison: missing csv/carriers.csv");
  else if (csvRowCount(carriersCsv) !== carriers.length) fail(`livraison: carriers CSV rows ≠ JSON ${carriers.length}`);

  // stopdesks (geocoded points, wilaya_code required)
  let desks = [];
  try {
    desks = readJson(join(dataDir, "stopdesks.json"));
  } catch (e) {
    fail(`livraison/stopdesks.json: invalid JSON — ${e.message}`);
  }
  if (!Array.isArray(desks) || !desks.length) fail("livraison/stopdesks.json: expected a non-empty array");
  if (meta.stopdesks !== desks.length) {
    fail(`livraison/stopdesks.json: count ${desks.length} ≠ metadata.stopdesks ${meta.stopdesks}`);
  }
  const deskIds = new Set(desks.map((s) => s.id));
  if (deskIds.size !== desks.length) fail(`livraison/stopdesks.json: ${desks.length - deskIds.size} duplicate id(s)`);

  if (isV2) {
    const { errors: v2errs, warnings: v2warn } = validateV2Records(desks, {
      requireName: true,
      boundaries: BOUNDARIES,
    });
    for (const m of v2errs) fail(`livraison/stopdesks.json [v2]: ${m}`);
    tallyBoundaries("livraison", "livraison/stopdesks.json", desks);
    const metaRes = validateV2Metadata(meta);
    for (const m of metaRes.errors) fail(`livraison/metadata.json [v2]: ${m}`);
    const warnCount = v2warn.length + metaRes.warnings.length;
    if (warnCount) console.log(`  ⚠ livraison/stopdesks.json [v2]: ${warnCount} warning(s)`);
  }
  let badWilaya = 0, badCoord = 0, missing = 0, badOp = 0;
  for (const s of desks) {
    if (!isV2) {
      const w = Number(s.wilaya_code);
      if (!/^\d+$/.test(String(s.wilaya_code)) || w < 1 || w > 69) badWilaya++;
      if (!inAlgeria(s.lat, s.lng)) badCoord++;
      for (const f of ["id", "operator", "name", "wilaya_code"]) {
        if (s[f] === undefined || s[f] === null || s[f] === "") missing++;
      }
    }
    if (!carrierIds.has(s.operator)) badOp++;
  }
  if (badWilaya) fail(`livraison: ${badWilaya} stop-desk(s) with wilaya_code outside [1,69]`);
  if (badCoord) fail(`livraison: ${badCoord} stop-desk(s) with coordinates outside Algeria`);
  if (missing) fail(`livraison: ${missing} missing required stop-desk field(s)`);
  if (badOp) fail(`livraison: ${badOp} stop-desk(s) with an operator absent from carriers.json`);
  const deskCsv = join(dataDir, "csv", "stopdesks.csv");
  if (!existsSync(deskCsv)) fail("livraison: missing csv/stopdesks.csv");
  else if (csvRowCount(deskCsv) !== desks.length) fail(`livraison: stopdesks CSV rows ≠ JSON ${desks.length}`);
  const geo = join(dataDir, "geojson", "stopdesks.geojson");
  const withCoord = desks.filter(hasCoord).length;
  if (!existsSync(geo)) fail("livraison: missing geojson/stopdesks.geojson");
  else {
    const features = readJson(geo).features;
    if (!Array.isArray(features)) fail("livraison/stopdesks.geojson: no FeatureCollection features array");
    else if (features.length !== withCoord) fail(`livraison: GeoJSON features ${features.length} ≠ stop-desks with coordinates ${withCoord}`);
  }

  // coverage (per-carrier presence — reconciles against stopdesks + carriers)
  let cov = [];
  try {
    cov = readJson(join(dataDir, "coverage.json"));
  } catch (e) {
    fail(`livraison/coverage.json: invalid JSON — ${e.message}`);
  }
  if (!Array.isArray(cov) || !cov.length) fail("livraison/coverage.json: expected a non-empty array");
  if (meta.coverage !== cov.length) {
    fail(`livraison/coverage.json: count ${cov.length} ≠ metadata.coverage ${meta.coverage}`);
  }
  const covIds = new Set(cov.map((c) => c.operator));
  if (covIds.size !== cov.length) fail("livraison/coverage.json: duplicate operator id(s)");
  let covSum = 0, covBadWilaya = 0;
  for (const c of cov) {
    if (!carrierIds.has(c.operator)) fail(`livraison/coverage.json: operator "${c.operator}" not in carriers.json`);
    if (!Number.isInteger(c.stopdesks)) fail(`livraison/coverage.json: operator "${c.operator}" has a non-integer stopdesks count`);
    covSum += Number(c.stopdesks);
    // coverage.wilayas is derived from stopdesks.wilaya_code, so it must carry the
    // same key type — zero-padded strings — or the two files won't join.
    if (!Array.isArray(c.wilayas) || c.wilayas.some((w) => !WILAYA_CODES.includes(w))) covBadWilaya++;
  }
  if (covBadWilaya) fail(`livraison: ${covBadWilaya} coverage row(s) whose wilayas[] are not zero-padded codes "01".."69"`);
  if (covSum !== desks.length) fail(`livraison: coverage stop-desk sum ${covSum} ≠ stopdesks ${desks.length}`);
  const covCsv = join(dataDir, "csv", "coverage.csv");
  if (!existsSync(covCsv)) fail("livraison: missing csv/coverage.csv");
  else if (csvRowCount(covCsv) !== cov.length) fail(`livraison: coverage CSV rows ≠ JSON ${cov.length}`);

  // livraison's metadata describes the stop-desks; carriers.json and coverage.json
  // are reconciled above and are not GeoRecords.
  validateDerivedMetadata("livraison", desks);

  console.log(
    `  OK: ${carriers.length} carriers, ${desks.length} stop-desks (${withCoord} geocoded, ${meta.wilayas_covered} wilayas), ${cov.length} coverage rows`,
  );
}

// Flat (table-driven) packages plus the bespoke livraison validator, in run order.
const FLAT = Object.keys(PACKAGES);
const ALL = [...FLAT, "livraison"];

const only = process.argv[2];
const targets = only ? [only] : ALL;
for (const pkg of targets) {
  if (pkg === "livraison") {
    console.log(`\n[@geoalgeria/livraison]`);
    validateLivraison();
    continue;
  }
  if (!PACKAGES[pkg]) {
    fail(`unknown package "${pkg}" (expected: ${ALL.join(", ")})`);
    continue;
  }
  console.log(`\n[@geoalgeria/${pkg}]`);
  // Only GeoRecord files feed the derived metadata. record_count, geocoded_pct,
  // precision, bbox and by_source all describe PLACES, and a relation row is not
  // one: folding routes.json in dropped aviation's geocoded_pct to 35% and blew
  // by_source out into forty source URLs.
  const shipped = [];
  for (const spec of PACKAGES[pkg]) {
    const arr = validateDataset(pkg, spec);
    if (arr && spec.records !== false) shipped.push(...arr);
  }
  validateDerivedMetadata(pkg, shipped);
}
console.log(`\n[geo: every point inside its declared wilaya]`);
reportBoundaries(!only);

console.log(`\n[cross-file id uniqueness (merged export surfaces)]`);
validateMergedIds(only ? [only] : Object.keys(MERGED_ID_NAMESPACES));

console.log(`\n[retired ids never become live again]`);
validateRetiredIds(only ? [only] : readdirSync(join(ROOT, "packages")).sort());

console.log(`\n[package files[] ↔ derived data]`);
validatePackageFiles(
  only ? [only] : readdirSync(join(ROOT, "packages")).sort(),
);

console.log(`\n[types/index.d.ts ↔ shipped data]`);
validateTypes(only ? [only] : readdirSync(join(ROOT, "packages")).sort());

console.log(`\n[licence terms: manifest ↔ LICENSE ↔ metadata]`);
validateLicenceTerms(only ? [only] : readdirSync(join(ROOT, "packages")).sort());

// the mirror is poste-specific — only run it when validating poste (or all)
if (!only || only === "poste") {
  console.log(`\n[mirror: dataset ↔ poste]`);
  validateMirror();
}

if (!only || only === "aviation") {
  console.log(`\n[aviation route endpoints]`);
  validateRouteEndpoints();
}

console.log("\n" + "=".repeat(40));
if (errors.length) {
  console.error(`FAILED: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("PASSED: all scoped packages valid");
