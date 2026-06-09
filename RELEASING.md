# Releasing

GeoAlgeria publishes two packages to npm — **`geoalgeria`** (the dataset, kept
unscoped as the flagship) and **`@geoalgeria/poste`** (under the `@geoalgeria`
org) — using [Changesets](https://github.com/changesets/changesets) with
**staged Trusted Publishing** (the same flow as the GPC monorepo). The web app
lives in the separate **`geoalgeria.com`** repo and is not part of this one.

The raw `CSV`/`GeoJSON`/`SQL` formats are **not** in the npm tarball (only
`*.json` is), so each release also cuts a **GitHub Release** with a zipped data
bundle — that is the only download channel for those formats.

## Day-to-day: add a changeset with every PR

Any PR touching `packages/dataset` or `packages/poste` must include a changeset:

```bash
pnpm changeset
```

Choose the package(s), the bump type, write a one-line note, commit the
generated `.changeset/*.md` file. Bump rules (data semver):

- **major** — breaking schema change (renamed/removed fields)
- **minor** — new data or new export format
- **patch** — corrections to existing records

## How a release flows

1. Merging changesets to `main` makes the **Release** workflow open a
   **`chore: version packages`** PR: it bumps versions and appends to each
   `CHANGELOG.md`.
2. Merging *that* PR triggers the workflow again, which:
   - **stages** the changed packages to npm (`npm stage publish`) — they do
     **not** go live until you approve them, and
   - cuts a **GitHub Release** `name@version` per changed package with the data
     bundle attached.
3. **Approve the staged packages** to make them live on npm:
   ```bash
   npm stage list
   npm stage approve <stage-id>     # requires 2FA
   ```
   …or approve on npmjs.com → Account → Staged packages.

## One-time setup (maintainer)

These are prerequisites the workflow can't do for you:

1. **`@geoalgeria` org** — already created on npmjs.com (owner: `gorthidz`).
   It reserves the `@geoalgeria/*` namespace where `@geoalgeria/poste` lives;
   the flagship `geoalgeria` stays unscoped.
2. **Both names are already published** (`geoalgeria@1.0.0`,
   `@geoalgeria/poste@1.0.0`), so the packages exist and Trusted Publishing can
   be configured directly — no manual claim publish is needed. The first
   automated release ships `geoalgeria@1.1.0` and `@geoalgeria/poste@1.0.1`.
3. **Trusted Publisher per package** — on npmjs.com, for each of `geoalgeria`
   and `@geoalgeria/poste`: *Settings → Trusted Publisher → GitHub Actions*,
   repo **`yasserstudio/geoalgeria`**, workflow `release.yml`. No `NPM_TOKEN`
   is used — auth is the workflow's OIDC `id-token`.
4. **Enable 2FA** on the npm account (required to approve staged packages).
5. **Repo → Settings → Actions → General → Workflow permissions**: allow
   GitHub Actions to *create and approve pull requests* (for the version PR)
   and grant *read and write* permissions.

## Manual fallback

If you need to bypass staging and publish directly (e.g. a hotfix):

```bash
pnpm release        # pnpm validate && changeset publish
```
