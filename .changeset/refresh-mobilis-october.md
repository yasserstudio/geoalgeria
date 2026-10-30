---
"@geoalgeria/mobilis": patch
---

Re-pull the Mobilis store locator, retrieved 2026-10-25: 164 agencies + 12,180 points of sale, identical.

Source: Mobilis (mobilis.dz) store locator, all 69 wilayas walked for both categories. Previous pull 2026-08-31; the locator had been unreachable from outside Algeria since, and this one ran over an Algerian connection.

**The directory came back byte-identical.** `data/agences.json` and `data/pdv.json`, and their CSV and GeoJSON mirrors, are the same bytes that shipped on 2026-08-31: 164 agencies and 12,180 approved points of sale, nothing added, nothing removed, no name changed in either script, no coordinate moved, no `geo_precision`, `geo_method`, wilaya or commune changed, and no id changed hands.

The only field that moves is `retrieved` in `data/metadata.json`, and that is what the pull is worth: the directory is confirmed current as of 2026-10-25 rather than merely unrefuted since August.

Worth reading as a property of the source rather than of the network: two months of a commercial retail estate with not one opening, closure, move or rename says the locator is a static export republished unchanged, so a later pull that is also identical is not independent confirmation. The 12,180 points of sale still carry no coordinates at source, so commune-level density remains the ceiling for them and nothing was geocoded from an address to pretend otherwise.
