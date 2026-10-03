// The per-package licence classes, and the rule that keeps their three artefacts
// in step: the manifest `license` field, the package LICENSE file, and the data
// terms declared in dataset-metadata.json.
//
// Before this rule every manifest said "MIT" while most packages redistribute
// data under terms that are not MIT at all. Nothing failed, because the manifest
// was never read against the metadata that states the real terms. The classes
// below are the whole map: a package that fits none of them is an error naming
// the URL, not a silent pass.
//
// A package also ships per-file and per-folder descriptors under `data/`, each
// with a `license` field of its own, and those were never read against the
// package class. `geoalgeria` moved to SEE LICENSE IN LICENSE with prose terms,
// and `data/geojson/communes.metadata.json` kept the SPDX expression the manifest
// used before the move, claiming the ODbL over all 1,541 commune centres while
// the file's own note says no such claim is made over 1,290 of them.
// `descriptorTermsErrors` below covers every one of those descriptors.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** metadata state -> manifest value -> LICENSE shape. Cited by CONTRIBUTING.md. */
export const LICENCE_CLASSES = [
  {
    id: "umbrella",
    metadata: "no dataset-metadata.json, `dependencies` on @geoalgeria/* members",
    manifest: "SEE LICENSE IN LICENSE",
    licence: "`## Code` MIT plus a `## Data` section listing exactly one `- <member>: <terms>` line per member",
  },
  {
    id: "code-only",
    metadata: "no dataset-metadata.json",
    manifest: "MIT",
    licence: "the plain MIT text",
  },
  {
    id: "open-mit",
    metadata: "`license` is the MIT URL",
    manifest: "MIT",
    licence: "the plain MIT text",
  },
  {
    id: "open-odbl",
    metadata: "`license` is the ODbL 1.0 URL",
    manifest: "MIT AND ODbL-1.0",
    licence: "`## Code` MIT plus a `## Data` section carrying the ODbL URL",
  },
  {
    id: "open-mixed",
    metadata: "`license` is an array of the MIT URL and the ODbL 1.0 URL",
    manifest: "MIT AND ODbL-1.0",
    licence:
      "`## Code` MIT plus a `## Data` section carrying both URLs and listing each non-MIT carve-out as a `- ` bullet naming the `data/...` paths it covers",
    notice:
      "a NOTICE file, listed in the manifest `files[]`, carrying the ODbL URL and every `data/...` path the LICENSE's carve-out bullets name",
  },
  {
    id: "restricted",
    metadata: "`conditionsOfAccess`",
    manifest: "SEE LICENSE IN LICENSE",
    licence: "`## Code\\n\\nMIT License` plus a `## Data` section carrying conditionsOfAccess verbatim",
  },
];

/**
 * The MIT grant itself, from the first `Permission` line to the closing `SOFTWARE.`.
 * The `## Code` heading alone proves nothing: a LICENSE could title itself MIT over a
 * gutted or reworded grant and still pass, so every class is checked against this text.
 */
export const MIT_BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const SEE_LICENSE = "SEE LICENSE IN LICENSE";
const CODE_HEADING = "## Code\n\nMIT License";
const ODBL_URL = "https://opendatacommons.org/licenses/odbl/1-0/";
const MIT_URL = "https://opensource.org/licenses/MIT";
const IS_ODBL = /opendatacommons\.org\/licenses\/odbl/i;
const IS_MIT = /opensource\.org\/licenses\/MIT/i;

/** Everything after the `## Data` heading, or "" when the file has no such section. */
function dataSection(licenceText) {
  const at = (licenceText ?? "").indexOf("## Data");
  return at === -1 ? "" : licenceText.slice(at + "## Data".length);
}

/** Everything before the `## Data` heading, or the whole file when there is no such section. */
function codeSection(licenceText) {
  const text = licenceText ?? "";
  const at = text.indexOf("## Data");
  return at === -1 ? text : text.slice(0, at);
}

