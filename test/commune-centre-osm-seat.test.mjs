// Guards every commune centre against the OpenStreetMap chef-lieu node it was
// audited against, in every file that carries a commune point.
//
// WHY THIS AND NOT commune-in-boundary.test.mjs. That file asks where a centre is
// relative to the 69 wilaya polygons this repository ships. Those polygons are
// display-grade (mapshaper `dp 2% keep-shapes`, a 3.4 km median vertex gap) and a
// wilaya is enormous, so a centre can be tens of kilometres from its own town and
// still sit comfortably inside the right wilaya. That is exactly how Bethioua
// shipped inside the Arzew LNG complex (issue #167) and how the 2026-09-29 audit
// found 215 centres outside their own commune that no containment rule had flagged.
//
// So this guard measures against a point instead of a polygon: the `admin_centre`
// member node of the commune's own OSM `admin_level=8` relation, recorded per
// commune in research/_commune-centres/osm-seat-reference.json with the relation id
// and the Overpass `timestamp_osm_base` of the pull it came from. The reference is
// a file, not a live query: a test that fetches is a test that fails when Overpass
// is busy, and a moving reference cannot be a ratchet.
//
// TOLERANCE_M is the Owner's 2026-09-29 decision (private tracker #170): the
// standing guard fails at 1 km, with a documented exceptions list. It is not a
// claim that everything under 1 km is right. It is the line below which two
// hand-placed claims about one town are not worth arguing about.
//
// THE EXCEPTIONS ARE NOT A CLEAN BILL OF HEALTH. 496 of the 1,537 audited centres
// were already over the line on the day the line was drawn, with a median delta of
// 402 m over the whole set, so the exceptions file starts large and each entry
// carries the reason it is there. 174 of them are decided coordinate errors waiting
// on their own correction release (research/_commune-centres/pending-corrections-
// 2026-09-29.json). The pin includes the measured distance, so a listed commune
// that moves at all is a new fact and fails rather than being absorbed; that is what
// makes a large exceptions list still a ratchet.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { COMMUNE_COUNT, COPIES } from "./lib/commune-carriers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH = join(ROOT, "research", "_commune-centres");
const readJson = (...p) => JSON.parse(readFileSync(join(RESEARCH, ...p), "utf-8"));

const TOLERANCE_M = 1000;

const reference = readJson("osm-seat-reference.json");
const exceptionsDoc = readJson("seat-exceptions.json");

// Keyed on (wilaya_code, name_fr) because data/geojson/communes.geojson carries no
// code_commune, and that pair is unique across all 1,541 rows (asserted below, as
// scripts/fix-commune-centres.mjs asserts it for the same reason).
const keyOf = (wilaya, name) => `${Number(wilaya)}|${name}`;
const SEATS = new Map(reference.communes.map((c) => [keyOf(c.wilaya_code, c.name_fr), c]));
const EXCEPTIONS = new Map(
  exceptionsDoc.exceptions.map((e) => [keyOf(e.wilaya_code, e.name_fr), e]),
);

