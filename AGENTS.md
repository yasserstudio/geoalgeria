# Working in this repo (humans & agents)

GeoAlgeria is a small **pnpm monorepo** of open Algeria datasets published to npm.
This file is the short version of how work flows here; deeper docs are linked.

## Layout

| Path | Package | Contents |
| --- | --- | --- |
| `packages/dataset/` | `geoalgeria` | wilayas, dairas, communes (+ structured postal data) |
| `packages/poste/` | `@geoalgeria/poste` | post offices & ATMs (Algérie Poste) |
| `packages/emploi/` | `@geoalgeria/emploi` | employment agencies (ANEM: AWEM + ALEM) |
| `packages/mobilis/` | `@geoalgeria/mobilis` | Mobilis agencies & approved points of sale (mobilis.dz) |
| `packages/telecom/` | `@geoalgeria/telecom` | cross-operator 5G coverage (Djezzy, Mobilis, Ooredoo) |
| `packages/aviation/` | `@geoalgeria/aviation` | civil airports with ICAO codes (ANAC) |
| `packages/banques/` | `@geoalgeria/banques` | licensed banks, institutions & branches (RIB/SWIFT) |
| `packages/livraison/` | `@geoalgeria/livraison` | delivery carriers & geocoded stop-desks |
| `packages/jeunesse/` | `@geoalgeria/jeunesse` | youth & sports institutions (Ministère de la Jeunesse) |
| `packages/enseignement-superieur/` | `@geoalgeria/enseignement-superieur` | higher-education network — universities, grandes écoles, ENS, centres (MESRS) |
| `packages/tourisme/` | `@geoalgeria/tourisme` | tourism infrastructure — hotels, attractions, historic sites, thermal springs, parks (ASAL, OSM, Wikidata) |
| `packages/formation-professionnelle/` | `@geoalgeria/formation-professionnelle` | vocational training — CFPA, INSFP, DFEPs, private centers (MFEP / takwin.dz) |

The postal data under `packages/dataset/data/poste/` is a **generated mirror** —
edit it in `packages/poste`, then `npm run fetch` there. Never hand-edit the mirror.

## The loop

1. **Branch** off `main`: `fix/commune-name`, `feat/emploi-coords`, `chore/ci`.
2. **Edit data**, keeping the rules in [`CONTRIBUTING.md`](CONTRIBUTING.md):
   sorted, UTF-8, sourced (JORA / Algérie Poste / ONS), bilingual FR/AR.
3. **`pnpm validate`** — schema + integrity checks. Must pass.
4. **Add a changeset** if a published package changed: `pnpm changeset`
   (data semver: **major** = breaking schema · **minor** = new data/format ·
   **patch** = corrections).
5. **Commit** with [Conventional Commits](https://www.conventionalcommits.org):
   `feat(emploi): ...`, `fix(dataset): ...`, `chore(ci): ...`.
6. **Open a PR** to `main`. CI (Node 22 & 24) runs lockfile/audit/validate/smoke.

Maintainers push small data fixes straight to `main` with a changeset; the
release machinery below handles versioning either way.

## Releasing (automated)

We use **Changesets + a "Version Packages" PR + staged Trusted Publishing**:

- Land changes **with changesets** on `main`.
- The **Release** workflow opens/updates a **`chore: version packages` PR** that
  bumps versions and CHANGELOGs. **Merging that PR** is the release trigger.
- On merge, packages are **staged** on npm (OIDC, no token) and per-package
  **GitHub Releases** are cut with CSV/GeoJSON/SQL bundles attached.
- **Approve the staged packages** (2FA) to make them live, then `pnpm purge-cdn`.

Full details and one-time setup: [`RELEASING.md`](RELEASING.md).

## Marketing & announcements

- Strategy, positioning, and launch copy live in **`.agents/`** (gitignored —
  local working files, not published): `product-marketing.md`, `launch-plan.md`,
  `launch-posts.md`, `launch-discussions.md`, `release-notes-templates.md`.
- The **Announce** workflow turns each release into a Discussion + social drafts.
  Release-note structure: [`.github/RELEASE_TEMPLATE.md`](.github/RELEASE_TEMPLATE.md)
  (committed); the marketing copy built from it: `.agents/release-notes-templates.md`.
- Publishing public content (social posts, seeded discussions) under the owner's
  identity needs **explicit human go-ahead** — automation drafts, humans post.

## Don't

- Hand-edit generated mirrors (`packages/dataset/data/poste/`).
- Push a bump without a changeset, or a changeset without a source for the data.
- Commit anything from `.agents/` — it's intentionally local.
