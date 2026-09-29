#!/usr/bin/env node
// Write the exceptions list test/record-in-declared-wilaya.test.mjs holds the data to.
//
// WHY THE GUARD EXISTS. Moving 245 commune centres in the 2026-09-29 batch moved 58
// published records into a wilaya whose polygon does not contain them, because the
// joins were unrestricted nearest-centroid: a centre that moves stops being the
// nearest for everything around where it was. The join was fixed
// (scripts/lib/build-utils.mjs resolveCommune), and this guard is the ratchet that
// keeps it fixed, over every record in every package rather than over the ones a
// review happened to open.
//
// WHY THE EXCEPTIONS ARE NOT A TOLERANCE. Every row listed here is a defect, and the
// list says which kind. They are overwhelmingly one kind: a package whose
// `wilaya_code` comes from the SOURCE'S OWN TEXT, not from geometry, so its
// coordinate and its attribution are two independent claims and the guard has caught
// them disagreeing. Deciding which one is wrong needs the source (a ministry
// register, an operator's own list), not a re-join, so this batch corrects none of
// them and hides none of them either.
//
// THE DATASET'S OWN COMMUNE CENTRES ARE NOT HERE. They are held by
// test/commune-in-boundary.test.mjs and test/commune-centre-in-commune.test.mjs,
// which carry their own exceptions; a second guard over the same rows would only
// disagree with the first.
//
// USAGE
//   node scripts/build-wilaya-containment-exceptions.mjs           # report
//   node scripts/build-wilaya-containment-exceptions.mjs --write   # write the file

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { containingWilayaCode } from "./lib/build-utils.mjs";
import { RECORD_FILES, recordsOf, violationsIn } from "../test/lib/wilaya-containment.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "research", "_wilaya-containment", "record-exceptions.json");
const WRITE = process.argv.includes("--write");

// Why each file's rows are listed rather than corrected. Keyed by the package, since
// the answer is a property of where that package's `wilaya_code` comes from.
const REASONS = {
  banques:
    "the branch's wilaya comes from each bank's own branch list, and its coordinate from a separate geocode; the two disagree here and only the bank can say which is wrong",
  emploi:
    "ANEM publishes the agency's wilaya as a field and its address separately; the coordinate is geocoded from the address, so a disagreement is an address or a geocode to re-check against ANEM, not a re-join",
  jeunesse:
    "the establishment's wilaya is the ministry register's own column and the coordinate was geocoded from the same row's locality, so the two are independent claims and the register decides",
  poste:
    "Algérie Poste's own office and ATM lists carry the wilaya; the coordinate is the operator's, and a disagreement is a row for the operator, not for this join",
  "protection-civile":
    "the unit's wilaya is the DGPC's own field in dgpc.dz/dgpc2/unite.geojson, shipped beside the DGPC's own coordinate; both are the same authority's claim and correcting either needs the DGPC",
  sante:
    "the facility's wilaya and commune come from the MSP's own posts, matched on the locality text rather than on geometry, and its coordinate is geocoded; re-pairing those posts retires published ids, which a coordinate correction is not the release for",
  sports:
    "the facility's wilaya is the ministry register's own column, its coordinate geocoded from the same row, so a disagreement is a register row to re-check",
  telecom:
    "the operator's 5G coverage export carries its own wilaya label per point; the label and the point are both the operator's, so a disagreement is theirs to resolve",
  tourisme:
    "the attraction's wilaya comes from the source listing's own wilaya field while the coordinate is OpenStreetMap's, and for a natural feature that straddles a border the listing is often right and the polygon crude",
};

const files = RECORD_FILES(ROOT);
const groups = [];
let total = 0;
for (const file of files) {
  const rows = recordsOf(ROOT, file);
  const bad = violationsIn(rows, containingWilayaCode);
  if (!bad.length) continue;
  const pkg = file.split("/")[1];
  const reason = REASONS[pkg];
  if (!reason) {
    throw new Error(
      `${file}: ${bad.length} record(s) outside their declared wilaya and no reason stated for package "${pkg}". ` +
        "Either the generator should be re-run so the join fixes them, or add the reason to REASONS in this script.",
    );
  }
  groups.push({ file, package: pkg, count: bad.length, reason, records: bad });
  total += bad.length;
}

const doc = {
  generated: "2026-09-29",
  guard: "test/record-in-declared-wilaya.test.mjs",
  note:
    "Published records whose coordinate is inside a wilaya polygon other than the one they declare. Every row is a " +
    "defect, not a tolerance: the reason per group says which two claims disagree and who can settle it. Records " +
    "whose coordinate is inside NO wilaya polygon are not listed and not failed, because the 69 shipped outlines " +
    "are display-grade (mapshaper `dp 2% keep-shapes`, a 3.4 km median vertex gap) and cut inside the shoreline. " +
    "Regenerate with `node scripts/build-wilaya-containment-exceptions.mjs --write`.",
  files_checked: files.length,
  count: total,
  groups,
};

console.log(`${files.length} record file(s) checked, ${total} record(s) outside their declared wilaya`);
for (const g of groups) console.log(`  ${g.file}: ${g.count}`);
if (WRITE) {
  writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`wrote ${OUT}`);
}
