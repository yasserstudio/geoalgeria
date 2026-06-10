# Releasing

GeoAlgeria publishes three packages to npm — **`geoalgeria`** (the dataset, kept
unscoped as the flagship), **`@geoalgeria/poste`** and **`@geoalgeria/emploi`**
(under the `@geoalgeria` org) — using
[Changesets](https://github.com/changesets/changesets) with **staged Trusted
Publishing** (the same flow as the GPC monorepo). The web app lives in the
separate **`geoalgeria.com`** repo and is not part of this one.

The raw `CSV`/`GeoJSON`/`SQL` formats are **not** in the npm tarball (only
`*.json` is), so each release also cuts a **GitHub Release** with a zipped data
bundle — that is the only download channel for those formats.

## Releasing (main-direct, no PR)

This repo commits straight to `main` — we do **not** use the Changesets
"Version Packages" PR. To cut a release as a maintainer:

```bash
pnpm changeset          # 1. describe the change: pick package(s) + bump + note
pnpm version-packages   # 2. apply it: bumps versions + CHANGELOGs, consumes the changeset
git commit -am "chore: version packages — <pkg>@<ver>"   # 3. commit the BUMP
git push                # 4. push to main
```

Bump rules (data semver): **major** = breaking schema change · **minor** = new
data / format · **patch** = corrections to existing records.

On push, the **Release** workflow:
- **stages** any package whose version is new (`npm stage publish`), skipping
  anything already published *or already staged* — so re-pushing during the
  approval window is safe; and
- cuts a **GitHub Release** `name@version` per package with the data bundle.

Then **approve the staged packages** to make them live on npm:

```bash
npm stage list
npm stage approve <stage-id>     # requires 2FA
```
…or approve on npmjs.com → Staged packages.

> **Important:** always run `version-packages` locally and commit the *bump* —
> never push a bare changeset. Pushing an unversioned changeset makes the
> workflow try to open a "Version Packages" PR, which fails (Actions can't
> create PRs here) and isn't the flow we use.

## One-time setup (maintainer)

These are prerequisites the workflow can't do for you:

1. **`@geoalgeria` org** — already created on npmjs.com (owner: `gorthidz`).
   It reserves the `@geoalgeria/*` namespace where `@geoalgeria/poste` lives;
   the flagship `geoalgeria` stays unscoped.
2. **`geoalgeria` and `@geoalgeria/poste` are already published**
   (`@1.0.0`), so they exist and Trusted Publishing can be configured directly.
   **`@geoalgeria/emploi` is new** and not yet on npm — claim the name once, by
   hand, so Trusted Publishing has something to attach to:
   ```bash
   cd packages/emploi && npm publish --access public   # one-time, 1.0.0
   ```
   After that, future bumps go through the staged workflow like the others.
3. **Trusted Publisher per package** — on npmjs.com, for each of `geoalgeria`,
   `@geoalgeria/poste`, and `@geoalgeria/emploi`: *Settings → Trusted Publisher →
   GitHub Actions*, repo **`yasserstudio/geoalgeria`**, workflow `release.yml`.
   No `NPM_TOKEN` is used — auth is the workflow's OIDC `id-token`.
4. **Enable 2FA** on the npm account (required to approve staged packages).
5. **Repo → Settings → Actions → General → Workflow permissions**: allow
   GitHub Actions to *create and approve pull requests* (for the version PR)
   and grant *read and write* permissions.

## Manual fallback

If you need to bypass staging and publish directly (e.g. a hotfix):

```bash
pnpm release        # pnpm validate && changeset publish
```
