---
"@geoalgeria/poste": patch
---

Reform-stale wilaya corrections (yasserstudio/geoalgeria.com#209): records whose source still files them under the wilaya their commune belonged to before the 2026 reform (law 26-06, JO 25; presidential decree 26-206, JO 40) now carry the current wilaya, with the commune the correction was derived from. Each is a reviewed decision in `quality/overrides/poste.json`, so a regeneration reapplies it and stops if the source's own value has moved. No id changes.