/** Great-circle metres between two [lng, lat] pairs. */
function metresBetween(aLng, aLat, bLng, bLat) {
  const R = 6371008.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

test("the seat reference and its exceptions file agree with each other", () => {
  assert.equal(SEATS.size, reference.communes.length, "the reference has duplicate (wilaya, name) keys");
  assert.ok(reference.timestamp_osm_base, "the reference must record the Overpass timestamp_osm_base it was pulled at");
  assert.equal(exceptionsDoc.tolerance_m, TOLERANCE_M, "the exceptions file is written for a different tolerance");
  assert.equal(EXCEPTIONS.size, exceptionsDoc.exceptions.length, "the exceptions file has duplicate keys");

  const orphans = [...EXCEPTIONS.keys()].filter((k) => !SEATS.has(k));
  assert.deepEqual(orphans, [], "exception(s) naming a commune the reference does not carry");
  const reasonless = exceptionsDoc.exceptions
    .filter((e) => !e.reason || !Number.isFinite(e.delta_m))
    .map((e) => e.name_fr);
  assert.deepEqual(reasonless, [], "every exception carries a reason and the distance measured for it");
});

for (const [label, load] of COPIES) {
  test(`${label}: no commune centre is more than ${TOLERANCE_M} m from its recorded OSM seat`, () => {
    const rows = load();
    // A reader that silently drops rows would report a clean run over data it never
    // looked at, which is the failure this whole file exists to prevent.
    assert.equal(rows.length, COMMUNE_COUNT, `${label}: parsed ${rows.length} communes`);

    const unknown = [];
    const measured = new Map();
    for (const r of rows) {
      const key = keyOf(r.w, r.name);
      const seat = SEATS.get(key);
      if (!seat) {
        // The four communes with no OSM admin_level=8 relation at the 2026-09-29
        // pull, plus anything added since. Nothing can be measured for them.
        unknown.push(`${r.name} (w${r.w})`);
        continue;
      }
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue; // full.sql's Stidia
      const d = Math.round(metresBetween(r.lng, r.lat, seat.seat[0], seat.seat[1]));
      if (d > TOLERANCE_M) measured.set(key, d);
    }

    // The unmeasurable set is pinned, so a commune quietly losing its reference
    // cannot turn into a pass.
    assert.deepEqual(
      unknown.sort(),
      exceptionsDoc.no_reference.slice().sort(),
      `${label}: commune(s) with no recorded OSM seat. Refresh the reference with ` +
        "`node scripts/audit-commune-centres.mjs --fetch --geometry --write` and pin the result.",
    );

    // The exact set, both directions: an unpinned commune over the line fails, and a
    // pin that is no longer needed must be removed rather than left to absorb the
    // next one.
    assert.deepEqual(
      [...measured.keys()].sort(),
      [...EXCEPTIONS.keys()].sort(),
      `${label}: commune centre(s) further than ${TOLERANCE_M} m from their recorded OSM seat and not ` +
        "pinned in research/_commune-centres/seat-exceptions.json (or pinned there and no longer over " +
        "the line). Decide each one against the commune's own OSM admin_level=8 boundary " +
        "(research/_commune-centres/README.md), then correct it through scripts/fix-commune-centres.mjs " +
        "or pin it with the reason.",
    );

    // And the distance, so a pinned commune that MOVES is a new fact rather than one
    // the pin absorbs. The window is 5 m because the seven carriers hold the same
    // point at 6 decimals through three different serialisations, which can put two
    // files a metre apart on the same row; movement worth deciding is never 5 m.
    const drifted = [];
    for (const [key, d] of measured) {
      const pinned = EXCEPTIONS.get(key).delta_m;
      if (Math.abs(d - pinned) > 5) drifted.push(`${key}: pinned at ${pinned} m, now ${d} m`);
    }
    assert.deepEqual(
      drifted,
      [],
      `${label}: pinned commune centre(s) have moved relative to their recorded OSM seat. ` +
        "Re-decide them and regenerate seat-exceptions.json rather than editing the distance.",
    );
  });
}

test("the guard can fail: Bethioua's repudiated value is over the line", () => {
  // The defect the 1 km line was chosen for. Bethioua shipped at [-0.2596, 35.805837],
  // inside the Arzew LNG complex, which is inside its own commune and its own wilaya,
  // so no containment rule could see it. Against the seat it measures ~0.75 km, which
  // is UNDER this tolerance: that is the honest limit of a 1 km line and the reason
  // Bethioua was caught by a human report, not by a threshold.
  const seat = SEATS.get(keyOf(31, "Bethioua"));
  assert.ok(seat, "Bethioua (w31) is missing from the seat reference");
  const shipped = metresBetween(-0.2596, 35.805837, seat.seat[0], seat.seat[1]);
  assert.ok(shipped > 700 && shipped < TOLERANCE_M, `the repudiated value measures ${Math.round(shipped)} m`);

  // Alger Centre's repudiated value, in the sea east of the port, is over it.
  const alger = SEATS.get(keyOf(16, "Alger Centre"));
  assert.ok(alger, "Alger Centre (w16) is missing from the seat reference");
  assert.ok(
    metresBetween(3.0909, 36.76846, alger.seat[0], alger.seat[1]) > TOLERANCE_M,
    "Alger Centre's repudiated value must be over the line",
  );
});
