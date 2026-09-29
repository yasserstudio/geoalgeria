// Every published record's coordinate agrees with the commune it names, and where no
// commune outline exists to ask, with the wilaya polygon it declares.
//
// WHY. The 2026-09-29 batch moved 245 commune centres, and the nearest-centroid joins
// that stamp `commune_code` and `wilaya_code` from those centres carried published
// records into places they are demonstrably not in. The join was replaced by
// scripts/lib/commune-resolver.mjs, and this file is the ratchet: without it, the next
// centre move reintroduces the same class silently.
//
// THE COMMUNE OUTLINE IS THE FIRST QUESTION, not the wilaya polygon. The first version
// of this guard asked only whether a record was inside the wilaya polygon it declared,
// and that made it blind to the very defect it was added for. The shipped wilaya 55
// polygon is about 50 km short of the decree boundary (yasserstudio/geoalgeria.com#171),
// so 70 records wrongly re-attributed to N'goussa (3003, wilaya 30) were inside the
// wilaya 30 polygon and passed. They are not inside N'goussa's OpenStreetMap outline,
// which is what fails them here.
//
// IT IS EVERY PACKAGE, NOT THE ONES THAT BROKE. Enumeration is by pattern
// (test/lib/wilaya-containment.mjs), so a package added later is covered the day it
// ships. It finds 396 records their own geometry contradicts that this batch did not
// create and does not correct; every one is listed in
// research/_wilaya-containment/record-exceptions.json with `pre_existing: true`, the
// clause of the join that decides it, and the reason per group. They are two classes:
// a package whose `wilaya_code` and `commune` come from the source's own text rather
// than from geometry, so the coordinate and the attribution are independent claims only
// the source can settle (yasserstudio/geoalgeria.com#209); and a row the join
// deliberately refuses to move, because its coordinate is too rounded to join on or its
// commune is one of the four OpenStreetMap ships no relation for. Nothing there is
// forgiven by a threshold.
//
// WHAT IT DELIBERATELY DOES NOT FAIL. A record with no commune outline to check whose
// coordinate is inside NO wilaya polygon at all. The 69 outlines this repository ships
// are display-grade (mapshaper `dp 2% keep-shapes`, a 3.4 km median vertex gap) and cut
// inside the real shoreline, so coastal and border records sit outside every one of them
// as an artefact of the simplification. Failing those would be failing the outlines,
// which are #171.
//
// THE DATASET'S OWN COMMUNE CENTRES ARE NOT HERE either: test/commune-in-boundary
// .test.mjs and test/commune-centre-in-commune.test.mjs hold those rows, with their
// own exceptions.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { communeResolver, containingWilayaCode } from "../scripts/lib/build-utils.mjs";
import { RECORD_FILES, containmentViolations, recordsOf } from "./lib/wilaya-containment.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const exceptionsDoc = JSON.parse(
  readFileSync(join(ROOT, "research", "_wilaya-containment", "record-exceptions.json"), "utf-8"),
);

const resolver = communeResolver();
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
    assert.equal(
      g.pre_existing + g.created_by_this_batch,
      g.count,
      `${g.file}: every row says whether it is pre-existing or new`,
    );
  }
  // A group naming a file the guard does not read is a group nobody will ever retire.
  const orphans = exceptionsDoc.groups.map((g) => g.file).filter((f) => !files.includes(f));
  assert.deepEqual(orphans, [], "exception group(s) naming a file the guard does not read");
});

test("this batch creates no new violation", () => {
  // The pre-existing rows are yasserstudio/geoalgeria.com#209 and are listed, not
  // hidden. A row this batch created is a row this batch has to fix.
  const created = exceptionsDoc.groups.flatMap((g) =>
    g.records.filter((r) => r.pre_existing === false).map((r) => `${g.file} ${r.id}`),
  );
  assert.deepEqual(created, [], "record(s) their own geometry contradicts that this batch created");
  assert.equal(exceptionsDoc.created_by_this_batch, 0);
});

