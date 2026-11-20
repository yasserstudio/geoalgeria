# 0004. Per-wilaya Commune outline files

- Status: Accepted (Owner, 2026-11-21)
- Context: batch 2026-17 (Admin geography), item A2 on the private tracker (#392)

The national `data/geojson/commune-boundaries.geojson` (pull request #349) holds all
1,541 Commune outlines in 3.5 MB, too heavy for a browser that needs one Wilaya. So
`geoalgeria` also publishes them cut by Wilaya, at
`data/geojson/commune-boundaries/<code>.geojson` (code 1 to 69, unpadded), each holding
that Wilaya's Commune outlines with the national file's features and properties
unchanged. The cut is written by `scripts/build-commune-boundaries.mjs` from the
national file in the same run and checked byte for byte by its `--check`; the national
file stays the only one anyone edits. The files are files only, with no function in the
JS API, and are covered by the national file's metadata and by the same ODbL part in
LICENSE and NOTICE.

## Consequences

- The folder and its file names are a published path: removing or renaming them is a
  major version of `geoalgeria`.
- Mobile Wilaya packs do not read these files. The pack builder reads the national
  file from a pinned `geoalgeria` version and cuts each Wilaya inside its own signed
  pack, so the npm layout and the pack format can change apart.
- The Web reads the national file at build time and sends one Commune's outline per
  page, so it does not depend on the split either.
- The package grows to about 19 MB unpacked (10.6 MB in 2.4.1). A test fails past
  25 MB, so the next large file is a decision, not a drift.

## Considered options

- **No split**: outside users fetch the national file. Rejected: 3.5 MB to draw one
  Wilaya on a phone.
- **A separate polygons package**: keeps `geoalgeria` light, but adds a package, three
  READMEs, licence terms and a release lane for about 4 MB. It can still be split out
  in a later major version.
- **Packs reuse the split byte for byte**: ties the signed pack format to the npm file
  layout. Rejected.
