#!/usr/bin/env node
// Pin the administrative core's digest to the `dateModified` it is published
// under, so a release that moves the core cannot quote the previous release's
// date on the Web app's Wilaya and Commune pages.
//
// Why the field needs a guard at all, and what is and is not enforced:
// test/core-date-pinned.test.mjs. How the digest is taken:
// scripts/lib/core-date-pin.mjs.
//
// Usage:
//   node scripts/pin-core-date.mjs            # dry-run report
//   node scripts/pin-core-date.mjs --check    # exit 1 if the pin is stale
//   node scripts/pin-core-date.mjs --write    # re-pin, refusing an undated change

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PIN_FILE, pinDocument, pinRefusal, serialisePin, todayUtc } from "./lib/core-date-pin.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "packages", "dataset");
const PIN_PATH = join(PKG, PIN_FILE);
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

const committed = JSON.parse(readFileSync(PIN_PATH, "utf8"));
const next = pinDocument(PKG);
const bytes = serialisePin(next);

console.log(`${next.carrier_count} carrier(s), dateModified ${next.dateModified}, digest ${next.sha256}`);

if (readFileSync(PIN_PATH, "utf8") === bytes) {
  console.log(`${PIN_FILE} is the digest of the core it names`);
  process.exit(0);
}

// --check is what CI and the test suite run, so it reads no clock: it reports
// that the committed pin is not the core's and leaves the date to the releaser,
// which is the same verdict on any later day and in a shallow clone.
if (CHECK) {
  console.error(
    `\nFAILED: ${PIN_FILE} is not the digest of the administrative core.\n` +
      `Fix: if the core changed in this branch, set "dateModified" in ` +
      "packages/dataset/dataset-metadata.json to the date this release ships (unless it already " +
      "reads it), rebuild the catalog with `node scripts/build-catalog.mjs`, then re-pin with " +
      "`pnpm pin-core-date --write`. If the core did not change, revert the edit.",
  );
  process.exit(1);
}

// The direction, enforced where the pin is written. A moved core may only be
// re-pinned against a date it has not outlived; an unchanged core may be re-pinned
// at any date, because `dateModified` dates the whole descriptor and a licence
// correction legitimately refreshes it.
const refusal = pinRefusal({
  pin: committed,
  dateModified: next.dateModified,
  digest: next.sha256,
  today: todayUtc(),
});
if (refusal) throw new Error(refusal);

console.log(
  `${WRITE ? "re-pinned" : "would re-pin"} ${PIN_FILE}: ` +
    `${committed.dateModified} -> ${next.dateModified}, ${committed.sha256} -> ${next.sha256}`,
);
if (WRITE) {
  const tmp = `${PIN_PATH}.${process.pid}.tmp`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, PIN_PATH);
}