/**
 * The `- ` bullets of a `## Data` section, one per carve-out, each folded to a
 * single line so a wrapped bullet reads as one item.
 */
function carveOutBullets(dataText) {
  const bullets = [];
  for (const line of dataText.split("\n")) {
    if (/^- \S/.test(line)) bullets.push(line.slice(2).trim());
    else if (bullets.length && /^\s+\S/.test(line)) bullets[bullets.length - 1] += ` ${line.trim()}`;
    else if (line.trim() === "") continue;
    else if (bullets.length) bullets.push("");
  }
  return bullets.filter(Boolean);
}

/**
 * The `data/...` paths a carve-out bullet names, from its backticked tokens. A
 * path is what identifies a carved-out part; the rest of the bullet describes it.
 * A glob is reduced to the literal prefix before the `*`, so `data/communes_w*.json`
 * matches a NOTICE that spells the three files out.
 */
function dataPathsIn(bullet) {
  const paths = [];
  for (const [, token] of bullet.matchAll(/`([^`]+)`/g)) {
    if (!token.startsWith("data/")) continue;
    paths.push(token.includes("*") ? token.slice(0, token.indexOf("*")) : token);
  }
  return paths;
}

/**
 * The `open-mixed` class alone splits ONE package's data between two licences, so
 * the LICENSE can only say which part is which by naming the parts. That naming is
 * the whole carve-out: get it wrong and the package either claims share-alike over
 * MIT data or quietly relicenses ODbL data. The LICENSE points at NOTICE for the
 * per-part attribution, so NOTICE is part of the terms, not a courtesy:
 *
 *  - it has to exist, or the LICENSE points nowhere;
 *  - it has to be in `files[]`, or it exists in git and is absent from the npm
 *    tarball, where the consumer who needs it is;
 *  - it has to carry the ODbL URL, so the terms travel with the attribution; and
 *  - it has to name every `data/...` path the LICENSE's carve-out bullets name, so
 *    no carved-out part is left without attribution.
 *
 * Checked only for `open-mixed`: the single-licence classes have nothing to split.
 */
function mixedNoticeErrors({ name, manifest, licenceText, noticeText, data }) {
  const errors = [];

  if (noticeText == null) {
    errors.push(
      `${name}/NOTICE: missing, so the per-part attribution the LICENSE refers to does not exist. A mixed MIT/ODbL package must name each carved-out part somewhere.`,
    );
    return errors;
  }

  const files = manifest?.files;
  if (!Array.isArray(files) || !files.includes("NOTICE"))
    errors.push(
      `${name}/package.json: files[] does not list "NOTICE", so the per-part ODbL attribution is in git but not in the npm tarball`,
    );

  if (!noticeText.includes(ODBL_URL))
    errors.push(`${name}/NOTICE: does not carry ${ODBL_URL}, so the attribution does not state the terms it is for`);

  const bullets = carveOutBullets(data);
  if (bullets.length === 0) {
    errors.push(
      `${name}/LICENSE: the "## Data" section lists no "- " carve-out bullet, so the non-MIT parts are not enumerated and cannot be checked against NOTICE`,
    );
    return errors;
  }

  for (const bullet of bullets) {
    const paths = dataPathsIn(bullet);
    const label = bullet.length > 60 ? `${bullet.slice(0, 60)}...` : bullet;
    if (paths.length === 0) {
      errors.push(
        `${name}/LICENSE: the carve-out "${label}" names no \`data/...\` path, so which shipped data it covers is unstated`,
      );
      continue;
    }
    for (const path of paths)
      if (!noticeText.includes(path))
        errors.push(
          `${name}/NOTICE: does not name ${path}, carved out by "${label}" in the LICENSE, so that part ships without its attribution`,
        );
  }

  return errors;
}

