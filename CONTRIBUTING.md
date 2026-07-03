# Contributing to GeoAlgeria

Thanks for helping! GeoAlgeria aims to be the most complete, accurate, and
*current* open dataset for Algeria — administrative divisions, postal/banking
data today, and more kinds of Algeria data over time. Corrections, additions,
and new-dataset proposals are all welcome.

This is a small monorepo:

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
| `packages/formation-professionnelle/` | `@geoalgeria/formation-professionnelle` | vocational training establishments (MFEP / takwin.dz) |
| `packages/djezzy/` | `@geoalgeria/djezzy` | Djezzy boutiques — geocoded retail stores (djezzy.dz) |
| `packages/mosquees/` | `@geoalgeria/mosquees` | mosques — Wikidata + OpenStreetMap composite (all 69 wilayas) |
| `packages/sante/` | `@geoalgeria/sante` | public health establishments — EPH/EPSP/EHS/CHU (Ministry of Health), bilingual, geocoded via OSM + Wikidata |
| `packages/culture/` | `@geoalgeria/culture` | cultural atlas — protected sites, museums, theatres, libraries + cultural establishments (Ministry of Culture), bilingual, fully geocoded |
| `packages/agriculture/` | `@geoalgeria/agriculture` | agriculture-sector institutions — DSA, forest conservations, research/training institutes, chambers of agriculture, public offices & groups (Ministry of Agriculture), bilingual, geocoded |
| `packages/ecoles/` | `@geoalgeria/ecoles` | schools — 11,830 primaires/CEM/lycées/préscolaires classified by cycle, bilingual, all 69 wilayas (OpenStreetMap) |
| `packages/gares-routieres/` | `@geoalgeria/gares-routieres` | intercity bus stations — 74 SOGRAL gares routières, 51 wilayas, geocoded with surfaces (live.sogral.com) |
| `packages/ferroviaire/` | `@geoalgeria/ferroviaire` | rail & urban transit — 692 train/tram/metro/aerial-tramway/gondola nodes (SNTF/SETRAM/SEMA), Wikidata + OSM composite, bilingual |
| `packages/buses/` | `@geoalgeria/buses` | urban bus networks — 50 ETUSA (Alger) lines, line-level v1 (fr.wikipedia) |
| `packages/transport/` | `@geoalgeria/transport` | transport umbrella — re-exports aviation + ferroviaire + gares-routieres + buses |

## How to contribute

### 1. Fork, clone, install

```bash
git clone https://github.com/YOUR_FORK/geoalgeria.git
cd geoalgeria
pnpm install
```

### 2. Make your change

- Fix incorrect data (names, postal codes, coordinates)
- Add missing communes, dairas, or fields
- Improve Arabic transliterations
- Add a new export format

Data lives under `packages/dataset/data/` and `packages/poste/data/`. The postal
data in `packages/dataset/data/poste/` is **generated** — edit it in
`packages/poste` and run `npm run fetch` there (it mirrors into the dataset), don't
hand-edit the mirror.

### 3. Validate

```bash
pnpm validate    # schema + integrity checks on the dataset
```

### 4. Open a pull request

Branch (`git checkout -b fix/commune-name-typo`), commit using
[Conventional Commits](https://www.conventionalcommits.org)
(`fix(dataset): correct Béjaïa postal code`), and open a PR against `main`.

You **don't** bump versions — releases are automated. If your change touches
published data, add a changeset so it ends up in the changelog:

```bash
pnpm changeset   # pick package(s) + bump type + a one-line note
```

(No worries if you skip it — a maintainer will add one.) On merge, a bot opens a
"Version Packages" PR; merging that releases. See [`RELEASING.md`](RELEASING.md).

## Data guidelines

### Format
- Follow the existing JSON schema (see [`packages/dataset/data/README.md`](packages/dataset/data/README.md))
- UTF-8, no trailing commas
- Keep entries sorted by `wilaya_code`, then alphabetically by `name_fr`

### Naming
- **French**: official JORA spelling (e.g., "Oum El Bouaghi")
- **Arabic**: standard script, no tashkeel (diacritics)
- **Daira**: the French name of the daira seat (chef-lieu)

### Sources
Always cite a source for data changes. Accepted:
- Official Journal (JORA / الجريدة الرسمية)
- Algérie Poste (postal codes, offices, ATMs)
- ONS (National Statistics Office)
- Interior Ministry publications
- Wikipedia (secondary reference only)

### What not to submit
- Data from unofficial/unverifiable sources
- Frequently-changing data better served as its own dataset (e.g. population)
- Political/opinion content or copyrighted material

## Requesting a new dataset

GeoAlgeria is meant to grow into the open reference source for *all kinds* of Algeria
data, as sources allow. Know of one worth adding (elections, schools, health
facilities, economic indicators, transport…)?

- **Have a concrete, sourced dataset in mind?** Open a
  [**Request a dataset**](https://github.com/yasserstudio/geoalgeria/issues/new/choose)
  issue — include where the data comes from and whether it's freely available.
- **Just an idea or want to discuss/upvote?** Use
  [Discussions](https://github.com/yasserstudio/geoalgeria/discussions).

## Code of conduct

Be respectful and constructive, assume good intent, focus on accuracy over
preference, and welcome newcomers — not everyone is fluent in git or JSON.

## Questions?

Open a [Discussion](https://github.com/yasserstudio/geoalgeria/discussions) and
we'll help.
