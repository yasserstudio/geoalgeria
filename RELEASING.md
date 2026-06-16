# Releasing

GeoAlgeria publishes four packages to npm — **`geoalgeria`** (the dataset, kept
unscoped as the flagship), **`@geoalgeria/poste`**, **`@geoalgeria/emploi`** and
**`@geoalgeria/mobilis`** (under the `@geoalgeria` org) — using
[Changesets](https://github.com/changesets/changesets) with a **"Version
Packages" PR** and **staged Trusted Publishing** (the same flow as the GPC
monorepo). The web app lives in the separate **`geoalgeria.com`** repo and is
not part of this one.

The raw `CSV`/`GeoJSON`/`SQL` formats are **not** in the npm tarball (only
`*.json` is), so each release also cuts a **GitHub Release** with a zipped data
bundle — that is the only download channel for those formats.

## The flow

You never bump versions by hand. The bot does it; you merge and approve.

```
1. Land changes on main WITH a changeset
        │   (pnpm changeset → pick package(s) + bump + note → commit → push/PR)
        ▼
2. Release workflow opens/updates a "chore: version packages" PR
        │   (bumps versions + regenerates CHANGELOGs)
        ▼
3. You MERGE that PR        ← this is the release trigger
        │
        ▼
4. Workflow stages the changed packages on npm (OIDC, no token)
   and cuts a GitHub Release per package with the data bundle
        │
        ▼
5. You APPROVE the staged packages (2FA) → live on npm
        │
        ▼
6. pnpm purge-cdn           ← refresh jsDelivr's @latest cache
```

### 1–2. Add a changeset, let the bot open the PR

```bash
pnpm changeset   # pick package(s), bump type, one-line note → commit it
git push         # straight to main, or via a PR
```

Bump rules (data semver): **major** = breaking schema change · **minor** = new
data / format · **patch** = corrections to existing records.

On push to `main`, the **Release** workflow runs `changesets/action`. If
unconsumed changesets exist, it opens (or updates) a **`chore: version
packages`** PR. Review the version bumps and CHANGELOG entries there.

### 3–4. Merge → stage + GitHub Releases

Merging the Version PR lands the bumped versions on `main`. The Release workflow
then:

- **stages** each package whose version is new (`npm stage publish`), skipping
  anything already published *or already staged* — re-runs during the approval
  window are safe; and
- cuts a **GitHub Release** `name@version` per package with the data bundle and
  notes pulled from that version's `CHANGELOG.md` section.

The new GitHub Release fires the **Announce** workflow (see below).

### 5. Approve the staged packages

Staging does **not** publish — approve to go live:

```bash
npm stage list
npm stage approve <stage-id>     # requires 2FA
```

…or approve on npmjs.com → Staged packages.

### 6. Purge the CDN

Once npm is live, refresh jsDelivr's cached `@latest` paths:

```bash
pnpm purge-cdn
```

(jsDelivr is auto-served from npm but edge-caches `@latest` up to ~24h. Purge
*after* approval — purging while npm still serves the old version is pointless.)

## Release notes

The GitHub Release notes and the auto-generated announcements both read from each
package's `CHANGELOG.md`. Write changeset notes so the **first bullet is a
human-readable headline** (it becomes the announcement title and social hook).
The canonical structure + a worked example is in
[`.github/RELEASE_TEMPLATE.md`](.github/RELEASE_TEMPLATE.md); the Discussion/social
copy built from it lives in `.agents/release-notes-templates.md` (local, gitignored).

## Announcements

When a release is cut, the **Announce** workflow (`.github/workflows/announce.yml`)
builds a Discussion + X/LinkedIn drafts from the CHANGELOG:

- **minor/major** releases auto-post a GitHub **Discussion** in *Announcements*;
- **social drafts** (`x-thread.md`, `linkedin.md`) are attached to the GitHub
  Release for you to copy-paste — they are **never** auto-posted to X/LinkedIn.

Run it manually for any tag from the Actions tab (workflow_dispatch), or locally:

```bash
GEOALGERIA_TAG="geoalgeria@1.2.0" pnpm announce   # writes .release-notes/
```

> Timing: the GitHub Release (and thus the announcement) is cut at **stage**
> time, before npm goes live. Approve the staged packages promptly so the
> announcement and the live npm version line up.

## One-time setup (maintainer)

These are prerequisites the workflow can't do for you:

1. **`@geoalgeria` org** — created on npmjs.com (owner: `gorthidz`); reserves the
   `@geoalgeria/*` namespace. The flagship `geoalgeria` stays unscoped.
2. **Bootstrap each package once.** Trusted Publishing's OIDC grant attaches to
   an *existing* package, so a brand-new name must be claimed by hand first:
   ```bash
   cd packages/<new> && npm publish --access public   # one-time
   ```
   After that, future bumps go through the staged workflow.
3. **Trusted Publisher per package** — on npmjs.com, for each of `geoalgeria`,
   `@geoalgeria/poste`, `@geoalgeria/emploi`, `@geoalgeria/mobilis`,
   `@geoalgeria/banques`: *Settings →
   Trusted Publisher → GitHub Actions*, repo **`yasserstudio/geoalgeria`**,
   workflow `release.yml`.
   No `NPM_TOKEN` — auth is the workflow's OIDC `id-token`.
4. **Enable 2FA** on the npm account (required to approve staged packages).
5. **Repo → Settings → Actions → General → Workflow permissions**: *Allow GitHub
   Actions to create and approve pull requests* (so the bot can open the Version
   PR). ✅ Already enabled for this repo.

## Manual fallback

To bypass staging and publish directly (e.g. a hotfix) after bumping locally:

```bash
pnpm version-packages   # apply pending changesets locally
pnpm release            # pnpm validate && changeset publish
```
