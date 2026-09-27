# ETUS Skikda: what shipped from the Operator's website, and what did not

Companion to the verbatim excerpt in
[`etus-skikda-site-2026-09-27.md`](./etus-skikda-site-2026-09-27.md), which is
left byte for byte as the project owner supplied it. This note records the
decisions taken when that excerpt was promoted into
[`sources/buses/etus-skikda-lines.json`](../../sources/buses/etus-skikda-lines.json)
and `@geoalgeria/buses` 2.2.0. It promotes no data of its own.

The promotion is scripted:
[`promote-etus-skikda-supplied-site.mjs`](./promote-etus-skikda-supplied-site.mjs)
parses the Line sections out of the committed excerpt rather than retyping them,
so the capture cannot drift from the evidence. It splits on the page's own
separators, which are a mix of hyphen and en dash with stray leading, doubled
and trailing ones, and asserts six Lines all starting at ساحة الشهداء.

## The six Lines as published

| Line | Termini (AR, first and last stop as published) | Termini (FR) | Stops |
| --- | --- | --- | ---: |
| 01 | ساحة الشهداء to مدخل الجامعة | Place des Martyrs to null | 10 |
| 02 | ساحة الشهداء to الحانوت | Place des Martyrs to null | 9 |
| 03 | ساحة الشهداء to المشتى | Place des Martyrs to null | 12 |
| 04 | ساحة الشهداء to الشركة الوطنية للحبوب OAIC | Place des Martyrs to null | 16 |
| 05 | ساحة الشهداء to الاخوة عياشي (الفتوي) | Place des Martyrs to null | 30 |
| 06 | ساحة الشهداء to المتوسطة | Place des Martyrs to null | 31 |

Directory-only, like every other Operator entered from its own publications: no
shape, no Station, no Direction, no membership, no schedule.

## Ordered stop names have no field on a Line, so they stay in the Source

`BusLine` carries `stops` as a **count**, not a list: there is no published field
for an ordered stop sequence, and none was invented. The sequences therefore
live in the Source capture as `lines[].stop_names_ar`, exactly as ETUS M'Sila's
diagram transcriptions do, and `stops` carries their length. Skikda is the first
Operator whose every Line has a complete ordered sequence in the repository,
which makes it the cheapest candidate for a later geometry pass: the names are
committed, only coordinates are missing.

Two caveats are recorded in the capture's `stop_list_note`:

- Lines 04 and 05 end on a stray separator in the page. Their lists are the full
  published sequence, but cannot be proven exhaustive.
- Names are verbatim, including the page's own inconsistent spacing
  (`مركز العربي بن مهيدي07` next to `مركز العربي بن مهيدي 08`) and its
  mixed-script entries (`كارافاني ladécente`, `Gaz de France`, `ADL 1`, `LPP`,
  `SLMB`, `OAIC`, `PLF`).

## The service window is network-wide, so no Line claims service hours

The page states 06:00 to 19:00 every day of the year for the **service**, with
30 buses over 6 Lines. `BusServiceHours` models a first and last **departure**
per Line and period. Copying one network-wide window into six Lines would assert
per-Line departure times the Operator never published, so the window, the fleet
size and the claimed 3,000 daily passengers are kept as Source evidence and
`service_hours` stays empty. This matches how ETUSTO's published
05:30 to 19:25 window is handled.

## The six named areas are not bound to Line numbers

The service paragraph names الزفزاف, الزرامنة, الحدائق, حمادي كرومة, فلفلة and
بوزعرورة alongside the count of six Lines. The order is suggestive, but the page
never binds an area to a Line number, so they are **not** published as Line
names. Sanity check against the authoritative stop lists:

- الزفزاف appears on Line 01 as مقبرة الزفزاف.
- الحدائق appears on Line 03 as مدخل الحدائق.
- حمادي كرومة appears on Line 04 as تكوين حمادي كرومة.
- الزرامنة, فلفلة and بوزعرورة appear in **no** stop list, although Lines 05 and
  06 run east from the centre through حمروش حمودي and the Sonatrach complex,
  which is the direction of Filfila and Bouzaaroura.

So the paragraph corroborates three of six areas and contradicts none, and the
areas are recorded as `evidence.service_areas_ar` with that note.

## French names: one sourced, five left null

The page publishes no French at all. Rather than transliterate, French was taken
only where OpenStreetMap carries a `name:fr` for the place, queried at
`timestamp_osm_base` 2026-09-27:

| Arabic | OSM | `name:fr` | Used as |
| --- | --- | --- | --- |
| ساحة الشهداء | way/168946052 | Place des Martyrs | `terminus1_fr` on all six Lines |
| الحدائق | node/3042693423 | El Hadaïek | evidence only (a served area, not a terminus) |
| حمادي كرومة | node/2852022479 | Hammadi Krouma | evidence only |
| فلفلة | relation/5174375 | Filfila | evidence only |
| بوزعرورة | node/2861255057 | Bouzaâroura | evidence only |
| الزفزاف | node/7730537685 | none | nothing |
| الزرامنة | none found | none | nothing |

`way/168946052` sits at 36.8762, 6.9098, which is Skikda's city centre, and
matches the square all six Lines start from; the repository's own commune data
independently gives El Hadaiek, Hammadi Krouma and Filfila as the French forms
of those three communes. Every other terminus stays Arabic only: `terminus2_fr`
is absent and `terminus2` carries the Arabic, because the terminus is known even
though its French name is not.

المشتى (Line 03) was **not** matched to OSM's المشتة / El Mechta village: that
node is at 36.825, 6.654, roughly 23 km west of the city, while Line 03 ends
after عمارات سوناطراك inside Skikda.

## Open items

- No geometry. The next lever is coordinates for the committed stop names, in
  OSM or from the Operator, not a drawing traced off a map.
- The Rusicada-Bus app (`com.deeper.etus.skikda`) advertises live tracking and
  electronic ticketing. It is recorded as a discovery lead with
  `reuse_status: "no_open_feed_found"`; no endpoint was probed for this release.
- The site's TLS certificate was expired on 2026-09-27, so the page cannot be
  re-fetched by an automated client until that is fixed upstream. The excerpt
  and the capture are the reproducible record.
- [`operator-registry.json`](./operator-registry.json) still lists `etus-skikda`
  with `reuse_status: "no_open_feed_found"` and no sources. The registry is a
  discovery artifact and was not updated for ETUS-C Constantine either; both
  entries are stale in the same way and should be refreshed in one pass.
