/**
 * Which packages `scripts/stage-publish.js` stages, and in what order.
 *
 * Every non-private package under `packages/` is staged, the umbrellas
 * (`@geoalgeria/transport`, `@geoalgeria/pharma`) included. They used to be
 * skipped because they carry `workspace:` RUNTIME deps and npm uploads a
 * manifest verbatim; since the 2026-09-27 fix `scripts/lib/workspace-deps.mjs`
 * resolves every `workspace:` spec to real semver across all four dependency
 * fields, so that reason is gone and they publish like every other package.
 *
 * Order matters for the umbrellas alone: `@geoalgeria/transport` stages with
 * `"@geoalgeria/buses": "^2.2.0"`, and that range has to be a version npm is
 * already serving, or about to serve from the same run. Dir-name order does not
 * give that (`packages/pharma` sorts before both of its members), so the
 * umbrellas are moved to the end and stage after the packages they re-export.
 *
 * Pure, no I/O, so the workflow script and a test share it.
 */

/**
 * Whether a manifest depends on a workspace sibling at RUNTIME, which is the
 * umbrella shape. `devDependencies` does not count: half the packages carry
 * `"@geoalgeria/schema": "workspace:^"` there and none of them is an umbrella.
 *
 * @param {Record<string, any>} manifest a parsed package.json
 */
export function isUmbrella(manifest) {
  return Object.values(manifest?.dependencies ?? {}).some((spec) => String(spec).startsWith("workspace:"));
}

/**
 * The publishable packages in staging order: everything else first, in the order
 * given, then the umbrellas.
 *
 * Only `private` packages drop out. `@geoalgeria/schema` is not one of them: the
 * data contract is a normal manifest that npm has simply never seen, and
 * `stage-publish.js` skips an unpublished name later in the loop, because Trusted
 * Publishing cannot claim one. The set is derived from the workspace rather than
 * hand-written so a newly added package is never silently skipped.
 *
 * @param {Array<{dir: string, manifest: Record<string, any>}>} packages every package dir under packages/
 * @returns {string[]} the dirs to stage, in order
 */
export function stagedSet(packages) {
  const publishable = packages.filter(({ manifest }) => !manifest.private);
  return [
    ...publishable.filter(({ manifest }) => !isUmbrella(manifest)),
    ...publishable.filter(({ manifest }) => isUmbrella(manifest)),
  ].map(({ dir }) => dir);
}
