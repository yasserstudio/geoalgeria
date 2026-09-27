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
 * Not every decline means the same thing, though, and the workflow used to treat
 * them identically:
 *
 *   - **`pending-version-pr`** is routine. The version is not on `main` yet, which
 *     is exactly the bumped-working-tree case above. npm published nothing either,
 *     so there is nothing missing; the Release is cut on the push that merges the
 *     Version PR. Silent skip.
 *   - **`missing-changelog`** is not routine. The version IS committed at the
 *     released commit, so `stage-publish.js` already staged it and npm will serve
 *     it, but its `CHANGELOG.md` section is absent or empty so no Release, no data
 *     bundle and no announcement are cut. That is a version live on npm with no
 *     Release behind it, and nothing would have said so.
 *   - **`unreadable`** is a broken tree (no `package.json`, unparseable JSON, no
 *     version field, no `CHANGELOG.md`). It cannot be classified, so it warns too.
 *
 * `verdict.kind` carries that distinction; `scripts/release-guard.mjs` maps it to
 * an exit code the workflow annotates.
 *
 * No dependencies beyond a sibling module, and no side effects, so it is safe to
 * import from a test.
 */

import { sectionFor } from "./release-copy.mjs";

/** Verdict kinds. `release` is the only releasable one. */
export const VERDICT_KINDS = ["release", "pending-version-pr", "missing-changelog", "unreadable"];

/**
 * @param {object} input
 * @param {string} input.tag            release tag, `name@version`, for messages
 * @param {string} input.version        version the release would carry
 * @param {string|null} input.packageJson  `package.json` as committed at the released
 *                                      commit, or null when it is not there
 * @param {string|null} input.changelog `CHANGELOG.md` as committed at the released
 *                                      commit, or null when it is not there
 * @param {string} [input.ref]          how to name that commit in messages
 * @returns {{releasable: boolean, kind: "release"|"pending-version-pr"|"missing-changelog"|"unreadable", reason: string}}
 */
export function releaseVerdict({ tag, version, packageJson, changelog, ref = "the released commit" }) {
  if (!version) {
    return { releasable: false, kind: "unreadable", reason: `${tag}: no version given; refusing to release` };
  }

  if (packageJson == null) {
    return {
      releasable: false,
      kind: "unreadable",
      reason: `${tag}: package.json is not in ${ref}; refusing to release`,
    };
  }

  let committedVersion;
  try {
    committedVersion = JSON.parse(packageJson).version;
  } catch {
    return {
      releasable: false,
      kind: "unreadable",
      reason: `${tag}: package.json in ${ref} is not valid JSON; refusing to release`,
    };
  }

  if (!committedVersion) {
    return {
      releasable: false,
      kind: "unreadable",
      reason: `${tag}: package.json in ${ref} carries no version; refusing to release`,
    };
  }

  if (committedVersion !== version) {
    return {
      releasable: false,
      kind: "pending-version-pr",
      reason:
        `${tag}: ${ref} carries ${committedVersion}, not ${version}. ` +
        "The Version PR has not merged yet, so this version is not on main. " +
        "Refusing to release; it will be cut on the push that merges it.",
    };
  }

  // Past this line the version IS on main, so npm has it (or soon will). Any
  // decline from here leaves a published version with no GitHub Release.
  if (changelog == null) {
    return {
      releasable: false,
      kind: "unreadable",
      reason: `${tag}: CHANGELOG.md is not in ${ref}; refusing to release`,
    };
  }

  if (!sectionFor(changelog, version)) {
    return {
      releasable: false,
      kind: "missing-changelog",
      reason:
        `${tag}: ${version} IS committed at ${ref}, so it stages and goes live on npm, but ` +
        `CHANGELOG.md there has no section for ${version}. No GitHub Release, no data bundle and no ` +
        "announcement will be cut for a version that npm serves. Add the section and re-run Release, " +
        "or cut the Release by hand.",
    };
  }

  return {
    releasable: true,
    kind: "release",
    reason: `${tag}: ${version} is on main with a CHANGELOG section`,
  };
}
