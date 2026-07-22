# @geoalgeria/protection-civile

## 1.0.0

Algeria's Protection Civile (civil protection / fire & rescue) units — 880 units
nationwide from the DGPC's own dataset (dgpc.dz), official-primary, on the v2
record contract.

### Added

- **880 Protection Civile units** across all wilayas from the **DGPC** GeoJSON
  (`dgpc.dz/dgpc2/unite.geojson`), each with an Arabic name, address, phone, fax
  and a status tier (`statut`, 10 tiers). Evidence type **official**.
- Every unit geocoded from the DGPC's own decimal coordinate — 853 `exact`, 27
  `approximate` (coincident points honestly demoted).
- **Wilaya derived by point-in-polygon** against the 69 post-2026-reform
  boundaries, then cross-checked against the DGPC's own code: units in the 11 new
  wilayas carry their correct new code, and where geometry and the DGPC code
  disagree among pre-reform codes (a border unit misfiled by a simplified outline)
  the DGPC's official code wins. The DGPC's `cod_wilaya` is preserved in
  `refs.dgpc_wilaya`. Commune best-effort (Arabic name match, nearest-centroid
  fallback), stable `{wilaya}-{seq}` ids.
- JSON, CSV, GeoJSON, TypeScript types, and a `npm run fetch` rebuild script.
- Government content © DGPC — no open licence; published as a factual public
  listing with attribution (`conditionsOfAccess` in the discovery descriptor).
