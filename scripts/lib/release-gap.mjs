/**
 * Release gap report: every publishable package whose repo version will NOT
 * reach npm on this release, and why.
 *
 * Two ways a package falls out of the automated release, both of them silent
 * until this check existed:
 *
 *  - **never bootstrapped.** Trusted Publishing's OIDC grant attaches to an
 *    EXISTING package, so a brand-new name has to be claimed by one manual
 *    publish first. `@geoalgeria/normalize` 1.0.0 sat unpublished for weeks
 *    while its README carried npm badges and RELEASING listed it among the
 *    staged 28, until its bootstrap on 2026-09-29.
 *  - **absent from `release.yml`.** The dry-run step and the GitHub Releases step
 *    iterate a hand-written list of package dirs, not the workspace. A package
 *    missing from it gets no dry run and no GitHub Release even when it stages.
 *
 * There was a third: **an umbrella the staged path skipped.**
 * `@geoalgeria/transport` and `@geoalgeria/pharma` carry `workspace:` RUNTIME
 * deps, which `scripts/stage-publish.js` used to refuse, and npm served
 * `@geoalgeria/pharma` 2.0.0 while the repo said 2.0.1 with nothing saying a
 * word. Both stage like every other package since 2026-09-30, so an umbrella
 * ahead of npm is no longer a gap: the release will stage it.
 *
 * Pure, so the workflow and a test can share it. `releaseGaps` takes the facts
 * (versions, registry versions, the workflow text) and returns the findings.
 */

/**
 * @typedef {object} PackageFacts
 * @property {string} dir               workspace dir, e.g. `packages/transport`
 * @property {string} name              npm name
 * @property {string|undefined} version version the repo carries
 * @property {string|null} registryVersion npm's current version, or null when npm has never seen it
 */

/**
 * Packages that are deliberately never on npm, with the reason. Only the data
 * contract: it is a dev dependency of every generator, not a dataset, and
 * RELEASING.md records that it is absent from the workflow's lists on purpose.
 * Anything NOT named here is reported, so a new package cannot slip in quietly.
 */
export const DELIBERATELY_UNPUBLISHED = new Map([
  [
    "@geoalgeria/schema",
    "the v2 data contract, a dev dependency of every generator and not a dataset; never published (RELEASING.md)",
  ],
]);

/**
 * release.yml's hand-written package lists: the `for pkg in ...` line of the
 * dry-run loop and of the GitHub Releases loop. A package has to be in BOTH, and
 * they are two separate lists, so each one is checked on its own.
 */
export function packageLoops(workflow) {
  return workflow.match(/^.*\bfor pkg in\b.*$/gm) ?? [];
}

/**
 * Whether EVERY one of release.yml's package loops lists this exact package dir.
 *
 * Two traps, both of which made a missing package read as present:
 *  - a plain substring test over the whole file: `packages/pharma` is a prefix of
 *    `packages/pharmacies`, so the pharma umbrella read as listed because
 *    pharmacies is. Hence the `(?![\w-])` boundary.
 *  - matching the file rather than each loop: one mention anywhere satisfied it,
 *    so a dir added to the dry-run loop but not the Releases loop (it then stages
 *    and goes live on npm with no GitHub Release) read as present. Hence `every`.
 *
 * No loops at all proves nothing, so it answers false.
 */
export function mentionsDir(workflow, dir) {
  const escaped = dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const listed = new RegExp(`${escaped}(?![\\w-])`);
  const loops = packageLoops(workflow);
  if (loops.length === 0) return false;
  return loops.every((loop) => listed.test(loop));
}

/**
 * @param {PackageFacts[]} packages     every NON-private package in the workspace
 * @param {string} workflow             the text of .github/workflows/release.yml
 * @returns {Array<{name: string, dir: string, version: string, registryVersion: string|null, kind: "unpublished"|"not-in-workflow"|"excluded", message: string}>}
 */
export function releaseGaps(packages, workflow) {
  const gaps = [];

  for (const pkg of packages) {
    const { dir, name, version, registryVersion } = pkg;

    // A recorded exclusion is not a gap. It is still listed, so the report says
    // what is off npm on purpose as well as what is off npm by accident.
    if (DELIBERATELY_UNPUBLISHED.has(name)) {
      gaps.push({
        name,
        dir,
        version,
        registryVersion,
        kind: "excluded",
        message: `${name}@${version}: not on npm on purpose, ${DELIBERATELY_UNPUBLISHED.get(name)}.`,
      });
      continue;
    }

    if (!mentionsDir(workflow, dir)) {
      gaps.push({
        name,
        dir,
        version,
        registryVersion,
        kind: "not-in-workflow",
        message:
          `${name}@${version}: ${dir} is not in release.yml's package lists, so it gets no publish dry run ` +
          "and no GitHub Release. Add it to both loops, or record why it is excluded.",
      });
    }

    if (registryVersion === version) continue;

    if (registryVersion === null) {
      gaps.push({
        name,
        dir,
        version,
        registryVersion,
        kind: "unpublished",
        message:
          `${name}@${version}: never published to npm, so it cannot be staged (Trusted Publishing attaches to an ` +
          "existing package). The Owner bootstraps it once by hand: cd " +
          `${dir} && npm publish --access public. See RELEASING.md, One-time setup step 2.`,
      });
      continue;
    }

    // Anything else that is ahead of npm is simply what this release stages,
    // umbrellas included. Not a gap.
  }

  return gaps;
}

/**
 * The findings as GitHub Actions annotations, one `::warning::` per real gap. A
 * recorded exclusion prints as a plain notice, so it does not cry wolf.
 */
export function gapAnnotations(gaps) {
  return gaps.map((g) =>
    g.kind === "excluded"
      ? `::notice title=Release exclusion::${g.message}`
      : `::warning title=Release gap (${g.kind})::${g.message}`,
  );
}
