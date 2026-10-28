// MESRS BAC 2026 placement file: the second identity source for this package.
//
// www.mesrs.dz was unreachable from the build machine on 2026-10-27/28, but the
// ministry's own BAC 2026 placement file is published and reachable:
//
//   "Moyennes minimales BAC 2026 (suite à la première phase)", MESRS, 350 pages
//   https://www.esi.dz/wp-content/uploads/2026/07/BAC-2026-Fichier-des-moyennes-minimales-apres-phase-1.pdf
//
// Every offer in that file names the institution it belongs to by the ministry's
// own establishment code ("Code Etb": C02, P08, U50 …) and its official French
// name, so the file states which institutions the MESRS network currently holds.
// It carries no address, no coordinate and no Arabic name.
//
// What is committed is a RIGHTS-SAFE PROJECTION of its institution rows, exactly
// the two factual fields the build consumes (`code`, `name`), never the PDF and
// never the per-filière minimum averages. The manifest records the PDF's own URL,
// SHA-256, byte count and page count, so the evidence stays auditable without
// redistributing the document (sources/README.md, "Rules").
//
// The projection is the AUTHORITY for a supplemented record's French name:
// `assertBacName()` below refuses any name in seeds/bac-2026.json that does not
// fold to the row the ministry published under that code, so a published name can
// never drift from the committed source.
//
// Usage:
//   node scripts/bac-2026.mjs --capture <rows.json>   rewrite the capture
//     where <rows.json> is { rows: [{ code, name }, …] } extracted from the PDF
//     above; extraction is documented in README.md ("Source").

import { readFileSync } from "node:fs";
import { writeCapture, readCapture, captureMeta } from "../../../scripts/lib/source-store.mjs";

export const SOURCE = "bac-2026";
export const PAGE_BAC =
  "https://www.esi.dz/wp-content/uploads/2026/07/BAC-2026-Fichier-des-moyennes-minimales-apres-phase-1.pdf";

// The ministry's establishment code: one letter then two digits (C02, P08, W91).
const CODE_RE = /^[A-Z]\d{2}$/;

/** The committed projection as `Map(code -> official French name, as published)`. */
export function readBacInstitutions() {
  const payload = readCapture("enseignement-superieur", SOURCE);
  const rows = Array.isArray(payload?.rows) ? payload.rows : null;
  if (!rows?.length) throw new Error(`sources/enseignement-superieur/${SOURCE}.json: no rows`);
  const out = new Map();
  for (const row of rows) {
    if (!CODE_RE.test(String(row?.code)) || !String(row?.name || "").trim())
      throw new Error(`sources/enseignement-superieur/${SOURCE}.json: malformed row ${JSON.stringify(row)}`);
    if (out.has(row.code))
      throw new Error(`sources/enseignement-superieur/${SOURCE}.json: duplicate code ${row.code}`);
    out.set(row.code, row.name);
  }
  return out;
}

/** The capture's manifest entry (url, retrieved, sha256, note), for the metadata. */
export const bacMeta = () => captureMeta("enseignement-superieur", SOURCE);

// Fold a name to what it says rather than how it is typed: the PDF publishes
// names in accentless upper case, with apostrophes flattened to spaces and the
// institution's acronym sometimes trailing ("… DE SAIDA (E.N.S)"), while a
// published record carries properly accented, properly cased French. Folding both
// sides lets the capture stay the authority for the name without the build having
// to reinvent French capitalisation from upper case.
//
// One-letter tokens are dropped, because they are exactly what the flattening
// destroys: the source writes the same place as "ALGER" in one row and "D ALGER"
// in the next, and a letter-by-letter acronym ("E N S") survives the fold as
// nothing else. Dropping them keeps the gate on the words, which is where a real
// difference lives: "ingénierie (Annaba)" passes and "ingénierie de Annaba" does
// not, because "de" is a word the ministry did not write.
export const foldBacName = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 1)
    .join(" ");

/**
 * Refuse a supplemented name that is not the one the ministry published under
 * that code. This is what makes seeds/bac-2026.json a casing/accent layer over
 * the committed source instead of a second, hand-written identity.
 *
 * `sourceSpelling` is the narrow, declared exception for a misspelling in the
 * placement file itself: the seed must quote the ministry's row verbatim, the
 * quote is checked against the committed capture character for character, and
 * only then may the published name differ from it. So a typo is corrected in the
 * open, and the correction stops applying the moment the ministry fixes its file.
 */
export function assertBacName(code, name, bac, where, sourceSpelling = null) {
  const published = bac.get(code);
  if (published == null)
    throw new Error(`${where}: code ${code} is not in the committed BAC 2026 projection`);
  if (sourceSpelling != null) {
    if (sourceSpelling !== published)
      throw new Error(
        `${where}: ${code} source_spelling is no longer the committed BAC 2026 row\n` +
          `  seed quotes: ${sourceSpelling}\n  source says:  ${published}\n` +
          "  drop or update the exception",
      );
    return published;
  }
  if (foldBacName(published) !== foldBacName(name))
    throw new Error(
      `${where}: ${code} name does not match the committed BAC 2026 row\n` +
        `  seed:    ${name}\n  source:  ${published}\n` +
        `  folded:  ${foldBacName(name)}\n  folded:  ${foldBacName(published)}`,
    );
  return published;
}

// --- capture (manual, documented in README.md) -------------------------------
if (process.argv.includes("--capture")) {
  const file = process.argv[process.argv.indexOf("--capture") + 1];
  if (!file) throw new Error("--capture needs the extracted rows JSON path");
  const { rows, pdf } = JSON.parse(readFileSync(file, "utf-8"));
  const sorted = [...rows]
    .map((r) => ({ code: String(r.code), name: String(r.name) }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const out = writeCapture("enseignement-superieur", SOURCE, { rows: sorted }, {
    url: PAGE_BAC,
    retrieved: "2026-10-28",
    records: sorted.length,
    note:
      "Rights-safe projection of the institution rows of the MESRS BAC 2026 placement file " +
      `(PDF sha256 ${pdf.pdf_sha256}, ${pdf.pdf_bytes} bytes, ${pdf.pdf_pages} pages): the ` +
      "ministry's establishment code and official French name only. The per-filiere minimum " +
      "averages, the paramedical INFSPM/INFSSF rows (R codes) and the twin-offer pseudo-codes " +
      "(F codes) are not projected. The PDF itself is not committed.",
  });
  console.log(`wrote ${out} (${sorted.length} institution rows)`);
}
