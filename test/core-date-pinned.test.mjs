// `dateModified` in packages/dataset/dataset-metadata.json is the administrative
// core's date, and until this file nothing tied it to the core.
//
// WHY THIS FILE EXISTS. The Web app's Wilaya and Commune pages quote that date,
// both as the visible freshness line and as the JSON-LD `dateModified` of the
// page: those pages' InfoCards, detail rows and factual lead ARE the commune
// table, its dairas, postal codes and codes, so the core is one of the datasets
// they show (app tracker #224). The date reaches them through
// scripts/build-catalog.mjs, which copies `dateModified` into the catalog the app
// reads at its pinned data commit. The field is hand-maintained, and no test tied
// it to the records, so a release that corrected a commune and forgot the field
// would ship pages quoting a date from the release before it, on data that had
// moved. The batch runbook carried a manual bump step instead, which is the
// mistake this repository has made with every hand-maintained summary it has had
// (see test/division-counts.test.mjs).
//
// WHAT IS ENFORCED, AND WHAT IS NOT. The rule is one-directional: the core moving
// requires the date to move, never the other way round. `dateModified` dates the
// published descriptor as a whole, so a licence-prose or terms correction may
// refresh it with no record having changed, and that stays legal here.
//
// HOW. packages/dataset/core-date.pin.json records the digest of the core's
// carriers next to the `dateModified` they were last dated at. This file fails
// when the committed digest is not the core's, which is the releaser's prompt to
// bump the date and re-pin; and scripts/pin-core-date.mjs refuses to re-pin a
// moved core against a date that did not move, which is where the direction is
// enforced. Neither needs git history or the network, so a shallow CI clone
// checks the same thing a full one does.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CARRIER_EXTENSIONS,
  EXCLUDED_DIRS,
  PIN_ALGORITHM,
  PIN_FILE,
  coreCarriers,
  carrierHashes,
  digestOf,
  fileHash,
  pinRefusal,
  serialisePin,
} from "../scripts/lib/core-date-pin.mjs";

const ROOT = join(import.meta.dirname, "..");
const PKG = join(ROOT, "packages", "dataset");
const read = (...parts) => readFileSync(join(PKG, ...parts), "utf8");
const metadata = JSON.parse(read("dataset-metadata.json"));
const pin = JSON.parse(read(PIN_FILE));

// The carriers, listed here as well as discovered by the library, so a discovery
// that stopped seeing a file fails instead of passing over a smaller core. Every
// published representation of the wilaya, daira and commune records is one: the
// JSON the package's API loads, the CSV, GeoJSON and SQL exports built from it,
// the ledgers that make an old id or an old spelling resolvable, and the
// descriptors that state what each export carries. `data/poste/` is deliberately
// not here, see EXCLUDED_DIRS.
const EXPECTED_CARRIERS = [
  "algeria.json",
  "communes_new_wilayas.csv",
  "communes_w1_w23.json",
  "communes_w24_w48.json",
  "communes_w49_w69.json",
  "csv/communes.csv",
  "csv/wilayas.csv",
  "dairas.json",
  "delivery/maystro.json",
  "delivery/yalidine.json",
  "delivery/zr_express.json",
  "ecommerce/communes.csv",
  "ecommerce/communes.json",
  "ecommerce/communes.sql",
  "geojson/communes.geojson",
  "geojson/communes.metadata.json",
  "geojson/wilaya-boundaries.geojson",
  "geojson/wilaya-boundaries.metadata.json",
  "geojson/wilayas.geojson",
  "name-history.json",
  "osm-links.metadata.json",
  "phone-code-provenance.json",
  "retired-ids.json",
  "sql/full.sql",
  "wilaya-capitals.metadata.json",
  "wilayas.csv",
  "wilayas.json",
];

test("the core's carriers are every published data file but the postal mirror", () => {
  assert.deepEqual(coreCarriers(PKG), EXPECTED_CARRIERS);

  // The extensions are the package's own `files[]` globs under `data/`, so a
  // published file cannot land outside the digest by carrying a new extension:
  // a fifth glob fails here and has to be decided on.
  const globs = JSON.parse(read("package.json")).files.filter((entry) => entry.startsWith("data/"));
  assert.deepEqual(
    globs.sort(),
    CARRIER_EXTENSIONS.map((extension) => `data/**/*${extension}`).sort(),
  );
  assert.deepEqual(EXCLUDED_DIRS, ["poste"]);
});

