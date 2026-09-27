---
"@geoalgeria/transport": patch
---

Carry the umbrella to buses 2.2.0, so its published dependency range and docs name 16 bus Operators.

`@geoalgeria/buses` 2.2.0 adds ETUS-C Constantine and ETUS Skikda as its fifteenth and sixteenth Operators. The umbrella's own `workspace:^` range already resolves to it, but the last published manifest pins `^2.1.1` and the published READMEs (EN/FR/AR) still say 14 Operators. This patch republishes the umbrella so the resolved range and the counts match the member package. No API change.