/**
 * Errors (empty when consistent) for one package's licence trio.
 *
 * @param {object} input
 * @param {string} input.name package directory name, used in the messages
 * @param {object} input.manifest parsed package.json
 * @param {object|null} input.metadata parsed dataset-metadata.json, null when absent
 * @param {string} input.licenceText the package LICENSE file
 * @param {string|null} [input.noticeText] the package NOTICE file, null when absent
 * @param {string[]} input.members `@geoalgeria/*` dependency names (umbrellas only)
 * @returns {string[]}
 */
export function licenceTermsErrors({ name, manifest, metadata, licenceText, noticeText = null, members = [] }) {
  const errors = [];
  const declared = manifest?.license;

  // Every class grants the code under MIT, so every LICENSE carries the grant itself,
  // and it carries it in the code part: the grant is not code terms once it sits under
  // "## Data".
  if (!codeSection(licenceText).includes(MIT_BODY))
    errors.push(`${name}/LICENSE: the MIT permission grant is missing or altered before the "## Data" section, so the code terms are not the MIT licence`);

  // An umbrella has no data of its own: it re-exports its members', and the LICENSE is
  // the only place a consumer sees them. A package that also has metadata is not an
  // umbrella, and falls through to the checks its own metadata calls for.
  if (metadata === null && members.length > 0) {
    if (declared !== SEE_LICENSE)
      errors.push(`${name}/package.json: license is ${JSON.stringify(declared ?? null)}, expected "${SEE_LICENSE}" (umbrella re-exporting ${members.length} packages)`);
    if (!(licenceText ?? "").startsWith(CODE_HEADING))
      errors.push(`${name}/LICENSE: must start with "## Code" then the MIT text, so the code terms are stated apart from the members' data terms`);
    const data = dataSection(licenceText);
    for (const member of members) {
      if (!data.includes(`- ${member}:`))
        errors.push(`${name}/LICENSE: the "## Data" section has no "- ${member}:" line, so a consumer cannot see that member's data terms`);
    }
    for (const line of data.split("\n")) {
      const listed = /^- (@geoalgeria\/[^:]+):/.exec(line)?.[1];
      if (listed && !members.includes(listed))
        errors.push(`${name}/LICENSE: the "## Data" section lists "- ${listed}:", which is not a dependency, so it states terms for data the package does not ship`);
    }
    return errors;
  }

  if (metadata === null) {
    if (declared !== "MIT")
      errors.push(`${name}/package.json: license is ${JSON.stringify(declared ?? null)}, expected "MIT" (no dataset-metadata.json, so the package ships code only)`);
    return errors;
  }

  const data = dataSection(licenceText);

  if (metadata.license) {
    if (Array.isArray(metadata.license)) {
      // A package whose data is not all under one set of terms: the bulk under one
      // licence, a named part under another. A single URL cannot say that, and
      // picking the stricter one alone would relicense the rest, so the array holds
      // every licence the shipped data is under and the LICENSE says which part each
      // one covers. Only the MIT + ODbL pair is known, because that is the only
      // split the repository actually ships; another pair is an error naming the
      // URLs, exactly like an unknown single URL.
      const urls = metadata.license;
      const unknown = urls.filter((url) => !IS_MIT.test(url) && !IS_ODBL.test(url));
      if (unknown.length || !urls.some((url) => IS_MIT.test(url)) || !urls.some((url) => IS_ODBL.test(url))) {
        errors.push(`${name}/dataset-metadata.json: license ${JSON.stringify(urls)} is not the MIT plus ODbL 1.0 pair, the only array class known, add the class to licence-terms.mjs`);
      } else {
        if (declared !== "MIT AND ODbL-1.0")
          errors.push(`${name}/package.json: license is ${JSON.stringify(declared ?? null)}, expected "MIT AND ODbL-1.0" (dataset-metadata.json licenses part of the data under the ODbL and the rest under the MIT licence)`);
        if (!(licenceText ?? "").startsWith(CODE_HEADING))
          errors.push(`${name}/LICENSE: must start with "## Code" then the MIT text, so the code terms are stated apart from the two sets of data terms`);
        for (const url of [MIT_URL, ODBL_URL])
          if (!data.includes(url))
            errors.push(`${name}/LICENSE: the "## Data" section does not carry ${url}, so a consumer cannot tell which part of the data it covers`);
        errors.push(...mixedNoticeErrors({ name, manifest, licenceText, noticeText, data }));
      }
    } else if (IS_ODBL.test(metadata.license)) {
      if (declared !== "MIT AND ODbL-1.0")
        errors.push(`${name}/package.json: license is ${JSON.stringify(declared ?? null)}, expected "MIT AND ODbL-1.0" (dataset-metadata.json licenses the data under the ODbL)`);
      if (!data.includes(ODBL_URL))
        errors.push(`${name}/LICENSE: the "## Data" section does not carry ${ODBL_URL}, so the ODbL the manifest claims is nowhere stated`);
    } else if (IS_MIT.test(metadata.license)) {
      if (declared !== "MIT")
        errors.push(`${name}/package.json: license is ${JSON.stringify(declared ?? null)}, expected "MIT" (dataset-metadata.json licenses the data under the MIT licence)`);
    } else {
      errors.push(`${name}/dataset-metadata.json: license ${metadata.license} matches no known licence class, add the class to licence-terms.mjs`);
    }
  }

  if (metadata.conditionsOfAccess) {
    if (declared !== SEE_LICENSE)
      errors.push(`${name}/package.json: license is ${JSON.stringify(declared ?? null)}, expected "${SEE_LICENSE}" (dataset-metadata.json states conditionsOfAccess, so the data is not under an SPDX licence)`);
    if (!(licenceText ?? "").startsWith(CODE_HEADING))
      errors.push(`${name}/LICENSE: must start with "## Code" then the MIT text, so the code terms are stated apart from the data terms`);
    if (!data.includes(metadata.conditionsOfAccess))
      errors.push(`${name}/LICENSE: the "## Data" section does not carry conditionsOfAccess verbatim (${metadata.conditionsOfAccess})`);
  }

  if (metadata.license && metadata.conditionsOfAccess)
    errors.push(`${name}/dataset-metadata.json: license and conditionsOfAccess are exclusive, it declares both`);
  else if (!metadata.license && !metadata.conditionsOfAccess)
    errors.push(`${name}/dataset-metadata.json: needs exactly one of license or conditionsOfAccess, it declares neither`);

  return errors;
}

