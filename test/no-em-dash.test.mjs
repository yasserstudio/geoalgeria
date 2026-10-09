// The em-dash gate, over published metadata and over the source that writes it.
// The metadata sweep touched every package, so what matters there is that a
// reintroduced one is reported with the file and the JSON pointer, wherever in
// the document it sits. The source gate below is a ratchet instead: the tree was
// never swept, so each file is pinned at the debt it carries today.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { EM_DASH, emDashPointers, emDashErrors } from "../scripts/lib/no-em-dash.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("emDashPointers finds nothing in clean metadata", () => {
  assert.deepEqual(
    emDashPointers({ title_en: "Algeria schools", sources: [{ name: "OpenStreetMap: schools" }] }),
    [],
  );
});

test("emDashPointers points at a source name, a note and a nested array entry", () => {
  assert.deepEqual(emDashPointers({ coverage_note: `a ${EM_DASH} b` }), ["/coverage_note"]);
  assert.deepEqual(emDashPointers({ sources: [{ name: "x" }, { name: `y ${EM_DASH} z` }] }), [
    "/sources/1/name",
  ]);
  assert.deepEqual(emDashPointers({ citation: ["ok", `a ${EM_DASH} b`] }), ["/citation/1"]);
  assert.deepEqual(emDashPointers(`bare ${EM_DASH} string`), ["/"]);
});

test("emDashPointers ignores non-strings and other dashes", () => {
  assert.deepEqual(emDashPointers({ n: 1, ok: null, yes: true, en: "6–7", hy: "a-b" }), []);
});

