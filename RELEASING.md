# Releasing

GeoAlgeria publishes twenty-eight packages to npm, **`geoalgeria`** (the dataset, kept
unscoped as the flagship) plus **`@geoalgeria/poste`**, **`@geoalgeria/emploi`**,
**`@geoalgeria/mobilis`**, **`@geoalgeria/telecom`**, **`@geoalgeria/aviation`**,
**`@geoalgeria/banques`**, **`@geoalgeria/livraison`**, **`@geoalgeria/jeunesse`**,
**`@geoalgeria/sports`**, **`@geoalgeria/enseignement-superieur`**,
**`@geoalgeria/tourisme`**, **`@geoalgeria/formation-professionnelle`**,
**`@geoalgeria/djezzy`**, **`@geoalgeria/mosquees`**, **`@geoalgeria/sante`**,
**`@geoalgeria/culture`**, **`@geoalgeria/agriculture`**, **`@geoalgeria/ecoles`**,
**`@geoalgeria/gares-routieres`**, **`@geoalgeria/ferroviaire`**, **`@geoalgeria/buses`**,
**`@geoalgeria/transport`**, **`@geoalgeria/industrie-pharmaceutique`**,
**`@geoalgeria/pharmacies`**, **`@geoalgeria/ooredoo`**,
**`@geoalgeria/protection-civile`** and **`@geoalgeria/pharma`**
(under the `@geoalgeria` org), using
[Changesets](https://github.com/changesets/changesets) with a **"Version
Packages" PR** and **staged Trusted Publishing** (the same flow as the GPC
monorepo). Of these, `release.yml`'s automated staging covers **26**: the flagship
`geoalgeria`, `@geoalgeria/telecom` and the 24 sector packages; the two umbrellas
**`@geoalgeria/transport`** and **`@geoalgeria/pharma`** carry `workspace:*` deps and are
published **manually** with pnpm (see setup, step 2). `@geoalgeria/schema` is the v2 data
contract every other package's generator depends on, a dev dependency, not a dataset, and
is **not** published to npm at all (it is absent from the workflow's package list). The web
app lives in the separate **`geoalgeria.com`** repo and is not part of this one.

Since the v2 correctness pass, every package's npm tarball ships the data as
**JSON, CSV and GeoJSON** (its `files[]` globs `data/**/*.csv` and
`data/**/*.geojson`, not only `*.json`). The one format still kept out of the
tarballs is **SQL**, which exists only for the flagship `geoalgeria` dataset.
Each minor/major release also cuts a **GitHub Release** with a zipped data
bundle: it remains the download channel for people who do not use npm (and the
home of the flagship's SQL dump), not because CSV/GeoJSON are absent from the
tarballs.

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

- **Docs parity:** the root READMEs (EN/FR/AR) and any affected package READMEs reflect every contract, artifact, licence, or count change shipping in this release, sweep before tagging, not after.

On push to `main`, the **Release** workflow runs `changesets/action`. If
unconsumed changesets exist, it opens (or updates) a **`chore: version
packages`** PR. Review the version bumps and CHANGELOG entries there.

### 3–4. Merge → stage + GitHub Releases

Merging the Version PR lands the bumped versions on `main`. The Release workflow
then:

- **stages** each package whose version is new (`npm stage publish`), skipping
  anything already published *or already staged*, re-runs during the approval
  window are safe; and
- cuts a **GitHub Release** `name@version` for each **minor/major** version, with
  the data bundle and notes from that version's `CHANGELOG.md` section. **Patches
  are skipped**, the npm version and the repo's committed data already cover
  docs/corrections, so they stay out of the Releases feed (delete any stray ones
  by hand). The npm publish itself still happens for every version.

The new GitHub Release fires the **Announce** workflow (see below).

### 5. Approve the staged packages

Staging does **not** publish, approve to go live:

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
*after* approval, purging while npm still serves the old version is pointless.)

## Project (umbrella) versions

The per-package versions above cover npm. **GeoAlgeria as a whole** also has its
own SemVer, `vX.Y.Z`, tracked in the root [`CHANGELOG.md`](CHANGELOG.md) and root
`package.json`, and marked with a **git tag**. It is intentionally **not** a GitHub
Release: the Releases feed is per-package, and an umbrella release there collides
with and clutters the package releases (a project `1.0.0` sitting next to a package
`1.0.0`). The project version lives in the **tag + root CHANGELOG** instead. It's
**manual** and **occasional**: bump at milestones (a new package, a major refresh,
a reform), independent of the npm package versions.

To cut one:

```bash
# 1. bump root package.json "version" + add a CHANGELOG.md section (counts across all packages)
# 2. tag it
git tag v1.1.0 && git push origin v1.1.0
```

Bumps: **major** = breaking project change (package removed/renamed, schema break)
· **minor** = new package or substantial data expansion · **patch** = corrections.

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
  Release for you to copy-paste, they are **never** auto-posted to X/LinkedIn.

Run it manually for any tag from the Actions tab (workflow_dispatch), or locally:

```bash
GEOALGERIA_TAG="geoalgeria@1.2.0" pnpm announce   # writes .release-notes/
```

> Timing: the GitHub Release (and thus the announcement) is cut at **stage**
> time, before npm goes live. Approve the staged packages promptly so the
> announcement and the live npm version line up.

## One-time setup (maintainer)

These are prerequisites the workflow can't do for you:

1. **`@geoalgeria` org**: created on npmjs.com (owner: `gorthidz`); reserves the
   `@geoalgeria/*` namespace. The flagship `geoalgeria` stays unscoped.
2. **Bootstrap each package once.** Trusted Publishing's OIDC grant attaches to
   an *existing* package, so a brand-new name must be claimed by hand first:
   ```bash
   cd packages/<new> && npm publish --access public   # one-time
   ```
   For a package that will flow through CI, follow the bootstrap with its
   Trusted Publisher entry (step 3) **before** the first staged release.
   > ⚠️ **Umbrella / any package with `workspace:*` deps** (e.g.
   > `@geoalgeria/transport`, `@geoalgeria/pharma`) is **not** in the workflow, it is
   > published with **pnpm**, not npm, both to bootstrap and for every bump, because
   > npm ships the literal `workspace:^` spec and breaks installs (pnpm rewrites it to
   > real semver). Publish it with
   > `cd packages/transport && pnpm publish --access public --no-git-checks`
   > (verify via `pnpm pack` that deps resolve to `^x.y.z`). These umbrellas need no
   > Trusted Publisher entry.
3. **Trusted Publisher per package**: for each of the **26** packages the workflow
   stages (`geoalgeria`, `@geoalgeria/poste`, `@geoalgeria/emploi`, `@geoalgeria/mobilis`,
   `@geoalgeria/telecom`, `@geoalgeria/aviation`, `@geoalgeria/banques`,
   `@geoalgeria/livraison`, `@geoalgeria/jeunesse`, `@geoalgeria/sports`,
   `@geoalgeria/enseignement-superieur`, `@geoalgeria/tourisme`,
   `@geoalgeria/formation-professionnelle`, `@geoalgeria/djezzy`, `@geoalgeria/mosquees`,
   `@geoalgeria/sante`, `@geoalgeria/culture`, `@geoalgeria/agriculture`,
   `@geoalgeria/ecoles`, `@geoalgeria/gares-routieres`, `@geoalgeria/ferroviaire`,
   `@geoalgeria/buses`, `@geoalgeria/industrie-pharmaceutique`, `@geoalgeria/pharmacies`,
   `@geoalgeria/ooredoo`, `@geoalgeria/protection-civile`). The umbrellas (`transport`,
   `pharma`) and the unpublished
   contract package (`@geoalgeria/schema`) get **no** entry. Manage entries with the npm
   CLI (npm ≥ 12) rather than the web UI:
   ```bash
   npm trust github <pkg> --file release.yml --repo yasserstudio/geoalgeria \
     --allow-publish --allow-stage-publish -y
   ```
   Every `npm trust` op is 2FA-gated with browser auth; one auth session covers a batch
   of consecutive ops, so do them back-to-back. No `NPM_TOKEN`, auth is the workflow's
   OIDC `id-token`.
   > ⚠️ **The entry MUST include `--allow-stage-publish`.** Without it the workflow's
   > `npm stage publish` fails with a **generic E401** that reads like broken auth, not a
   > missing permission. Entries created through the older npmjs.com web UI lack stage-publish
   > and hit exactly this, re-create them via the CLI.
   >
   > **Entries can't be edited in place.** Re-running `npm trust github` on an existing
   > entry returns **E409** (`already exists. Please delete and re-create`). To fix one,
   > revoke then re-create:
   > ```bash
   > npm trust list <pkg> --json | jq '[.. | objects | select(has("id")) | .id] | unique'
   > npm trust revoke <pkg> --id=<id>
   > npm trust github <pkg> --file release.yml --repo yasserstudio/geoalgeria \
   >   --allow-publish --allow-stage-publish -y
   > ```
   > (the ids are nested in the `list` output, the `jq` filter pulls them out.)
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
