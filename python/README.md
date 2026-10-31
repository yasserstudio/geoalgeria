# geoalgeria (Python)

Algeria's 69 wilayas and 1,541 communes, with postal codes, coordinates and
Arabic/French search. No dependencies. The data is the
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria) open dataset, the same
one behind the `geoalgeria` npm package and [geoalgeria.com](https://geoalgeria.com).

```bash
pip install geoalgeria
```

```python
import geoalgeria

geoalgeria.wilaya(31)["name_ar"]          # 'وهران'
geoalgeria.commune(101)["postal_code"]    # '01000'
len(geoalgeria.communes(16))              # communes of Algiers
geoalgeria.dairas(30)                     # dairas of Ouargla, with their commune codes
geoalgeria.search("ورقلة")                # Arabic, with or without harakat
geoalgeria.search("bejaia")               # French, accents optional
geoalgeria.DATA_VERSION                   # GeoAlgeria data release bundled
```

Each commune has `code_commune`, `name_fr`, `name_ar`, `wilaya_code`, `daira`,
`postal_code`, `latitude`, `longitude`, `osm_relation_id` and `wikidata`.
Wilaya codes follow the 2026 reform (69 wilayas).

## Licence

Code and the compilation (codes, names, postal codes) are MIT. The
OpenStreetMap-derived parts (323 commune centre coordinates, OSM relation ids
and Wikidata items) are ODbL 1.0, © OpenStreetMap contributors. Full terms in
[LICENSE](LICENSE) and [NOTICE](NOTICE). If you reuse the data, credit
GeoAlgeria and OpenStreetMap.

Corrections: [open an issue](https://github.com/yasserstudio/geoalgeria/issues).