/**
 * Every metadata descriptor a package publishes from `data/`, as paths relative to
 * the package directory, sorted. Discovered rather than listed, so a descriptor
 * added next to a new data file is covered the day it lands: that is how
 * `data/geojson/communes.metadata.json` went unchecked.
 *
 * `dataset-metadata.json` is deliberately not here. It is the package's own terms
 * statement and `licenceTermsErrors` above already owns it; listing it twice would
 * report the same defect from two rules.
 *
 * @param {string} pkgDir absolute path of the package directory
 * @returns {string[]} e.g. ["data/geojson/communes.metadata.json", "data/metadata.json"]
 */
export function publishedMetadataPaths(pkgDir) {
  const dataDir = join(pkgDir, "data");
  if (!existsSync(dataDir)) return [];
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (entry === "metadata.json" || entry.endsWith(".metadata.json"))
        found.push(relative(pkgDir, path).split(sep).join("/"));
    }
  };
  walk(dataDir);
  return found.sort();
}

/** A bare SPDX expression: identifiers joined by AND, OR or WITH, and nothing else. */
const SPDX_EXPRESSION = /^[A-Za-z0-9][A-Za-z0-9.+-]*(?: (?:AND|OR|WITH) [A-Za-z0-9][A-Za-z0-9.+-]*)*$/;

/** True when `terms` reads as an SPDX expression rather than prose or a licence URL. */
export const isSpdxExpression = (terms) => typeof terms === "string" && SPDX_EXPRESSION.test(terms.trim());

