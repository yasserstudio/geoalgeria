// The five wilaya capital commune centres of tracker #236, held to geometry this
// repository did not derive them from.
//
// WHY A SEPARATE FILE. test/commune-centre-in-commune.test.mjs is containment, and
// containment cannot see this class: all five stored centres were inside their own
// commune, 3 to 6 km from the town, exactly Bethioua's class
// (research/_commune-centres/README.md, "the guard's honest limit"). The seat delta
// cannot see it either: the 2026-09-29 audit measured a median disagreement with the
// OpenStreetMap `admin_centre` node of 402 m over all 1,537 rows, and a delta alone
// says the two sources disagree, not which one is wrong (the Owner's 2026-09-29
// decision, #170; the shipped bands are the report
// research/_commune-centres/seat-distance-2026-09-29.md). So 132 non-capital centres
// are still more than 3 km from their seat by that documented decision and are not
// defects.
//
// WHAT MAKES THEM DECIDABLE is a claim about the same town that the correction does
// not come from. There are two, and which ones apply is per row:
//
//   1. the geometric median of the `geo_precision: exact` records that other
//      packages place inside the commune's own OpenStreetMap outline. Those are
//      pharmacies, schools, mosques, post offices, bank branches: dozens to hundreds
//      of independently surveyed buildings, selected here by point-in-polygon rather
//      than by the `commune` they name, so the selection cannot depend on the
//      commune centre under test. It applies to all five.
//   2. the wilaya's own published point, which comes from its `admin_level=4`
//      relation, a different OpenStreetMap object from the commune's
//      `admin_level=8` `admin_centre` node. It applies to four of the five, and the
//      one it does not apply to is Beni-Abbes.
//
// THAT SECOND CLAIM IS NOW A FROZEN SNAPSHOT, and it has to be. Rule 9 of
// docs/adr/0001-coordinate-review-by-independent-votes.md makes a wilaya point equal
// its capital commune's centre, so the published value is a Copied claim under rule 3
// and cannot vote on the centre it is a copy of: read live, this leg would report that
// every one of the five agrees with itself. The claim as it stood when this batch was
// decided is research/_commune-centres/wilaya-point-reference-2026-10-01.json, and each
// row's own `evidence.wilaya_point` is asserted against it below, so what replays here
// is the decision that was taken and not a later reading of it. The live value has its
// own guard, test/wilaya-capital-commune.test.mjs.
//
// Each claim is an absolute ceiling in metres, and each is asserted in both
// directions: the shipped value is inside the ceiling and the repudiated value is
// outside it. A test that only checked the new value would pass just as well on the
// old one for three of the four, and "closer than before" is not a fact about one
// claim.
//
// EVERY PUBLISHED VALUE HERE IS THE OPEN ONE. All five are the commune's own
// OpenStreetMap `admin_centre` node, so all five are ODbL and all five are counted in
// the licence carve-out. That is the Owner's rule of 2026-10-01: a coordinate a human
// reads off a proprietary map (Google Maps, in Beni-Abbes's case) may CONFIRM an open
// source when the two agree within OWNER_CONFIRMATION_M, and it is the open coordinate
// that ships. A reading that confirms is recorded as a confirmation, never as the
// published value, so no proprietary map can become the provenance of a published
// number.
//
// BENI-ABBES (5201) STILL GETS ITS OWN BRANCH, for the other claim rather than the
// value. The wilaya 52 point is 6.7 km from the repudiated centre and 8.8 km from the
// node, so claim 2 argues AGAINST the move there: wilaya 52's own capital point was
// itself about 8.8 km out, which #228 fixes in the same batch, by making it this
// commune's corrected centre. Run over all
// 69 capitals the two-claim criterion therefore excludes Beni-Abbes, and the test at
// the bottom of this file asserts exactly that, so nothing here pretends the criterion
// nominated it. What nominated it is the Owner, and what evidences it is claim 1 plus
// the confirmation: the facility median is 139 m from the node against 5,628 m from
// the repudiated centre, and the Owner's independent reading is 268 m from the node.
//
// THE FIVE ARE WILAYA CAPITALS (chefs-lieux), per décret 84-79 for Biskra (7),
// El Bayadh (32) and Constantine (25), décret présidentiel 21-117 for Beni-Abbes (52)
// and décret présidentiel 26-206 for El Kantara (61). The capital is the published
// `capital_commune_code`, which arrives with #228 in this batch and whose capital-point
// check this correction is a prerequisite for.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { haversine, inCommuneOutline } from "../scripts/lib/commune-resolver.mjs";
import { COPIES } from "./lib/commune-carriers.mjs";
import { RECORD_FILES, recordsOf } from "./lib/wilaya-containment.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf-8"));

