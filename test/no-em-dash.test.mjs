// The em-dash gate, over published metadata and over the source that writes it.
// The metadata sweep touched every package, so what matters there is that a
// reintroduced one is reported with the file and the JSON pointer, wherever in
// the document it sits. The source gate below is a ratchet instead: the tree was
// never swept, so each file is pinned at the debt it carries today. It covers
// JS/TS, Python and YAML, which is every hand-written source file here.
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
// nothing would have stopped the next one. 342 remain across 60 other files
// (the fetchers, announce.js, build-catalog.mjs, the CI workflows, the Python
// research scripts, a few tests), which is a sweep of its own, not a
// prerequisite for a gate.
//
// So this walks every hand-written source file and pins each one at the debt it
// carries today. A new file, a new em dash in an old one, and a stale entry all
// fail. Sweeping a file means lowering its number or deleting the line; the
// numbers only ever go down. Same shape as KNOWN_MISLINKS in
// scripts/validate-packages.mjs, for the same reason.
const SOURCE_RE = /\.(mjs|cjs|js|mts|cts|ts|py|ya?ml)$/;

// Tracked but not hand-written, so not this gate's business.
const GENERATED = new Set(["pnpm-lock.yaml"]);

// Recorded debt, in em dashes per file. Only ever edit a number downward.
//
// Four entries are pinned rather than swept because the character is the point,
// not a slip. They stay in the ledger instead of being exempted outright so a
// second, genuinely prose dash in the same file still fails.
const DEBT = {
  ".github/ISSUE_TEMPLATE/dataset-request.yml": 1,
  ".github/workflows/announce.yml": 7,
  ".github/workflows/ci.yml": 14,
  ".github/workflows/release.yml": 3,
  "packages/aviation/scripts/fetch.mjs": 9,
  "packages/banques/scripts/build.mjs": 1,
  "packages/banques/scripts/fetch.mjs": 15,
  "packages/culture/scripts/fetch.mjs": 6,
  "packages/dataset/scripts/validate.py": 1,
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
  // fetch.mjs:62 matches an em dash as an upstream null placeholder. One of
  // these 24 is a value, not prose: do not sweep that line.
  "packages/livraison/scripts/fetch.mjs": 24,
  "packages/mobilis/scripts/fetch.mjs": 9,
  "packages/mosquees/scripts/fetch.mjs": 3,
  // corpus.js feeds "Alger-Centre<em dash>Rue-Didouche" to the dash-folding
  // golden corpus. Value, not prose: do not sweep.
  "packages/normalize/fixtures/corpus.js": 1,
  "packages/ooredoo/scripts/fetch.mjs": 12,
  "packages/pharmacies/scripts/fetch.mjs": 11,
  "packages/poste/scripts/fetch.mjs": 3,
  "packages/protection-civile/scripts/fetch.mjs": 10,
  "packages/schema/test/schema.test.mjs": 15,
  "packages/sports/scripts/fetch.mjs": 5,
  "packages/telecom/scripts/fetch.mjs": 13,
  "research/_flight-routes/localize_endpoint_names.py": 1,
  "research/_pharma-landscape/build.py": 10,
  "research/agriculture/geocode.py": 2,
  "research/agriculture/normalize.py": 1,
  "research/agriculture/parse.py": 1,
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
  // no-em-dash.mjs declares EM_DASH itself. Value, not prose: do not sweep.
  "scripts/lib/no-em-dash.mjs": 1,
  "scripts/lib/source-store.mjs": 8,
  "scripts/migrate-to-v2.mjs": 5,
  "scripts/purge-cdn.js": 4,
  "scripts/release-notes.mjs": 3,
  "scripts/stage-publish.js": 3,
  // buses-research.test.mjs:17 parses the OSM name "1A<em dash>Timizart".
  // Value, not prose: do not sweep.
  "test/buses-research.test.mjs": 1,
  "test/carry-over-ids.test.mjs": 5,
  "test/commune-in-boundary.test.mjs": 6,
  "test/geo-in-boundary.test.mjs": 4,
  // jo-corrections.test.mjs:107 asserts the published GeoJSON name format,
  // "name_fr<em dash>name_ar". Value, not prose: do not sweep.
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
    .filter((p) => p && SOURCE_RE.test(p) && !GENERATED.has(p))
    .sort();

const countEmDashes = (path) => {
  try {
    return readFileSync(join(ROOT, path), "utf-8").split(EM_DASH).length - 1;
  } catch (e) {
    if (e?.code === "ENOENT")
      throw new Error(
        `${path}: the em-dash gate cannot read this file. It is named in DEBT but is ` +
          `not on disk; drop the line or correct the path in test/no-em-dash.test.mjs.`,
      );
    throw e;
  }
};

/**
 * One pass over the tree, shared by the checks below so a rename is reported
 * once. A rename lands as two separate faults that look unrelated: a ledger
 * line whose file the walk never saw, and an unrecorded file carrying the same
 * count. Pairing them lets the message say "move the line".
 */
function scan() {
  const walked = new Map(sourceFiles().map((p) => [p, countEmDashes(p)]));
  const missing = Object.keys(DEBT).filter((p) => !walked.has(p));
  const renames = new Map();
  const claimed = new Set();
  for (const [path, found] of walked) {
    if (found === 0 || DEBT[path] !== undefined) continue;
    const gone = missing.find((g) => !claimed.has(g) && DEBT[g] === found);
    if (gone) {
      claimed.add(gone);
      renames.set(path, gone);
    }
  }
  return { walked, missing, renames };
}

test("every hand-written source file carries exactly its recorded em-dash debt", () => {
  const { walked, renames } = scan();
  const faults = [];
  for (const [path, found] of walked) {
    const allowed = DEBT[path] ?? 0;
    if (found === allowed) continue;
    if (renames.has(path))
      faults.push(
        `${path}: ${found} em dash(es) (U+2014) and no ledger line, while ` +
          `${renames.get(path)} is recorded with the same count and is gone. ` +
          `Renamed? Move the ledger line in test/no-em-dash.test.mjs.`,
      );
    else if (found > allowed)
      faults.push(
        `${path}: ${found} em dash(es) (U+2014), recorded debt is ${allowed}. ` +
          `Use a colon, comma or semicolon; do not raise the number in test/no-em-dash.test.mjs.`,
      );
    else
      faults.push(
        `${path}: the debt shrank to ${found}, recorded as ${allowed}. ` +
          `Ratchet DEBT down to ${found} in test/no-em-dash.test.mjs.`,
      );
  }
  assert.deepEqual(faults, []);
});

// A debt entry for a file that is clean, renamed or deleted is dead weight that
// hides the next regression, exactly as it would in KNOWN_MISLINKS. A rename is
// left to the check above, which names both halves of it.
test("the debt ledger carries no entry for a file that is clean or gone", () => {
  const { walked, missing, renames } = scan();
  const moved = new Set(renames.values());
  const stale = [
    ...missing.filter((p) => !moved.has(p)),
    ...Object.keys(DEBT).filter((p) => walked.get(p) === 0),
  ].sort();
  assert.deepEqual(stale, [], "drop these entries from DEBT");
});

test("the walk reaches every tree it is meant to, and nothing generated", () => {
  const files = sourceFiles();
  // scripts/, test/ and packages/ are always here. research/ and .github/ are
  // required only while the ledger still names files in them, so pruning or
  // untracking research/ relaxes this instead of breaking it.
  const trees = new Set(["scripts/", "test/", "packages/"]);
  for (const path of Object.keys(DEBT)) trees.add(path.slice(0, path.indexOf("/") + 1));
  for (const tree of trees)
    assert.ok(
      files.some((p) => p.startsWith(tree)),
      `the walk found no source file under ${tree}`,
    );
  // The widened extensions actually reach something, and the two swept files
  // are still in scope.
  assert.ok(files.includes("scripts/validate-packages.mjs"));
  assert.ok(files.includes("scripts/lib/v2-transforms.mjs"));
  assert.ok(files.some((p) => p.endsWith(".py")), "the walk covers no Python");
  assert.ok(
    files.some((p) => p.startsWith(".github/workflows/")),
    "the walk covers no CI workflow",
  );
  assert.ok(!files.some((p) => p.includes("node_modules/")));
  for (const path of GENERATED) assert.ok(!files.includes(path), `${path} is generated, keep it out`);
});