/**
 * Errors (empty when consistent) for one package's `data/` descriptors.
 *
 * Three rules, and the reason each one exists:
 *
 *  1. A descriptor states its terms in exactly one of `license` or
 *     `conditionsOfAccess`, the same exclusive pair the Dataset JSON-LD rule
 *     requires of `dataset-metadata.json`. A descriptor that states neither
 *     publishes data with no terms at all.
 *  2. A bare SPDX expression under a package that declares SEE LICENSE IN LICENSE
 *     has to say why. The manifest value means no SPDX expression states this
 *     package's terms, so a descriptor that produces one is either the stale
 *     manifest value left behind by a class change, or a part whose own data really
 *     is wholly under that licence. The second is legitimate and the repository
 *     ships one, `data/geojson/wilaya-boundaries.geojson`, whose every feature is
 *     ODbL; it is told apart from the first by a `provenance_notes` entry that
 *     names both the expression and the manifest value.
 *  3. Prose terms have to be the terms the package grants, carried verbatim by the
 *     `## Data` section of its LICENSE. Otherwise a descriptor can offer data on
 *     terms no licence file states.
 *
 * @param {object} input
 * @param {string} input.name package directory name, used in the messages
 * @param {object} input.manifest parsed package.json
 * @param {string} input.licenceText the package LICENSE file
 * @param {{ path: string, json: object }[]} input.descriptors parsed `data/` descriptors
 * @returns {string[]}
 */
export function descriptorTermsErrors({ name, manifest, licenceText, descriptors }) {
  const errors = [];
  const data = dataSection(licenceText);

  for (const { path, json } of descriptors) {
    const where = `${name}/${path}`;
    const { license, conditionsOfAccess } = json ?? {};

    if (license && conditionsOfAccess) {
      errors.push(`${where}: license and conditionsOfAccess are exclusive, it declares both`);
      continue;
    }
    const terms = license || conditionsOfAccess;
    if (!terms) {
      errors.push(
        `${where}: needs exactly one of license or conditionsOfAccess, it declares neither, so this data ships with no terms`,
      );
      continue;
    }

    if (isSpdxExpression(terms)) {
      // A package-level descriptor may narrow the package's SPDX expression (a
      // data descriptor saying "ODbL-1.0" under "MIT AND ODbL-1.0") but may not
      // name a licence the package does not grant. mosquees and ferroviaire
      // shipped "CC0-1.0 AND ODbL-1.0" under "MIT AND ODbL-1.0": CC0 is their
      // Wikidata source's licence, which belongs in sources[].license.
      if (manifest?.license !== SEE_LICENSE) {
        const ids = (expression) => new Set(String(expression).split(/\s+(?:AND|OR|WITH)\s+|[()\s]+/).filter(Boolean));
        const granted = ids(manifest?.license ?? "");
        const foreign = [...ids(terms)].filter((id) => !granted.has(id));
        if (path === "data/metadata.json" && granted.size && foreign.length)
          errors.push(
            `${where}: license "${terms}" names ${foreign.join(", ")}, which ${name}/package.json ("${manifest.license}") does not grant; a source's licence belongs in sources[].license`,
          );
        continue;
      }
      const notes = Array.isArray(json.provenance_notes) ? json.provenance_notes : [];
      const documented = notes.some((note) => note.includes(terms) && note.includes(SEE_LICENSE));
      if (!documented)
        errors.push(
          `${where}: license is the SPDX expression "${terms}" while ${name}/package.json declares "${SEE_LICENSE}", meaning no SPDX expression states this package's terms. Either state the terms the LICENSE grants, or add a provenance_notes entry naming both "${terms}" and "${SEE_LICENSE}" to say why this part alone is wholly under that licence.`,
        );
      continue;
    }

    if (!data.includes(terms))
      errors.push(
        `${where}: license is not carried verbatim by the "## Data" section of ${name}/LICENSE, so it states terms no licence file grants (${terms})`,
      );
  }

  return errors;
}
