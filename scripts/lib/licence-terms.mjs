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
    licence: "`## Data` lists one `- <member>: <terms>` line per member",
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

  if (members.length > 0) {
    if (declared !== SEE_LICENSE)
      errors.push(`${name}/package.json: license is ${JSON.stringify(declared ?? null)}, expected "${SEE_LICENSE}" (umbrella re-exporting ${members.length} packages)`);
    const data = dataSection(licenceText);
    for (const member of members) {
      if (!data.includes(`- ${member}:`))
        errors.push(`${name}/LICENSE: the "## Data" section has no "- ${member}:" line, so a consumer cannot see that member's data terms`);
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
