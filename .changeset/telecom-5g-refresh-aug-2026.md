---
"@geoalgeria/telecom": minor
---

5G coverage refreshed from the operators' maps (2026-08-02 capture): 2,798 to **3,096** points. Mobilis grew 1,621 to **1,919** after a bulk re-survey on their side (1,273 sites kept, 646 added, 348 removed or moved; ids are content-deterministic, so a moved coordinate counts as remove + add). First Mobilis 5G points in **Beni Abbes** and **In Guezzam**; largest gains in Tlemcen (+29), Constantine (+23) and Tiaret (+17). Djezzy (1,001) and Ooredoo (176) are unchanged, re-verified against their maps the same day.

Feed hygiene: the new Mobilis export ships 77 exact duplicate rows (same coordinates + commune) and 4 out-of-Algeria points; the fetcher now drops duplicates explicitly and logs both counts separately. Per-source `retrieved` dates in `metadata.json` now track each fetch run instead of the frozen 2026-06-13 cutover date.

No API or shape changes: record contract, file layout and loaders are exactly as in 2.0.0.