test("the guard reads every package's records, and enough of them to mean something", () => {
  // A reader that silently drops files or rows reports a clean run over data it never
  // looked at, which is the failure the whole file exists to prevent.
  assert.equal(files.length, exceptionsDoc.files_checked, "the exceptions file was generated over a different file set");
  const located = files.reduce((n, f) => n + recordsOf(ROOT, f).length, 0);
  assert.ok(located > 60000, `only ${located} located records found across ${files.length} files`);
});

for (const file of files) {
  test(`${file}: every record agrees with the commune and wilaya it declares`, () => {
    const rows = recordsOf(ROOT, file);
    if (!rows.length) return; // a lookup table or a set of shapes, nothing located
    const found = containmentViolations(rows, resolver).map((v) => v.id);
    const expected = (EXPECTED.get(file)?.records ?? []).map((v) => v.id);
    // The exact set, both directions: an unlisted record its geometry contradicts fails,
    // and a listing that is no longer needed must be removed rather than left to absorb
    // the next one.
    assert.deepEqual(
      found.sort(),
      expected.sort(),
      `${file}: record(s) outside the OpenStreetMap outline of the commune they name, or (with no such outline) ` +
        "inside a different wilaya's polygon, and not listed in " +
        "research/_wilaya-containment/record-exceptions.json (or listed there and now correct). A package joined on " +
        "geometry should be re-run so scripts/lib/commune-resolver.mjs fixes it; a package whose commune and wilaya " +
        "come from its source's own text needs the source. Then regenerate the list with " +
        "`node scripts/build-wilaya-containment-exceptions.mjs --write`.",
    );
  });
}

test("the guard can fail, and the wilaya-55 records are what it fails on", () => {
  // THE #171 CASE, stated as data rather than trusted to a comment. These four records
  // are inside El-Hadjira (5507) and El Alia (5513) in wilaya 55, and the wilaya-first
  // join published them as N'goussa (3003) in wilaya 30. The shipped wilaya 30 polygon
  // DOES contain all four, so the old wilaya-only guard passed every one; N'goussa's
  // OpenStreetMap outline does not, so this one fails every one.
  const moved = [
    { id: "55-0051", wilaya_code: "30", commune_code: 3003, lat: 32.615544, lng: 5.513943 },
    { id: "55-00012", wilaya_code: "30", commune_code: 3003, lat: 32.613374, lng: 5.51684 },
    { id: "55-library-02", wilaya_code: "30", commune_code: 3003, lat: 32.702481, lng: 5.41333 },
    { id: "55-0210", wilaya_code: "30", commune_code: 3003, lat: 32.647857, lng: 5.516124 },
  ];
  for (const r of moved) {
    assert.equal(containingWilayaCode(r.lat, r.lng), "30", `${r.id}: the shipped w30 polygon contains it, which is #171`);
    assert.equal(resolver.insideOwnOutline(r.lat, r.lng, 3003), false, `${r.id}: it is not inside N'goussa`);
  }
  const bad = containmentViolations(moved, resolver);
  assert.deepEqual(bad.map((v) => v.id).sort(), ["55-00012", "55-0051", "55-0210", "55-library-02"]);
  assert.deepEqual([...new Set(bad.map((v) => v.kind))], ["outside_own_commune_outline"]);

  // As published by this batch, in wilaya 55, every one of them passes.
  const kept = moved.map((r) => ({
    ...r,
    wilaya_code: "55",
    commune_code: resolver.containingCommunes(r.lat, r.lng)[0].code_commune,
  }));
  assert.deepEqual(kept.map((r) => r.commune_code), [5507, 5507, 5513, 5507]);
  assert.deepEqual(containmentViolations(kept, resolver), []);

  // A record whose commune has no outline falls back to the wilaya polygon, and one
  // inside no polygon at all is not a violation, by design.
  assert.equal(containingWilayaCode(37.5, 3.0), null);
  assert.deepEqual(
    containmentViolations([{ id: "offshore", wilaya_code: "16", commune_code: 1634, lat: 37.5, lng: 3.0 }], resolver),
    [],
  );
  assert.deepEqual(
    containmentViolations(
      [{ id: "no-outline", wilaya_code: "29", commune_code: 1634, lat: 35.547628, lng: -0.414678 }],
      resolver,
    ).map((v) => v.kind),
    ["outside_declared_wilaya_polygon"],
  );
});
