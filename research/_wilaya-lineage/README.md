# research/_wilaya-lineage: the texts behind wilaya_code_58 and wilaya_code_48

Tracked provenance for `packages/dataset/data/wilaya-lineage.json` and the two
fields every commune record repeats from it (#359). `test/wilaya-lineage.test.mjs`
holds the published data to the files here.

## creation-articles.json

The communes each creating article lists, **as printed** in the French edition,
each matched to its `code_commune`:

- **Law 19-12** (JORA n° 78 of 18 December 2019, pp. 12-15), art. 3, inserting
  arts. 52 bis to 52 bis 9 into Law 84-09: wilayas 49 to 58.
- **Law 26-06** (JORA n° 25 of 5 April 2026, pp. 4-9), art. 3 on pp. 8-9,
  inserting arts. 52 bis 10 to 52 bis 20: wilayas 59 to 69.

The test asserts that each list, read in the text, is exactly the set of communes
the dataset holds in that wilaya, and that each new wilaya's two codes are its
mother wilaya's. The one disagreement is kept as printed:
item 14 of art. 52 bis 6 (Touggourt, 55) is El Borma, which the dataset keeps in
Ouargla (30) on the ONS 2021 code 3021. `wilaya-lineage.json` records it under
`exceptions`, and the test pins it there so it cannot change silently.

## ordonnance-97-14.json

The 24 communes **Ordonnance 97-14** (JORA n° 38 of 4 June 1997, pp. 4-5)
detached from Boumerdès (art. 2, 6 communes), Tipaza (art. 3, 14) and Blida
(art. 4, 4) and attached to Alger, codes 1634 to 1657. They are why the
48-wilaya map is Law 84-09 **on the eve of Law 19-12** and not as printed in 1984:
on that map these communes read `wilaya_code_48: 16`.

## Law 84-09

Law 84-09 (JORA n° 6 of 7 February 1984, pp. 101-112) lists wilaya N's communes
in art. N + 4. It fixes the 48 codes; a commune of wilayas 1 to 48 keeps its
wilaya's code on all three maps, the 1997 transfers above included, since they
were in force on the eve of Law 19-12. The scan's
OCR merges some commune items (Guelma and Mascara counts read off by one or two),
so the 1984 lists are not extracted item by item. The test checks instead that no
creating article lists a commune of wilayas 1 to 48, that each of them keeps its
code on both earlier maps, and the transfers.

## The PDFs are not committed

`.gitignore` excludes `research/**/*.pdf`. Each extract records the URL it was
read from; the SHA-256 of each PDF read for this work:

| File | Text | SHA-256 |
|------|------|---------|
| `F1984006.pdf` | Law 84-09 | `d14ebe0fc3c6c806f9431c96f2bff463f58db78b572378c72d277671e28ab3ff` |
| `F1997038.pdf` | Ordonnance 97-14 | `2c48b0e27ad4ff305fdef188fec29350e84407a7392c036a6c39922ce47f5224` |
| `F2019078.pdf` | Law 19-12, French edition | `5a31159713aa60e49a56e2fb1a22cd33c00432ddc0f3082200f84218cb22669d` |
| `A2019078.pdf` | Law 19-12, Arabic edition (El Borma, p. 16) | `4a135bc50d460f9079ddfc361940592cbefc6406a562c81f745e1cd885464054` |
| `F2026025.pdf` | Law 26-06 | `f6d7f5261e997e490d54a1a061648a5635d3263e1f19aed50e5cd1e5ad01e46f` |
| `F2026040.pdf` | Décret 26-206 (names and seats of 59 to 69), p. 5 | `7cc0cf26f944d20138b24f7894332f2cc4c5cba260dc2303d4ba75d8c8b8f9b0` |

The URLs are `https://www.joradp.dz/FTP/jo-francais/<year>/<file>` and, for the
Arabic edition, `https://www.joradp.dz/FTP/jo-arabe/2019/A2019078.pdf`.
