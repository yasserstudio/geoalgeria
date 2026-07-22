**English** | [Français](README.fr.md) | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/protection-civile

**Algeria's Protection Civile (civil protection / fire & rescue) units — as data you can install.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/protection-civile)](https://www.npmjs.com/package/@geoalgeria/protection-civile)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/protection-civile)](https://www.npmjs.com/package/@geoalgeria/protection-civile)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# Overview

**880 Protection Civile units** across every wilaya, straight from the **DGPC's own dataset** (dgpc.dz) — each unit with an Arabic name, an address, phone and fax, a status tier (`statut`), and a real DGPC coordinate. This is an **official-primary** dataset: the DGPC is the authoritative "this unit exists here" source.

## Installation

```bash
npm install @geoalgeria/protection-civile
```

## Quick start

```js
import {
  units,
  unitById,
  unitsByWilaya,
  unitsByStatut,
  metadata,
} from "@geoalgeria/protection-civile";

units().length; // 880

// Everything in Alger (code 16)
unitsByWilaya(16).length;

// One tier, and a single record
unitsByStatut("UNITE PRINCIPALE").length;
unitById("16-001")?.commune;

metadata().wilayas_covered; // 69
```

## What you can build

- A civil-protection / fire-station locator or map layer for Algeria
- An emergency-response coverage analysis by wilaya
- A base layer to join against live DGPC bulletins

## What's inside

| Dataset | Count | Coordinates | Notes |
| --- | --- | --- | --- |
| `protection-civile` | 880 | all 880 | DGPC (dgpc.dz), geocoded, post-2026-reform wilaya linkage |

**By status tier (`statut`):** UNITE SECONDAIRE 444 · POSTE AVANCE 146 · UNITE DE SECTEUR 132 · UNITE PRINCIPALE 62 · SIEGE DE DIRECTION WILAYA 58 · POSTE DE SECOURS ROUTIER 20 · UNITE MARINE 15 · U.N D'INSTRUCTION ET D'INTERVENTION 1 · DIRECTION GENERALE 1 · CELLULE DE SECURITE 1

Every unit carries `tel`, `fax` and `address`; **777** communes were matched by name, the rest by nearest centroid.

## Formats

- `data/protection-civile.json` — full array (typed by `types/index.d.ts`)
- `data/csv/protection-civile.csv` — flat CSV
- `data/geojson/protection-civile.geojson` — `FeatureCollection` (all records)
- `data/metadata.json` — counts, sources, generated date

```js
import data from "@geoalgeria/protection-civile/data/protection-civile.json" with { type: "json" };
```

```ts
import type { ProtectionCivileUnit } from "@geoalgeria/protection-civile";
```

## How the data is built

Downloaded from the DGPC's own GeoJSON (`dgpc.dz/dgpc2/unite.geojson`). Coordinates come from each feature's decimal `x`/`y`. The DGPC's own `cod_wilaya` is **pre-2026-reform** (codes `"01".."58"`), so it is **not** trusted for `wilaya_code`: every unit's wilaya is re-derived by point-in-polygon against the repo's 69 post-reform wilaya boundaries, so units now inside the 11 new 2026 wilayas carry their correct new code. The DGPC code is preserved verbatim in `refs.dgpc_wilaya` as a receipt. Commune is best-effort — the Arabic `commune_1` name is matched against the geoalgeria commune set within the derived wilaya (nearest-centroid fallback). Rebuild with `npm run fetch` (or `--cache` to rebuild from the cached pull). See `research/protection-civile/` in the monorepo.

## On accuracy & coverage

> **This is the DGPC's complete published unit network — 880 units.** Every unit carries a real DGPC coordinate; a few coincident points are honestly marked `approximate` (`geo_precision`), the rest `exact`. There is no French name in the source, so `name_fr` is not derived — nothing is machine-translated. Commune is name-matched best-effort; **wilaya is re-derived from geometry** and is reliable.
>
> The DGPC's original `cod_wilaya` is pre-2026-reform and is kept only as `refs.dgpc_wilaya`. Use `wilaya_code` (the geometry-derived, post-reform code) for any wilaya join.

## Source & license

Data © **Direction Générale de la Protection Civile (DGPC)** — official government content, redistributed here for reference. There is **no open licence**; treat it as a factual public listing and attribute the DGPC. Wilaya/commune linkage uses the geoalgeria base dataset. Package code under MIT (see [LICENSE](LICENSE)).

## Questions?

Open an issue: https://github.com/yasserstudio/geoalgeria/issues
