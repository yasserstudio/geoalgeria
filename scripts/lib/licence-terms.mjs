// The per-package licence classes, and the rule that keeps their three artefacts
// in step: the manifest `license` field, the package LICENSE file, and the data
// terms declared in dataset-metadata.json.
//
// Before this rule every manifest said "MIT" while most packages redistribute
// data under terms that are not MIT at all. Nothing failed, because the manifest
// was never read against the metadata that states the real terms. The classes
// below are the whole map: a package that fits none of them is an error naming
// the URL, not a silent pass.

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
 * Errors (empty when consistent) for one package's licence trio.
 *
 * @param {object} input
 * @param {string} input.name package directory name, used in the messages
 * @param {object} input.manifest parsed package.json
 * @param {object|null} input.metadata parsed dataset-metadata.json, null when absent
 * @param {string} input.licenceText the package LICENSE file
 * @param {string[]} input.members `@geoalgeria/*` dependency names (umbrellas only)
 * @returns {string[]}
 */
export function licenceTermsErrors({ name, manifest, metadata, licenceText, members = [] }) {
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
    if (IS_ODBL.test(metadata.license)) {
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