const LEDGER_FILE = "corrections-2026-10-01.json";
const WILAYA_POINT_FILE = "wilaya-point-reference-2026-10-01.json";
const ledger = readJson("research", "_commune-centres", LEDGER_FILE);
const boundaries = readJson("research", "_commune-centres", "commune-boundaries.json");
const wilayaPointReference = readJson("research", "_commune-centres", WILAYA_POINT_FILE);
const wilayas = readJson("packages", "dataset", "data", "algeria.json");

/** Absolute ceiling, metres. Every claim that applies to a row puts the corrected
 *  centre inside it (the widest is Constantine, 1.5 km from its facility median and
 *  1.7 km from the wilaya point) and the repudiated centre outside it (the narrowest
 *  is Constantine again, 2.5 km and 4.2 km). It is a ceiling on agreement between two
 *  hand-placed claims about one town centre, not a tolerance on an error. */
const CEILING_M = 2000;

/** A facility median built from fewer buildings than this is not an independent claim
 *  about where the town is. The thinnest of the five is El Kantara, a town of about
 *  7,000, with 40, and Beni-Abbes has 40 as well. */
const MIN_FACILITY_RECORDS = 10;

/** How far an Owner reading may sit from the open coordinate it confirms. Within it the
 *  two are the same town centre read by two hands, and the open one ships. Beyond it
 *  they are two places, and the Owner's rule of 2026-10-01 is that the row stops and
 *  gets a decision rather than a tolerance. Beni-Abbes reads 268 m. */
const OWNER_CONFIRMATION_M = 500;

/** The five, with the wilaya each is the capital of, the source its published value
 *  comes from, whether the wilaya-point claim supports it, and whether an Owner reading
 *  confirms it. Pinned so the ledger and this file cannot drift apart: a sixth row, a
 *  different commune, a row that changes its deciding source, or a row that starts or
 *  stops being supported by the wilaya point all fail here rather than riding along. */
const CAPITALS = [
  { code_commune: 701, wilaya_code: 7, name_fr: "Biskra", decided_by: "osm_admin_centre_node", wilaya_point_supports: true, owner_confirmed: false },
  { code_commune: 717, wilaya_code: 61, name_fr: "El Kantara", decided_by: "osm_admin_centre_node", wilaya_point_supports: true, owner_confirmed: false },
  { code_commune: 2501, wilaya_code: 25, name_fr: "Constantine", decided_by: "osm_admin_centre_node", wilaya_point_supports: true, owner_confirmed: false },
  { code_commune: 3201, wilaya_code: 32, name_fr: "El Bayadh", decided_by: "osm_admin_centre_node", wilaya_point_supports: true, owner_confirmed: false },
  { code_commune: 5201, wilaya_code: 52, name_fr: "Beni-Abbes", decided_by: "osm_admin_centre_node", wilaya_point_supports: false, owner_confirmed: true },
];

const BOUNDARIES = new Map(boundaries.communes.map((c) => [c.code_commune, c]));
// The claim as it stood when this batch was decided, never the live wilaya point: see
// the note at the top of this file. A row's own `evidence.wilaya_point` is asserted
// against it, so the snapshot and the ledger cannot drift apart.
const WILAYA_POINT = new Map(wilayaPointReference.wilayas.map((w) => [Number(w.wilaya_code), w.point]));
const SHIPPED_CENTRE = new Map(
  wilayas.flatMap((w) => (w.communes ?? []).map((c) => [c.code_commune, [c.longitude, c.latitude]])),
);
const ROWS = new Map(ledger.corrections.map((r) => [r.code_commune, r]));

/**
 * Weiszfeld's algorithm for the geometric median, the point minimising the sum of
 * distances to every input. The mean is not usable here: a single facility a commune
 * away drags it, and these communes are large (El Kantara's outline is 40 km across).
 * Longitude is cosLat-scaled so the iteration minimises metres rather than degrees.
 */
