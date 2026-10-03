#!/usr/bin/env node
// Write the exceptions list test/record-in-declared-wilaya.test.mjs holds the data to.
//
// WHY THE GUARD EXISTS. Moving 245 commune centres in the 2026-09-29 batch moved
// published records into communes and wilayas they are demonstrably not in, because the
// joins were unrestricted nearest-centroid: a centre that moves stops being the nearest
// for everything around where it was. The join was replaced
// (scripts/lib/commune-resolver.mjs), and this guard is the ratchet that keeps it
// replaced, over every record in every package rather than over the ones a review
// happened to open.
//
// WHY IT CHECKS THE COMMUNE OUTLINE FIRST. Its first version checked only the shipped
// wilaya polygon, and the shipped wilaya 55 polygon is wrong by about 50 km
// (yasserstudio/geoalgeria.com#171). Records wrongly re-attributed to N'goussa in wilaya
// 30 are inside the wilaya 30 polygon, so that guard passed every one of them. The
// commune outline is the finer claim and does not depend on the wilaya polygons at all.
//
// WHY THE EXCEPTIONS ARE NOT A TOLERANCE. Every row listed here is a defect, and the
// list says which kind and which clause of the join decides it today. They fall into
// three classes:
//
//   source text    a package whose `wilaya_code` comes from the SOURCE'S OWN TEXT, not
//                  from geometry, so its coordinate and its attribution are two
//                  independent claims and the guard has caught them disagreeing.
//                  Deciding which one is wrong needs the source (a ministry register, an
//                  operator's own list), not a re-join.
//   kept by rule   a row the join deliberately refuses to move: `kept_low_precision` (a
//                  coordinate too rounded to join on) or `kept_no_outline` (a commune
//                  OpenStreetMap ships no relation for). Keeping a published claim that
//                  cannot be disproved is the intended behaviour, and the row is listed
//                  rather than hidden.
//   seam           a point inside the reduced outline's own error at a commune border.
//
// Each row also carries `pre_existing`, recomputed by running the same rule over the
// same file at origin/main: those are for yasserstudio/geoalgeria.com#209 and this batch
// neither corrects nor hides them. A row without it is one this batch created, and the
// target is none.
//
// THE DATASET'S OWN COMMUNE CENTRES ARE NOT HERE. They are held by
// test/commune-in-boundary.test.mjs and test/commune-centre-in-commune.test.mjs,
// which carry their own exceptions; a second guard over the same rows would only
// disagree with the first.
//
// USAGE
//   node scripts/build-wilaya-containment-exceptions.mjs           # report
//   node scripts/build-wilaya-containment-exceptions.mjs --write   # write the file

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { communeResolver } from "./lib/build-utils.mjs";
import { RECORD_FILES, containmentViolations, recordsOf } from "../test/lib/wilaya-containment.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "research", "_wilaya-containment", "record-exceptions.json");
const WRITE = process.argv.includes("--write");
const REF = "origin/main";

const resolver = communeResolver();

// Why each file's rows are listed rather than corrected, where the answer is a property
// of the package rather than of the row. Keyed by the package.
const REASONS = {
  banques:
    "the branch's wilaya comes from each bank's own branch list, and its coordinate from a separate geocode; the two disagree here and only the bank can say which is wrong",
  cliniques:
    "a row the join refuses to move: its commune has no OpenStreetMap relation, or the point sits inside the reduced outline's own error at a commune seam, so the published attribution is the only claim there is",
  culture:
    "a row the join refuses to move: the patrimoine portal ships whole-degree placeholder coordinates for a handful of sites, and a join on a 100 km square is arithmetic on a guess",
  ecoles:
    "a row the join refuses to move: its commune has no OpenStreetMap relation (Bir Touta, Collo, Souk Oufella, Dhayet Bendhahoua), or its coordinate carries fewer than three decimals",
  emploi:
    "ANEM publishes the agency's wilaya as a field and its address separately; the coordinate is geocoded from the address, so a disagreement is an address or a geocode to re-check against ANEM, not a re-join",
  ferroviaire:
    "a row the join refuses to move: a station whose coordinate carries fewer than three decimals, or whose commune has no OpenStreetMap relation",
  "gares-routieres":
    "a row the join refuses to move: a SOGRAL station whose coordinate carries fewer than three decimals",
  jeunesse:
    "the establishment's wilaya is the ministry register's own column and the coordinate was geocoded from the same row's locality, so the two are independent claims and the register decides",
  mosquees:
    "a row the join refuses to move: its commune has no OpenStreetMap relation, or its coordinate carries fewer than three decimals; plus a few points inside the reduced outline's own error at a commune seam",
  ooredoo:
    "a row the join refuses to move: Ooredoo's own store feed rounds some coordinates to two decimals, which is about 1 km of ambiguity, and the operator's declared commune is kept instead",
  pharmacies:
    "a row the join refuses to move: its commune has no OpenStreetMap relation, or the point sits inside the reduced outline's own error at a commune seam",
  poste:
    "Algérie Poste's own office and ATM lists carry the wilaya and the commune; the coordinate is the operator's, and a disagreement is a row for the operator, not for this join",
  "protection-civile":
    "the unit's wilaya and commune are the DGPC's own fields in dgpc.dz/dgpc2/unite.geojson, shipped beside the DGPC's own coordinate; both are the same authority's claim and correcting either needs the DGPC",
  sante:
    "the facility's wilaya and commune come from the MSP's own posts, matched on the locality text rather than on geometry, and its coordinate is geocoded; re-pairing those posts retires published ids, which a coordinate correction is not the release for",
  sports:
    "the facility's wilaya is the ministry register's own column, its coordinate geocoded from the same row, so a disagreement is a register row to re-check",
  telecom:
    "the operator's 5G coverage export carries its own wilaya label per point; the label and the point are both the operator's, so a disagreement is theirs to resolve",
  tourisme:
    "the attraction's wilaya comes from the source listing's own wilaya field while the coordinate is OpenStreetMap's, and for a natural feature that straddles a border the listing is often right and the polygon crude",
};

