# Working in this repo (humans & agents)

GeoAlgeria is a small **pnpm monorepo** of open Algeria datasets published to npm.
This file is the short version of how work flows here; deeper docs are linked.

## Layout

| Path | Package | Contents |
| --- | --- | --- |
| `packages/dataset/` | `geoalgeria` | wilayas, dairas, communes (+ mirrored postal data) |
| `packages/poste/` | `@geoalgeria/poste` | post offices & ATMs (Algérie Poste) |
| `packages/emploi/` | `@geoalgeria/emploi` | employment agencies (ANEM: AWEM + ALEM) |
| `packages/mobilis/` | `@geoalgeria/mobilis` | Mobilis agencies & approved points of sale (mobilis.dz) |
| `packages/telecom/` | `@geoalgeria/telecom` | cross-operator 5G coverage (Djezzy, Mobilis, Ooredoo) |
| `packages/aviation/` | `@geoalgeria/aviation` | civil airports with ICAO codes (ANAC) |
| `packages/banques/` | `@geoalgeria/banques` | licensed banks, institutions & branches (RIB/SWIFT) |
| `packages/livraison/` | `@geoalgeria/livraison` | delivery carriers & geocoded stop-desks |
| `packages/jeunesse/` | `@geoalgeria/jeunesse` | youth establishments (Ministry of Youth and Sports) |
| `packages/sports/` | `@geoalgeria/sports` | sports facilities — stadiums, pools, courts, tracks (Ministry of Youth and Sports) |
| `packages/enseignement-superieur/` | `@geoalgeria/enseignement-superieur` | higher-education network — universities, grandes écoles, ENS, centres + private & other-ministry institutions (MESRS) |
| `packages/tourisme/` | `@geoalgeria/tourisme` | tourism infrastructure — hotels, attractions, historic sites, thermal springs, parks (ASAL, OSM, Wikidata) |
| `packages/formation-professionnelle/` | `@geoalgeria/formation-professionnelle` | vocational training — CFPA, INSFP, DFEPs, private centers (MFEP / takwin.dz) |
| `packages/djezzy/` | `@geoalgeria/djezzy` | Djezzy boutiques — geocoded retail stores with category & hours (djezzy.dz) |
| `packages/ooredoo/` | `@geoalgeria/ooredoo` | Ooredoo stores — 572 EO/CSO/ESO with real coordinates & wilaya/commune linkage (ooredoo.dz locator API); completes the telecom retail trio |
| `packages/mosquees/` | `@geoalgeria/mosquees` | mosques — Wikidata + OpenStreetMap composite, bilingual, all 69 wilayas |
| `packages/sante/` | `@geoalgeria/sante` | public health establishments — EPH, EPSP, EHS, CHU (Ministry of Health), bilingual, geocoded via OSM + Wikidata |
| `packages/culture/` | `@geoalgeria/culture` | cultural atlas — protected sites, museums, theatres, libraries + cultural establishments (Ministry of Culture), bilingual, fully geocoded |
| `packages/agriculture/` | `@geoalgeria/agriculture` | agriculture-sector institutions — services directorates (DSA), forest conservations, research/training institutes, chambers of agriculture, public offices & groups (Ministry of Agriculture), bilingual, geocoded |
| `packages/industrie-pharmaceutique/` | `@geoalgeria/industrie-pharmaceutique` | approved pharmaceutical manufacturers — 171 medicine (PP) & medical-device (DM) makers from the Ministry of Pharmaceutical Industry (MIP) fabrication register, bilingual, typed by nature, geocoded to commune/wilaya centroid |
| `packages/pharmacies/` | `@geoalgeria/pharmacies` | pharmacies (officines) — 3,790 geocoded across 67 wilayas, bilingual where named, phone/hours/dispensing where tagged, wilaya/commune-linked (OpenStreetMap, ODbL); honest ~half coverage |
| `packages/ecoles/` | `@geoalgeria/ecoles` | schools — 11,830 primaires/CEM/lycées/préscolaires classified by cycle, bilingual, all 69 wilayas (OpenStreetMap, ODbL) |
| `packages/gares-routieres/` | `@geoalgeria/gares-routieres` | intercity bus stations — 74 SOGRAL gares routières, 51 wilayas, geocoded with surfaces (live.sogral.com) |
| `packages/ferroviaire/` | `@geoalgeria/ferroviaire` | rail & urban transit — 692 train/tram/metro/aerial-tramway/gondola nodes (SNTF/SETRAM/SEMA), Wikidata + OSM composite, bilingual |
| `packages/buses/` | `@geoalgeria/buses` | urban bus networks — 50 ETUSA (Alger) lines, line-level v1 (fr.wikipedia) |
| `packages/transport/` | `@geoalgeria/transport` | transport umbrella — re-exports aviation + ferroviaire + gares-routieres + buses |

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
