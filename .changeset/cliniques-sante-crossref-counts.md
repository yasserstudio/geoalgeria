---
"@geoalgeria/cliniques": patch
---

**The cross-reference to `@geoalgeria/sante` states this release's counts.** The README's disjointness note (the one that says these 1,917 care facilities must never be summed with the registry tier) quoted the sante figures, and sante merged four FR/AR half-record pairs in this release. The note now reads 657 registry establishments, 121 of them referencing an OpenStreetMap element, 85 of those on a hospital and excluded here by construction, 36 on an EPSP and kept here, and 536 carrying no OSM reference at all. Nothing about this package changed: no record, no field, no coordinate.

Three of those numbers were also wrong before this release, written when sante still held 668 records: the OSM-referencing count read 121 where the data said 122, the EPSP count read 35 where it said 36, and the no-reference count read 547 where it said 539. They are read off the shipped data now, and they add up in the open: 85 and 36 make 121, and 121 and 536 make 657.

The hospital tier the exclusion actually covers is named in full, too. It is CHU, EPH, EHS and the registry's plain `hopital` type, which is what `loadSanteOsmIds` has always matched on; the note listed only the first three, so its count never reconciled with the types beside it.

Same fix in all three locales (`README.md`, `README.fr.md`, `README.ar.md`).
