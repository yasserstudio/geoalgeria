---
"geoalgeria": minor
---

Add `data/fires/burned-area.json`, read by `require("geoalgeria").burnedArea`: hectares burned per wilaya and month since January 2001, for the 69 wilayas. The burned cells are NASA MODIS MCD64A1 v061 (DOI 10.5067/MODIS/MCD64A1.061), counted inside the detailed wilaya outlines, so the file is ODbL 1.0. Cells that NASA MCD12Q1 land cover calls snow, barren or water are left out. National totals from 2002 to 2024 are within 1% of the GWIS country totals (EU JRC GWIS, CC BY 4.0, used as a check).
