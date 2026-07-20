// Guards the commune centroids in packages/dataset against the wilaya polygons.
//
// Why this file exists, and why it is a test rather than a line in
// validate-packages.mjs: `dataset` ships no data/metadata.json, never reaches that
// script's v2 gate, and is a declared V1 holdout — so the geo-in-boundary check
// that now runs over all 24 scoped packages ran over none of the 1,528 commune
// centroids they are all derived from. The table was the one file exempt from the
// standard its consumers are held to.
//
// It is not a hypothetical exemption. packages/ecoles/scripts/fetch.mjs (and the
// same pattern in mosquees, culture, pharmacies, sante, djezzy, ooredoo) stamps
// wilaya_code onto OSM features by nearest-centroid join against
// dataset/data/algeria.json. A commune row carrying another wilaya's coordinate is
// therefore not one wrong row — it is an attractor that stamps its own wilaya_code
// onto every facility near a point it does not belong to. Five such rows produced
// 30 of the repo's mislinks before they were repaired.
//
// The gate is adjacency, not distance, and it is the same wilayaNeighbours() the
// package validator uses:
//   - outside the declared wilaya but inside a NEIGHBOUR (or inside none at all,
//     i.e. just off the national outline) → warning. The shipped outlines are
//     simplified display-grade geometry, so this is unprovable either way here.
//   - inside a wilaya that does NOT touch the declared one → nothing about the
//     geometry can explain it. That fails.
//
// Every representation that carries a commune point is checked, not just the split
// JSON: the nearest-centroid joins above read algeria.json, and the csv/sql/geojson
// mirrors are what external consumers install. A repair that lands in one file and
// not the others is the drift that shipped v2 JSON beside v1 CSV in packages/poste.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  loadBoundaries,
  pointInWilaya,
  pointInGeometry,
  wilayaNeighbours,
} from "../packages/schema/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const readText = (...p) => readFileSync(join(DATA, ...p), "utf-8");
const readJson = (...p) => JSON.parse(readText(...p));

const COMMUNE_COUNT = 1528;

// Commune rows whose point cannot be asked about, pinned per file so a second one
// cannot appear unnoticed. Stidia (w27) carries longitude 0 in every JSON/CSV/
// GeoJSON copy — a value that is inside Mostaganem, so nothing here disproves it —
// while full.sql alone writes NULL, because whatever emitted it treats 0 as absent.
// Which of the two is right is an ONS question (P3 commune reconciliation), not a
// validator one, so the drift is recorded rather than papered over.
const UNCHECKABLE = { "data/sql/full.sql": ["Stidia (w27)"] };

const boundaryFc = readJson("geojson", "wilaya-boundaries.geojson");
const BOUNDARIES = loadBoundaries(boundaryFc);
const NEIGHBOURS = wilayaNeighbours(boundaryFc);

/** Every file in packages/dataset that carries a commune point.
 *  [label, () => {name, wilaya_code, lat, lng}[]] */
