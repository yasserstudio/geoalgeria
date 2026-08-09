---
"@geoalgeria/pharmacies": minor
---

Fresh OpenStreetMap re-survey (2026-08-08 pull, `timestamp_osm_base` 2026-08-08T14:50:21Z): 3,790 to **3,797** pharmacies, **2,461** named, still **67** wilayas. 9 added and 2 dropped upstream (`44-00029` Barça Toufiq in Aïn Defla and `47-00001` in Ghardaïa). Precision 3,509 exact / 288 approximate. Enrichment moves a little: 146 with phone, 257 with opening hours (was 255), 1,163 with address (was 1,159), 526 with a `dispensing` flag (was 524). The 1,769-way bulk-import artifact near Attatba is still detected and excluded.

**Ids of surviving records are stable.** All 3,788 records that survive the re-survey keep the id they shipped under, so existing joins on `id` keep working across re-surveys. The fetcher now runs `carryOverIds` keyed on the OSM id before writing, matching the other sector packages. Without it the positional `{wilaya_code}-{seq}` sequence re-homed 1,120 records, because a single pharmacy inserted upstream shifts every later record in its wilaya.

Four records are re-linked against the current core set rather than against OSM: two points near Menaa move from Aïn Oussera (65) to Bou Saâda (68), and two near Bou Saâda re-link from Bou Saâda to Ouled Sidi Brahim. Since ids carry over, the id prefix on those records no longer matches their `wilaya_code`, which is expected under the v2 contract where `id` is opaque. Eleven records pick up upstream name edits, mostly generic "Pharmacie" placeholders being cleared or a bilingual name being split into `name_fr` / `name_ar`.

`commune_code` nulls go 18 to **21**. The two re-linked Menaa records drop `"1709"` for null, and the new `16-00749` ships null. Both communes exist in the core set but carry no `code_commune` there (Menaa in wilaya 68, Bologhine Ibnou Ziri in wilaya 16), so this is an upstream gap in `packages/dataset`, not a regression in the join. `commune` names on those records are populated as usual.

`metadata.json` keeps `evidence_type: "crowdsourced"` on the OpenStreetMap source. `buildMetadata` passes `sources[]` through verbatim, so the fetcher now pins the value instead of leaving it off and silently dropping the provenance claim on every rebuild.

No API or shape changes: record contract, file layout and loaders are exactly as before.
