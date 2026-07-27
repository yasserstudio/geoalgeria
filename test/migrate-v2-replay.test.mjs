// Guards scripts/migrate-to-v2.mjs against drifting away from the data it produced.
//
// The bug this exists for: the id prefixes that make mobilis.all() and
// tourisme.all() collision-free (`ag-`, `pdv-`, `attraction-`, `historic-`,
// `lodging-`, `park-`, `thermal-spring-`) were applied to the committed JSON by
// hand. The transform that its own header calls "the source-of-truth transform
// for packages whose upstream source is dead or blocked" kept emitting the old
// colliding ids, and nothing noticed, because the transform is never re-run
// against v1 input — the double-run guard skips any package that already looks
// v2, so replaying it in place is a no-op that always passes.
//
// The check: keep a sample of each package's real v1 input and replay the map
// over it. Every produced record must deep-equal the record that ships under
// that id today. A dropped prefix makes the id unfindable; any other field drift
// fails the deep-equal.
//
// What this asserts: the per-record transform, for all 22 configured packages
// and all 34 of their data files, over the fixture sample (372 records — 12
// evenly spaced per file plus the first ungeocoded one).
// What it does NOT assert: the file-level behaviour of the runner — id sort
// order, the CSV/GeoJSON emit, or metadata.json. Those are checked by replaying
// the full v1 tree out of git history, which cannot run here: CI checks out at
// depth 1, and the full v1 inputs are ~24 MB.
//
// To refresh the fixture after adding a package to MIGRATIONS, take the same
// sample from `git show <cutover>^:packages/<pkg>/data/<file>` and record the
// cutover sha alongside it; the fixture's own `_readme` carries the recipe.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MIGRATIONS } from "../scripts/migrate-to-v2.mjs";
import { sharedPoints } from "../packages/schema/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf-8"));
const FIXTURE = read("test/fixtures/migrate-v2-v1-sample.json");

/** [pkg, file, map] for every file the migration writes. */
const SPECS = Object.entries(MIGRATIONS).flatMap(([pkg, cfg]) =>
  (cfg.files || [{ file: cfg.file, map: cfg.map }]).map((s) => [pkg, s.file, s.map]),
);

test("migrate-to-v2 replay: the fixture covers every configured package and file", () => {
  const want = SPECS.map(([p, f]) => `${p}/${f}`).sort();
  const have = Object.entries(FIXTURE.packages)
    .flatMap(([p, e]) => Object.keys(e.files).map((f) => `${p}/${f}`))
    .sort();
  assert.deepEqual(have, want, "fixture and MIGRATIONS disagree on which files exist");
});

// A package whose generator gained a second upstream can no longer be replayed
// from frozen v1 input: aviation's committed records now carry an OurAirports
// `iata`, which no v1 row can produce, so its sample had to become generator
// input instead. That trade quietly costs the guarantee this file exists for.
// A v1 fixture is frozen in git history and cannot move; a generator-input
// fixture is derived from the very code path it checks, so changing the id rule
// in the generator and regenerating the fixture keeps the test green, which is
// exactly the class of drift the header describes.
//
// `_anacFrozen` restores the anchor: the upstream-owned fields of the same rows
// as they stood at `<cutover>^`, copied in once. `iata` and `source` are
// excluded because both legitimately changed. It is read from the fixture rather
// than from git so it still works on CI's depth-1 checkout.
for (const [pkg, entry] of Object.entries(FIXTURE.packages)) {
  if (!entry._anacFrozen) continue;
  test(`migrate-v2 fixture: ${pkg}'s sample still matches its frozen upstream rows`, () => {
    const file = Object.keys(entry.files)[0];
    const sample = new Map(entry.files[file].map((r) => [r.id, r]));
    for (const frozen of entry._anacFrozen) {
      const row = sample.get(frozen.id);
      assert.ok(
        row,
        `${pkg}: frozen upstream row ${JSON.stringify(frozen.id)} is missing from the sample. ` +
          `the id rule drifted, or the fixture was regenerated against changed upstream data`,
      );
      for (const [k, want] of Object.entries(frozen))
        assert.deepEqual(
          row[k],
          want,
          `${pkg}/${frozen.id}: ${k} is ${JSON.stringify(row[k])} in the sample but ` +
            `${JSON.stringify(want)} in the frozen pre-cutover row. The generator-input ` +
            `fixture has drifted from the upstream data it is supposed to represent`,
        );
    }
  });
}

for (const [pkg, file, map] of SPECS) {
  test(`migrate-to-v2 replay: ${pkg}/${file} reproduces the committed records`, () => {
    const sample = FIXTURE.packages[pkg].files[file];
    assert.ok(sample.length > 0, `${pkg}/${file}: empty fixture sample`);

    const rows = read(`packages/${pkg}/data/${file}`);
    const committed = new Map(rows.map((r) => [r.id, r]));
    // The runner's demoteSharedPoints() pass is file-level — a per-record map
    // cannot see that another record carries the same point — so replay it here.
    // The transform never moves a coordinate, so the clusters in the committed
    // file are exactly the clusters the runner saw.
    const shared = new Set([...sharedPoints(rows)].map((i) => `${rows[i].lat},${rows[i].lng}`));

    for (const v1 of sample) {
      const produced = map(v1);
      if (produced.geo_precision === "exact" && shared.has(`${produced.lat},${produced.lng}`))
        produced.geo_precision = "approximate";
      const shipped = committed.get(produced.id);
      assert.ok(
        shipped,
        `${pkg}/${file}: the transform produced id ${JSON.stringify(produced.id)}, which is not ` +
          `in the committed data — the id rule drifted (v1 id was ${JSON.stringify(v1.id)})`,
      );
      assert.deepEqual(produced, shipped, `${pkg}/${file}: transform output differs from the committed record ${produced.id}`);
    }
  });
}
