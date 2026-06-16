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
- <Title: short, factual, what changed. ≤ ~50 chars / ~8 words. No period. THIS is the title.>
- <Detail: the concrete facts — counts, fields, formats. Lead with the number.>
- Source: <JORA n° XX / Algérie Poste / ONS / Interior Ministry>   ← for data changes
```

With `pnpm changeset`, the first line of your summary becomes this first bullet —
write it as a **short, sober title**, and put the detail in the lines below.

Rules:
- **First bullet is the title — keep it short.** Aim for **≤ ~50 characters / ~8
  words**, no trailing period. It states *what changed*, not a pitch:
  "Branches for all 21 licensed banks" — not "Every licensed bank in Algeria now
  has branch locations, all 21!".
- **Titles render as `<version> - <title>`.** `release.yml` and the announcer
  prepend the version automatically, so a GitHub Release & Discussion title looks
  like **`1.1.0 - Branches for all 21 licensed banks`**. The package **name/scope**
  is never in the title — it's already in the release chip + URL. Used verbatim as
  the Release title, the Discussion title, and (without the version) the social hook.
- **Tone: sober and factual.** No emoji, no hype, no marketing CTAs ("ship fast",
  "🇩🇿", "drop it into your app"). This is a data project — state the facts, cite
  the source, link npm + the release. Let the numbers do the selling.
- **Always cite a source** for data changes (it's also the contribution rule).
- **Bump:** `major` = breaking schema · `minor` = new data/format/package ·
  `patch` = corrections to existing records. The bump gates auto-announce
  (minor/major post a Discussion; patch stays quiet).
- New package → its first release is a `minor` and **deserves a real note** — do
  not let it ship with an empty auto-generated changelog (see emploi@1.0.0).

## Worked example (geoalgeria@1.1.0)

```
- Real postal codes for ~1,440 communes
- Corrected from Algérie Poste data (previously only ~88 matched reality).
- Added 3,908 post offices and 2,026 ATMs (codes, bilingual names, coordinates) in JSON, CSV, GeoJSON.
- Added postOffices / atms / getPostOfficesByCommune() JS API + TypeScript types.
- Source: Algérie Poste (baridimap.poste.dz).
```

That section becomes a GitHub Release titled *"Real postal codes for ~1,440
communes"* (tag `geoalgeria@1.1.0`), a matching Discussion, and X/LinkedIn drafts
— no extra work.
