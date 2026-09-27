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

/** The three bare aliases that stand for the linked package's own version. */
const ALIASES = new Set(["*", "^", "~"]);

/**
 * One comparator inside a semver range: an optional operator, then a version
 * whose parts are numbers or an `x`/`X`/`*` wildcard, then an optional
 * prerelease and build. Deliberately narrow, because anything it rejects is
 * refused rather than published.
 */
const COMPARATOR = /^(?:[<>]=?|=|\^|~)?v?(?:\d+|[xX*])(?:\.(?:\d+|[xX*])){0,2}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Whether a string is a semver RANGE npm will understand: `||`-separated
 * comparator sets, each a space-separated run of comparators, with `-` allowed
 * for a hyphen range (`1.2.3 - 2.0.0`).
 */
function isSemverRange(range) {
  if (range.trim() === "") return false;
  return range.split("||").every((set) => {
    const parts = set.trim().split(/\s+/).filter(Boolean);
    return parts.length > 0 && parts.every((part) => part === "-" || COMPARATOR.test(part));
  });
}

/**
 * What a `workspace:` spec is, following pnpm:
 *  - `alias`: `workspace:*` pins the exact version, `workspace:^` and
 *    `workspace:~` take that prefix. All three need the linked package's version.
 *  - `range`: `workspace:<semver range>` keeps the range it already states, so
 *    only the protocol is stripped.
 *  - `unsupported`: everything else. pnpm also accepts the ALIAS form
 *    `workspace:<name>@<range>` (a dependency published under a different name),
 *    and a bare `workspace:` is simply malformed. Stripping the protocol off
 *    either one produced a manifest npm would accept and publish: `geoalgeria@*`,
 *    which no resolver can install, and `""`, which npm reads as `*` and so
 *    silently widens the dependency to any version. Neither is rewritable here,
 *    so both are reported as unresolved and the fail-closed guard refuses the
 *    package.
 */
function classifySpec(spec) {
  const alias = spec.slice(PROTOCOL.length);
  if (ALIASES.has(alias)) return { kind: "alias", alias };
  if (isSemverRange(alias)) return { kind: "range", range: alias };
  return { kind: "unsupported" };
}

/** The real range an alias spec stands for, given the linked package's version. */
function resolveAlias(alias, version) {
  return alias === "*" ? version : `${alias}${version}`;
}

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
    const classified = classifySpec(spec);
    if (classified.kind === "unsupported") {
      unresolved.push({
        field,
        name,
        spec,
        reason: `${JSON.stringify(spec)} is neither workspace:* / ^ / ~ nor workspace:<semver range>`,
      });
      continue;
    }
    if (classified.kind === "range") {
      rewritten.push({ field, name, from: spec, to: classified.range });
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
    rewritten.push({ field, name, from: spec, to: resolveAlias(classified.alias, version) });
  }

  if (unresolved.length > 0) return { manifest, rewritten: [], unresolved, changed: false };

  const next = { ...manifest };
  for (const { field, name, to } of rewritten) {
    next[field] = { ...next[field], [name]: to };
  }
  return { manifest: next, rewritten, unresolved: [], changed: true };
}