test(`${PIN_FILE} records the digest of the core it names`, () => {
  assert.equal(pin.algorithm, PIN_ALGORITHM);
  assert.match(pin.sha256, /^[0-9a-f]{64}$/);
  assert.ok(pin.canonical_form, "the pin must state the serialisation the digest is taken over");
  assert.equal(pin.carrier_count, EXPECTED_CARRIERS.length);
  assert.equal(
    digestOf(carrierHashes(PKG)),
    pin.sha256,
    "the administrative core has changed since it was dated " +
      `${pin.dateModified}. Set "dateModified" in packages/dataset/dataset-metadata.json to this ` +
      "release's date, then re-pin with `node scripts/pin-core-date.mjs --write`.",
  );
});

test("the pin is dated at the `dateModified` the package publishes", () => {
  assert.match(metadata.dateModified, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(
    pin.dateModified,
    metadata.dateModified,
    `${PIN_FILE} was dated ${pin.dateModified} and dataset-metadata.json publishes ` +
      `${metadata.dateModified}: re-pin with \`node scripts/pin-core-date.mjs --write\` so the pin ` +
      "states the date the core is actually published under",
  );
});

test("a one-character edit to one carrier breaks the digest", () => {
  // The red proof, on the real committed data rather than on a fixture: the
  // smallest edit a correction can be is one changed name in one file, and it has
  // to move the digest or the guard proves nothing.
  const dairas = read("data", "dairas.json");
  const edited = dairas.replace('"name_fr"', '"name_Fr"');
  assert.notEqual(edited, dairas, "dairas.json no longer has the field this proof edits");
  assert.notEqual(fileHash(edited), fileHash(dairas));

  const tampered = carrierHashes(PKG).map(([path, hash]) =>
    path === "dairas.json" ? [path, fileHash(edited)] : [path, hash],
  );
  assert.notEqual(digestOf(tampered), pin.sha256);
});

test("the digest states the content, not the line endings", () => {
  // A checkout that hands the suite CRLF must not read as a changed core: a
  // failure that can mean "your git normalised the file" is one people learn to
  // re-roll.
  const wilayas = read("data", "wilayas.csv");
  assert.equal(fileHash(wilayas.replace(/\n/g, "\r\n")), fileHash(wilayas));
});

test("a carrier dropped from the set changes the digest", () => {
  // The path is hashed with its file, so a carrier that stops being published,
  // or is renamed, moves the digest rather than quietly leaving the core.
  const entries = carrierHashes(PKG);
  assert.notEqual(digestOf(entries.filter(([path]) => path !== "wilayas.json")), pin.sha256);
  assert.notEqual(
    digestOf(entries.map(([path, hash]) => (path === "wilayas.json" ? ["wilayas-2026.json", hash] : [path, hash]))),
    pin.sha256,
  );
});

test("re-pinning a moved core is refused while `dateModified` has not moved", () => {
  // Where the direction is enforced. The pin on its own only proves the core and
  // the date were written together; this is what stops them being written
  // together on the old date.
  const dated = { dateModified: "2026-10-03", sha256: "a".repeat(64) };
  const moved = "b".repeat(64);

  // The release-day mistake: the core moved, the field was left alone.
  assert.match(
    pinRefusal({ pin: dated, dateModified: "2026-10-03", digest: moved }),
    /dated 2026-10-03, and dateModified reads 2026-10-03, which is not later/,
  );
  // And a date edited backwards is the same refusal, not a pass.
  assert.match(
    pinRefusal({ pin: dated, dateModified: "2026-09-29", digest: moved }),
    /dated 2026-10-03, and dateModified reads 2026-09-29, which is not later/,
  );
  assert.equal(pinRefusal({ pin: dated, dateModified: "2026-10-09", digest: moved }), null);

  // An unchanged core may be re-pinned at any date, because `dateModified` dates
  // the whole descriptor and a licence correction legitimately refreshes it.
  assert.equal(pinRefusal({ pin: dated, dateModified: "2026-10-09", digest: dated.sha256 }), null);
  assert.equal(pinRefusal({ pin: dated, dateModified: "2026-10-03", digest: dated.sha256 }), null);
});

test("the committed pin is byte-identical to what the writer emits", () => {
  // So that `--write` on an unchanged core is a no-diff run, which is what makes
  // the `--check` below usable as a gate.
  assert.equal(serialisePin(pin), read(PIN_FILE));
});

test("pin-core-date.mjs --check passes on the committed tree", () => {
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [join(ROOT, "scripts", "pin-core-date.mjs"), "--check"], { stdio: "pipe" }),
  );
});
