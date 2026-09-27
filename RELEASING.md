# Releasing

GeoAlgeria publishes thirty packages to npm, **`geoalgeria`** (the dataset, kept
unscoped as the flagship) plus **`@geoalgeria/poste`**, **`@geoalgeria/emploi`**,
**`@geoalgeria/mobilis`**, **`@geoalgeria/telecom`**, **`@geoalgeria/aviation`**,
**`@geoalgeria/banques`**, **`@geoalgeria/livraison`**, **`@geoalgeria/jeunesse`**,
**`@geoalgeria/sports`**, **`@geoalgeria/enseignement-superieur`**,
**`@geoalgeria/tourisme`**, **`@geoalgeria/formation-professionnelle`**,
**`@geoalgeria/djezzy`**, **`@geoalgeria/mosquees`**, **`@geoalgeria/sante`**, **`@geoalgeria/cliniques`**,
**`@geoalgeria/culture`**, **`@geoalgeria/agriculture`**, **`@geoalgeria/ecoles`**,
**`@geoalgeria/gares-routieres`**, **`@geoalgeria/ferroviaire`**, **`@geoalgeria/buses`**,
**`@geoalgeria/transport`**, **`@geoalgeria/industrie-pharmaceutique`**,
**`@geoalgeria/pharmacies`**, **`@geoalgeria/ooredoo`**,
**`@geoalgeria/protection-civile`**, **`@geoalgeria/pharma`** and
**`@geoalgeria/normalize`**
(under the `@geoalgeria` org), using
[Changesets](https://github.com/changesets/changesets) with a **"Version
Packages" PR** and **staged Trusted Publishing** (the same flow as the GPC
monorepo). Of these, `release.yml`'s automated staging lists **28**: the flagship
`geoalgeria`, `@geoalgeria/telecom`, the 25 sector packages and the code-only
`@geoalgeria/normalize` (search keys, no data bundle). **27 of those 28 actually
stage today:** `@geoalgeria/normalize` has never been published, and Trusted
Publishing cannot claim a name npm has never seen, so it is skipped until the
Owner bootstraps it by hand (see below). The two umbrellas
**`@geoalgeria/transport`** and **`@geoalgeria/pharma`** carry `workspace:*` deps, are
absent from `release.yml` entirely, and are published **manually** with pnpm on
every bump (see below). `@geoalgeria/schema` is the v2 data
contract every other package's generator depends on, a dev dependency, not a dataset, and
is **not** published to npm at all (it is absent from the workflow's package list). The web
app lives in the separate **`geoalgeria.com`** repo and is not part of this one.

Anything that falls out of the automated path is reported on every release run by
the [release gap check](#the-release-gap-check).

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

### Rebuild order between coupled packages

One package reads another's shipped data at generate time:
`packages/cliniques/scripts/fetch.mjs` reads `packages/sante/data/sante.json` to
exclude the OSM elements sante's hospital-tier records already publish. So
regenerating `sante` can change `cliniques` output with nothing in
`packages/cliniques` having changed. When a release touches both, rebuild
`sante` first, then `cliniques`, and review the two diffs together.

`pnpm --filter <pkg> fetch` runs pnpm's own built-in `fetch` command, not the
package's generator, and tries to purge `node_modules` in the process. Run the
generator directly instead: `node packages/<pkg>/scripts/fetch.mjs` (offline,
deterministic) or `pnpm --filter <pkg> run fetch`.

### 1–2. Add a changeset, let the bot open the PR

```bash
pnpm changeset   # pick package(s), bump type, one-line note → commit it
git push         # straight to main, or via a PR
```

Bump rules (data semver): **major** = breaking schema change · **minor** = new
data / format · **patch** = corrections to existing records.

- **Widening a published field to nullable is a minor, with a migration note.**
  It reads like a break, because a consumer doing `r.website.trim()` throws once
  a record ships `null`. But these are data packages: new records routinely
  arrive without a field the existing ones all had, and majoring for each one
  would major constantly. So it stays a minor, and the changeset must open with
  a **Migration** paragraph naming the field, the count that changed, and the
  guarded form to use. Precedent: `@geoalgeria/enseignement-superieur` 1.1.0
  (`name` nullable), `@geoalgeria/aviation` 2.1.0 (`address`/`website`).

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

#### The `workspace:` protocol on the staged path

npm uploads a manifest verbatim, so a `workspace:` spec that reaches it ships as
the literal string and a consumer's resolver answers `EUNSUPPORTEDPROTOCOL`.
`scripts/stage-publish.js` therefore resolves every `workspace:` spec to real
semver, the way pnpm does, across **all four** dependency fields, and refuses to
stage a package whose spec it cannot resolve. The rewrite lives only for the
upload; the file is put back afterwards.

> **Leak, found 2026-09-27.** The old check read `dependencies` only, so
> `@geoalgeria/telecom` 3.0.0, `@geoalgeria/pharmacies` 2.2.1 and
> `@geoalgeria/protection-civile` 1.0.3 are all live on npm carrying
> `"@geoalgeria/schema": "workspace:^"` in **devDependencies**. A published
> version's manifest cannot be repaired in place: each is fixed only by its next
> version. `test/workspace-deps.test.mjs` pins the resolver and walks the real
> workspace, so no publishable package can carry an unresolvable spec again.

### The release-timing guard

A Release is only cut for a version `main` actually carries. Each iteration of
the releases loop runs `scripts/release-guard.mjs <pkg> <version> <tag>
$GITHUB_SHA`, which reads `package.json` and `CHANGELOG.md` **as committed at
the released commit** and declines (`release guard skip: ...`, exit 3) unless
both the version is there and that version has a `CHANGELOG.md` section. It
fails closed: a missing file, unparseable JSON or an empty section all decline.

This exists because `changesets/action` builds the Version PR **in the runner's
own workspace**: it runs `git checkout -b changeset-release/main`, then
`changeset version`, commits, pushes, and never switches back. Every step after
it therefore sees a working tree whose versions and CHANGELOGs are already
bumped, on a push that released nothing. The loop read those files and cut the
tag at the pre-bump commit with the bot's raw `### Minor Changes` notes, and the
tag-existence guard then blocked the real Release for good, so the tag had to be
deleted by hand.

> **Incident, 2026-09-26.** `geoalgeria@2.1.0` was tagged at 13:03 UTC on the
> push that merged feature PR #222, three minutes before Version PR #223 merged
> at 13:06 (run 36243800992: `git checkout -b changeset-release/main` 13:02:48,
> `creating pull request` 13:03:07, `releasing: geoalgeria@2.1.0` 13:03:09). The
> Owner cleared it with `gh release delete '<tag>' --cleanup-tag`. The same run
> shape cut seven tags early on 2026-09-13 (run 34766226083), so this fired on
> every release cycle, not twice. The manual delete is no longer the fix; the
> guard is.

A changeset's **first line must still be a headline**: `scripts/release-notes.mjs`
falls back to it (clamped) whenever a CHANGELOG section has no headline line.

### The release gap check

Three ways a publishable package's version never reaches npm, all of them silent
until 2026-09-27:

| Gap | Live case |
| --- | --- |
| an umbrella the staged path skips | npm served `@geoalgeria/pharma` **2.0.0** while the repo said **2.0.1** |
| a name npm has never seen, so it cannot be staged | `@geoalgeria/normalize` **1.0.0**, advertised with npm badges and listed here among the staged 28 |
| a package dir absent from `release.yml`'s two loops, so no dry run and no GitHub Release | `packages/transport`, `packages/pharma` |

`scripts/release-gap.mjs` reports all three as GitHub Actions `::warning::`
annotations on every release run, and the **Release gap check** step in
`release.yml` runs it. It reads versions as committed at `$GITHUB_SHA`, not the
runner's working tree (which the changesets step leaves bumped), and never fails
the run. Run it locally the same way:

```bash
node scripts/release-gap.mjs          # against HEAD
```

The only recorded exclusion is `@geoalgeria/schema`, which prints as a `::notice::`
instead; it is named in `scripts/lib/release-gap.mjs`, so a new package cannot
join that list by accident. `test/release-gap.test.mjs` pins the report and fails
if a workspace package other than the two umbrellas and `schema` drops out of
`release.yml`.

### Publishing the `transport` / `pharma` umbrellas (manual, every bump)

Neither umbrella is in `release.yml` or in `stage-publish.js`'s staged set, and
neither has a Trusted Publisher entry. **Every** bump of either is a manual pnpm
publish by the Owner, not just the first:

```bash
# 1. Confirm what npm actually serves against what the repo carries.
npm view @geoalgeria/transport version
npm view @geoalgeria/pharma version
node -p "require('./packages/transport/package.json').version"
node -p "require('./packages/pharma/package.json').version"

# 2. Verify the tarball resolves the workspace: ranges to real semver BEFORE
#    publishing. pnpm rewrites them; npm would ship the literal spec.
cd packages/transport
pnpm pack
tar -xzOf geoalgeria-transport-*.tgz package/package.json | node -p \
  "JSON.parse(require('fs').readFileSync(0,'utf8')).dependencies"
#    Expect ^x.y.z for every @geoalgeria/* dep. A "workspace:^" here means STOP.
rm geoalgeria-transport-*.tgz

# 3. Publish (interactive OTP; --no-git-checks because the tag is per-package).
pnpm publish --access public --no-git-checks
```

Same three steps in `packages/pharma`. Then check `npm view <pkg> version` again,
and `pnpm purge-cdn`.

> `@geoalgeria/pharma` 2.0.1 has been sitting unpublished since it was bumped:
> npm still serves 2.0.0. The gap check now names it on every release run.

### Bootstrapping `@geoalgeria/normalize` (one time, Owner only)

`@geoalgeria/normalize` has never been on npm. Trusted Publishing's OIDC grant
attaches to an **existing** package, so the staged path can never claim the name:
it needs exactly one manual publish, by the Owner, from a terminal logged in to
npm.

```bash
npm whoami                                  # else: npm login --auth-type=web
cd packages/normalize
npm publish --access public                 # the one-time bootstrap
npm view @geoalgeria/normalize version      # expect 1.0.0
```

Then give it a Trusted Publisher entry (One-time setup, step 3) **before** the
next release, and restore the npm badges and the plain `npm install` line in
`packages/normalize/README.md`, `README.fr.md` and `README.ar.md`, plus its row in
the three root READMEs: all six currently say "not yet published" on purpose, and
they stay wrong in the other direction the moment it is live.

### One-off: publishing an umbrella away from a terminal

The `transport`/`pharma` umbrellas (see One-time setup, step 2) publish with
pnpm, which needs interactive OTP entry. If you're away from a terminal:

```bash
pnpm pack   # in packages/<umbrella>; verify the tarball's deps resolve to real semver
script -q -F publish.log npm publish <tgz>.tgz --access public --auth-type=web
```

Running `npm publish --auth-type=web` inside a pseudo-terminal (`script`) makes
npm print the **unmasked** web-auth link, which you can open on a phone. A
non-interactive `npm publish` masks the link as `***`, and `pnpm publish` itself
refuses outright with `ERR_PNPM_OTP_NON_INTERACTIVE`.

On a machine that has never logged in, the publish fails with
`E404 Not Found - PUT https://registry.npmjs.org/@geoalgeria%2f<pkg>`: npm
answers 404 rather than 401 for an unauthenticated write to a scope. Run
`npm login --auth-type=web` first (check with `npm whoami`), then publish.

### 5. Approve the staged packages

Staging does **not** publish, approve to go live:

```bash
npm stage list
npm stage approve <stage-id>     # requires 2FA
```

…or approve on npmjs.com → Staged packages.

Staged packages can sit unapproved for days if the maintainer isn't at a
terminal (the August 2026 refresh was staged 31 Aug and only approved 4 Sept).
After merging a Version PR, check `npm view <pkg> version` for **every**
package listed in that PR's body, not just the one you set out to release,
before assuming the batch is live.

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
human-readable headline** (its **first sentence** becomes the Release title, the
announcement title and the social hook, so make that sentence stand alone). Both
titles come from the same clamp in
[`scripts/lib/release-copy.mjs`](scripts/lib/release-copy.mjs): the first
sentence of the lead entry, cut at a word boundary past 120 characters, well
under GitHub's hard limit of 256. A changeset brief continued in indented
paragraphs is fine, each paragraph becomes its own body entry.
The canonical structure + a worked example is in
[`.github/RELEASE_TEMPLATE.md`](.github/RELEASE_TEMPLATE.md); the Discussion/social
copy built from it lives in `.agents/release-notes-templates.md` (local, gitignored).

Changesets own a package's `CHANGELOG.md`; never hand-write an "## Unreleased"
section into one. It goes stale under the next generated section instead of
being replaced by it.

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

**Rehearse with a dry run.** The dispatch has a `dry_run` checkbox: it builds the
kit, prints the exact Discussion title and body into the job summary, and posts
nothing. Locally the same switch is an env flag:

```bash
GEOALGERIA_DRY_RUN=1 GEOALGERIA_TAG="geoalgeria@2.1.0" pnpm announce
```

Use it on an already-released tag before trusting a new changeset shape, and read
the headline the run prints with its character count.

> ⚠️ **A run-on headline fails the post, it is not trimmed.** `geoalgeria` 2.1.0
> (run 36244148854, 2026-09-26): the announcer merged every indented paragraph of
> the changeset brief into the lead bullet, so `createDiscussion` got a
> 2,705-character title and answered `Title is too long (maximum is 256
> characters)`; the step exited 1, nothing was posted, and Discussion #225 was
> written by hand. The headline is clamped since, and
> `test/announce-copy.test.mjs` pins it on that same changeset.

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
   > **Still owed:** `@geoalgeria/normalize` 1.0.0 has never had this bootstrap, so
   > it cannot stage. Exact steps: [Bootstrapping
   > `@geoalgeria/normalize`](#bootstrapping-geoalgerianormalize-one-time-owner-only).
   > ⚠️ **Umbrella / any package with `workspace:*` deps** (e.g.
   > `@geoalgeria/transport`, `@geoalgeria/pharma`) is **not** in the workflow, it is
   > published with **pnpm**, not npm, both to bootstrap and for every bump, because
   > npm ships the literal `workspace:^` spec and breaks installs (pnpm rewrites it to
   > real semver). Exact steps, including the `pnpm pack` check:
   > [Publishing the `transport` / `pharma`
   > umbrellas](#publishing-the-transport--pharma-umbrellas-manual-every-bump).
   > These umbrellas need no Trusted Publisher entry.
3. **Trusted Publisher per package**: for each of the **28** packages the workflow
   stages (`geoalgeria`, `@geoalgeria/poste`, `@geoalgeria/emploi`, `@geoalgeria/mobilis`,
   `@geoalgeria/telecom`, `@geoalgeria/aviation`, `@geoalgeria/banques`,
   `@geoalgeria/livraison`, `@geoalgeria/jeunesse`, `@geoalgeria/sports`,
   `@geoalgeria/enseignement-superieur`, `@geoalgeria/tourisme`,
   `@geoalgeria/formation-professionnelle`, `@geoalgeria/djezzy`, `@geoalgeria/mosquees`,
   `@geoalgeria/sante`, `@geoalgeria/cliniques`, `@geoalgeria/culture`,
   `@geoalgeria/agriculture`,
   `@geoalgeria/ecoles`, `@geoalgeria/gares-routieres`, `@geoalgeria/ferroviaire`,
   `@geoalgeria/buses`, `@geoalgeria/industrie-pharmaceutique`, `@geoalgeria/pharmacies`,
   `@geoalgeria/ooredoo`, `@geoalgeria/protection-civile`, `@geoalgeria/normalize`).
   `@geoalgeria/normalize` needs its bootstrap publish (step 2) **before** the entry
   can be created, because the grant attaches to an existing package. The
   umbrellas (`transport`,
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