test("emDashErrors names the file and the pointer", () => {
  const errors = emDashErrors([
    { label: "ecoles/data/metadata.json", json: { sources: [{ name: `OSM ${EM_DASH} schools` }] } },
    { label: "ecoles/dataset-metadata.json", json: { name: "clean" } },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^ecoles\/data\/metadata\.json: em dash \(U\+2014\) at \/sources\/0\/name/);
});

test("every published metadata file in the repo is clean", () => {
  const offenders = [];
  for (const pkg of readdirSync(join(ROOT, "packages")).sort()) {
    for (const rel of ["dataset-metadata.json", join("data", "metadata.json")]) {
      const path = join(ROOT, "packages", pkg, rel);
      if (!existsSync(path)) continue;
      offenders.push(
        ...emDashErrors([{ label: `${pkg}/${rel}`, json: JSON.parse(readFileSync(path, "utf-8")) }]),
      );
    }
  }
  assert.deepEqual(offenders, []);
});

// ---------------------------------------------------------------------------
// The source gate.
//
// The sweep above only ever looked at published metadata, so the code that
// writes it was never covered: #260 found 95 em dashes still sitting in
// validate-packages.mjs and lib/v2-transforms.mjs, cleared them by hand, and
// nothing would have stopped the next one. 299 remain across 48 other files
// (the fetchers, announce.js, build-catalog.mjs, a few tests), which is a sweep
// of its own, not a prerequisite for a gate.
//
// So this walks every hand-written source file and pins each one at the debt it
// carries today. A new file, a new em dash in an old one, and a stale entry all
// fail. Sweeping a file means lowering its number or deleting the line; the
// numbers only ever go down. Same shape as KNOWN_MISLINKS in
// scripts/validate-packages.mjs, for the same reason.
const SOURCE_RE = /\.(mjs|cjs|js|mts|cts|ts)$/;

// U+2014 is the point of these two, not a slip: one declares the character the
// gate looks for, the other feeds it to the dash-folding corpus as input.
const EXEMPT = new Set(["scripts/lib/no-em-dash.mjs", "packages/normalize/fixtures/corpus.js"]);

// Recorded debt, in em dashes per file. Only ever edit a number downward.
const DEBT = {
  "packages/aviation/scripts/fetch.mjs": 9,
  "packages/banques/scripts/build.mjs": 1,
  "packages/banques/scripts/fetch.mjs": 15,
  "packages/culture/scripts/fetch.mjs": 6,
  "packages/djezzy/scripts/fetch.mjs": 7,
  "packages/ecoles/scripts/fetch.mjs": 14,
  "packages/emploi/scripts/fetch.mjs": 11,
  "packages/enseignement-superieur/scripts/fetch.mjs": 13,
  "packages/enseignement-superieur/scripts/geocode-osm.mjs": 3,
  "packages/enseignement-superieur/scripts/geocode.mjs": 2,
  "packages/enseignement-superieur/scripts/mesrs-ar.mjs": 6,
  "packages/enseignement-superieur/scripts/mesrs.mjs": 2,
  "packages/ferroviaire/scripts/fetch.mjs": 5,
  "packages/gares-routieres/scripts/fetch.mjs": 3,
  "packages/jeunesse/scripts/fetch.mjs": 10,
  "packages/livraison/scripts/fetch.mjs": 24,
  "packages/mobilis/scripts/fetch.mjs": 9,
  "packages/mosquees/scripts/fetch.mjs": 3,
  "packages/ooredoo/scripts/fetch.mjs": 12,
  "packages/pharmacies/scripts/fetch.mjs": 11,
  "packages/poste/scripts/fetch.mjs": 3,
  "packages/protection-civile/scripts/fetch.mjs": 10,
  "packages/schema/test/schema.test.mjs": 15,
  "packages/sports/scripts/fetch.mjs": 5,
  "packages/telecom/scripts/fetch.mjs": 13,
  "research/buses/analyze-candidates.mjs": 2,
  "research/buses/artifact/app.js": 2,
  "research/buses/collect-osm.mjs": 2,
  "research/buses/national/build-national-inventory.mjs": 5,
  "research/buses/parse-etusa.mjs": 1,
  "research/buses/promote-official-sources.mjs": 2,
  "research/gares-routieres/clean-sogral.mjs": 1,
  "scripts/announce.js": 14,
  "scripts/build-catalog.mjs": 9,
  "scripts/fix-jo-corrections.mjs": 1,
  "scripts/lib/source-store.mjs": 8,
  "scripts/migrate-to-v2.mjs": 5,
  "scripts/purge-cdn.js": 4,
  "scripts/release-notes.mjs": 3,
  "scripts/stage-publish.js": 3,
  "test/buses-research.test.mjs": 1,
  "test/carry-over-ids.test.mjs": 5,
  "test/commune-in-boundary.test.mjs": 6,
  "test/geo-in-boundary.test.mjs": 4,
  "test/jo-corrections.test.mjs": 1,
  "test/package-api.test.mjs": 1,
  "test/source-store.test.mjs": 1,
  "test/wilaya-capitals.test.mjs": 6,
};

// git ls-files, not a directory walk: it is already the list of hand-written
// files, so node_modules, dist, coverage and the gitignored research/ caches
// are out without a skip list to maintain.
const sourceFiles = () =>
  execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf-8", maxBuffer: 64 << 20 })
    .split("\0")
    .filter((p) => p && SOURCE_RE.test(p) && !EXEMPT.has(p))
    .sort();

const countEmDashes = (path) => readFileSync(join(ROOT, path), "utf-8").split(EM_DASH).length - 1;

test("every hand-written source file carries exactly its recorded em-dash debt", () => {
  const faults = [];
  for (const path of sourceFiles()) {
    const found = countEmDashes(path);
    const allowed = DEBT[path] ?? 0;
    if (found === allowed) continue;
    faults.push(
      found > allowed
        ? `${path}: ${found} em dash(es) (U+2014), recorded debt is ${allowed}. ` +
          `Use a colon, comma or semicolon; do not raise the number in test/no-em-dash.test.mjs.`
        : `${path}: the debt shrank to ${found}, recorded as ${allowed}. ` +
          `Ratchet DEBT down to ${found} in test/no-em-dash.test.mjs.`,
    );
  }
  assert.deepEqual(faults, []);
});

// A debt entry for a file that is clean, renamed or deleted is dead weight that
// hides the next regression, exactly as it would in KNOWN_MISLINKS.
test("the debt ledger carries no entry for a file that is clean or gone", () => {
  const present = new Set(sourceFiles());
  const stale = Object.keys(DEBT).filter((path) => !present.has(path) || countEmDashes(path) === 0);
  assert.deepEqual(stale, [], "drop these entries from DEBT");
});

test("an exemption stays justified: the file exists and still needs its em dash", () => {
  for (const path of EXEMPT) {
    assert.ok(existsSync(join(ROOT, path)), `${path} is exempt but does not exist`);
    assert.ok(countEmDashes(path) > 0, `${path} no longer needs its exemption, drop it from EXEMPT`);
  }
});

test("the gate reads the whole tree, not just the scripts it was written for", () => {
  const files = sourceFiles();
  for (const tree of ["scripts/", "test/", "packages/", "research/"])
    assert.ok(
      files.some((p) => p.startsWith(tree)),
      `the walk found no source file under ${tree}`,
    );
  assert.ok(files.includes("scripts/validate-packages.mjs"));
  assert.ok(files.includes("scripts/lib/v2-transforms.mjs"));
  assert.ok(!files.some((p) => p.includes("node_modules/")));
});
