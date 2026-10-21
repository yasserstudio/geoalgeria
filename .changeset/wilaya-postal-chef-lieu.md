---
"geoalgeria": patch
---

Each of the 21 wilayas created in 2019 and 2026 now publishes its chef-lieu commune's postal code instead of a synthetic one.

Wilayas 1 to 48 have always published their chef-lieu's code: wilaya 1 reads Adrar's `01000`, wilaya 3 reads Laghouat's `03000`. Wilayas 49 to 69 published `NN000` built from the wilaya's own number instead, and no Algérie Poste office holds any of those 21 values. Each wilaya's own chef-lieu said otherwise in the same install: wilaya 59 Aflou read `59000` while commune 319 Aflou read `03001`, the code of a real office.

The rule is now the same for all 69: a wilaya's `postal_code` is its chef-lieu commune's. Wilaya 49 reads `49001` (Timimoun), wilaya 59 reads `03001` (Aflou), wilaya 69 reads `32003` (El Abiodh Sidi Cheikh). Every derived code was checked against Algérie Poste's own office register, by its code and wilaya, so each one is held by a real office of that chef-lieu.

The two-digit prefix is the issuing office's wilaya, which is why 11 of the 69 no longer start with their own number: a commune promoted into wilayas 59 to 69 kept the postal numbering of its pre-reform wilaya, exactly as 108 commune codes already do. A consumer reading a wilaya's `postal_code` as a prefix of its communes' codes was reading something the postal service never guaranteed; a consumer joining `capital_commune_code` to the commune table already saw this value.

Corrected in all five carriers at once, so JSON, CSV, GeoJSON and SQL agree: `data/algeria.json`, `data/csv/wilayas.csv`, `data/geojson/wilayas.geojson`, `algeria.geojson` and the wilaya rows of `data/sql/full.sql`. No field, record or count changes: still 69 wilayas, 551 dairas and 1,541 communes.
