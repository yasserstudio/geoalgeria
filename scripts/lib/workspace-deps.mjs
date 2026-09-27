/**
 * The `workspace:` protocol is a pnpm-only spec. npm does not resolve it on
 * publish: it uploads the manifest verbatim, so whatever `workspace:` range a
 * package carries ends up in the published tarball, where `workspace:` means
 * nothing and a consumer's resolver answers EUNSUPPORTEDPROTOCOL.
 *
 * `scripts/stage-publish.js` guarded against this by skipping any package with a
 * `workspace:` spec in `dependencies`, which is the umbrella shape. It read that
 * one field, so three packages went live with the spec in `devDependencies`
 * instead: `@geoalgeria/telecom` 3.0.0, `@geoalgeria/pharmacies` 2.2.1 and
 * `@geoalgeria/protection-civile` 1.0.3 all publish
 * `"@geoalgeria/schema": "workspace:^"`.
 *
 * So the publish path resolves the protocol itself, across every dependency
 * field, exactly the way pnpm does (RELEASING.md's "pnpm rewrites it to real
 * semver"), and refuses to publish anything it cannot resolve. No dependencies
 * and no side effects, so it is safe to import from a test.
 */

/** Every field npm treats as a dependency map. All four can carry the protocol. */
export const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

const PROTOCOL = "workspace:";

/**
 * Every `workspace:` spec in a manifest, in field order.
 *
 * @param {Record<string, any>} manifest a parsed package.json
 * @returns {Array<{field: string, name: string, spec: string}>}
 */
export function findWorkspaceSpecs(manifest) {
  const found = [];
  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, spec] of Object.entries(manifest?.[field] ?? {})) {
      if (String(spec).startsWith(PROTOCOL)) found.push({ field, name, spec: String(spec) });
    }
  }
  return found;
}

/**
 * The real range a `workspace:` spec stands for, following pnpm:
 * `workspace:*` pins the exact version, `workspace:^` and `workspace:~` take
 * that prefix, and `workspace:<range>` keeps the range it already states.
 */
function resolveSpec(spec, version) {
  const alias = spec.slice(PROTOCOL.length);
  if (alias === "*") return version;
  if (alias === "^" || alias === "~") return `${alias}${version}`;
  return alias;
}

/** Whether an alias needs the linked package's own version to resolve. */
const needsVersion = (spec) => ["*", "^", "~"].includes(spec.slice(PROTOCOL.length));

/**
 * A copy of the manifest with every `workspace:` spec resolved to real semver.
 *
 * Fails closed: if any spec cannot be resolved, nothing is rewritten and the
 * manifest comes back untouched, so a caller cannot publish a half-rewritten
 * one. Check `unresolved` before using `manifest`.
 *
 * @param {Record<string, any>} manifest a parsed package.json, never mutated
 * @param {Map<string, string|undefined>} versions workspace package name to its version
 * @returns {{manifest: Record<string, any>, rewritten: Array<{field: string, name: string, from: string, to: string}>, unresolved: Array<{field: string, name: string, spec: string, reason: string}>, changed: boolean}}
 */
export function rewriteWorkspaceSpecs(manifest, versions) {
  const found = findWorkspaceSpecs(manifest);
  if (found.length === 0) return { manifest, rewritten: [], unresolved: [], changed: false };

  const rewritten = [];
  const unresolved = [];

  for (const { field, name, spec } of found) {
    if (!needsVersion(spec)) {
      rewritten.push({ field, name, from: spec, to: resolveSpec(spec, undefined) });
      continue;
    }
    if (!versions.has(name)) {
      unresolved.push({ field, name, spec, reason: `no workspace package named ${name}` });
      continue;
    }
    const version = versions.get(name);
    if (!version) {
      unresolved.push({ field, name, spec, reason: `workspace package ${name} carries no version` });
      continue;
    }
    rewritten.push({ field, name, from: spec, to: resolveSpec(spec, version) });
  }

  if (unresolved.length > 0) return { manifest, rewritten: [], unresolved, changed: false };

  const next = { ...manifest };
  for (const { field, name, to } of rewritten) {
    next[field] = { ...next[field], [name]: to };
  }
  return { manifest: next, rewritten, unresolved: [], changed: true };
}