function geometricMedian(points) {
  let [x, y] = points
    .reduce(([sx, sy], [px, py]) => [sx + px, sy + py], [0, 0])
    .map((s) => s / points.length);
  const cosLat = Math.cos((y * Math.PI) / 180);
  for (let iter = 0; iter < 256; iter++) {
    let nx = 0;
    let ny = 0;
    let weight = 0;
    for (const [px, py] of points) {
      const d = Math.hypot((px - x) * cosLat, py - y);
      if (d < 1e-12) continue; // the median sits on an input point
      nx += px / d;
      ny += py / d;
      weight += 1 / d;
    }
    if (weight === 0) break;
    const [sx, sy] = [nx / weight, ny / weight];
    const moved = Math.hypot(sx - x, sy - y);
    x = sx;
    y = sy;
    if (moved < 1e-9) break;
  }
  return [x, y];
}

/** Metres between two `[lng, lat]` points, which is the order every coordinate in this
 *  file and in the ledger is written in. haversine() takes lat first, so one wrapper
 *  here is one place for that flip instead of one at every call site. */
const metresApart = ([aLng, aLat], [bLng, bLat]) => haversine(aLat, aLng, bLat, bLng);

/** Every `geo_precision: exact` published record inside one commune's OpenStreetMap
 *  outline, over every package's record files, with the files it came from. The
 *  selection is point-in-polygon, never the `commune` the record names, so it is
 *  independent of the centre under test. */
function exactRecordsInside(boundary) {
  const points = [];
  const files = new Set();
  for (const file of RECORD_FILES(ROOT)) {
    for (const r of recordsOf(ROOT, file)) {
      if (r.row.geo_precision !== "exact") continue;
      if (!inCommuneOutline(r.lng, r.lat, boundary)) continue;
      points.push([r.lng, r.lat]);
      files.add(file);
    }
  }
  return { points, files: [...files].sort() };
}

/** One commune's exact-facility median and its wilaya's own point, measured against two
 *  candidate centres. Both are claims about where the town is that no commune centre in
 *  this repository is derived from, which is the whole point of the pair. */
function independentClaims(code_commune, wilaya_code, candidates) {
  const boundary = BOUNDARIES.get(code_commune);
  const { points, files } = exactRecordsInside(boundary);
  const median = points.length ? geometricMedian(points) : null;
  const wilayaPoint = WILAYA_POINT.get(wilaya_code);
  return {
    records: points.length,
    files: files.length,
    median,
    wilayaPoint,
    to: candidates.map((p) => ({
      median: median ? metresApart(median, p) : null,
      wilaya: metresApart(wilayaPoint, p),
    })),
  };
}

test(`${WILAYA_POINT_FILE} is the claim the ledger was decided against, and it is frozen`, () => {
  assert.equal(wilayaPointReference.count, wilayaPointReference.wilayas.length, "the snapshot's own count disagrees with its rows");
  assert.equal(WILAYA_POINT.size, 69, `the snapshot carries ${WILAYA_POINT.size} wilaya points, not 69`);
  assert.ok(wilayaPointReference.licence, "the snapshot must state its licence; these points are OpenStreetMap-derived");
  assert.ok(wilayaPointReference.superseded_by, "the snapshot must say what replaced it, or a reader will take it for the live value");

  // The five rows' own record of this claim, against the snapshot. Either side edited
  // alone fails here, which is what keeps the replay below honest.
  for (const row of ledger.corrections) {
    assert.deepEqual(
      WILAYA_POINT.get(row.wilaya_code),
      row.evidence.wilaya_point,
      `${row.name_fr}: the snapshot's wilaya ${row.wilaya_code} point is not the one the ledger row recorded`,
    );
  }

  // And it is a snapshot, not the live value: every published wilaya point is now its
  // capital commune's centre (ADR 0001 rule 9), so reading the claim live would make it
  // a Copied claim voting for itself. At least one wilaya has moved away from the
  // snapshot, and the five rows' own capitals are exactly the moved-to values.
  const live = new Map(wilayas.map((w) => [Number(w.code), [w.longitude, w.latitude]]));
  for (const row of ledger.corrections) {
    assert.deepEqual(
      live.get(row.wilaya_code),
      row.to,
      `wilaya ${row.wilaya_code}: its published point is not the corrected centre of its capital ${row.name_fr}, which ADR 0001 rule 9 requires`,
    );
  }
});

