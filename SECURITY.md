# Security Policy

GeoAlgeria ships **data**, not a running service — the main risks are a
malformed package, a compromised release, or a dependency issue in the tooling.

## Reporting a Vulnerability

**Do not open a public issue for a security vulnerability.**

Use [GitHub's private vulnerability reporting](https://github.com/yasserstudio/geoalgeria/security/advisories/new).

Include:

- A description of the issue and its impact
- Steps to reproduce (or the affected file / version)
- A suggested fix, if you have one

### Response timeline

- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 1 week
- **Fix / disclosure:** within 30 days for serious issues

## Supported versions

Only the latest published version of each package (`geoalgeria` and every
`@geoalgeria/*` scoped package) is supported. Fixes ship forward in a
new release rather than as patches to old versions.

## Supply-chain practices

- **No `NPM_TOKEN`.** Publishing uses npm **Trusted Publishing** (OIDC) from the
  release workflow — there is no long-lived token to leak. See `RELEASING.md`.
- **Staged publishing.** Every release is staged on npm and requires a manual
  2FA approval before it goes live, so a rogue push can't auto-publish.
- **Provenance.** Published packages carry npm provenance attestations.
- **Dependency security** is handled by the org-wide Socket.dev GitHub App on
  every PR, plus `pnpm audit --prod` in CI.

## Data accuracy ≠ security

Wrong or outdated data (a misspelled commune, a stale postal code) is a **data
correction**, not a security issue — please
[open a normal issue](https://github.com/yasserstudio/geoalgeria/issues/new/choose)
for those.
