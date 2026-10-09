// The proof that `dateModified` in packages/dataset/dataset-metadata.json is the
// date of the administrative core the package actually ships.
//
// WHY THIS EXISTS. The field is hand-maintained, the Web app quotes it on every
// Wilaya and Commune page, and nothing tied it to the records: a release that
// corrected a commune and forgot the field shipped pages dated at the release
// before it. The reasoning and the one-directional rule are in
// test/core-date-pinned.test.mjs.
//
// WHY A SIDECAR AND NOT A FIELD IN dataset-metadata.json. The digest covers the
// carriers, not the descriptor, so it could sit in the descriptor without
// defining itself away. It stays outside because the descriptor is published: the
// pin is release bookkeeping for this repository, no consumer has any use for it,
// and `files[]` does not glob it into the tarball. Keeping it out also makes
// weakening the guard a two-file diff a reviewer can disagree with.
//
// WHY A BYTE HASH PER CARRIER AND NOT A CANONICAL FORM. The carriers are six
// formats (JSON, CSV, GeoJSON, SQL and two descriptor shapes), so there is no one
// canonical serialisation to take a digest over, and every one of them is written
// by a generator in this repository: a reformat is not a thing that happens to
// them on its own. Line endings are the one exception, because a checkout can
// hand the suite CRLF for a file nobody touched, so they are normalised away.
// The path is hashed with the bytes, so a renamed or dropped carrier moves the
// digest instead of quietly leaving the core.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, posix } from "node:path";

export const PIN_FILE = "core-date.pin.json";
export const PIN_ALGORITHM = "sha256";

/** The extensions `geoalgeria`'s `files[]` publishes out of `data/`. A published
 *  file is a carrier by default; the test holds this list to those globs. */
export const CARRIER_EXTENSIONS = [".json", ".csv", ".geojson", ".sql"];

/** `data/poste/` is a generated mirror of @geoalgeria/poste, which carries its
 *  own `updated` and its own date in the catalog, and which this repository
 *  forbids hand-editing. A postal refresh is that package's release, not a change
 *  to the wilayas, dairas and communes, so it must not be able to date the core
 *  and must not be able to hold it hostage either. */
export const EXCLUDED_DIRS = ["poste"];

export const CANONICAL_FORM =
  "sha256 over one line per carrier, `<path> <sha256 of the file with CRLF normalised to LF>`, the " +
  "carriers in ascending path order, so the digest states the published content of the core and not " +
  "the order the files were read in or the line endings a checkout produced";

/** The digest of one carrier's bytes, line endings normalised away. */
export function fileHash(text) {
  return createHash(PIN_ALGORITHM).update(text.replace(/\r\n/g, "\n"), "utf-8").digest("hex");
}

/** Every published core carrier, as a path relative to `<pkg>/data`, ascending. */
export function coreCarriers(pkgDir) {
  const found = [];
  const walk = (relative) => {
    for (const entry of readdirSync(join(pkgDir, "data", relative), { withFileTypes: true })) {
      const path = relative ? posix.join(relative, entry.name) : entry.name;
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(path)) walk(path);
        continue;
      }
      if (CARRIER_EXTENSIONS.includes(extname(entry.name))) found.push(path);
    }
  };
  walk("");
  return found.sort();
}

/** `[path, digest]` per carrier, ascending by path. */
export function carrierHashes(pkgDir) {
  return coreCarriers(pkgDir).map((path) => [
    path,
    fileHash(readFileSync(join(pkgDir, "data", path), "utf8")),
  ]);
}

/** The pinned digest, over the carrier lines rather than over the files, so the
 *  tests can prove a tampered carrier moves it without writing to the tree. */
export function digestOf(entries) {
  const lines = [...entries]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, hash]) => `${path} ${hash}`);
  return createHash(PIN_ALGORITHM).update(`${lines.join("\n")}\n`, "utf-8").digest("hex");
}

/** The digest of the core as it sits on disk. */
export const coreDigest = (pkgDir) => digestOf(carrierHashes(pkgDir));

/**
 * The one-directional rule, in one place: a core that moved may only be re-pinned
 * against a `dateModified` the core has not outlived, which is any date from the
 * day of the re-pin onwards.
 *
 * WHY THE FLOOR IS THE DAY OF THE RE-PIN AND NOT THE DATE IN THE PIN. The first
 * cut asked for a date strictly later than the pinned one, which deadlocked the
 * second core change of a release day: a batch lands eight to eleven core commits
 * in one day (29 September and 1 October 2026 each did), the first of them dates
 * the core at today, and the second then had no date it could honestly bump to.
 * Carrying the previous release's date in the pin as well does not fix it, because
 * the first commit of the day would then pass against that older date without
 * bumping anything, which is the defect this guard exists for. The day of the
 * re-pin is the one reference that makes "this date is stale" decidable, so that
 * is the floor, and a date ahead of it is a deliberately pre-dated release rather
 * than a stale one.
 *
 * This is the only clock in the guard, and nothing that runs in CI reaches it:
 * `--check` and test/core-date-pinned.test.mjs compare the pin with the tree, so a
 * shallow clone checked on any later day reaches the same verdict.
 *
 * @returns the refusal, or null when re-pinning is legal.
 */
export function pinRefusal({ pin, dateModified, digest, today }) {
  if (!pin || pin.sha256 === digest) return null;
  if (!today)
    return (
      "the administrative core has changed and today's date was not supplied, so whether " +
      "dateModified is stale cannot be decided"
    );
  if (dateModified >= today) return null;
  return (
    `the administrative core has changed since it was dated ${pin.dateModified}, and dateModified ` +
    `reads ${dateModified}, older than ${today}. Set "dateModified" in ` +
    "packages/dataset/dataset-metadata.json to the date this release ships, rebuild the catalog " +
    "with `node scripts/build-catalog.mjs`, then re-pin."
  );
}

/** Today in UTC, as the ISO date the descriptor states its dates in. UTC rather
 *  than local time so two releasers in different zones get one floor. */
export const todayUtc = () => new Date().toISOString().slice(0, 10);

/** The sidecar document. */
export function pinDocument(pkgDir) {
  const entries = carrierHashes(pkgDir);
  return {
    document: "dataset-metadata.json",
    field: "dateModified",
    dateModified: JSON.parse(readFileSync(join(pkgDir, "dataset-metadata.json"), "utf8")).dateModified,
    algorithm: PIN_ALGORITHM,
    canonical_form: CANONICAL_FORM,
    carrier_count: entries.length,
    carriers: entries.map(([path]) => path),
    sha256: digestOf(entries),
    note:
      "The digest of the administrative core's published carriers, next to the `dateModified` they " +
      "were last dated at. `pnpm validate` and test/core-date-pinned.test.mjs recompute it and fail " +
      "when the core has moved and this file has not, which is the releaser's prompt to date the " +
      "release: set `dateModified`, run `node scripts/build-catalog.mjs`, then `pnpm pin-core-date " +
      "--write`, which refuses while `dateModified` is older than the day it runs on. `data/poste/` " +
      "is excluded: it is a mirror of @geoalgeria/poste and carries that package's date.",
  };
}

/** The sidecar's bytes. */
export const serialisePin = (document) => `${JSON.stringify(document, null, 2)}\n`;
