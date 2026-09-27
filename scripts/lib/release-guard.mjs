/**
 * Release timing guard: decide whether a GitHub Release + tag may be cut for one
 * package version, from what `main` actually carries at the released commit.
 *
 * Why this exists. `changesets/action` builds the Version PR by checking out
 * `changeset-release/main` in the runner's own workspace, running `changeset
 * version` there, committing and pushing. It does not switch back, so the step
 * after it sees a working tree whose `package.json` and `CHANGELOG.md` are
 * ALREADY bumped, on a push where nothing was released at all. The releases loop
 * read those files and cut `geoalgeria@2.1.0` (2026-09-26 13:03 UTC) and seven
 * tags on 2026-09-13, each pointing at the pre-bump commit, each with the bot's
 * raw `### Minor Changes` notes instead of the curated section the Version PR
 * merge would have produced. The tag-existence guard then blocked the correct
 * release forever, so the tag had to be deleted by hand.
 *
 * The guard is fail closed: anything it cannot prove about the released commit
 * means no Release. A missing file, an unparseable `package.json`, a version the
 * committed tree does not carry, or an empty CHANGELOG section all decline.
 *
 * No dependencies beyond a sibling module, and no side effects, so it is safe to
 * import from a test.
 */

import { sectionFor } from "./release-copy.mjs";

/**
 * @param {object} input
 * @param {string} input.tag            release tag, `name@version`, for messages
 * @param {string} input.version        version the release would carry
 * @param {string|null} input.packageJson  `package.json` as committed at the released
 *                                      commit, or null when it is not there
 * @param {string|null} input.changelog `CHANGELOG.md` as committed at the released
 *                                      commit, or null when it is not there
 * @param {string} [input.ref]          how to name that commit in messages
 * @returns {{releasable: boolean, reason: string}}
 */
export function releaseVerdict({ tag, version, packageJson, changelog, ref = "the released commit" }) {
  if (!version) {
    return { releasable: false, reason: `${tag}: no version given; refusing to release` };
  }

  if (packageJson == null) {
    return {
      releasable: false,
      reason: `${tag}: package.json is not in ${ref}; refusing to release`,
    };
  }

  let committedVersion;
  try {
    committedVersion = JSON.parse(packageJson).version;
  } catch {
    return {
      releasable: false,
      reason: `${tag}: package.json in ${ref} is not valid JSON; refusing to release`,
    };
  }

  if (committedVersion !== version) {
    return {
      releasable: false,
      reason:
        `${tag}: ${ref} carries ${committedVersion ?? "no version"}, not ${version}. ` +
        "The Version PR has not merged yet, so this version is not on main. " +
        "Refusing to release; it will be cut on the push that merges it.",
    };
  }

  if (changelog == null) {
    return {
      releasable: false,
      reason: `${tag}: CHANGELOG.md is not in ${ref}; refusing to release`,
    };
  }

  if (!sectionFor(changelog, version)) {
    return {
      releasable: false,
      reason:
        `${tag}: CHANGELOG.md in ${ref} has no section for ${version}. ` +
        "Refusing to release rather than cutting a tag with fallback notes.",
    };
  }

  return { releasable: true, reason: `${tag}: ${version} is on main with a CHANGELOG section` };
}
