// Every clause of the commune/wilaya join, on fixtures.
//
// WHY FIXTURES AND NOT THE COUNTRY. test/commune-rejoin.test.mjs asserts the real
// evidence rows, which is the regression ratchet. It cannot state a clause the current
// data happens not to exercise, and it cannot show that a clause fired for the reason
// claimed rather than because another clause reached the same commune first. These
// fixtures are eight communes and three wilaya polygons, arranged so that for each
// clause exactly one answer is possible.

import { test } from "node:test";
import assert from "node:assert/strict";

import { pointInGeometry } from "../packages/schema/index.js";
import { createCommuneResolver, RESOLVE_RULES } from "../scripts/lib/commune-resolver.mjs";

// --- fixture geometry ---------------------------------------------------------
// Axis-aligned squares. A bbox is [lngMin, latMin, lngMax, latMax]; a commune row is
// (code, wilaya, latitude, longitude), the shape the flagship files use.
const ring = (w, s, e, n) => [[w, s], [e, s], [e, n], [w, n], [w, s]];
const outline = (code_commune, wilaya_code, [w, s, e, n]) => ({
  code_commune,
  wilaya_code,
  usable: true,
  bbox: [w, s, e, n],
  outer: [ring(w, s, e, n)],
  inner: [],
});
const noOutline = (code_commune, wilaya_code) => ({ code_commune, wilaya_code, usable: false });
const geom = ([w, s, e, n]) => ({ type: "Polygon", coordinates: [ring(w, s, e, n)] });
const commune = (code_commune, wilaya_code, latitude, longitude, name_fr) => ({
  code_commune,
  wilaya_code,
  latitude,
  longitude,
  name_fr,
});

// The wilaya 55 defect of yasserstudio/geoalgeria.com#171, to scale: the shipped w55
// polygon stops short and the w30 polygon covers what it dropped, so commune 5507's
// territory sits inside the WRONG wilaya's shipped polygon.
const W55 = [0, 0, 1, 1];
const W30 = [1, 0, 3, 1];
const W16 = [0, 2, 1, 3];

const communes = [
  commune(5507, 55, 0.5, 2.5, "El-Hadjira"), //   a w55 commune inside the w30 polygon
  commune(5513, 55, 0.5, 0.5, "El Alia"),
  commune(5599, 55, 0.5, 1.02, "Souk Oufella"), // no outline, inside the w30 polygon
  commune(3003, 30, 0.5, 1.5, "N'goussa"),
  commune(1601, 16, 2.4, 0.5, "Douira"),
  commune(1634, 16, 2.88, 0.05, "Bir Touta"), //  no outline
  commune(1699, 16, 2.4001, 0.5001, "Alger Centre"),
  commune(9901, 99, 0.5, 9.5, "Registry only"), // a wilaya with no polygon at all
];

const outlines = [
  outline(5507, 55, [2, 0, 3, 1]),
  outline(5513, 55, [0, 0, 1, 1]),
  outline(3003, 30, [1.05, 0, 2, 1]), // a gap at lng 1.00-1.05 inside the w30 polygon
  outline(1601, 16, [0, 2, 1, 2.85]), // covers Bir Touta: OpenStreetMap never split it
  outline(1699, 16, [0.4, 2.3, 0.6, 2.5]), // an overlap inside Douira
  noOutline(1634, 16),
  noOutline(5599, 55),
  // The outline file and the registry can drift. An outline for a code the registry
  // does not carry must not become an answer.
  outline(4242, 42, [5, 0, 6, 1]),
];

const R = createCommuneResolver({
  wilayaGeometries: new Map([["55", geom(W55)], ["30", geom(W30)], ["16", geom(W16)]]),
  outlines,
  communes,
  pointInGeometry,
});

// --- clause 3: the commune outline, globally ---------------------------------

