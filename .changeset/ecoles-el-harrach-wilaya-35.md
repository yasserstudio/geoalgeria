---
'@geoalgeria/ecoles': patch
---

fix: re-link 3 schools mislabeled as commune El Harrach (wilaya 16) to their true communes in Boumerdes (wilaya 35) - their coordinates (3.707-3.757 E, 36.68-36.72 N) sit in Isser / Bordj Menaiel territory, ~55 km east of El Harrach. The 2.1.0 re-extract re-runs the commune join under the PIP wilaya-containment guard (PR #158), which rejects exactly this cross-wilaya shape. Closes #165.
