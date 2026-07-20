// Guards the wilaya capital points in packages/dataset.
//
// The bug this exists for: the 9 wilayas created by the 2026 reform had their
// capital points assigned in French alphabetical order of capital name instead
// of by code — a closed 9-cycle. Every coordinate VALUE was a real Algerian
// town and inside Algeria, so range/bbox checks saw nothing. Only the code each
// point was attached to was wrong.
//
// The check: the commune table (data/communes_w*.json) carries its own
// lat/lng + wilaya_code and is built independently of the capital points. So a
// capital's nearest commune centroid, over all 1,528 communes, must belong to
// that capital's own wilaya. A permutation moves a capital into someone else's
// territory and fails immediately.
//
// Catches: permutations/swaps of capitals, lat↔lng transposition, sign flips,
// and any displacement large enough to land nearer another wilaya's communes.
// Does NOT catch: a displacement small enough to stay nearest a commune of the
// same wilaya (see the "wilaya coords" note — small displacements are invisible
// here), nor a wrong-but-plausible point in a wilaya with no commune centroids.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset");
const read = (...p) => JSON.parse(readFileSync(join(DATA, ...p), "utf-8"));

const communes = ["communes_w1_w23", "communes_w24_w48", "communes_w49_w69"]
  .flatMap((f) => read("data", `${f}.json`))
  .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));

/** Every file in packages/dataset that carries a capital point: [label, () => {code: [lng, lat]}] */
const COPIES = [
  [
    "data/geojson/wilayas.geojson",
    () =>
      Object.fromEntries(
        read("data", "geojson", "wilayas.geojson").features.map((f) => [
          f.properties.code,
          f.geometry.coordinates,
        ]),
      ),
  ],
  [
    "algeria.geojson",
    () =>
      Object.fromEntries(
        read("algeria.geojson").features.map((f) => [f.properties.code, f.geometry.coordinates]),
      ),
  ],
  [
    "data/algeria.json",
    () => Object.fromEntries(read("data", "algeria.json").map((w) => [w.code, [w.longitude, w.latitude]])),
  ],
  ["data/csv/wilayas.csv", () => fromCsv()],
  ["data/sql/full.sql", () => fromSql()],
];

function fromCsv() {
  const text = readFileSync(join(DATA, "data", "csv", "wilayas.csv"), "utf-8");
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const col = head.split(",");
  const [ci, lat, lng] = [col.indexOf("code"), col.indexOf("latitude"), col.indexOf("longitude")];
  return Object.fromEntries(
    rows.map((r) => {
      const f = r.split(",");
      return [Number(f[ci]), [Number(f[lng]), Number(f[lat])]];
    }),
  );
}

function fromSql() {
  const text = readFileSync(join(DATA, "data", "sql", "full.sql"), "utf-8");
  const out = {};
  // (code, 'name_fr', 'name_ar', phone, postal, latitude, longitude, created)
  const re = /^ {2}\((\d+), .*?, (-?[\d.]+), (-?[\d.]+), '[^']*'\)[,;]$/gm;
  for (const m of text.matchAll(re)) out[Number(m[1])] = [Number(m[3]), Number(m[2])];
  return out;
}

/** Equirectangular approximation — plenty for "which commune is nearest". */
function km([lngA, latA], [lngB, latB]) {
  const x = (lngA - lngB) * Math.cos((((latA + latB) / 2) * Math.PI) / 180) * 111.32;
  return Math.hypot(x, (latA - latB) * 110.57);
}

test("wilaya capitals: 1,528 commune centroids loaded", () => {
  assert.ok(communes.length > 1500, `only ${communes.length} commune centroids`);
});

for (const [label, load] of COPIES) {
  test(`${label}: every capital's nearest commune belongs to its own wilaya`, () => {
    const capitals = load();
    assert.equal(Object.keys(capitals).length, 69, `${label}: expected 69 wilayas`);

    const wrong = [];
    for (const [code, point] of Object.entries(capitals)) {
      assert.ok(
        Number.isFinite(point[0]) && Number.isFinite(point[1]),
        `${label}: wilaya ${code} has a non-numeric point ${JSON.stringify(point)}`,
      );
      let best = null;
      let bestD = Infinity;
      for (const c of communes) {
        const d = km(point, [c.longitude, c.latitude]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (Number(best.wilaya_code) !== Number(code)) {
        wrong.push(
          `wilaya ${code}: point ${JSON.stringify(point)} is nearest ${best.name_fr} ` +
            `(${bestD.toFixed(1)} km), a commune of wilaya ${best.wilaya_code}`,
        );
      }
    }
    assert.deepEqual(wrong, [], `${label}: ${wrong.length} misplaced capital(s)\n  ${wrong.join("\n  ")}`);
  });
}

test("wilaya capitals: all five copies in packages/dataset carry the same point", () => {
  const [[baseLabel, baseLoad], ...rest] = COPIES;
  const base = baseLoad();
  for (const [label, load] of rest) {
    const other = load();
    for (const code of Object.keys(base)) {
      assert.ok(
        km(base[code], other[code]) < 0.001,
        `wilaya ${code}: ${label} has ${JSON.stringify(other[code])}, ` +
          `${baseLabel} has ${JSON.stringify(base[code])}`,
      );
    }
  }
});