test("a commune outline outside the wilaya's shipped polygon still wins (#171)", () => {
  // The point is inside El-Hadjira's outline and inside the WRONG wilaya's polygon.
  const lat = 0.5001, lng = 2.5001;
  assert.equal(R.containingWilayaCode(lat, lng), "30");
  assert.equal(R.containingCommuneCode(lat, lng), 5507);

  const got = R.resolve(lat, lng, { wilaya_code: "55", commune_code: "5507" });
  assert.equal(got.rule, "commune_outline");
  assert.equal(got.commune.code_commune, 5507);
  assert.equal(got.commune.wilaya_code, 55, "the wilaya comes from the commune registry, not from the polygon");

  // With nothing published, and with the wrong commune published, the outline still
  // decides: this is the 50 records the wilaya-first rule moved to N'goussa.
  assert.equal(R.resolve(lat, lng, null).commune.code_commune, 5507);
  assert.equal(R.resolve(lat, lng, { wilaya_code: "30", commune_code: "3003" }).commune.code_commune, 5507);
});

test("overlapping outlines: the published commune keeps its own overlap, else the nearest centre", () => {
  const lat = 2.4001, lng = 0.5001; // inside both Douira (1601) and Alger Centre (1699)
  assert.deepEqual(R.containingCommunes(lat, lng).map((o) => o.code_commune), [1601, 1699]);

  assert.equal(R.resolve(lat, lng, { wilaya_code: "16", commune_code: "1601" }).commune.code_commune, 1601);
  assert.equal(R.resolve(lat, lng, { wilaya_code: "16", commune_code: "1699" }).commune.code_commune, 1699);
  // Nothing published: the nearest centre decides, not the file's order.
  assert.equal(R.resolve(lat, lng, null).commune.code_commune, 1699);
});

// --- clause 2: the communes with no OpenStreetMap outline ---------------------

test("a record published in an outline-less commune keeps it", () => {
  // Bir Touta's territory is inside OpenStreetMap's Douira relation, because OSM never
  // split it. Containment therefore says Douira, and containment is wrong here.
  const lat = 2.1001, lng = 0.1001;
  assert.equal(R.containingCommuneCode(lat, lng), 1601);

  const got = R.resolve(lat, lng, { wilaya_code: "16", commune_code: "1634" });
  assert.equal(got.rule, "kept_no_outline");
  assert.equal(got.commune.code_commune, 1634);
  assert.deepEqual(R.outlineLessCodes(), [1634, 5599, 9901]);
});

test("an outline-less commune wins by distance where no outline holds the point", () => {
  // Inside the w16 polygon, past the northern edge of Douira's outline, next to Bir
  // Touta's centre.
  const lat = 2.8801, lng = 0.0501;
  assert.equal(R.containingWilayaCode(lat, lng), "16");
  assert.equal(R.containingCommuneCode(lat, lng), null);

  const got = R.resolve(lat, lng, null);
  assert.equal(got.rule, "wilaya_nearest");
  assert.equal(got.commune.code_commune, 1634);
});

test("an outline-less commune within 10 km is a candidate even from another wilaya", () => {
  // The gap at lng 1.00-1.05 inside the w30 polygon. The nearest w30 centre, N'goussa,
  // is 53 km away; Souk Oufella (w55, no outline) is 10 m away. Pinning the candidates
  // to the wilaya whose polygon holds the point is exactly what loses these records.
  const lat = 0.5001, lng = 1.0201;
  assert.equal(R.containingWilayaCode(lat, lng), "30");
  assert.equal(R.containingCommuneCode(lat, lng), null);

  const got = R.resolve(lat, lng, null);
  assert.equal(got.rule, "wilaya_nearest");
  assert.equal(got.commune.code_commune, 5599);
  assert.equal(got.commune.wilaya_code, 55);
});

// --- clause 1: a coordinate too coarse to join -------------------------------

test("a whole-degree placeholder never re-joins anything", () => {
  // culture 19-bcp-08 shipped [6, 36] and the distance join re-attributed it from
  // wilaya 19 to wilaya 43. A whole degree is 100 km wide; there is nothing to join on.
  const got = R.resolve(0, 2, { wilaya_code: "30", commune_code: "3003" });
  assert.equal(got.rule, "kept_low_precision");
  assert.equal(got.commune.code_commune, 3003);

  // Two decimals is still short of the repository's MIN_EXACT_DECIMALS.
  assert.equal(R.resolve(0.51, 2.51, { wilaya_code: "30", commune_code: "3003" }).rule, "kept_low_precision");
  // Three is enough, and then containment decides and moves it.
  const moved = R.resolve(0.501, 2.501, { wilaya_code: "30", commune_code: "3003" });
  assert.equal(moved.rule, "commune_outline");
  assert.equal(moved.commune.code_commune, 5507);
});

