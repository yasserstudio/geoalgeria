// Guards the commune centroids in packages/dataset against the wilaya polygons.
//
// Why this file exists, and why it is a test rather than a line in
// validate-packages.mjs: `dataset` ships no data/metadata.json, never reaches that
// script's v2 gate, and is a declared V1 holdout, so the geo-in-boundary check
// that now runs over all 24 scoped packages ran over none of the 1,541 commune
// centroids they are all derived from. The table was the one file exempt from the
// standard its consumers are held to.
//
// It is not a hypothetical exemption. packages/ecoles/scripts/fetch.mjs (and the
// same pattern in mosquees, culture, pharmacies, sante, djezzy, ooredoo) stamps
// wilaya_code onto OSM features by nearest-centroid join against
// dataset/data/algeria.json. A commune row carrying another wilaya's coordinate is
// therefore not one wrong row: it is an attractor that stamps its own wilaya_code
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
// The seven carriers and their readers are shared with the OSM-seat guard, so the
// two standards are held over the same set of files by construction.
import { COMMUNE_COUNT, COPIES } from "./lib/commune-carriers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const readText = (...p) => readFileSync(join(DATA, ...p), "utf-8");
const readJson = (...p) => JSON.parse(readText(...p));

// Commune rows whose point cannot be asked about, pinned per file so a second one
// cannot appear unnoticed. Stidia (w27) carries longitude 0 in every JSON/CSV/
// GeoJSON copy (a value that is inside Mostaganem, so nothing here disproves it)
// while full.sql alone writes NULL, because whatever emitted it treats 0 as absent.
// Which of the two is right is an ONS question (P3 commune reconciliation), not a
// validator one, so the drift is recorded rather than papered over.
const UNCHECKABLE = { "data/sql/full.sql": ["Stidia (w27)"] };

const boundaryFc = readJson("geojson", "wilaya-boundaries.geojson");
const BOUNDARIES = loadBoundaries(boundaryFc);
const NEIGHBOURS = wilayaNeighbours(boundaryFc);


