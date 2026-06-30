# @geoalgeria/agriculture — sources (MADR institutional directory)

Anchor for a new **agriculture** sector — currently unrepresented in the
portfolio. One authoritative owner (MADR — Ministry of Agriculture, Rural
Development and Fisheries) spanning **7 institutional networks**, ~196 records,
extracted from the ministry's official "annuaire / دليل الهاتف" page.

## 1. Official directory (authoritative anchor)

Two Polylang translations of the **same** wpDataTables dataset (table element
ids `table_1`…`table_7`, `data-wpdatatable_id` 22–28):

- **Arabic — canonical / up-to-date** (use this for the data):
  `https://madr.gov.dz/contact/دليل-الهاتف/`
  → DSA table covers **all 58 wilayas** (incl. the 10 post-2019 southern wilayas).
- **French — use only for bilingual category labels:**
  `https://fr.madr.gov.dz/contact/annuaire/`
  → DSA table is **stale at 48 wilayas**; section titles give the FR side of each label.

Both reachable from the sandbox/CI (HTTP 200, unlike Ooredoo's WAF). Data is
**static HTML** in `<tbody>` (wpDataTables also expose Print/Excel/CSV/Copy
buttons on the FR page) — no JS execution needed. Raw pages saved in `raw/`,
parsed by `parse.py` → `csv/`. Snapshot: **2026-06-30**.

## 2. The 7 networks

| # | CSV | Category — AR ⇄ FR | Records (AR) | Wilaya coverage |
| --- | --- | --- | --- | --- |
| 1 | `01-dsa.csv` | مديريات المصالح الفلاحية ⇄ **Directions des Services Agricoles (DSA)** | **58** | all 58 ✅ |
| 2 | `02-conservations-forets.csv` | محافظات الغابات ⇄ **Conservations des Forêts** | 48 | pre-2019 48 |
| 3 | `03-instituts-recherche.csv` | المعاهد التقنية والبحث العلمي ⇄ **Instituts techniques et recherche scientifique** | 16 | national (INRAA, INRF, CNCC, CNIAAG, INMV, INPV, INSID, INVA, ITAFV, ITCMI, ITELV, ITGC, ENAF, ITDAS, HCDS, CDARS) |
| 4 | `04-instituts-formation.csv` | المعاهد و المراكز التكوينية ⇄ **Instituts et centres de formation** | 11 | ITMAS ×7 + CFATSF ×2 + CFVA ×2 |
| 5 | `05-chambres-agriculture.csv` | الغرفة الوطنية + الغرف الفلاحية الولائية ⇄ **Chambre Nationale + Chambres d'Agriculture d'État** | 49 | ~48 wilayas + CNA |
| 6 | `06-operateurs-publics.csv` | المتعاملين الاقتصاديين العموميين ⇄ **Opérateurs économiques publics** | 4 | OAIC, ONIL, ONILEV, ONTA |
| 7 | `07-complexes.csv` | المجمعات ⇄ **Les complexes** | 10 | GVAPRO, AGROLOG, GIPLAIT, GGR + filiales (SARBO, SOTRAVIT, SUDACO, AGRAL/AM, SAO, SAGRODEV) |

**Total: 196 institutions.**

## 3. Record shape

Per-record fields vary by network but always include **wilaya + address +
phone (+ fax)**; institutes/offices/groups also carry a **Latin abbreviation**
and an **Arabic name**. The DSA / forêts / chambres rows have *no name field* —
just wilaya + address.

- **No coordinates.** Address-only registry → geocode at build via **OSM +
  Wikidata**, labelled with `geo_precision` (the shipped `sante` /
  `enseignement-superieur` / `formation-professionnelle` pattern).
- **Language:** data is Arabic-primary + Latin abbreviations. Bilingual naming
  comes "for free" at the **category** level (the 7 AR⇄FR pairs above) and the
  **abbreviation** level; per-record FR names need transliteration.

## 4. Coverage caveat (per-network, not uniform)

Only **DSA** is fully 58 wilayas. Forêts (48) and Chambres (49) still use the
pre-2019 administrative division — the 10 new southern wilayas (Timimoun, Bordj
Badji Mokhtar, Ouled Djellal, Béni Abbès, In Salah, In Guezzam, Touggourt,
Djanet, El M'Ghair, El Meniaa) fold into their parent wilayas there. Carry a
per-network `wilaya_coverage` note rather than assuming 58 everywhere.

## 5. Known source errors (clean in a normalization pass)

- **Conservations des Forêts (`02`)** mislabelled `المحافظة` (conservation name):
  - Batna (row) → "محافظة الغابات **عنابة**" (should be Batna)
  - Sétif (row) → "محافظة الغابات **سعيدة**" (should be Sétif)
  - plus minor spelling drift (`غليزي`→إليزي, `تمراست`→تمنراست, `تيسة`→تبسة).
- **Wilaya-name typos** in chambres (`05`): `عنلبة`→عنابة, `بجابة`→بجاية.
- A few phone/fax cells empty or with stray leading spaces.

These are cosmetic; the wilaya column is otherwise clean enough to spatial-join.

## 6. Build pipeline (proposed)

1. `parse.py` (Arabic page) → 7 CSVs of base records `{network, wilaya, name_ar,
   abbr, address, phone, fax}`.
2. Normalize wilaya names → official `code_wilaya` (fix the typos above); attach
   the bilingual `network` label (AR + FR) from §2; stamp `wilaya_coverage`.
3. Geocode: OSM (`amenity`/`office` + name/address) → Wikidata fallback →
   address-centroid fallback; per-record `geo_precision` + provenance.
4. Emit unified records with `sector: "public"`, `type` = network slug.
   metadata.json frames counts vs the MADR directory.

## 7. Draft ROADMAP entry

> **Agriculture (new sector)** — `@geoalgeria/agriculture` — MADR official
> annuaire (`madr.gov.dz/contact/دليل-الهاتف/`, bilingual via `fr.madr.gov.dz`).
> ~196 institutions across 7 networks: DSA (58) · Conservations des Forêts (48) ·
> technical/research institutes (16) · training institutes (11) · Chambres
> d'Agriculture + CNA (49) · public offices (4) · public groups (10). Clean
> wpDataTables (CSV export), sandbox-reachable, addresses → geocode via OSM+WD.
> Effort: Low–Medium. See `research/agriculture/`.

## Files

- `raw/annuaire-ar.html` — Arabic page (canonical, 58-wilaya DSA)
- `raw/annuaire-fr.html` — French page (bilingual labels; DSA stale at 48)
- `parse.py` — extractor (Arabic page → CSVs)
- `csv/01-…07-*.csv` — the 7 networks, 196 records
