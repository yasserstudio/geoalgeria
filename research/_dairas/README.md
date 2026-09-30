# research/_dairas: the official daira lists

Tracked provenance for the daira table of `packages/dataset`, which is a joined
table: `data/dairas.json` holds the rows, and every commune record names its
daira in a `daira` field that the carriers repeat.

## decree-26-253.json

The annex of **decret executif n 26-253 du 30 Moharram 1448 correspondant au
15 juillet 2026**, modifying and supplementing decret executif n 91-306 du
24 aout 1991 fixing the list of communes each daira chief administers. Published
in the **Journal officiel de la Republique algerienne n 52 of 21 July 2026**
(French edition), decree on pages 9 to 10, annex on pages 10 to 16.

The annex is the first post-2026-reform text that states daira membership. It
covers wilayas **3, 5, 7, 12, 13, 14, 17, 26, 28, 32 and 59 to 69** as tables,
and names the rest in nine `(sans changement ...)` notes that leave them under
their 91-306 list. The notes and the tables together cover wilayas 1 to 69
exactly, which `extract_decree_26_253.py` asserts.

What the file holds, per annexed wilaya: the printed wilaya heading, and each
daira as its printed seat plus its member communes **as printed**, in printed
order. Nothing is normalised here; matching the printed spellings to our commune
records is `scripts/lib/decree-26-253.mjs`.

### The PDF is not committed

`.gitignore` excludes `research/**/*.pdf`, and joradp.dz declines automated
fetches, so this is an owner-supplied artifact with no fetchable URL: the
`source` block records `provenance: "owner_supplied_artifact"`, a null `url`,
and the size and SHA-256 of the PDF the extract was built from, per the rule in
[`sources/README.md`](../../sources/README.md). Re-running the extraction needs
that same PDF:

```sh
pip install pymupdf pypdf          # tested with PyMuPDF 1.28.2, pypdf 6.19
python3 research/_dairas/extract_decree_26_253.py path/to/JORA-2026-052-fr.pdf
```

### Why the extraction is not a plain text dump

The annex prints a two-column table per wilaya, `Sieges` beside `Communes a
animer par chaque chef de daira concerne`. A text extraction interleaves the two
columns and loses which communes sit in which cell, so the tables are read
through their ruled cells and only the headings and notes through text
positions, both in print reading order: left column top to bottom, then right.
A table with no heading above it continues the previous wilaya, which is how
Batna, Tebessa, Tlemcen, Medea and Bou Saada run across a column break.

Two crosschecks make a mis-paired cell fail loudly rather than ship: every seat
must be the first commune listed in its own cell, and the wilaya coverage must
come to 1 to 69 with no wilaya named twice.

## What the decree settles, and what it does not

It settles the daira list of the 21 annexed wilayas: **142 dairas**. It does not
restate the other 48 wilayas' lists, it points at 91-306 as amended, so the
national total stays this dataset's own count rather than an official figure.
See `packages/dataset/README.md`.
