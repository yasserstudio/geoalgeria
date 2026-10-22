// A commune postal code is ONE value repeated across eight files, and every one of
// them has to hold it.
//
// WHY THIS FILE EXISTS. scripts/fix-commune-postal-codes.mjs rebuilt the codes from
// Algérie Poste's own locator on 2026-08-07 and wrote only the four JSON tables, so
// data/geojson/communes.geojson, data/csv/communes.csv, data/sql/full.sql and the
// three data/ecommerce flattenings kept the pre-repair values: 187 communes, the
// same 187 in all six mirrors, read a different postal code depending on which
// format a consumer installed (private tracker #246). Nothing checked it, because
// every other commune guard this repository has reads a name or a point.
//
// This is the standing check, and it is deliberately a comparison and not a
// re-derivation: it asks whether every carrier says what data/algeria.json says,
// which is the only claim that makes "one value" true. Whether algeria.json itself
// holds the right code is the fix script's question, and its pins answer it.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { POSTAL_CARRIERS, postalTable } from "./lib/commune-postal-carriers.mjs";

const COMMUNE_COUNT = 1541;

test("every carrier of a commune postal code agrees with algeria.json", () => {
  const table = postalTable();
  assert.equal(table.size, COMMUNE_COUNT, "algeria.json no longer holds every commune");

  // The code-less carriers are addressed by (wilaya_code, name_fr). That pair is
  // unique over all 1,541 rows, and it is asserted rather than assumed: a collision
  // would make a disagreement invisible instead of failing.
  const byName = new Map();
  for (const [codeCommune, postal] of table) byName.set(codeCommune, postal);
  const nameKeys = new Map();
  for (const wilayaRow of POSTAL_CARRIERS.find(([label]) => label === "data/algeria.json")[1]()) {
    const key = `${Number(wilayaRow.wilaya_code)}|${wilayaRow.name_fr}`;
    assert.ok(!nameKeys.has(key), `two communes share (wilaya, name_fr) ${key}`);
    nameKeys.set(key, wilayaRow.code);
  }

  const problems = [];
  for (const [label, read] of POSTAL_CARRIERS) {
    const rows = read();
    assert.equal(rows.length, COMMUNE_COUNT, `${label}: read ${rows.length} rows, not ${COMMUNE_COUNT}`);
    const seen = new Set();
    for (const row of rows) {
      const codeCommune = row.code ?? nameKeys.get(`${Number(row.wilaya_code)}|${row.name_fr}`);
      if (codeCommune == null) {
        problems.push(`${label}: ${row.name_fr} (wilaya ${row.wilaya_code}) matches no commune of algeria.json`);
        continue;
      }
      if (seen.has(codeCommune)) problems.push(`${label}: commune ${codeCommune} appears more than once`);
      seen.add(codeCommune);
      const want = byName.get(codeCommune);
      if (row.postal_code !== want)
        problems.push(
          `${label}: ${row.name_fr} (${codeCommune}) holds ${JSON.stringify(row.postal_code)}, ` +
            `algeria.json says ${JSON.stringify(want)}`,
        );
    }
    assert.equal(seen.size, COMMUNE_COUNT, `${label}: covers ${seen.size} communes, not ${COMMUNE_COUNT}`);
  }

  assert.deepEqual(problems, [], `${problems.length} carrier row(s) disagree with algeria.json`);
});

test("the fix script agrees that every carrier is corrected", () => {
  // The same acceptance the script's own --check runs, so a carrier that drifts
  // fails here as well as under
  // `node scripts/fix-commune-postal-codes.mjs --check`. It is a different
  // question from the comparison above: this one re-derives the mapping from
  // packages/poste/data/postoffices.json and fails when the published codes are no
  // longer what the rule produces, which is what a postal refresh will trip.
  execFileSync(process.execPath, [join(import.meta.dirname, "../scripts/fix-commune-postal-codes.mjs"), "--check"], {
    stdio: "pipe",
  });
});