// --- clause 4: nearest centre inside the containing wilaya -------------------

test("the nearest centre stays in the containing wilaya unless the winner has no outline", () => {
  let checked = 0;
  for (let lat = 0.0503; lat < 3; lat += 0.0701) {
    for (let lng = 0.0503; lng < 3; lng += 0.0701) {
      const w = R.containingWilayaCode(lat, lng);
      if (!w) continue;
      const { commune, rule } = R.resolve(lat, lng, null);
      assert.ok(commune, `no commune at ${lng},${lat}`);
      if (rule !== "wilaya_nearest") continue;
      checked++;
      if (!R.hasOutline(commune.code_commune)) continue; // the documented widening
      assert.equal(String(commune.wilaya_code), String(Number(w)), `${rule} at ${lng},${lat} left wilaya ${w}`);
    }
  }
  assert.ok(checked > 0, "no fixture point exercised the nearest-centre clause");
});

// --- clause 5: outside every wilaya polygon ----------------------------------

test("outside every wilaya polygon the published commune is kept, never re-guessed", () => {
  const lat = 5.5001, lng = 5.5001; // in no fixture polygon
  assert.equal(R.containingWilayaCode(lat, lng), null);

  const kept = R.resolve(lat, lng, { wilaya_code: "16", commune_code: "1601" });
  assert.equal(kept.rule, "kept_outside_wilaya_polygons");
  assert.equal(kept.commune.code_commune, 1601);

  // Only a wilaya published: the search is that wilaya's communes, and says so.
  const w = R.resolve(lat, lng, { wilaya_code: "16" });
  assert.equal(w.rule, "published_wilaya_nearest");
  assert.equal(Number(w.commune.wilaya_code), 16);

  // THE DELETED NATIONAL FALLBACK. A published wilaya the registry has no commune for
  // used to widen the search to the whole country while still reporting
  // `published_wilaya_nearest`. It now resolves to nothing.
  const none = R.resolve(lat, lng, { wilaya_code: "77" });
  assert.equal(none.rule, "unresolved");
  assert.equal(none.commune, null);
  assert.equal(R.resolve(lat, lng, null).rule, "unresolved");
});

// --- the conservative change rule --------------------------------------------

test("a commune with no outline is never moved by distance alone", () => {
  // Registry drift: outline 4242 exists for a commune the registry does not carry, and
  // commune 9901 is in a wilaya with no polygon. The point sits in the w30 gap, so
  // clause 4 would hand it to Souk Oufella; nothing has shown it left 9901, which has
  // no outline to leave, so the published claim stands.
  const lat = 0.5001, lng = 1.0201;
  assert.equal(R.containingWilayaCode(lat, lng), "30");
  const got = R.resolve(lat, lng, { wilaya_code: "99", commune_code: "9901" });
  assert.equal(got.rule, "kept_no_outline");
  assert.equal(got.commune.code_commune, 9901);
});

test("every reported rule is a declared one", () => {
  const seen = new Set();
  for (let lat = 0.0007; lat < 6; lat += 0.1307) {
    for (let lng = 0.0007; lng < 6; lng += 0.1307) {
      for (const pub of [null, { wilaya_code: "16" }, { wilaya_code: "16", commune_code: "1601" }, { wilaya_code: "16", commune_code: "1634" }, { wilaya_code: "77" }]) {
        seen.add(R.resolve(lat, lng, pub).rule);
      }
    }
  }
  assert.deepEqual([...seen].filter((r) => !RESOLVE_RULES.includes(r)), []);
  for (const r of ["commune_outline", "wilaya_nearest", "kept_no_outline", "kept_outside_wilaya_polygons", "unresolved"]) {
    assert.ok(seen.has(r), `the grid never exercised ${r}`);
  }
});