for (const [label, load] of COPIES) {
  test(`${label}: every commune centroid sits in its own wilaya or a neighbour`, () => {
    const rows = load();
    // A parser that silently drops rows would report a clean run over data it
    // never looked at: the exact failure this whole check exists to prevent.
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
      `${label}: commune(s) with no usable point; nothing can check where they are`,
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

// ---------------------------------------------------------------------------
// How far outside, not just which wilaya.
//
// The adjacency rule above is scale-free and stays as the hard failure, but it
// cannot see the two defects reported in September 2026. Alger Centre shipped in
// the sea east of the port: inside NO wilaya polygon, which the rule above skips
// on purpose ("just off the national outline, unprovable here"). Bethioua shipped
// inside the Arzew LNG complex, which is inside its own wilaya, so nothing about
// containment was wrong. Sweeping the 1,541 centres turned up 68 outside their own
// wilaya polygon, of which 55 were outside their own commune's unsimplified OSM
// boundary too, i.e. real errors that this file passed.
//
// So a second, quantitative rule rides on the same loop: how far outside its own
// wilaya polygon a centre is allowed to sit.
//
// TOLERANCE_M is set by the defect it has to catch, not by headroom over the
// artefacts, because the two distributions overlap and no threshold separates
// them. After the 2026-09-27 repair (research/_commune-centres/) the ten centres
// that are legitimately outside the simplified outline measure
//   10 · 29 · 83 · 92 · 134 · 139 · 210 · 231 · 426 · 479 m,
// each verified to be inside its own commune per OSM, while the repaired defects
// ran from 132 m to 188 km with Alger Centre at 997 m. 500 m is therefore the
// loosest line that still fails an Alger Centre, and the tightest that does not
// fail Tigzirt at 479 m.
//
// This is a net, not a classifier: crossing it means a human has to decide error
// or artefact, the way those 68 were decided, against the commune's own OSM
// boundary rather than against these display-grade outlines. Nothing under it is
// certified correct, and a centre wrong by hundreds of metres inside the right
// commune (Bethioua's own class) stays invisible here.
const TOLERANCE_M = 500;

// Centres known to sit further out than that, pinned with what was checked, so
// they neither fail the build nor hide a new one.
//
// Empty since the wilaya-membership correction of private tracker #171. The three
// rows that used to be pinned here, El Alia (w55) at 53,201 m, El-Hadjira (w55)
// at 51,107 m and Mansoura (w47) at 5,233 m, were never point errors: each
// commune's own OSM chef-lieu node was outside the shipped wilaya outline too,
// which made the outline the suspect. It was. Touggourt (55) and El Meniaa (58)
// were carved out of Ouargla (30) and Ghardaia (47) in 2019 and OpenStreetMap
// never re-cut the admin_level=4 relations, so the three communes' territory
// stayed with the mother wilaya. scripts/fix-wilaya-membership.mjs moved it and
// test/wilaya-membership.test.mjs holds that correction in place.
const OUTSIDE_WILAYA = {};

/** Metres from (lng,lat) to the nearest edge of a Polygon/MultiPolygon.
 *  Equirectangular around the point: at these distances the projection error is
 *  far under the 3.4 km vertex gap of the geometry being measured against. */
function metresOutside(lng, lat, geom) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180);
  const ky = 110540;
  const px = lng * kx;
  const py = lat * ky;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let best = Infinity;
  for (const poly of polys) {
    for (const ring of poly) {
      for (let i = 1; i < ring.length; i++) {
        const ax = ring[i - 1][0] * kx;
        const ay = ring[i - 1][1] * ky;
        const dx = ring[i][0] * kx - ax;
        const dy = ring[i][1] * ky - ay;
        const len = dx * dx + dy * dy;
        let t = len === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        if (d < best) best = d;
      }
    }
  }
  return best;
}

for (const [label, load] of COPIES) {
  test(`${label}: no commune centroid is more than ${TOLERANCE_M} m outside its own wilaya`, () => {
    const rows = load();
    assert.equal(rows.length, COMMUNE_COUNT, `${label}: parsed ${rows.length} communes`);

    const tooFar = {};
    for (const r of rows) {
      const w = String(r.w).padStart(2, "0");
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue; // UNCHECKABLE above
      if (pointInWilaya(r.lng, r.lat, w, BOUNDARIES)) continue;
      const d = metresOutside(r.lng, r.lat, BOUNDARIES.get(w));
      if (d <= TOLERANCE_M) continue;
      tooFar[`${r.name} (w${w})`] = Math.round(d);
    }

    // Exact set AND exact distances: a pinned row that drifts further out is a
    // new fact about the data, and the pin must not absorb it silently.
    assert.deepEqual(
      tooFar,
      OUTSIDE_WILAYA,
      `${label}: commune centroid(s) more than ${TOLERANCE_M} m outside their own wilaya polygon ` +
        `and not among the pinned, reviewed cases. Decide each one against the commune's own OSM ` +
        `admin_level=8 boundary (see research/_commune-centres/README.md), then fix it or pin it ` +
        `with what was checked.`,
    );
  });
}

test("a commune centroid dropped in the sea is reported", () => {
  // The distance rule must be able to fail, and on the exact value that prompted
  // it: Alger Centre's [3.0909, 36.76846] is inside no wilaya at all, so the
  // adjacency rule above skips it, while this one measures it at ~1 km out.
  const alger = readJson("communes_w1_w23.json").find(
    (c) => c.wilaya_code === 16 && c.name_fr === "Alger Centre",
  );
  assert.ok(alger, "Alger Centre (w16) is missing from the commune table");
  assert.equal(pointInWilaya(alger.longitude, alger.latitude, "16", BOUNDARIES), true);
  assert.ok(
    metresOutside(alger.longitude, alger.latitude, BOUNDARIES.get("16")) > 0,
    "a point inside the polygon still has a distance to its edge",
  );

  const before = { lng: 3.0909, lat: 36.76846 }; // the value that shipped, in the sea
  assert.equal(pointInWilaya(before.lng, before.lat, "16", BOUNDARIES), false);
  const inside = [...BOUNDARIES].filter(([, g]) => pointInGeometry(before.lng, before.lat, g)).map(([c]) => c);
  assert.deepEqual(inside, [], "the shipped value was inside no wilaya, which is what hid it");
  const d = metresOutside(before.lng, before.lat, BOUNDARIES.get("16"));
  assert.ok(d > TOLERANCE_M, `the shipped value measured ${Math.round(d)} m out, not over ${TOLERANCE_M}`);
});

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
