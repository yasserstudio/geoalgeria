// Every commune centre lies inside its own commune, in every file that carries one.
//
// THE OWNER'S 2026-09-29 DECISION (private tracker #170). This file replaces the
// seat-distance guard that shipped the same morning. That one failed any centre more
// than 1 km from the `admin_centre` node of its own OSM relation and carried 496
// pinned exceptions. The reason it needed 496 is that it was not measuring an error:
// our centre and the OSM node are two hand-placed claims about one town, the median
// disagreement over all 1,537 compared rows was 402 m, and a delta says the two
// sources disagree, not which one is wrong. So the distance became a report
// (research/_commune-centres/seat-distance-2026-09-29.md) and the standing guard
// became containment, which is a fact about one claim on its own: a centre outside
// its own commune is wrong whatever the node says. That is exactly how the 189
// corrections of this batch were decided, and 215 of the defects it finds were
// invisible to every rule this repository had.
//
// WHY NOT commune-in-boundary.test.mjs. That file asks where a centre is relative to
// the 69 wilaya polygons this repository ships. They are display-grade (mapshaper
// `dp 2% keep-shapes`, a 3.4 km median vertex gap) and a wilaya is enormous, so a
// centre can be tens of kilometres from its own town, in the wrong commune, and
// still sit comfortably inside the right wilaya. Alger Centre was in the sea and
// Bethioua inside the Arzew LNG complex (issue #167); neither was catchable there.
//
// THE POLYGONS ARE A FILE, NOT A QUERY. This repository publishes no commune
// outlines, so the geometry is OpenStreetMap's, reduced once into
// research/_commune-centres/commune-boundaries.json by
// scripts/build-commune-boundary-cache.mjs and read here with no network. That
// script simplifies each ring to the tolerance the file records and refuses to write
// unless every one of the 1,541 verdicts is identical to the verdict from the
// unsimplified pull, so the reduction is proved rather than assumed.
//
// THE EXCEPTIONS ARE DEFECTS, NOT A TOLERANCE. research/_commune-centres/
// containment-exceptions.json lists 41 centres still outside their own commune and
// 4 communes with no usable OSM geometry at all, each with the reason it is there.
// Nothing in it is forgiven by a threshold: every one is a row a hand decision has
// to answer, and the list is exact in both directions, so a commune that stops
// needing its entry fails the guard rather than keeping it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { COMMUNE_COUNT, COPIES } from "./lib/commune-carriers.mjs";
import { coordinateAnomaly } from "../scripts/lib/seat-evidence.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH = join(ROOT, "research", "_commune-centres");
const readJson = (...p) => JSON.parse(readFileSync(join(RESEARCH, ...p), "utf-8"));

const boundaries = readJson("commune-boundaries.json");
const exceptionsDoc = readJson("containment-exceptions.json");
const seatReference = readJson("osm-seat-reference.json");

// Keyed on (wilaya_code, name_fr) because data/geojson/communes.geojson carries no
// code_commune, and that pair is unique across all 1,541 rows (asserted below, as
// scripts/fix-commune-centres.mjs asserts it for the same reason).
const keyOf = (wilaya, name) => `${Number(wilaya)}|${name}`;
const BOUNDARIES = new Map(boundaries.communes.map((c) => [keyOf(c.wilaya_code, c.name_fr), c]));
const OUTSIDE = new Map(exceptionsDoc.exceptions.map((e) => [keyOf(e.wilaya_code, e.name_fr), e]));
const NO_BOUNDARY = new Set(exceptionsDoc.no_boundary.map((e) => keyOf(e.wilaya_code, e.name_fr)));