test(`${LEDGER_FILE} carries exactly the five wilaya capital communes of tracker #236`, () => {
  assert.equal(ledger.applied, true, "a ledger scripts/lib/commune-corrections.mjs reads must be applied");
  assert.equal(ledger.count, ledger.corrections.length, "the ledger's own count disagrees with its rows");
  assert.deepEqual(
    ledger.corrections.map((r) => ({
      code_commune: r.code_commune,
      wilaya_code: r.wilaya_code,
      name_fr: r.name_fr,
      decided_by: r.decided_by,
      wilaya_point_supports: r.evidence.wilaya_point_supports_the_move,
      owner_confirmed: r.owner_confirmation != null,
    })),
    CAPITALS,
    "the ledger's rows are not the five capital communes this file checks, or one changed its deciding source, its wilaya-point verdict or its confirmation",
  );
  assert.ok(ledger.timestamp_osm_base, "the ledger must record the Overpass timestamp_osm_base its values come from");
  for (const row of ledger.corrections) {
    // Every row names the OpenStreetMap relation and node, because every row is
    // compared against that node even where it is not the value written.
    assert.ok(row.osm?.relation, `${row.name_fr}: no OpenStreetMap relation id`);
    assert.ok(row.osm?.admin_centre_node, `${row.name_fr}: no admin_centre node id to compare against`);
    assert.ok(row.osm?.admin_centre_point, `${row.name_fr}: no admin_centre node coordinate, so nothing can be re-checked offline`);
    assert.ok(row.evidence, `${row.name_fr}: no evidence block`);

    // `decided_by` is what the licence turns on, and the Owner's rule of 2026-10-01
    // leaves exactly one answer for a published coordinate: the open source. A reading
    // off a proprietary map can confirm it and is recorded as `owner_confirmation`,
    // never as `to`. So a row that ships anything but its own `admin_centre` node fails
    // here rather than being classified after the fact.
    assert.equal(
      row.decided_by,
      "osm_admin_centre_node",
      `${row.name_fr}: decided_by is ${JSON.stringify(row.decided_by)}; a published coordinate comes from the open source`,
    );
    assert.deepEqual(
      row.to,
      row.osm.admin_centre_point,
      `${row.name_fr}: says it is the admin_centre node but ships a different value`,
    );
    assert.equal(row.owner_verified, undefined, `${row.name_fr}: an Owner reading is a confirmation, not a published value`);

    if (row.owner_confirmation) {
      const c = row.owner_confirmation;
      assert.ok(c.point, `${row.name_fr}: a confirmation must record the point that was read`);
      assert.ok(c.read_at, `${row.name_fr}: a confirmation must record when it was read`);
      assert.ok(c.read_by, `${row.name_fr}: a confirmation must record who read it`);
      assert.ok(c.source, `${row.name_fr}: a confirmation must record what it was read off, so its terms are never ambiguous`);
      assert.equal(
        c.confirms,
        "osm_admin_centre_node",
        `${row.name_fr}: a confirmation must name the open source it confirms`,
      );
      // A confirmation that does not agree is not a confirmation. Recording one that
      // sits further away than the ceiling would turn the rule into a label.
      const apart = metresApart(c.point, row.osm.admin_centre_point);
      assert.ok(
        apart < OWNER_CONFIRMATION_M,
        `${row.name_fr}: the confirmation is ${Math.round(apart)} m from the value it confirms, past the ${OWNER_CONFIRMATION_M} m ceiling`,
      );
    }
  }
});

