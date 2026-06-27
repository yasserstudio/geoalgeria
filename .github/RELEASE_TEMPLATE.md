# Release-notes template

How to write release notes so every GeoAlgeria release reads the same and the
automation works. **This is the source of truth** for release-note structure;
`.agents/release-notes-templates.md` covers the Discussion/social copy built from it.

## How a release note flows

```
changeset note  →  packages/<pkg>/CHANGELOG.md section  →  GitHub Release
                   (finalized in the "Version             (release.yml runs
                    Packages" PR to the format below)      scripts/release-notes.mjs:
                                                            title = the headline line,
                                                            body  = the ### sections)
                                                         →  Announce workflow
```

## The format (modeled on `@geoalgeria/jeunesse@1.0.0`)

A CHANGELOG section is a **descriptive title line**, then **keep-a-changelog
sections** — `### Added`, `### Improved`, `### Dropped` (use only the ones that
apply):

```
## 2.0.0

Algeria's youth establishments — 2,334 from the official Ministry of Youth and Sports GIS, typed and geocoded.

### Added

- name_ar (Arabic name, backfilled by type-checked geo-match, ~59% of records)
- Per-record address, capacity, year, operational status, PMR accessibility, built/land area

### Improved

- Rebuilt from the official Ministry of Youth and Sports GIS — 2,334 establishments (was 2,076)

### Dropped

- Arabic as the primary `name` (now French — read `name_ar`); old type codes and ids
```

`scripts/release-notes.mjs` turns that into a GitHub Release titled
*"Algeria's youth establishments — 2,334 from the official Ministry of Youth and Sports
GIS, typed and geocoded."* with the `### Added/Improved/Dropped` sections as the body.

### Title — the headline line

- Pattern: **`Algeria's <thing> — <N> from <Source>, <qualities>.`** A descriptive
  sentence; a trailing period is fine. The count and source belong in it.
  Examples: *"Algeria's higher-education network — 177 from the MESRS, now with
  private & other-ministry institutions."*, *"Branches for all 21 licensed banks"*.
- It is the **headline line of the section** (the first non-blank, non-heading,
  non-bullet line). The version and package name/scope are **never** in the title —
  both are already in the release tag chip + URL. The same title is the social hook.
- If a section has **no** headline line (e.g. a raw changesets `### Minor Changes`
  block), the extractor falls back to the first bullet — so always write the
  headline line, don't rely on the fallback.

### Body — Added / Improved / Dropped

- **`### Added`** — new data, fields, formats, helpers. **`### Improved`** — bigger
  counts, better sourcing, refinements to existing records. **`### Dropped`** —
  removed/renamed fields, breaking changes (say `BREAKING` and the migration).
- Bullets are **sober and factual** — no emoji, no hype, no CTAs. State the facts,
  lead with the number, **cite the source** (it's also the contribution rule). Let
  the numbers do the selling.
- A **new package**'s first release is a `minor` and is all `### Added` — give it a
  real note, never an empty auto-generated changelog.

## Writing it: changeset → Version PR

1. `pnpm changeset` — pick package(s) + bump, and write the note with the headline
   line first, then the `### Added/Improved/Dropped` sections.
2. The Release workflow opens the **"Version Packages" PR**. Changesets renders the
   note under a `### Major/Minor/Patch Changes` heading; **before merging, finalize
   that CHANGELOG section to the format above** (headline line + `###` sections, drop
   the changeset hash). This is the one manual step that keeps every release on-style.
3. Merge the Version PR → `release.yml` cuts the GitHub Release with the data bundle,
   title and body from `scripts/release-notes.mjs`.

## Bump rules

`major` = breaking schema (renamed/removed fields) · `minor` = new data / format /
package · `patch` = corrections to existing records. **Patches get no GitHub
Release** (detected by version delta in `release-notes.mjs`) — the npm version and
committed data cover them, and the Releases feed stays meaningful.