/** Ray casting over one ring of [lng, lat] pairs. */
function inRing(lng, lat, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Inside any outer ring and no inner ring. The bbox is a reject, not the answer. */
function insideCommune(lng, lat, boundary) {
  const [w, s, e, n] = boundary.bbox;
  if (lng < w || lng > e || lat < s || lat > n) return false;
  return boundary.outer.some((r) => inRing(lng, lat, r)) && !boundary.inner.some((r) => inRing(lng, lat, r));
}

test("the boundary cache and its exceptions file agree with each other", () => {
  assert.equal(BOUNDARIES.size, boundaries.communes.length, "the cache has duplicate (wilaya, name) keys");
  assert.equal(boundaries.count, boundaries.communes.length, "the cache's own count disagrees with its rows");
  assert.equal(boundaries.communes.length, COMMUNE_COUNT, "the cache must carry one entry per commune, usable or not");
  assert.ok(boundaries.timestamp_osm_base, "the cache must record the Overpass timestamp_osm_base it was reduced from");
  assert.ok(boundaries.tolerance_deg > 0, "the cache must record the simplification tolerance it was built at");

  assert.equal(OUTSIDE.size, exceptionsDoc.exceptions.length, "the exceptions file has duplicate keys");
  assert.equal(exceptionsDoc.count, exceptionsDoc.exceptions.length, "the exceptions file's own count disagrees with its rows");

  const orphans = [...OUTSIDE.keys(), ...NO_BOUNDARY].filter((k) => !BOUNDARIES.has(k));
  assert.deepEqual(orphans, [], "exception(s) naming a commune the boundary cache does not carry");

  // A pin with no stated reason is a pin nobody can retire, which is how a 496-row
  // exceptions list happens in the first place.
  const reasonless = [...exceptionsDoc.exceptions, ...exceptionsDoc.no_boundary]
    .filter((e) => !e.reason)
    .map((e) => e.name_fr);
  assert.deepEqual(reasonless, [], "every exception carries the reason it is there");

  // The unusable set is the cache's own claim and the exceptions file's claim, and
  // they must be the same claim: a commune quietly losing its geometry would
  // otherwise turn into a silent pass.
  const unusable = boundaries.communes.filter((c) => !c.usable).map((c) => keyOf(c.wilaya_code, c.name_fr)).sort();
  assert.deepEqual(unusable, [...NO_BOUNDARY].sort(), "the cache's unusable communes and no_boundary disagree");
});

for (const [label, load] of COPIES) {
  test(`${label}: every commune centre is inside its own commune`, () => {
    const rows = load();
    // A reader that silently drops rows would report a clean run over data it never
    // looked at, which is the failure this whole file exists to prevent.
    assert.equal(rows.length, COMMUNE_COUNT, `${label}: parsed ${rows.length} communes`);

    const undecidable = [];
    const outside = [];
    for (const r of rows) {
      const key = keyOf(r.w, r.name);
      const boundary = BOUNDARIES.get(key);
      if (!boundary) {
        undecidable.push(key);
        continue;
      }
      if (!boundary.usable) continue; // pinned in no_boundary, asserted above
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue; // full.sql's Stidia
      if (!insideCommune(r.lng, r.lat, boundary)) outside.push(key);
    }

    assert.deepEqual(
      undecidable.sort(),
      [],
      `${label}: commune(s) with no entry in the boundary cache. Refresh it with ` +
        "`node scripts/build-commune-boundary-cache.mjs --from-raw-geometry --write` and review the diff.",
    );

    // The exact set, both directions: an unpinned centre outside its commune fails,
    // and a pin that is no longer needed must be removed rather than left to absorb
    // the next one.
    assert.deepEqual(
      outside.sort(),
      [...OUTSIDE.keys()].sort(),
      `${label}: commune centre(s) outside their own OpenStreetMap commune boundary and not listed in ` +
        "research/_commune-centres/containment-exceptions.json (or listed there and now inside). Decide each " +
        "one against its commune's own admin_level=8 relation (research/_commune-centres/README.md), then " +
        "correct it through a corrections file and scripts/fix-commune-centres.mjs, or list it with the reason.",
    );
  });
}

// The class containment is blind to, held as its own rule rather than left to the
// next human report. Fenoughil (115) shipped [0.3, 27.602777] for a seat at
// [-0.30211, 27.606097]: 59.3 km apart, a dropped minus, and inside its own commune
// either way because a Saharan commune is large enough to hold both. Containment
// passed it, the 2026-09-29 audit's evidence gate excluded it, and a review caught
// it. A mangled ordinate is not two claims disagreeing, so it takes no exceptions
// list: any row that trips this is a correction waiting to be written.
const SEATS = new Map(seatReference.communes.map((c) => [keyOf(c.wilaya_code, c.name_fr), c.seat]));

for (const [label, load] of COPIES) {
  test(`${label}: no commune centre is its own seat with a dropped minus or swapped ordinates`, () => {
    const mangled = [];
    for (const r of load()) {
      const seat = SEATS.get(keyOf(r.w, r.name));
      if (!seat || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
      const anomaly = coordinateAnomaly([r.lng, r.lat], seat);
      if (anomaly) mangled.push(`${keyOf(r.w, r.name)} ${anomaly.form} (${anomaly.metres} m once undone)`);
    }
    assert.deepEqual(
      mangled.sort(),
      [],
      `${label}: stored centre(s) that are the OSM seat mangled. Correct each through a corrections file and ` +
        "scripts/fix-commune-centres.mjs; there is no exceptions list for this class.",
    );
  });
}

test("the guard can fail, and says where it cannot", () => {
  // Alger Centre's repudiated value, in the sea east of the port. Outside its own
  // commune, so this guard catches it; the wilaya rule could not, because the point
  // was inside no wilaya polygon at all and that rule skips those on purpose.
  const alger = BOUNDARIES.get(keyOf(16, "Alger Centre"));
  assert.ok(alger?.usable, "Alger Centre (w16) is missing a usable boundary");
  assert.equal(insideCommune(3.0909, 36.76846, alger), false, "the repudiated Alger Centre value must fail");
  assert.equal(insideCommune(3.058211, 36.776335, alger), true, "the corrected Alger Centre value must pass");

  // And the honest limit, stated rather than implied. Bethioua shipped inside the
  // Arzew LNG complex, which is inside its own commune, so containment cannot see
  // it either: it was caught by a human report (issue #167) and nothing since has
  // replaced that. The 300 m review in seat-distance-2026-09-29.md is where this
  // class is answered, by hand.
  const bethioua = BOUNDARIES.get(keyOf(31, "Bethioua"));
  assert.ok(bethioua?.usable, "Bethioua (w31) is missing a usable boundary");
  assert.equal(insideCommune(-0.2596, 35.805837, bethioua), true, "Bethioua's repudiated value is inside its commune");
});