/** The same rule over the same file at `REF`, so a row can say whether this batch
 *  created it. Null when the file does not exist there. */
function violationIdsAtRef(file) {
  let parsed;
  try {
    parsed = JSON.parse(execFileSync("git", ["show", `${REF}:${file}`], { cwd: ROOT, maxBuffer: 1 << 30 }).toString());
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const rows = [];
  for (const r of parsed) {
    if (!r || typeof r !== "object") continue;
    const lat = r.lat ?? r.latitude;
    const lng = r.lng ?? r.longitude;
    if (r.wilaya_code == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    rows.push({
      id: r.id ?? r.name ?? null,
      wilaya_code: String(r.wilaya_code).padStart(2, "0"),
      commune_code: r.commune_code ?? null,
      lat,
      lng,
      row: r,
    });
  }
  return new Set(containmentViolations(rows, resolver).map((v) => v.id));
}

const files = RECORD_FILES(ROOT);
const groups = [];
let total = 0;
let created = 0;
for (const file of files) {
  const rows = recordsOf(ROOT, file);
  const bad = containmentViolations(rows, resolver);
  if (!bad.length) continue;
  const pkg = file.split("/")[1];
  const reason = REASONS[pkg];
  if (!reason) {
    throw new Error(
      `${file}: ${bad.length} record(s) their own geometry contradicts and no reason stated for package "${pkg}". ` +
        "Either the generator should be re-run so the join fixes them, or add the reason to REASONS in this script.",
    );
  }
  const before = violationIdsAtRef(file);
  const records = bad.map((v) => ({ ...v, pre_existing: before == null ? null : before.has(v.id) }));
  const kinds = {};
  const rules = {};
  for (const v of records) {
    kinds[v.kind] = (kinds[v.kind] ?? 0) + 1;
    rules[v.rule] = (rules[v.rule] ?? 0) + 1;
    if (v.pre_existing === false) created++;
  }
  groups.push({
    file,
    package: pkg,
    count: records.length,
    pre_existing: records.filter((v) => v.pre_existing === true).length,
    created_by_this_batch: records.filter((v) => v.pre_existing === false).length,
    kinds,
    rules,
    reason,
    records,
  });
  total += records.length;
}

const doc = {
  generated: "2026-10-01",
  guard: "test/record-in-declared-wilaya.test.mjs",
  ref: REF,
  note:
    "Published records their own geometry contradicts. `kind: commune_outline` is a coordinate outside the " +
    "OpenStreetMap outline of the commune the record names; `kind: wilaya_polygon` is a record with no commune " +
    "outline to check whose coordinate is inside a different wilaya's shipped polygon. Every row is a defect, not a " +
    "tolerance: `rule` names the clause of scripts/lib/commune-resolver.mjs that decides it today, and the group's " +
    "reason says which two claims disagree and who can settle it. `pre_existing` is recomputed by running the same " +
    "rule over the same file at origin/main, so a row this batch created cannot hide among the rows it inherited " +
    "(those are yasserstudio/geoalgeria.com#209). Records with no commune outline whose coordinate is inside NO " +
    "wilaya polygon are not listed and not failed, because the 69 shipped outlines are display-grade (mapshaper " +
    "`dp 2% keep-shapes`, a 3.4 km median vertex gap) and cut inside the shoreline. Regenerate with " +
    "`node scripts/build-wilaya-containment-exceptions.mjs --write`.",
  files_checked: files.length,
  count: total,
  pre_existing: groups.reduce((n, g) => n + g.pre_existing, 0),
  created_by_this_batch: created,
  groups,
};

console.log(
  `${files.length} record file(s) checked, ${total} record(s) their own geometry contradicts ` +
    `(${doc.pre_existing} pre-existing, ${created} created by this batch)`,
);
for (const g of groups) {
  console.log(`  ${g.file}: ${g.count} (${g.created_by_this_batch} new) ${JSON.stringify(g.kinds)} ${JSON.stringify(g.rules)}`);
}
if (WRITE) {
  writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`wrote ${OUT}`);
}
