#!/usr/bin/env node
// Make every wilaya point equal the centre of its capital commune.
//
// WHY. A wilaya shipped a point of its own, an OpenStreetMap `admin_level=4`
// relation's `admin_centre`, while the commune the decrees name as its chef-lieu
// shipped another. Two claims about one town is one claim too many: a reader asking
// where the seat of a wilaya is got a different answer from the wilaya row and from
// the capital commune row, and the only guard that compared them asked which commune
// centre the wilaya point was nearest, which passes on wrong data (wilaya 52's point
// was 8.8 km from the centre of Beni-Abbes and still answered Beni-Abbes). Rule 9 of
// docs/adr/0001-coordinate-review-by-independent-votes.md (Owner, 2026-10-01): a
// wilaya capital point IS its capital commune's centre, asserted by a test, so there
// is one point to verify per capital and it is verified by containment in that
// commune's own outline like every other published point.
//
// SOURCE OF TRUTH. `capital_commune_code` in packages/dataset/data/algeria.json, the
// decreed chef-lieu (décret n° 84-79, n° 21-117, n° 26-206), joined to that commune's
// published centre. This script derives and invents nothing: it copies the commune's
// own `latitude` / `longitude` digit for digit, so a wilaya point can never be a
// rounded near-copy of the value it is supposed to be.
//
// CARRIERS. The five files in packages/dataset that hold a wilaya point. A repair
// that lands in one and not the others is the drift that shipped v2 JSON beside v1
// CSV in packages/poste, so every run visits all five and every one of them has to
// have seen all 69 wilayas or the run fails.
//
// WHAT IT DOES NOT TOUCH. The commune centres themselves (those are
// scripts/fix-commune-centres.mjs and its ledgers), the wilaya boundary polygons, and
// any record in another package: nothing in this repository derives from a wilaya
// point. `wilaya_centroid` rows in @geoalgeria/agriculture and
// @geoalgeria/industrie-pharmaceutique sit on commune centres and polygon centroids,
// which is asserted by scripts/sync-commune-centroid-dependents.mjs --check.
//
// USAGE
//   node scripts/fix-wilaya-capital-points.mjs            # dry-run report
//   node scripts/fix-wilaya-capital-points.mjs --write    # patch packages/dataset
//   node scripts/fix-wilaya-capital-points.mjs --check    # fail if any point is stale

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "packages", "dataset");
const DATA = join(PKG, "data");

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));

const communes = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"].flatMap((f) =>
  readJson(join(DATA, f)),
);
const byCode = new Map(communes.map((c) => [c.code_commune, c]));
if (byCode.size !== communes.length) throw new Error("duplicate code_commune in the split commune files");

/** wilaya code -> { capital, name_fr, point: [lng, lat] } */
const WANT = new Map();
for (const w of readJson(join(DATA, "algeria.json"))) {
  const commune = byCode.get(w.capital_commune_code);
  if (!commune) throw new Error(`wilaya ${w.code}: capital ${w.capital_commune_code} is not a commune code`);
  if (Number(commune.wilaya_code) !== Number(w.code))
    throw new Error(`wilaya ${w.code}: capital ${w.capital_commune_code} belongs to wilaya ${commune.wilaya_code}`);
  if (!Number.isFinite(commune.longitude) || !Number.isFinite(commune.latitude))
    throw new Error(`wilaya ${w.code}: capital ${commune.name_fr} has no centre to copy`);
  WANT.set(Number(w.code), {
    capital: w.capital_commune_code,
    name_fr: commune.name_fr,
    point: [commune.longitude, commune.latitude],
  });
}
if (WANT.size !== 69) throw new Error(`expected 69 wilayas, read ${WANT.size}`);

// Externally-decided answers this run must reproduce, or it aborts. Wilaya 52 is the
// defect that made the rule necessary (8.8 km, and the old nearest-centre check passed
// it); its capital centre is the `admin_centre` node PR #248 wrote, confirmed by an
// Owner reading under rule 6. Wilaya 16 is the one the decree had to settle against
// OpenStreetMap: no commune is called "Alger", so the chef-lieu is Alger Centre. Wilaya
// 66's capital keeps its mother-wilaya prefix (Messaad reads 1717), so the pin also
// proves the join is on `capital_commune_code` and not on the wilaya code.
const PINS = [
  [52, 5201, "Beni-Abbes", [-2.169031, 30.131743]],
  [16, 1601, "Alger Centre", [3.058211, 36.776335]],
  [66, 1717, "Messaad", [3.50309, 34.15429]],
];
for (const [code, capital, name, want] of PINS) {
  const got = WANT.get(code);
  if (!got) throw new Error(`PIN FAILED: no wilaya ${code}`);
  if (got.capital !== capital || got.name_fr !== name)
    throw new Error(`PIN FAILED: wilaya ${code} expected capital ${capital} (${name}), got ${got.capital} (${got.name_fr})`);
  if (got.point[0] !== want[0] || got.point[1] !== want[1])
    throw new Error(`PIN FAILED: ${name} expected [${want}], the commune record says [${got.point}]`);
}

/** The published digits, never a rounded copy: the point has to BE the commune's. */
const num = (n) => String(n);
const same = (a, b) => Number(a) === Number(b);

const outputs = [];
const problems = [];
const moves = [];

/** Equirectangular approximation, only ever printed in the report. */
function km([lngA, latA], [lngB, latB]) {
  const x = (lngA - lngB) * Math.cos((((latA + latB) / 2) * Math.PI) / 180) * 111.32;
  return Math.hypot(x, (latA - latB) * 110.57);
}

