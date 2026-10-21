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

import {
  EM_DASH,
  EN_DASH,
  emDashPointers,
  emDashErrors,
  nameEmDashPointers,
  nameEmDashErrors,
  withoutEmDash,
  foldNameDashes,
} from "../scripts/lib/no-em-dash.mjs";

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
// The published-name gate.
//
// Metadata was the whole of the rule until #281: a record's own name counted as
// a value, so an em dash inside one was treated as a data decision. Three
// records had reached npm with one, four name strings between them: a
// hand-curated bank name in both `name` and `name_fr`, and two OpenStreetMap
// school names the fetcher passed straight through. So a published name is gated
// like the metadata around it, and `withoutEmDash` is what a generator calls to
// keep it that way.
//
// The substitution is a spaced hyphen and nothing more: it keeps the source's
// separation of the name without the character. No claim is made about a house
// separator.
//
// #294 brought the en dash (U+2013) under the same half of the rule, which 486
// published name values carried. The one shape left alone is a dash between two
// digits, a range rather than a separator: three sports facilities name an
// eponym's years. The metadata rule above is unchanged and still about the em
// dash alone, because its remedy is prose punctuation, which a range does not
// want.

test("withoutEmDash swaps the separator and leaves everything else alone", () => {
  assert.equal(withoutEmDash(`École primaire ${EM_DASH} Khaldi Mohammed`), "École primaire - Khaldi Mohammed");
  assert.equal(withoutEmDash(`a${EM_DASH}b`), "a - b");
  assert.equal(withoutEmDash(`${EM_DASH} a`), "a", "a name cannot open on a separator");
  assert.equal(withoutEmDash("Al Salam Bank - Algeria"), "Al Salam Bank - Algeria");
  assert.equal(withoutEmDash("6–7"), "6–7");
  assert.equal(withoutEmDash(null), null);
});

// It rewrites the dash, not the whitespace of the string it sits in. A /\s+/
// sweep looked equivalent and was not: \s matches U+00A0, so it flattened the
// non-breaking space French copy puts before a colon, and any interior tab with
// it. Those are the source's own characters and nothing here asked to touch
// them.
test("withoutEmDash leaves a non-breaking space and an interior tab alone", () => {
  const NBSP = "\u00a0";
  assert.equal(
    withoutEmDash(`Ligne 1${NBSP}: Alger ${EM_DASH} Oran`),
    `Ligne 1${NBSP}: Alger - Oran`,
  );
  assert.equal(withoutEmDash(`a${NBSP}${EM_DASH}${NBSP}b`), `a${NBSP} - ${NBSP}b`);
  assert.equal(withoutEmDash(`a\tb ${EM_DASH} c`), "a\tb - c");
  assert.equal(withoutEmDash(`a  ${EM_DASH}  b`), "a - b", "ASCII blanks touching the dash do go");
});

test("nameEmDashPointers points at names only, at any depth", () => {
  assert.deepEqual(nameEmDashPointers({ name: `a ${EM_DASH} b`, address: `c ${EM_DASH} d` }), ["/name"]);
  assert.deepEqual(
    nameEmDashPointers({ features: [{ properties: { name_fr: `a ${EM_DASH} b` } }] }),
    ["/features/0/properties/name_fr"],
  );
  assert.deepEqual(nameEmDashPointers([{ name: "ok" }, { former_names_fr: [`a ${EM_DASH} b`] }]), [
    "/1/former_names_fr/0",
  ]);
  assert.deepEqual(nameEmDashPointers({ name: "Al Salam Bank - Algeria", note: 1 }), []);
  // Scope is inherited through a nested object, not only through an array. No
  // published file shapes a name this way today, and the gate should not be the
  // thing that depends on that.
  assert.deepEqual(nameEmDashPointers({ name: { fr: `a ${EM_DASH} b` } }), ["/name/fr"]);
  assert.deepEqual(nameEmDashPointers({ note: { name_fr: `a ${EM_DASH} b` } }), ["/note/name_fr"]);
  assert.deepEqual(nameEmDashPointers({ note: { detail: `a ${EM_DASH} b` } }), []);
});

test("nameEmDashErrors names the file, the pointer and the separator to use", () => {
  const errors = nameEmDashErrors([
    { label: "banques/data/banks.json", json: [{ name: `CNEP ${EM_DASH} Banque` }] },
    { label: "banques/data/institutions.json", json: [{ name: "clean" }] },
  ]);
  assert.equal(errors.length, 1);
  assert.match(
    errors[0],
    /^banques\/data\/banks\.json: em dash \(U\+2014\) in a published name at \/0\/name, use " - "/,
  );
});

