# Pharma sector — landscape & build plan

**Date:** 2026-07-05 · **Scope:** the planned **major Pharma release** — a new sector
covering **retail pharmacies + medicine-production companies (manufacturers) + medical
labs + the wider pharmaceutical-establishment registry**. Parallels the Transport sector
(shipped as 4 packages under an umbrella at v1.7.0).

> Positioning: Ooredoo is the small **v1.9.0 minor** bump (see `../_next-dataset/`).
> This Pharma sector is the **headline** release after it. Note: in the project's own
> SemVer it's still a **minor** (new packages, no schema break) — "major" here means
> *flagship*, not a breaking change.

All counts **queried/downloaded live 2026-07-05**. Evidence in this folder:
`mip-*.pdf` / `mip-*.txt` (the five official MIP establishment lists, downloaded here).

---

## TL;DR — proposed sector shape

| Package | What | Verified size | Source / license | Geo | Effort |
| --- | --- | --- | --- | --- | --- |
| **`@geoalgeria/pharmacies`** | Retail pharmacies (officines) | **5,573** | OSM `amenity=pharmacy` / ODbL | ✅ fully geocoded | **Med** — flagship |
| **`@geoalgeria/industrie-pharmaceutique`** | Medicine + medical-device **manufacturers** (+ optionally all establishment *roles*) | **183** manufacturers (129 PP + 54 DM); **1,199** if all roles | **MIP official** (miph.gov.dz), updated 28/06/2026 | ⚠️ commune-level via enrichment | **Med–High** |
| **`@geoalgeria/laboratoires`** | Medical-analysis laboratories | **96** in OSM (true count far higher, unmapped) | OSM `healthcare=laboratory` / ODbL | ✅ (partial) | **Low–Med** — honest partial |
| **`@geoalgeria/pharma`** | Umbrella re-export of the three | — | — | — | Low |

**Recommended first drop:** `pharmacies` (biggest, cleanest, fully geocoded) +
`industrie-pharmaceutique` (the "medicine production companies" — official, unique,
no competitor dataset exists). Add `laboratoires` + the `pharma` umbrella to round out
the sector.

> **Build status (2026-07-05):** `@geoalgeria/industrie-pharmaceutique` is **built** —
> 171 manufacturers (120 PP + 48 DM + 3 mixte), all geocoded, 25 wilayas. Pipeline:
> `build.py` (reads `mip-fabrication*.txt` + `geo-research.json`). `pharmacies`,
> `laboratoires` and the `pharma` umbrella are still to build.

---

## The two authoritative bodies (both probed live 2026-07-05)

The user surfaced these — roles now confirmed and they are **complementary, not redundant**:

| Body | Site | Live | Holds | Use to us |
| --- | --- | --- | --- | --- |
| **Ministère de l'Industrie Pharmaceutique (MIP)** | `miph.gov.dz` | ✅ (PDFs downloadable) | official lists of **establishments** (fabrication / exploitation / importation / distribution / promotion) | **the establishments geo-registry** → `industrie-pharmaceutique` |
| **Agence Nationale des Produits Pharmaceutiques (ANPP)** | `anpp.dz` | ✅ 200 | **product** registry — RCP (résumé caractéristiques produit) at `rcp.anpp.dz`, E-TASJIL registration, illicit-trade reports | product-level, **not geo** → optional non-map `medicaments` reference dataset, out of sector scope |

**Takeaway:** MIP = *places* (establishments), ANPP = *products* (medicines). The map
sector is built on **MIP**; ANPP's medicines nomenclature is a separate, non-geographic
reference dataset (note below), not a locator layer.

---

## MIP establishment registry — the five official lists (updated 28/06/2026)

Downloaded and counted live. Every list is a numbered PDF, "en mise à jour continue":

| List | `Nature`/role | **Count** | PDF (2026-06-28) |
| --- | --- | --- | --- |
| **Fabrication** | manufacturers | **183** = **129 PP** (medicines) + **54 DM** (medical devices) | `clean_AGREMENT-DE-FABRICATION-28-06-2026.pdf` |
| **Importation** | importers | **547** | `clean_AGREMENT-IMPORTATION-28-06-2026.pdf` |
| **Exploitation** | exploitation (marketing-authorisation holders) | **302** | `clean_AGREMENT-EXPLOITATION-28-06-2026.pdf` |
| **Distribution en gros** | wholesalers (grossistes répartiteurs) | **187** | `clean_AGREMENT-DE-DISTRIBUTION-EN-GROS-28-06-2026.pdf` |
| **Promotion** | medical/scientific info promotion | **34** | `clean_AGREMENT-DE-PROMOTION-28-06-2026.pdf` |
| | **Total approvals** | **~1,199** | (companies may hold several roles) |

Each fabrication record: `N° | Opérateur | Nature (PP / DM)`. The **PP/DM split is a
built-in type dimension**. Examples: `EPE SPA GROUPE INDUSTRIEL SAIDAL … (ANNABA / DAR
EL BEIDA / OUED SMAR / CHERCHEL / CONSTANTINE)`, `HIKMA PHARMA ALGERIA`, `FRATER-RAZES`,
`GLAXOSMITHKLINE ALGERIE`, `WINTHROP PHARMA SAIDAL`.

### The geocoding catch (important)

