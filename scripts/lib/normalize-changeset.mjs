// The major-changeset guard over @geoalgeria/normalize's key path.
//
// Search keys are baked into every published catalog, and an installed catalog is
// never migrated record by record: a key that changes after a release has shipped
// rebuilds and re-downloads the whole catalog on every device. A key change is
// therefore closer to a schema change than to a bug fix, and the only cheap moment
// to insist on the major version is the pull request that makes it.
//
// The check is path-based and deliberately blunt. It reads which files a diff
// touched, not what the change meant, so a documentation-only edit to a guarded
// file still needs the major. Understanding what an edit means is the thing this
// guard exists to avoid trusting, and the accepted cost is written down in
// CONTRIBUTING.md rather than worked around here.

const PACKAGE = "@geoalgeria/normalize";

/**
 * The files a change to which is a key change: the key path, the reviewed Rule
 * table and its codepoint tables, the Golden corpus, and the barrel that publishes
 * them. An entry ending in "/" is a directory prefix.
 *
 * @type {ReadonlyArray<string>}
 */
export const GUARDED_PATHS = Object.freeze([
  "packages/normalize/src/",
  "packages/normalize/fixtures/corpus.js",
  "packages/normalize/index.js",
]);

/**
 * The guarded files a diff touched, in the order the diff listed them.
 *
 * @param {ReadonlyArray<string>} changedFiles paths relative to the repository root
 * @returns {string[]}
 */
export function guardedFiles(changedFiles) {
  return changedFiles.filter((file) =>
    GUARDED_PATHS.some((guarded) => (guarded.endsWith("/") ? file.startsWith(guarded) : file === guarded)),
  );
}

// Changesets are hand-written markdown: a frontmatter block between the first two
// lines of three dashes, then prose. Only the block counts, so the word "major" in
// a release note is not a bump, and the package name is read however the author
// quoted it.
const BUMP = new RegExp(`^\\s*(["']?)${PACKAGE.replace("/", "\\/")}\\1\\s*:\\s*major\\s*$`, "m");

/**
 * Whether one changeset file declares a major bump of this package.
 *
 * @param {string} contents the raw markdown of a `.changeset/*.md` file
 * @returns {boolean}
 */
function declaresMajor(contents) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(contents.trimStart());
  return match !== null && BUMP.test(match[1]);
}

const WHY =
  `Keys are baked into every published catalog and an installed catalog is never migrated record by record, so a key change rebuilds and re-downloads every catalog on every device. ` +
  `The check is path-based: a documentation-only edit to one of these files still needs the major, which CONTRIBUTING.md records as the accepted cost.`;

/**
 * The ways a pull request can be wrong here, as a list of messages so the caller
 * reports it the way the repository's other gates are reported.
 *
 * The exception is the pre-publish chain: until the first version of the package is
 * on npm there is no published catalog to invalidate and nothing installed to
 * migrate, and the release entry is a patch on the flagship rather than a major on
 * a package nobody can install yet. That exception needs the registry to have
 * actually said so, which is why `registry` carries three answers and not two. An
 * unreachable registry is `unknown`, and the guard fails closed on it: an
 * unnecessary major costs one version number, a missed one costs every installed
 * catalog on every device, so a timeout must not be allowed to read as a 404.
 *
 * @param {{
 *   changedFiles: ReadonlyArray<string>,
 *   changesets: ReadonlyArray<string>,
 *   registry: { status: "published" | "unpublished" | "unknown", version?: string, reason?: string },
 * }} input
 * @returns {string[]} one message when the guard fails, empty when it passes
 */
export function majorChangesetError({ changedFiles, changesets, registry }) {
  const touched = guardedFiles(changedFiles);
  if (touched.length === 0) return [];
  if (changesets.some(declaresMajor)) return [];
  if (registry.status === "unpublished") return [];

  const because =
    registry.status === "published"
      ? `${PACKAGE} is published at ${registry.version}, so the pre-publish exception no longer applies.`
      : `The registry could not be asked whether ${PACKAGE} is published (${registry.reason ?? "no reason given"}), and the pre-publish exception only applies to a registry that answered 404, so this check fails closed.`;

  return [
    `${touched.join(", ")}: this diff changes ${PACKAGE}'s key path, so it needs a changeset declaring "${PACKAGE}": major. ${WHY} ${because}`,
  ];
}
