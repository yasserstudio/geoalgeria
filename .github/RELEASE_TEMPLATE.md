# Release-notes template

How to write release notes so every GeoAlgeria release reads the same and the
automation works. **This is the source of truth** for release-note structure;
`.agents/release-notes-templates.md` covers the Discussion/social copy built from it.

## How a release note flows

```
changeset note  →  packages/<pkg>/CHANGELOG.md section  →  GitHub Release body
                                                            (release.yml extracts
                                                             the section verbatim)
                                                         →  Announce workflow
                                                            (headline = first bullet)
```

So the **changeset note you write is the release note**. Write it well once.

## The template

When you run `pnpm changeset`, structure the note like this:

```
- <Headline: one line, what a user gains. This FIRST BULLET is the headline.>
- <More concrete changes: counts, fields, formats. Lead with the number.>
- Source: <JORA n° XX / Algérie Poste / ONS / Interior Ministry>   ← for data changes
```

With `pnpm changeset`, the first line of your summary becomes this first bullet —
so write that line as the headline.

Rules:
- **First bullet is the headline.** Keep it short and specific — "Adds 412 ATM
  coordinates" beats "Update data". It is used **verbatim in three places**:
  - the GitHub Release **title** → the `<headline>` alone, set automatically by
    `release.yml` (the package tag is **never** repeated in the title — it's
    already in the release chip and URL),
  - the **Discussion** title, and
  - the social hook.
- **Always cite a source** for data changes (it's also the contribution rule).
- **Bump:** `major` = breaking schema · `minor` = new data/format/package ·
  `patch` = corrections to existing records. The bump gates auto-announce
  (minor/major post a Discussion; patch stays quiet).
- New package → its first release is a `minor` and **deserves a real note** — do
  not let it ship with an empty auto-generated changelog (see emploi@1.0.0).

## Worked example (geoalgeria@1.1.0)

```
- Real Algérie Poste postal codes for ~1,440 communes (previously only ~88 matched reality).
- Added 3,908 post offices and 2,026 ATMs (codes, bilingual names, coordinates) in JSON, CSV, GeoJSON.
- Added postOffices / atms / getPostOfficesByCommune() JS API + TypeScript types.
- Source: Algérie Poste (baridimap.poste.dz).
```

That section becomes a GitHub Release titled
*"Real Algérie Poste postal codes for ~1,440 communes"* (tag `geoalgeria@1.1.0`),
a matching Discussion, and X/LinkedIn drafts — no extra work.
