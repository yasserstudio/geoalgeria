# @geoalgeria/culture

## 1.0.0

Algeria's cultural atlas — 1,083 places from the Ministry of Culture's Patrimoine Culturel portal, bilingual FR/AR, fully geocoded.

### Added

- **1,083 cultural places** across **66 of Algeria's 69 wilayas**, every place carrying a source coordinate (`geo_precision: "source_point"`) — **100% bilingual** (French + Arabic). Places the portal still files under pre-2019 wilaya codes are rescoped to the current 69-wilaya scheme (Law 26-06) by nearest-commune geography (e.g. Timimoun, Touggourt, Djanet, Ksar El Boukhari).
- **11 typed layers** in two categories. **Heritage (943):** protected cultural property 580, libraries 257, museums 48, theatres 45, museums of the Moudjahid 13. **Establishments (140):** maisons de culture 51, culture directorates 33, cinemas 20, cultural centres 15, arts schools 15, palais de culture 6.
- `has_virtual_tour` flag — 22 places offer a 360° virtual tour on the portal.
- Commune/wilaya linkage: wilaya is exact (from the portal); commune is nearest-centroid from the GeoAlgeria commune set.
- Stable `{wilaya_code}-{type_code}-{seq}` ids, portal deep links, and FR/AR node ids.
- Shipped as JSON, CSV, GeoJSON, and TypeScript definitions.
