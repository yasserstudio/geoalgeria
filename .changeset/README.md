# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).

Every PR that changes a **published** package (`geoalgeria`, `@geoalgeria/poste`)
must include a changeset describing the bump. The `web` app is private and
ignored — it never needs one.

## Add a changeset

```bash
pnpm changeset
```

Pick the affected package(s), the bump type, and write a one-line summary.
This creates a markdown file in `.changeset/` — commit it with your PR.

### Versioning rules for these data packages

- **major** — breaking schema change (renamed/removed fields)
- **minor** — new data added (new communes/ATMs, new export format)
- **patch** — corrections to existing records (typos, coordinates, postal codes)

## How releases happen

On merge to `main`, the Release workflow opens a **"chore: version packages"**
PR that bumps versions and updates each `CHANGELOG.md`. Merging *that* PR
stages the packages to npm for your 2FA approval and cuts a GitHub Release
per package with the data bundle attached. See `RELEASING.md` at the repo root.