test("the name sweep walks record files and leaves metadata to the other rule", () => {
  const walked = publishedRecordFiles("ecoles");
  assert.ok(walked.includes(join("data", "ecoles.json")), "the canonical records are not being walked");
  assert.ok(
    walked.includes(join("data", "geojson", "ecoles.geojson")),
    "the GeoJSON mirror is not being walked",
  );
  assert.deepEqual(
    walked.filter((p) => p.includes("metadata.json")),
    [],
    "metadata belongs to the metadata rule, which gives a different remedy",
  );
});

// packages/dataset/algeria.geojson is the atlas file the README points at and
// the release workflow zips into every bundle beside data/. It carries the
// wilaya `name`, `name_en`, `name_fr` and `name_ar` of all 69 features and sat
// outside every walk in the repository, this one included, because it is the
// only published record file that does not live under data/.
test("the name sweep reaches the package-root atlas file", () => {
  assert.ok(
    publishedRecordFiles("dataset").includes("algeria.geojson"),
    "packages/dataset/algeria.geojson is published and must be swept",
  );
});

// ---------------------------------------------------------------------------
// The en dash, folded by #294 the same way and for the same reason.

test("withoutEmDash folds an en dash separator, spaced or not", () => {
  assert.equal(
    withoutEmDash(`Universit\u00e9 de Blida 1 ${EN_DASH} Saad Dahlab`),
    "Universit\u00e9 de Blida 1 - Saad Dahlab",
  );
  // Unspaced is the English Wikipedia airport form, which the route endpoints
  // are named from. It gains the spaces the separator is published with.
  assert.equal(
    withoutEmDash(`Tunis${EN_DASH}Carthage International Airport`),
    "Tunis - Carthage International Airport",
  );
  // Two separators in one name, which four airport names and six library names
  // carry, and a trailing one, which a health establishment carries.
  assert.equal(
    withoutEmDash(`A\u00e9roport de Tlemcen ${EN_DASH} Zenata ${EN_DASH} Messali El Hadj`),
    "A\u00e9roport de Tlemcen - Zenata - Messali El Hadj",
  );
  assert.equal(withoutEmDash(`Psychiatrie -yellel ${EN_DASH}`), "Psychiatrie -yellel");
  // Mixed, and the em dash is still folded wherever it stands.
  assert.equal(withoutEmDash(`a ${EN_DASH} b ${EM_DASH} c`), "a - b - c");
});

test("a folded name never opens or closes on a separator", () => {
  // There is nothing on the other side of it to separate. The real case: a
  // Relizane psychiatric hospital whose upstream name ends on the dash, which
  // the fold alone would have published ending " -".
  assert.equal(
    withoutEmDash(`Etablissement Hospitalier Sp\u00e9cialis\u00e9 en Psychiatrie -yellel ${EN_DASH}`),
    "Etablissement Hospitalier Sp\u00e9cialis\u00e9 en Psychiatrie -yellel",
  );
  assert.equal(withoutEmDash(`${EN_DASH} Mus\u00e9e de site`), "Mus\u00e9e de site");
  assert.equal(withoutEmDash(`Mus\u00e9e de site ${EM_DASH}`), "Mus\u00e9e de site");

  // A hyphen glued to the word beside it is part of that word, not a separator,
  // so it stays at either end: the blank on the inner side is what tells them
  // apart. Both of these are real upstream names.
  assert.equal(withoutEmDash(`-yellel ${EN_DASH} Relizane`), "-yellel - Relizane");
  assert.equal(
    withoutEmDash(`\u0633\u0648\u0642 \u0623\u0647\u0631\u0627\u0633 ${EN_DASH}\u062f\u0631\u0627\u064a\u0639\u064a\u0629 \u0623\u062d\u0645\u062f-`),
    "\u0633\u0648\u0642 \u0623\u0647\u0631\u0627\u0633 - \u062f\u0631\u0627\u064a\u0639\u064a\u0629 \u0623\u062d\u0645\u062f-",
  );

  // And a name with no dash at all is returned untouched, edges included: the
  // trim only ever runs on a name the fold changed.
  assert.equal(withoutEmDash("- Agence Hammani"), "- Agence Hammani");
});

