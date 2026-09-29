#!/usr/bin/env node
// Correct misplaced commune centres in the flagship dataset from OpenStreetMap.
//
// WHY. Alger Centre shipped at [3.0909, 36.76846], in the sea east of the port;
// Bethioua at [-0.2596, 35.805837], inside the Arzew LNG complex (issue #167).
// Sweeping all 1,541 centres against the 69 wilaya polygons found 68 outside
// their own wilaya, and testing each of those against its commune's own
// unsimplified OSM boundary separated 55 real errors from 13 simplification
// artefacts. Full method, sources and the 13 left for review:
// research/_commune-centres/README.md.
//
// THE 2026-09-29 SEAT AUDIT. Containment can only see a centre that leaves its
// commune, and the wilaya sweep above tested only 68 of the 1,541 against a
// commune boundary. Running the same standard over every row (private tracker
// #170) found 215 outside their own commune, 174 of them with the evidence
// complete, which is the second batch this script applies.
//
// SOURCE OF TRUTH. research/_commune-centres/corrections-<date>.json, one file
// per audit, listed oldest-first in scripts/lib/commune-corrections.mjs. Each row
// carries `from`, `to`, the OSM relation and admin_centre node ids the value comes
// from, and its pull's Overpass `timestamp_osm_base`. This script applies those
// files and invents nothing: a row whose stored value is neither its `from` nor
// its `to` aborts the run rather than being overwritten. A row already at its `to`
// is a no-op, so every batch is replayed on every run and a carrier that missed an
// older one still fails.
//
// CARRIERS. Every file in packages/dataset that holds a commune point, because a
// repair that lands in one and not the others is the drift that shipped v2 JSON
// beside v1 CSV in packages/poste. Keys are `code_commune` everywhere it exists
// and (wilaya_code, name_fr) in the GeoJSON, which has no code; both are unique
// across all 1,541 rows and that is asserted, not assumed.
//
// USAGE
//   node scripts/fix-commune-centres.mjs            # dry-run report
//   node scripts/fix-commune-centres.mjs --write    # patch packages/dataset
//   node scripts/fix-commune-centres.mjs --write \
//        --target /path/algeria.json --target /path/communes.geojson
//      # patch arbitrary carriers (the app repo's committed copies) from the
//      # SAME corrections files, so every surface agrees.

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describeBatches, loadCorrections } from "./lib/commune-corrections.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");

const WRITE = process.argv.includes("--write");
const targets = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--target") targets.push(process.argv[++i]);
}

const doc = loadCorrections();
const fixes = doc.corrections;

/** code_commune -> fix, and "w|name_fr" -> fix (the GeoJSON has no code). */
const byCode = new Map();
const byName = new Map();
for (const f of fixes) {
  const [lng, lat] = f.to;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) throw new Error(`${f.name_fr}: non-numeric target ${JSON.stringify(f.to)}`);
  if (byCode.has(f.code_commune)) throw new Error(`duplicate correction for code_commune ${f.code_commune}`);
  byCode.set(f.code_commune, f);
  byName.set(`${f.wilaya_code}|${f.name_fr}`, f);
}

// Externally-verified answers this run must reproduce, or it aborts. Each is
// stated as its report stated it, not as the corrections file happens to read.
// Alger Centre and Bethioua are the two reported defects of 2026-09-27; Sidi
// Slimane is the largest single move of the 2026-09-29 audit (108.7 km) and
// Ouled Ahmed Timmi is its sign-flip class, a positive longitude where the
// chef-lieu is west of Greenwich.
const PINS = [
  [1601, "Alger Centre", [3.058211, 36.776335]],
  [3107, "Bethioua", [-0.267936, 35.805837]],
  [3221, "Sidi Slimane", [1.731609, 33.832116]],
  [121, "Ouled Ahmed Timmi", [-0.281279, 27.851041]],
];
for (const [code, name, want] of PINS) {
  const f = byCode.get(code);
  if (!f) throw new Error(`PIN FAILED: no correction for ${name} (${code})`);
  if (f.to[0] !== want[0] || f.to[1] !== want[1])
    throw new Error(`PIN FAILED: ${name} expected ${JSON.stringify(want)}, corrections file says ${JSON.stringify(f.to)}`);
}

// 6 decimals is the repository's coordinate resolution (schema round6, ~0.1 m).
const same = (a, b) => Math.abs(a - b) < 5e-7;
const num6 = (n) => String(Math.round(n * 1e6) / 1e6);

