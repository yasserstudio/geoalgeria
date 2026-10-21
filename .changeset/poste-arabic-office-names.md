---
"geoalgeria": minor
"@geoalgeria/poste": minor
---

Three post offices are named after the places their own fields name.

BaridiMap glued a dash to a word inside the Arabic name instead of separating two
halves of it, so folding the dash would have published a separator that was never
there:

- `2298` read `عين –الزانة`, with the dash inside the commune name itself, and
  now reads `عين الزانة`, which is its own `commune_ar` and its Latin `AIN ZANA`.
- `3935` read `برج –بو-عريريج - أخروف`, which split the wilaya name in two, and
  now reads `برج بوعريريج - أخروف`: `commune_ar` is `برج بوعريريج` and the Latin
  name `BORDJ BOU ARRERIDJ AKHROUF`, so the farm is the only real separator.
- `725` read `سوق أهراس –درايعية أحمد-`, where the separator is real and the
  glued dash and the trailing hyphen are not, and now reads
  `سوق أهراس - درايعية أحمد`.

The source word order is kept in all three, the Latin `name` was always correct
and is unchanged, and so are ids, coordinates, codes, postal codes and counts.
The `geoalgeria` postal mirror follows, byte-identical as always.

Each correction is a reviewed entry in `quality/overrides/poste.json`, so it
survives the next BaridiMap pull and declines to apply if the upstream name
moves. That gives `postoffices.json` the four review fields `atms.json` already
carries, `review_status`, `reviewed_at`, `reviewed_by` and `review_evidence`,
declared optional on `PostOffice` as they are on `Atm`. **`csv/postoffices.csv`
gains those four columns**, which is why this is a minor rather than a patch: the
columns are appended, every existing column keeps its position, and no value
changes. A consumer reading the CSV by header name is unaffected; one reading a
fixed column count is not.