test("withoutEmDash leaves a range between two digits alone", () => {
  // The three sports facilities that name an eponym's years. A range is not a
  // separator, so folding it would be a data decision, and the gate below
  // reports exactly what the fold would change.
  for (const name of [
    `Piscine semi-olympique 25m Aichaoui Kaddour (1924 ${EN_DASH} 2008)`,
    `Stade Mohammed Dahbi Chraa (1933 ${EN_DASH} 2020)`,
    `Salle OMS Allag Mokhtar (1942 ${EN_DASH} 2019) Hassi Messaoud`,
  ])
    assert.equal(withoutEmDash(name), name);
  assert.equal(withoutEmDash(`6${EN_DASH}7`), `6${EN_DASH}7`);
  // A digit on one side only is still a separator: a university numbered 1 and
  // the eponym after it, and Guelma's 8 May 1945.
  assert.equal(withoutEmDash(`Universit\u00e9 d'Alger 1 ${EN_DASH} Benyoucef`), "Universit\u00e9 d'Alger 1 - Benyoucef");
  assert.equal(withoutEmDash(`\u062c\u0627\u0645\u0639\u0629 \u0642\u0627\u0644\u0645\u0629 ${EN_DASH} 08 \u0645\u0627\u064a 1945`), "\u062c\u0627\u0645\u0639\u0629 \u0642\u0627\u0644\u0645\u0629 - 08 \u0645\u0627\u064a 1945");
  // No exemption for the em dash: the gate has reported it in a name since #281
  // and no published name uses one as a range.
  assert.equal(withoutEmDash(`1924 ${EM_DASH} 2008`), "1924 - 2008");
});

test("the name gate reports an en dash separator and not a range", () => {
  assert.deepEqual(nameEmDashPointers({ name: `a ${EN_DASH} b` }), ["/name"]);
  assert.deepEqual(nameEmDashPointers({ name: `Kaddour (1924 ${EN_DASH} 2008)` }), []);
  // Still a name field only: an address or a note is the source's own sentence.
  assert.deepEqual(nameEmDashPointers({ address: `a ${EN_DASH} b` }), []);
  // And the metadata rule is untouched by #294: there an en dash range in a
  // coverage note does not want a colon, comma or semicolon.
  assert.deepEqual(emDashPointers({ coverage_note: `2019 ${EN_DASH} 2026`, name: `a ${EN_DASH} b` }), []);
});

test("nameEmDashErrors says which dash it found", () => {
  const errors = nameEmDashErrors([
    { label: "culture/data/culture.json", json: [{ name: `Dar El Baroud ${EN_DASH} T\u00e9n\u00e8s` }] },
    { label: "banques/data/banks.json", json: [{ name: `CNEP ${EM_DASH} Banque` }] },
  ]);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /^culture\/data\/culture\.json: en dash \(U\+2013\) in a published name at \/0\/name, use " - "/);
  assert.match(errors[1], /^banques\/data\/banks\.json: em dash \(U\+2014\) in a published name at \/0\/name, use " - "/);
});

test("foldNameDashes folds a record's names and nothing else", () => {
  assert.deepEqual(
    foldNameDashes({
      name: `a ${EN_DASH} b`,
      name_ar: `c ${EM_DASH} d`,
      address: `e ${EN_DASH} f`,
      former_names_fr: [`g ${EN_DASH} h`],
      capacity: 25,
    }),
    {
      name: "a - b",
      name_ar: "c - d",
      address: `e ${EN_DASH} f`,
      former_names_fr: ["g - h"],
      capacity: 25,
    },
  );
  // It returns a new value rather than editing the rows a caller still holds.
  const row = { name: `a ${EN_DASH} b` };
  foldNameDashes(row);
  assert.equal(row.name, `a ${EN_DASH} b`);
});

// livraison is swept by the walk above like every other package, and since #294
// by `pnpm validate` too: its bespoke validator (validateLivraison in
// scripts/validate-packages.mjs) ran no name check at all, so the three files
// below were gated only by this test. carriers.json is the one that matters
// most: those names are hand-curated.
test("the name sweep reaches all three livraison files", () => {
  const walked = publishedRecordFiles("livraison");
  for (const file of ["carriers.json", "stopdesks.json", "coverage.json"])
    assert.ok(walked.includes(join("data", file)), `livraison/data/${file} is not being walked`);
});