const COPIES = [
  [
    "data/communes_w*.json",
    () =>
      ["communes_w1_w23", "communes_w24_w48", "communes_w49_w69"]
        .flatMap((f) => readJson(`${f}.json`))
        .map((c) => ({ name: c.name_fr, w: c.wilaya_code, lat: c.latitude, lng: c.longitude })),
  ],
  [
    "data/algeria.json",
    () =>
      readJson("algeria.json").flatMap((wil) =>
        (wil.communes || []).map((c) => ({
          name: c.name_fr,
          w: c.wilaya_code,
          lat: c.latitude,
          lng: c.longitude,
        })),
      ),
  ],
  [
    "data/geojson/communes.geojson",
    () =>
      readJson("geojson", "communes.geojson").features.map((f) => ({
        name: f.properties.name_fr,
        w: f.properties.wilaya_code,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      })),
  ],
  [
    // name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune
    "data/csv/communes.csv",
    () =>
      readText("csv", "communes.csv")
        .trim()
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.split(","))
        .filter((c) => c.length === 8)
        .map((c) => ({ name: c[0], w: Number(c[2]), lat: Number(c[5]), lng: Number(c[6]) })),
  ],
  [
    // …, wilaya_code, 'daira', 'postal', latitude, longitude, code_commune)
    // Anchored at the end of the row: commune names carry SQL-escaped apostrophes
    // (M''fatha), so a left-anchored quoted-field pattern drops them silently.
    "data/sql/full.sql",
    () => {
      const re =
        /^ {2}\(\d+, '((?:[^']|'')*)', '(?:[^']|'')*', (\d+), '(?:[^']|'')*', '\d+', (-?[\d.]+|NULL), (-?[\d.]+|NULL), (?:\d+|NULL)\)[,;]$/;
      const num = (s) => (s === "NULL" ? NaN : Number(s));
      const out = [];
      for (const line of readText("sql", "full.sql").split("\n")) {
        const m = line.match(re);
        if (m) out.push({ name: m[1].replace(/''/g, "'"), w: Number(m[2]), lat: num(m[3]), lng: num(m[4]) });
      }
      return out;
    },
  ],
];

for (const [label, load] of COPIES) {
  test(`${label}: every commune centroid sits in its own wilaya or a neighbour`, () => {
    const rows = load();
    // A parser that silently drops rows would report a clean run over data it
    // never looked at — the exact failure this whole check exists to prevent.
    assert.equal(rows.length, COMMUNE_COUNT, `${label}: parsed ${rows.length} communes`);

    const mislinked = [];
    const noPoint = [];
    let outside = 0;
    for (const r of rows) {
      const w = String(r.w).padStart(2, "0");
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) {
        noPoint.push(`${r.name} (w${w})`);
        continue;
      }
      if (pointInWilaya(r.lng, r.lat, w, BOUNDARIES)) continue;
      outside++;
      const inside = [...BOUNDARIES].filter(([, g]) => pointInGeometry(r.lng, r.lat, g)).map(([c]) => c);
      // No containing wilaya at all = just outside the national outline.
      if (!inside.length || inside.some((c) => NEIGHBOURS.get(w).has(c))) continue;
      mislinked.push(`${r.name} (w${w}) at [${r.lng}, ${r.lat}] is in w${inside.join("+")}`);
    }

    assert.deepEqual(
      noPoint,
      UNCHECKABLE[label] ?? [],
      `${label}: commune(s) with no usable point — nothing can check where they are`,
    );
    assert.deepEqual(
      mislinked,
      [],
      `${label}: ${mislinked.length} commune(s) in a wilaya that does not touch the declared one ` +
        `(${outside} of ${rows.length} outside their wilaya overall, near-border warnings)\n  ` +
        mislinked.join("\n  "),
    );
  });
}

test("a commune centroid stamped with a non-adjacent wilaya is reported", () => {
  // The check must be able to fail. Souama (Tizi Ouzou, w15) is the row that
  // carried M'Sila's coordinate and stamped w15 onto facilities 100 km away;
  // putting that coordinate back must come back reported.
  const souama = readJson("communes_w1_w23.json").find(
    (c) => c.wilaya_code === 15 && c.name_fr === "Souama",
  );
  assert.ok(souama, "Souama (w15) is missing from the commune table");
  assert.equal(pointInWilaya(souama.longitude, souama.latitude, "15", BOUNDARIES), true);

  const before = { lng: 4.668889, lat: 35.6546 }; // M'Sila's Souamaa, the copied value
  assert.equal(pointInWilaya(before.lng, before.lat, "15", BOUNDARIES), false);
  const inside = [...BOUNDARIES].filter(([, g]) => pointInGeometry(before.lng, before.lat, g)).map(([c]) => c);
  assert.deepEqual(inside, ["28"]);
  assert.equal(NEIGHBOURS.get("15").has("28"), false, "w15 and w28 must not be neighbours");
});