The **current** (2026-06-28) "clean" lists carry **only `Opérateur` + `Nature` — no
wilaya/commune column**. Location survives only where it's baked into the operator name
(SAIDAL **ANNABA**, LINDE GAS **SIDI BEL ABBES**). So manufacturers are an official,
current *registry*, but **coordinates need enrichment**:

1. **The 2023 MIP fabrication list DID carry a structured `Wilaya` column with commune**
   (`PETROFINA · Alger – Sidi Abed`, `GLAXOSMITHKLINE · Boumerdes – Boudouaou`) — cross-ref
   the current names against it for commune → centroid (kept in this folder as the older pull).
2. **OSM name-match** (`office=company` / industrial sites) for exact coords where mapped.
3. **Wikidata is empty here** — only **3** pharma companies in Algeria, ~0 with coords →
   not a usable geo source (unlike rail/heritage). Manufacturers are a Wikidata-dead layer.
4. Place tokens embedded in operator names as a fallback.

This mirrors `sante` / `enseignement-superieur`: **official registry gives the names,
geo comes from a join** — `geo_precision`-labelled (`commune_centroid` vs `exact`). Ship
honestly at commune precision, upgrade coords over time.

---

## Retail pharmacies — `@geoalgeria/pharmacies`

- **OSM `amenity=pharmacy` = 5,573** (verified live 2026-07-05), fully geocoded.
- **No open official geocoded directory:** `cnop.dz` (Ordre des Pharmaciens) is **down
  (000)**; there is no national officine registry with coordinates. So this is an
  **OSM-only layer with honest partial-coverage framing**, exactly like `ecoles`
  (Algeria has ~11–12k pharmacies nationally; ~5.6k are mapped → frame as ~half).
- Highest everyday-civic value of any unshipped layer; the natural **flagship** of the
  sector and the single biggest reason to do this release.

## Medical-analysis labs — `@geoalgeria/laboratoires`

- **OSM `healthcare=laboratory` = 96** (+ `healthcare=blood_donation` = 10). The true
  count of private biology/analysis labs is in the thousands, but OSM mapping is thin.
- No official geocoded directory found (private-sector, licensed by DSP/wilaya health
  directorates, not centrally published with coords).
- **Verdict:** ship small and honest, or defer to a v1.1 of the sector. Lowest priority
  of the three. Blood-transfusion centres (ANS) could fold into `sante` instead.

## Out of scope (note, don't build as a map)

- **ANPP medicines nomenclature** (registered drugs / RCP) — a *product* list, not places.
  Could become a separate non-geo `@geoalgeria/medicaments` reference dataset later, but
  it's not a locator layer and shouldn't gate this sector.
- **Importation / exploitation / distribution / promotion** establishments (1,016 rows) —
  corporate registrations, geo-thin. Best folded into `industrie-pharmaceutique` as a
  `role` field (fabricant / importateur / exploitant / distributeur / promotion) rather
  than shipped as separate map packages. Fabricants are the ones that read as "places."

---

## Naming (per `.agents/NAMING.md` — domain, not operator)

- `@geoalgeria/pharmacies` — the officine layer (domain).
- `@geoalgeria/industrie-pharmaceutique` — manufacturers/industry; **MIP is the source,
  not the name** (like ANAC→`aviation`). Carry `role` (fabricant/importateur/…) + `nature`
  (PP/DM) as fields. Alt name: `@geoalgeria/etablissements-pharmaceutiques`.
- `@geoalgeria/laboratoires` — analysis labs.
- `@geoalgeria/pharma` — umbrella re-export (mirrors `@geoalgeria/transport`).

## Suggested release plan

1. **`pharmacies`** (5,573, OSM, honest coverage) — flagship, ship first.
2. **`industrie-pharmaceutique`** (129 PP + 54 DM manufacturers; official MIP registry,
   commune-geocoded via the 2023-list + OSM join; `role`/`nature` dimensions) — the
   unique "medicine production companies" layer.
3. **`laboratoires`** (OSM, small/honest) + **`pharma`** umbrella — complete the sector.

Effort is dominated by (2)'s geocoding-enrichment join; (1) and (3) are standard OSM
extracts. Whole sector is a bigger lift than a single package — hence "major/headline."

---

## Sources

- **MIP — Ministère de l'Industrie Pharmaceutique**, "Établissements pharmaceutiques":
  `https://miph.gov.dz/fr/etablissements-pharmaceutiques/` → the five `clean_AGREMENT-*-28-06-2026.pdf`
  lists (downloaded here). Older structured list: `.../uploads/2023/02/etablissements-de-fabrication.pdf`.
- **ANPP — Agence Nationale des Produits Pharmaceutiques**: `https://anpp.dz/` (product
  registry / RCP `rcp.anpp.dz` / E-TASJIL). Live 200, product-level not geo.
- **OSM Overpass** (ODbL): `amenity=pharmacy` 5,573 · `healthcare=laboratory` 96 ·
  `healthcare=blood_donation` 10 — Algeria, 2026-07-05.
- **Wikidata** (CC0): 3 pharma companies in DZ, ~0 geocoded → not a usable source here.
- Down/unreachable 2026-07-05: `cnop.dz`, `lncpp.dz`, `saidalgroup.dz` (000).
- Context: Biopharm, Saidal, El Kendi, Frater-Razes, Merinal are the sector leaders
  (maghrebpharma.com; D&B lists 659 company profiles — the MIP agrément list is the
  authoritative *approved-establishment* subset).