const outputs = [];
const problems = [];
function queue(path, content) {
  outputs.push([path, content]);
}
function writeAtomic(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

/** Apply one fix to a row's [lng, lat], refusing anything but the recorded `from`. */
function applyPoint(label, f, lng, lat) {
  if (same(lng, f.to[0]) && same(lat, f.to[1])) return { point: f.to, changed: false };
  if (!same(lng, f.from[0]) || !same(lat, f.from[1])) {
    problems.push(
      `${label}: ${f.name_fr} (${f.code_commune}) holds [${lng}, ${lat}], ` +
        `but the correction was recorded against [${f.from[0]}, ${f.from[1]}]`,
    );
    return { point: [lng, lat], changed: false };
  }
  return { point: f.to, changed: true };
}

// --- JSON carriers: the three split files, algeria.json, and any --target ------
/** Visit every commune row of a JSON doc in any of the shapes this repo ships. */
function communeRows(parsed) {
  if (parsed?.type === "FeatureCollection") return parsed.features.map((ft) => ({ props: ft.properties, geom: ft.geometry }));
  const arr = Array.isArray(parsed) ? parsed : parsed.wilayas ?? parsed.communes;
  if (!Array.isArray(arr)) return null;
  if (arr[0]?.communes) return arr.flatMap((w) => w.communes.map((c) => ({ props: c })));
  return arr.map((c) => ({ props: c }));
}

function patchJson(path) {
  const parsed = JSON.parse(readFileSync(path, "utf-8"));
  const rows = communeRows(parsed);
  if (!rows) throw new Error(`${basename(path)}: unrecognised commune carrier shape`);
  const label = basename(path);
  let changed = 0;
  const seen = new Set();
  for (const { props, geom } of rows) {
    const f =
      props.code_commune != null
        ? byCode.get(Number(props.code_commune))
        : byName.get(`${Number(props.wilaya_code)}|${props.name_fr}`);
    if (!f) continue;
    if (seen.has(f.code_commune)) throw new Error(`${label}: ${f.name_fr} (${f.code_commune}) appears more than once`);
    seen.add(f.code_commune);
    const [lng, lat] = geom ? geom.coordinates : [props.longitude, props.latitude];
    const res = applyPoint(label, f, Number(lng), Number(lat));
    if (!res.changed) continue;
    if (geom) geom.coordinates = [res.point[0], res.point[1]];
    else {
      props.longitude = res.point[0];
      props.latitude = res.point[1];
    }
    changed++;
  }
  queue(path, `${JSON.stringify(parsed, null, 2)}\n`);
  return { label, changed, seen: seen.size };
}

// --- data/csv/communes.csv -----------------------------------------------------
// name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune
// The dataset's CSVs are plain comma-joined (no quoting): commune names carry
// apostrophes but never commas, so a fixed 8-field split is exact here and a
// row that does not split into 8 is left alone and counted, never guessed at.
function patchCsv(path) {
  const text = readFileSync(path, "utf-8");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const label = basename(path);
  let changed = 0;
  const seen = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    if (cells.length !== 8) continue;
    const f = byCode.get(Number(cells[7]));
    if (!f) continue;
    if (seen.has(f.code_commune)) throw new Error(`${label}: code_commune ${f.code_commune} appears more than once`);
    seen.add(f.code_commune);
    const res = applyPoint(label, f, Number(cells[6]), Number(cells[5]));
    if (!res.changed) continue;
    cells[5] = num6(res.point[1]);
    cells[6] = num6(res.point[0]);
    lines[i] = cells.join(",");
    changed++;
  }
  queue(path, lines.join(newline));
  return { label, changed, seen: seen.size };
}

// --- data/sql/full.sql --------------------------------------------------------
//   (id, 'name_fr', 'name_ar', wilaya_code, 'daira', 'postal'|NULL, lat, lng, code)
// Anchored at the end of the row and keyed on the trailing code_commune, so
// SQL-escaped apostrophes (M''fatha) and the five NULL postal codes are all read
// rather than dropped. Only the two numeric fields are rewritten.
function patchSql(path) {
  const text = readFileSync(path, "utf-8");
  const label = basename(path);
  const re =
    /^( {2}\(\d+, '(?:[^']|'')*', '(?:[^']|'')*', \d+, '(?:[^']|'')*', (?:'\d+'|NULL), )(-?[\d.]+|NULL)(, )(-?[\d.]+|NULL)(, (\d+)\)[,;])$/;
  const lines = text.split("\n");
  let changed = 0;
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const f = byCode.get(Number(m[6]));
    if (!f) continue;
    if (seen.has(f.code_commune)) throw new Error(`${label}: code_commune ${f.code_commune} appears more than once`);
    seen.add(f.code_commune);
    const res = applyPoint(label, f, Number(m[4]), Number(m[2]));
    if (!res.changed) continue;
    lines[i] = `${m[1]}${num6(res.point[1])}${m[3]}${num6(res.point[0])}${m[5]}`;
    changed++;
  }
  queue(path, lines.join("\n"));
  return { label, changed, seen: seen.size };
}

const reports = [];
if (targets.length) {
  for (const t of targets) reports.push(t.endsWith(".csv") ? patchCsv(t) : t.endsWith(".sql") ? patchSql(t) : patchJson(t));
} else {
  for (const f of ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json", "algeria.json"])
    reports.push(patchJson(join(DATA, f)));
  reports.push(patchJson(join(DATA, "geojson", "communes.geojson")));
  reports.push(patchCsv(join(DATA, "csv", "communes.csv")));
  reports.push(patchSql(join(DATA, "sql", "full.sql")));
}

// Every carrier must have seen every correction, or one file keeps a stale point
// while the report reads clean. The three split files hold one wilaya range each,
// so between them they see all 230 and individually they do not.
const split = new Set(["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"]);
const splitSeen = reports.filter((r) => split.has(r.label)).reduce((n, r) => n + r.seen, 0);
if (!targets.length) {
  if (splitSeen !== fixes.length) problems.push(`the three split files together saw ${splitSeen} of ${fixes.length} corrections`);
  for (const r of reports) {
    if (split.has(r.label)) continue;
    if (r.seen !== fixes.length) problems.push(`${r.label} saw ${r.seen} of ${fixes.length} corrections`);
  }
}

console.log(`corrections: ${fixes.length} commune centre(s) over ${doc.docs.length} batch(es): ${describeBatches(doc.docs)}`);
for (const r of reports) console.log(`  ${WRITE ? "patched" : "would patch"} ${r.label}: ${r.changed} row(s) changed, ${r.seen} matched`);
console.log(`pins ok (${PINS.map(([, name, to]) => `${name} [${to.join(", ")}]`).join(", ")})`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s); nothing written:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
if (WRITE) for (const [path, content] of outputs) writeAtomic(path, content);