for (const { code_commune, wilaya_code, name_fr, wilaya_point_supports, owner_confirmed } of CAPITALS) {
  const row = ROWS.get(code_commune);
  const boundary = BOUNDARIES.get(code_commune);

  test(`${name_fr} (${code_commune}): every carrier ships the corrected centre`, () => {
    assert.ok(row, `${name_fr} is not in ${LEDGER_FILE}`);
    for (const [label, load] of COPIES) {
      const found = load().filter((c) => Number(c.w) === wilaya_code && c.name === name_fr);
      assert.equal(found.length, 1, `${label}: ${name_fr} appears ${found.length} time(s)`);
      assert.ok(
        Math.abs(found[0].lng - row.to[0]) < 5e-7 && Math.abs(found[0].lat - row.to[1]) < 5e-7,
        `${label}: ${name_fr} ships [${found[0].lng}, ${found[0].lat}], the ledger's value is [${row.to}]`,
      );
    }
  });

  test(`${name_fr} (${code_commune}): the corrected centre is inside its own commune`, () => {
    assert.ok(boundary?.usable, `${name_fr}: no usable OpenStreetMap outline`);
    assert.ok(
      inCommuneOutline(row.to[0], row.to[1], boundary),
      `${name_fr}: the corrected centre is outside its own commune's OpenStreetMap outline`,
    );
  });

  test(`${name_fr} (${code_commune}): the corrected centre agrees with the facilities, the repudiated one does not`, () => {
    const { points, files } = exactRecordsInside(boundary);
    assert.ok(
      points.length >= MIN_FACILITY_RECORDS,
      `${name_fr}: only ${points.length} exact record(s) inside the commune, too few to place the town`,
    );
    assert.ok(files.length >= 3, `${name_fr}: the facility median rests on ${files.length} package file(s)`);

    const median = geometricMedian(points);
    const toMedian = metresApart(median, row.to);
    const fromMedian = metresApart(median, row.from);
    assert.ok(
      toMedian < CEILING_M,
      `${name_fr}: the corrected centre is ${Math.round(toMedian)} m from the median of ${points.length} exact facilities`,
    );
    assert.ok(
      fromMedian > CEILING_M,
      `${name_fr}: the repudiated centre is only ${Math.round(fromMedian)} m from that median, so this correction is not evidenced here`,
    );
  });

  if (owner_confirmed)
    test(`${name_fr} (${code_commune}): the Owner's reading confirms the published value rather than replacing it`, () => {
      // The Owner read this town centre off Google Maps. A proprietary map can never be
      // the provenance of a published number, so what it does here is confirm the open
      // one, and the test is that the two are the same place.
      const apart = metresApart(row.owner_confirmation.point, row.to);
      assert.ok(
        apart < OWNER_CONFIRMATION_M,
        `${name_fr}: the Owner's reading is ${Math.round(apart)} m from the published value, past the ${OWNER_CONFIRMATION_M} m ceiling`,
      );
      // And it confirms a move rather than the status quo: the reading is far from the
      // value being repudiated, so it is evidence and not a coincidence.
      assert.ok(
        metresApart(row.owner_confirmation.point, row.from) > CEILING_M,
        `${name_fr}: the Owner's reading already agreed with the repudiated centre, so it confirms nothing`,
      );
    });

  test(`${name_fr} (${code_commune}): the wilaya's own point ${wilaya_point_supports ? "agrees, and the repudiated centre does not" : "does not support this row, and the ledger says so"}`, () => {
    const point = WILAYA_POINT.get(wilaya_code);
    assert.ok(point, `wilaya ${wilaya_code} carries no point`);
    const toWilaya = metresApart(point, row.to);
    const fromWilaya = metresApart(point, row.from);
    if (!wilaya_point_supports) {
      // Beni-Abbes. The claim fails here and the ledger has to admit it rather than
      // quietly leave the leg out: wilaya 52's capital point was about 8.8 km from its
      // capital's town centre when this batch read it, which #228 fixes.
      assert.ok(
        toWilaya > CEILING_M,
        `${name_fr}: the wilaya point now agrees with the corrected centre, so the ledger should stop saying it does not support this row`,
      );
      assert.equal(
        row.evidence.wilaya_point_supports_the_move,
        false,
        `${name_fr}: the ledger must state that the wilaya-point claim does not support this row`,
      );
      return;
    }
    assert.ok(
      toWilaya < CEILING_M,
      `${name_fr}: the corrected centre is ${Math.round(toWilaya)} m from the point of wilaya ${wilaya_code}, whose capital it is`,
    );
    assert.ok(
      fromWilaya > CEILING_M,
      `${name_fr}: the repudiated centre is only ${Math.round(fromWilaya)} m from that point, so this correction is not evidenced here`,
    );
  });
}

