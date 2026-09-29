// Every published record's coordinate is inside the wilaya polygon it declares.
//
// WHY. The 2026-09-29 batch moved 245 commune centres, and the nearest-centroid
// joins that stamp `wilaya_code` from those centres carried 58 published records into
// a wilaya whose polygon does not contain them: mosque 31-0390, at
// [-0.414678, 35.547628], is inside OpenStreetMap's commune 3111 Oued Tlelat in
// wilaya 31, and the join gave it Zahana in wilaya 29. The join was replaced by
// scripts/lib/build-utils.mjs resolveCommune(), which decides the wilaya by
// containment before it ever measures a distance. This file is the ratchet: without
// it, the next centre move reintroduces the same class silently.
//
// IT IS EVERY PACKAGE, NOT THE ONES THAT BROKE. Enumeration is by pattern
// (test/lib/wilaya-containment.mjs), so a package added later is covered the day it
// ships. It found 245 records outside their declared wilaya that this batch did not
// create and does not correct: they are in packages whose `wilaya_code` comes from
// the source's own text rather than from geometry, so the coordinate and the
// attribution are two independent claims and only the source can say which is wrong.
// Each is listed in research/_wilaya-containment/record-exceptions.json with the
// reason, per group. Nothing there is forgiven by a threshold.
//
// WHAT IT DELIBERATELY DOES NOT FAIL. A record whose coordinate is inside NO wilaya
// polygon at all. The 69 outlines this repository ships are display-grade (mapshaper
// `dp 2% keep-shapes`, a 3.4 km median vertex gap) and cut inside the real shoreline,
// so 205 coastal and border records sit outside every one of them as an artefact of
// the simplification. Failing those would be failing the outlines, which are #171.
//
// THE DATASET'S OWN COMMUNE CENTRES ARE NOT HERE either: test/commune-in-boundary
// .test.mjs and test/commune-centre-in-commune.test.mjs hold those rows, with their
// own exceptions.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { containingWilayaCode } from "../scripts/lib/build-utils.mjs";
import { RECORD_FILES, recordsOf, violationsIn } from "./lib/wilaya-containment.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const exceptionsDoc = JSON.parse(
  readFileSync(join(ROOT, "research", "_wilaya-containment", "record-exceptions.json"), "utf-8"),
);

const files = RECORD_FILES(ROOT);
const EXPECTED = new Map(exceptionsDoc.groups.map((g) => [g.file, g]));

test("the exceptions file is internally consistent", () => {
  assert.equal(
    exceptionsDoc.count,
    exceptionsDoc.groups.reduce((n, g) => n + g.records.length, 0),
    "the exceptions file's own count disagrees with its rows",
  );
  for (const g of exceptionsDoc.groups) {
    assert.equal(g.count, g.records.length, `${g.file}: the group's own count disagrees with its rows`);
    assert.ok(g.reason, `${g.file}: every group carries the reason its rows are not corrected`);
  }
  // A group naming a file the guard does not read is a group nobody will ever retire.
  const orphans = exceptionsDoc.groups.map((g) => g.file).filter((f) => !files.includes(f));
  assert.deepEqual(orphans, [], "exception group(s) naming a file the guard does not read");
});

test("the guard reads every package's records, and enough of them to mean something", () => {
  // A reader that silently drops files or rows reports a clean run over data it never
  // looked at, which is the failure the whole file exists to prevent.
  assert.equal(files.length, exceptionsDoc.files_checked, "the exceptions file was generated over a different file set");
  const located = files.reduce((n, f) => n + recordsOf(ROOT, f).length, 0);
  assert.ok(located > 60000, `only ${located} located records found across ${files.length} files`);
});

for (const file of files) {
  test(`${file}: every record is inside the wilaya it declares`, () => {
    const rows = recordsOf(ROOT, file);
    if (!rows.length) return; // a lookup table or a set of shapes, nothing located
    const found = violationsIn(rows, containingWilayaCode).map((v) => v.id);
    const expected = (EXPECTED.get(file)?.records ?? []).map((v) => v.id);
    // The exact set, both directions: an unlisted record outside its wilaya fails,
    // and a listing that is no longer needed must be removed rather than left to
    // absorb the next one.
    assert.deepEqual(
      found.sort(),
      expected.sort(),
      `${file}: record(s) whose coordinate is in a different wilaya than they declare and are not listed in ` +
        "research/_wilaya-containment/record-exceptions.json (or listed there and now correct). A package joined " +
        "on geometry should be re-run so scripts/lib/build-utils.mjs resolveCommune() fixes it; a package whose " +
        "wilaya comes from its source's own text needs the source. Then regenerate the list with " +
        "`node scripts/build-wilaya-containment-exceptions.mjs --write`.",
    );
  });
}

test("the guard can fail", () => {
  // Mosque 31-0390's repudiated attribution: the point is in wilaya 31, the join had
  // said 29. Stated as data rather than trusted to a comment, so a change to
  // containingWilayaCode that stopped deciding this point would be caught here.
  assert.equal(containingWilayaCode(35.547628, -0.414678), "31");
  const bad = violationsIn([{ id: "31-0390", wilaya_code: "29", lat: 35.547628, lng: -0.414678 }], containingWilayaCode);
  assert.deepEqual(bad.map((v) => v.containing_wilaya), ["31"]);
  // And a record inside no polygon at all is not a violation, by design.
  assert.equal(containingWilayaCode(37.5, 3.0), null);
  assert.deepEqual(violationsIn([{ id: "offshore", wilaya_code: "16", lat: 37.5, lng: 3.0 }], containingWilayaCode), []);
});