// A fetcher that reads an upstream name folds it itself, before anything keys or
// dedupes on it, rather than relying on the shared writer at the end. Asserted
// over the source because the committed JSON cannot tell: it stays clean, and
// the regression only appears on the next refresh. ecoles has its own
// function-level pin in test/ecoles-clean-name.test.mjs; this is the cheap check
// that the other two OpenStreetMap fetchers still do it at all.
test("the OpenStreetMap fetchers fold a raw name in cleanName", () => {
  for (const pkg of ["ecoles", "cliniques", "pharmacies"]) {
    const source = readFileSync(join(ROOT, "packages", pkg, "scripts", "fetch.mjs"), "utf-8");
    assert.match(source, /no-em-dash\.mjs"/, `${pkg} does not import the fold`);
    assert.match(
      source,
      /const cleanName = \(v\) => \{[^}]*withoutEmDash\(/,
      `${pkg}'s cleanName does not put the raw name through withoutEmDash`,
    );
  }
});

test("every published name in the repo is clean", () => {
  const offenders = [];
  for (const pkg of readdirSync(join(ROOT, "packages")).sort())
    for (const rel of publishedRecordFiles(pkg)) {
      // Cheap first: the full tree is ~120 MB, and only a file that carries one
      // of the two characters at all is worth parsing.
      const text = readFileSync(join(ROOT, "packages", pkg, rel), "utf-8");
      if (!text.includes(EM_DASH) && !text.includes(EN_DASH)) continue;
      offenders.push(...nameEmDashErrors([{ label: `${pkg}/${rel}`, json: JSON.parse(text) }]));
    }
  assert.deepEqual(offenders, []);
});

/**
 * Every published record file of one package, as paths relative to the package:
 * all of `data/` with its mirrors, plus any GeoJSON sitting at the package root
 * (`packages/dataset/algeria.geojson`). Nothing outside those, so a generator's
 * `scripts/seeds/*.json` stays out: it is input, not published.
 *
 * `metadata.json` and the `*.metadata.json` sidecars are left out on purpose.
 * Their `sources[].name` is a name by key and prose by nature ("OpenStreetMap:
 * schools"), so sweeping them here would report one string twice with two
 * contradictory remedies: a colon, comma or semicolon from the metadata rule,
 * " - " from this one. The metadata rule owns them, and it already walks every
 * string they carry, sidecars included (validateNoEmDash in
 * scripts/validate-packages.mjs).
 */
const METADATA_FILE = /(^|\.)metadata\.json$/;
const RECORD_FILE = /\.(json|geojson)$/;

function publishedRecordFiles(pkg) {
  const pkgDir = join(ROOT, "packages", pkg);
  const out = [];
  const dataDir = join(pkgDir, "data");
  if (existsSync(dataDir)) walkRecordFiles(dataDir, pkgDir, out);
  for (const entry of readdirSync(pkgDir, { withFileTypes: true }))
    if (entry.isFile() && entry.name.endsWith(".geojson")) out.push(entry.name);
  return out.sort();
}

function walkRecordFiles(dir, base, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkRecordFiles(path, base, out);
    else if (RECORD_FILE.test(entry.name) && !METADATA_FILE.test(entry.name))
      out.push(path.slice(base.length + 1));
  }
}

// ---------------------------------------------------------------------------
// The source gate.
//
// The sweep above only ever looked at published metadata, so the code that
// writes it was never covered: #260 found 95 em dashes still sitting in
// validate-packages.mjs and lib/v2-transforms.mjs, then 342 more across 60
// files (the fetchers, announce.js, build-catalog.mjs, the CI workflows, the
// Python research scripts, a few tests). The prose ones are all swept now.
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
// What is left is pinned rather than swept because the character is the point,
// not a slip: a regex, an entity table, an upstream null placeholder, an empty-
// cell placeholder, a golden-corpus input, an asserted published name format.
// Each stays in the ledger instead of being exempted outright so a second,
// genuinely prose dash in the same file still fails.
const DEBT = {
  // fetch.mjs:116 matches an em dash as an upstream null placeholder.
  "packages/aviation/scripts/fetch.mjs": 1,
  // geocode.mjs:48 splits an eponym on any dash, em dash included.
  "packages/enseignement-superieur/scripts/geocode.mjs": 1,
  // mesrs-ar.mjs:36 is the &#8212; entity table entry.
  "packages/enseignement-superieur/scripts/mesrs-ar.mjs": 1,
  // mesrs.mjs:25 is the same entity table entry.
  "packages/enseignement-superieur/scripts/mesrs.mjs": 1,
  // fetch.mjs:62 matches an em dash as an upstream null placeholder.
  "packages/livraison/scripts/fetch.mjs": 1,
  // corpus.js feeds "Alger-Centre<em dash>Rue-Didouche" to the dash-folding
  // golden corpus.
  "packages/normalize/fixtures/corpus.js": 1,
  // localize_endpoint_names.py:95 is the em-dash-to-en-dash replacement itself.
  "research/_flight-routes/localize_endpoint_names.py": 1,
  // app.js renders an em dash as the empty-cell placeholder, twice.
  "research/buses/artifact/app.js": 2,
  // collect-osm.mjs:334 is the same empty-cell placeholder.
  "research/buses/collect-osm.mjs": 1,
  // build-national-inventory.mjs fills five inventory columns with it.
  "research/buses/national/build-national-inventory.mjs": 5,
  // promote-official-sources.mjs:67 parses "Ligne X<em dash>A / B" headings.
  "research/buses/promote-official-sources.mjs": 2,
  // no-em-dash.mjs declares EM_DASH itself.
  "scripts/lib/no-em-dash.mjs": 1,
  // buses-research.test.mjs:17 parses the OSM name "1A<em dash>Timizart".
  "test/buses-research.test.mjs": 1,
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
