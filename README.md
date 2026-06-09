# GeoAlgeria

Open data for Algeria — 69 wilayas, 564 dairas, 1,541 communes (bilingual
FR/AR names, real Algérie Poste postal codes, coordinates) plus 3,908 post
offices and 2,026 ATMs. Available as JSON, CSV, GeoJSON, SQL, and TypeScript.

This is the **data monorepo**. The website lives in a separate repo
([`geoalgeria.com`](https://github.com/yasserstudio/geoalgeria.com)).

## Packages

| Package | npm | What |
| --- | --- | --- |
| [`packages/dataset`](packages/dataset) | [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) | Wilayas, dairas, communes + mirrored postal data |
| [`packages/poste`](packages/poste) | [`@geoalgeria/poste`](https://www.npmjs.com/package/@geoalgeria/poste) | Post offices & ATMs from Algérie Poste |

```bash
npm i geoalgeria          # the dataset
npm i @geoalgeria/poste   # post offices + ATMs
```

The npm packages ship the `*.json` data. The **CSV / GeoJSON / SQL** exports are
attached as a zipped bundle to each [GitHub Release](https://github.com/yasserstudio/geoalgeria/releases).

## Development

```bash
pnpm install
pnpm validate        # schema + integrity checks on the dataset
```

Releases are automated with [Changesets](https://github.com/changesets/changesets) —
see [`RELEASING.md`](RELEASING.md). Add a changeset with every data-changing PR:

```bash
pnpm changeset
```

## Contributing & license

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Data and code are MIT licensed
([`LICENSE`](LICENSE)); attribution to Algérie Poste applies to the postal data.