function writeAtomic(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

/** One wilaya's verdict. `moves` is deduplicated on the wilaya, not on the carrier. */
function verdict(label, code, lng, lat) {
  const want = WANT.get(code);
  if (!want) {
    problems.push(`${label}: wilaya ${code} is not a wilaya this package ships`);
    return null;
  }
  if (same(lng, want.point[0]) && same(lat, want.point[1])) return { want, changed: false };
  if (!moves.some((m) => m.code === code))
    moves.push({
      code,
      capital: want.capital,
      name_fr: want.name_fr,
      from: [Number(lng), Number(lat)],
      to: want.point,
      km: km([Number(lng), Number(lat)], want.point),
    });
  return { want, changed: true };
}

// --- data/algeria.json, data/geojson/wilayas.geojson, algeria.geojson ----------
function patchJson(path) {
  const parsed = readJson(path);
  const label = basename(path);
  const rows =
    parsed?.type === "FeatureCollection"
      ? parsed.features.map((ft) => ({ code: Number(ft.properties.code), geom: ft.geometry }))
      : parsed.map((w) => ({ code: Number(w.code), props: w }));
  const seen = new Set();
  let changed = 0;
  for (const { code, props, geom } of rows) {
    if (seen.has(code)) throw new Error(`${label}: wilaya ${code} appears more than once`);
    seen.add(code);
    const [lng, lat] = geom ? geom.coordinates : [props.longitude, props.latitude];
    const res = verdict(label, code, lng, lat);
    if (!res?.changed) continue;
    if (geom) geom.coordinates = [res.want.point[0], res.want.point[1]];
    else {
      props.longitude = res.want.point[0];
      props.latitude = res.want.point[1];
    }
    changed++;
  }
  outputs.push([path, `${JSON.stringify(parsed, null, 2)}\n`]);
  return { label, changed, seen: seen.size };
}

// --- data/csv/wilayas.csv ------------------------------------------------------
// code,name_fr,name_ar,phone_code,postal_code,latitude,longitude,created,capital_commune_code
// The dataset's CSVs are plain comma-joined (no quoting), so the header names the
// columns and a row that does not split into as many fields is a defect, not a row to
// guess at.
function patchCsv(path) {
  const text = readFileSync(path, "utf-8");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const label = basename(path);
  const col = lines[0].split(",");
  const [ci, lati, lngi] = [col.indexOf("code"), col.indexOf("latitude"), col.indexOf("longitude")];
  if (ci < 0 || lati < 0 || lngi < 0) throw new Error(`${label}: no code/latitude/longitude column`);
  const seen = new Set();
  let changed = 0;
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cells = lines[i].split(",");
    if (cells.length !== col.length) {
      problems.push(`${label} row ${i + 1}: expected ${col.length} fields, found ${cells.length}`);
      continue;
    }
    const code = Number(cells[ci]);
    if (seen.has(code)) throw new Error(`${label}: wilaya ${code} appears more than once`);
    seen.add(code);
    const res = verdict(label, code, cells[lngi], cells[lati]);
    if (!res?.changed) continue;
    cells[lati] = num(res.want.point[1]);
    cells[lngi] = num(res.want.point[0]);
    lines[i] = cells.join(",");
    changed++;
  }
  outputs.push([path, lines.join(newline)]);
  return { label, changed, seen: seen.size };
}

// --- data/sql/full.sql, the wilayas table only ---------------------------------
//   (code, 'name_fr', 'name_ar', 'phone', 'postal', lat, lng, 'created', capital)
// Keyed on the `created` literal in field 8, which is what tells a wilaya row from a
// commune row: both print 9 fields.
function patchSql(path) {
  const text = readFileSync(path, "utf-8");
  const label = basename(path);
  const re =
    /^( {2}\((\d+), '(?:[^']|'')*', '(?:[^']|'')*', (?:'[^']*'|NULL), (?:'[^']*'|NULL), )(-?[\d.]+)(, )(-?[\d.]+)(, '(?:original|2019|2026)', \d+\)[,;])$/;
  const lines = text.split("\n");
  const seen = new Set();
  let changed = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const code = Number(m[2]);
    if (seen.has(code)) throw new Error(`${label}: wilaya ${code} appears more than once`);
    seen.add(code);
    const res = verdict(label, code, m[5], m[3]);
    if (!res?.changed) continue;
    lines[i] = `${m[1]}${num(res.want.point[1])}${m[4]}${num(res.want.point[0])}${m[6]}`;
    changed++;
  }
  outputs.push([path, lines.join("\n")]);
  return { label, changed, seen: seen.size };
}

const reports = [
  patchJson(join(DATA, "algeria.json")),
  patchCsv(join(DATA, "csv", "wilayas.csv")),
  patchSql(join(DATA, "sql", "full.sql")),
  patchJson(join(DATA, "geojson", "wilayas.geojson")),
  patchJson(join(PKG, "algeria.geojson")),
];

for (const r of reports) {
  if (r.seen !== WANT.size) problems.push(`${r.label} saw ${r.seen} of ${WANT.size} wilayas`);
}

moves.sort((a, b) => b.km - a.km);
console.log(`wilaya points: ${moves.length} of ${WANT.size} are not their capital commune's centre`);
for (const m of moves)
  console.log(
    `  wilaya ${m.code} -> ${m.name_fr} (${m.capital}): [${m.from}] -> [${m.to}], ${m.km.toFixed(3)} km`,
  );
for (const r of reports)
  console.log(`  ${WRITE ? "patched" : "would patch"} ${r.label}: ${r.changed} row(s) changed, ${r.seen} matched`);
console.log(`pins ok (${PINS.map(([code, , name]) => `wilaya ${code} ${name}`).join(", ")})`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s); nothing written:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
if (CHECK && moves.length) {
  console.error(`\n${moves.length} wilaya point(s) are stale; run with --write`);
  process.exit(1);
}
if (WRITE) for (const [path, content] of outputs) writeAtomic(path, content);
