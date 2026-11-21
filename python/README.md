# geoalgeria (Python)

Algeria's 69 wilayas, 551 dairas and 1,541 communes, with postal codes,
coordinates and Arabic/French search. No dependencies. The data is the
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria) open dataset, the same
one behind the `geoalgeria` npm package and [geoalgeria.com](https://geoalgeria.com),
and search folds names exactly as the npm package does.

```bash
pip install geoalgeria
```

```python
import geoalgeria

geoalgeria.wilaya(31)["name_ar"]          # 'وهران'
geoalgeria.commune(101)["postal_code"]    # '01000'
len(geoalgeria.communes(16))              # communes of Algiers
geoalgeria.dairas(30)                     # dairas of Ouargla
geoalgeria.search("ورقلة")                # Arabic, with or without harakat
geoalgeria.search("bejaia", types=["commune"], limit=5)
geoalgeria.lineage()                      # where each wilaya was before 2019 and 2026
geoalgeria.DATA_VERSION                   # GeoAlgeria data release bundled
```

## Records

Each commune has `code_commune`, `name_fr`, `name_ar`, `wilaya_code`, `daira`,
`postal_code`, `latitude`, `longitude`, `osm_relation_id` and `wikidata`.
Wilaya codes follow the 2026 reform (69 wilayas). Each commune also carries
`wilaya_code_58` and `wilaya_code_48`: its wilaya on the 58-wilaya map (2019 to
2026) and on the 48-wilaya map (1984 to 2019), so older data joins on the code
it was written with.

Each daira has `id`, `name_fr`, `name_ar`, `wilaya_code`, `commune_count` and an
`audit` with its `status` and `citation`: `decree_table` when a whole-wilaya
decree table names it, `agrees_1991` when it matches the 1991 table, and no
grade yet otherwise. These are the dataset's 551 checked dairas, not dairas
regrouped from the communes.

`lineage()` returns, for each of the 69 wilayas, its codes on the 58 and 48
maps with the legal texts that say so, plus the commune transfers and the one
exception (El Borma).

## Search

`search(query, limit=10, types=None)` returns wilayas, dairas and communes,
best first:

```python
>>> geoalgeria.search("ورقله", limit=1)
[{'type': 'wilaya', 'code': 30, 'name_fr': 'Ouargla', 'name_ar': 'ورقلة', 'wilaya_code': 30, 'match': 'loose'}]

```

`match` says how the name matched: `exact`, then `prefix` (the name starts with
what was typed, the last word may be unfinished), then `loose` (equal or prefix
once ى reads as ي and ة as ه). Within each, wilayas come before dairas, then
communes, then by French name. A result found only by a former name, such as
`Lemcene` for Lemsane, also has `"matched": "former"`. `limit=None` returns every
match, and `types` keeps only some of `"wilaya"`, `"daira"` and `"commune"`.

Accents, harakat, hamza forms, tatweel and case never matter. The same fold is
public as `conservative_key()` and `loose_key()`, with `tokenize()` for its
words, if you build your own index. They give the same keys as the npm
`@geoalgeria/normalize`, character for character.

## Changes in 0.2.0

- `search()` results are `{type, code, name_fr, name_ar, wilaya_code, match}`
  instead of whole records, and include dairas. Use `commune(code)` or
  `wilaya(code)` for the full record.
- `dairas()` returns the audited daira records, which have `commune_count` but
  no list of commune codes; `communes()` and each commune's `daira` give the list.
- `normalize()` is deprecated and now returns `conservative_key()`, which keeps
  ة and ى as they are. Use `loose_key()` for the 0.1.0 reading of those two
  letters. Keys saved with 0.1.0 should be rebuilt.

## Licence

Code and the compilation (codes, names, postal codes) are MIT. The
OpenStreetMap-derived parts (323 commune centre coordinates, OSM relation ids
and Wikidata items) are ODbL 1.0, © OpenStreetMap contributors. Full terms in
[LICENSE](LICENSE) and [NOTICE](NOTICE). If you reuse the data, credit
GeoAlgeria and OpenStreetMap.

Corrections: [open an issue](https://github.com/yasserstudio/geoalgeria/issues).