// THE SELECTION, REPLAYED OVER ALL 69 CAPITALS. The claims above are about rows that
// were already chosen. The decision this batch rests on is the other half: that the
// two-claim criterion, run over every wilaya capital, picks exactly the four taken from
// an `admin_centre` node and leaves the rest alone, Beni-Abbes included. Asserting it
// in prose and not in code is how a correction set becomes unauditable, so it runs
// here, offline, against the committed files.
//
// BENI-ABBES MUST COME OUT EXCLUDED, and that is asserted rather than tolerated. It is
// the ledger's fifth row and the criterion does not reach it, because wilaya 52's point
// as this batch read it was 6.7 km from the repudiated centre and 8.5 km from the
// corrected one. The Owner decided that row; this test is what keeps the two things from
// being confused.
//
// THE CAPITAL LIST IS THE PUBLISHED FIELD. It used to be derived here, by folding each
// wilaya's name against its communes' names plus four wilayas no folding resolves.
// `capital_commune_code` arrived with #228 and is the decreed answer, so the sweep reads
// it and the derivation is gone; test/wilaya-capital-commune.test.mjs is what holds the
// field itself to the decrees.
/** The seat delta threshold the ledger's own `method` states. */
const SEAT_DELTA_M = 3000;

test("the criterion selects exactly these four over all 69 wilaya capitals", () => {
  const seats = new Map(
    readJson("research", "_commune-centres", "osm-seat-reference.json").communes.map((c) => [c.code_commune, c.seat]),
  );

  const capitals = wilayas.map((w) => ({
    wilaya_code: Number(w.code),
    code_commune: w.capital_commune_code,
    name_fr: w.name_fr,
  }));
  // A wilaya whose capital this cannot name would be a hole in the sweep, not a pass.
  assert.deepEqual(
    capitals.filter((c) => c.code_commune == null),
    [],
    "wilaya(s) whose capital commune this sweep cannot name",
  );
  assert.equal(new Set(capitals.map((c) => c.code_commune)).size, 69, "two wilayas resolved to one capital commune");

  // The centre each capital held BEFORE this batch: the ledger's `from` where this batch
  // moved it, the shipped value everywhere else. Running the criterion on the shipped
  // values would select nothing, because the four now sit on their seat.
  const selected = [];
  for (const cap of capitals) {
    const boundary = BOUNDARIES.get(cap.code_commune);
    const seat = seats.get(cap.code_commune);
    if (!seat || !boundary?.usable) continue; // no OpenStreetMap relation to compare with
    const point = ROWS.get(cap.code_commune)?.from ?? SHIPPED_CENTRE.get(cap.code_commune);
    assert.ok(point, `${cap.name_fr}: capital commune ${cap.code_commune} carries no centre`);
    if (metresApart(point, seat) <= SEAT_DELTA_M) continue;

    const claims = independentClaims(cap.code_commune, cap.wilaya_code, [seat, point]);
    const [toSeat, toStored] = claims.to;
    const wilayaAgrees = toSeat.wilaya < toStored.wilaya;
    const facilitiesAgree = claims.records > 0 && toSeat.median < toStored.median;
    if (wilayaAgrees && facilitiesAgree) selected.push(cap.name_fr);
  }

  assert.deepEqual(
    selected.sort(),
    ["Biskra", "Constantine", "El Bayadh", "El Kantara"],
    "the criterion in the ledger's own `method` no longer selects exactly the four rows it decides",
  );

  // Stated both ways round, so neither can drift. Every published value is the open
  // one, so `decided_by` no longer separates the criterion's rows from the rest; what
  // separates them is the wilaya-point verdict each row records. The criterion's four
  // are exactly the rows that record it as supporting, and the one row that records it
  // as not supporting is exactly the capital the criterion leaves behind.
  const supported = ledger.corrections.filter((r) => r.evidence.wilaya_point_supports_the_move).map((r) => r.name_fr);
  const unsupported = ledger.corrections.filter((r) => !r.evidence.wilaya_point_supports_the_move).map((r) => r.name_fr);
  assert.deepEqual(selected.sort(), supported.sort(), "the criterion's selection and the rows the ledger says it supports disagree");
  assert.deepEqual(unsupported, ["Beni-Abbes"], "the rows the wilaya point does not support are not the one capital the criterion excludes");
  assert.ok(
    !selected.includes("Beni-Abbes"),
    "Beni-Abbes is now selected by the criterion, so the ledger should stop recording its wilaya-point leg as unsupported",
  );
});
