// A wilaya postal code is ONE value repeated across five files, and every one of
// them has to hold the chef-lieu commune's code.
//
// WHY THIS FILE EXISTS. Wilayas 1 to 48 published their chef-lieu's code and the 21
// created in 2019 and 2026 published a synthetic `NN000` built from the wilaya's own
// number: 49000, 59000, 69000. No Algérie Poste office holds any of the 21, and each
// wilaya's own chef-lieu contradicted it, wilaya 59 Aflou publishing 59000 beside
// commune 319 Aflou's real 03001 (private tracker #293). Nothing checked it, because
// test/commune-postal-carriers.test.mjs reads the commune rows and deliberately
// leaves the wilaya rows alone.
//
// This is the standing check, and it is deliberately a comparison and not a
// re-derivation: it asks whether every carrier says what the wilaya's chef-lieu
// says, which is the only claim that makes "one value" true. Whether the chef-lieu
// itself holds the right code is the commune guard's question, and its pins answer
// it.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { WILAYA_POSTAL_CARRIERS, chefLieuPostalTable } from "./lib/wilaya-postal-carriers.mjs";

const WILAYA_COUNT = 69;

test("every carrier of a wilaya postal code agrees with the chef-lieu commune", () => {
  const table = chefLieuPostalTable();
  assert.equal(table.size, WILAYA_COUNT, "algeria.json no longer holds every wilaya");

  const problems = [];
  for (const [code, { postal_code: postal, seat }] of table) {
    if (!seat) problems.push(`wilaya ${code}: capital_commune_code matches no commune of algeria.json`);
    else if (postal === null) problems.push(`wilaya ${code}: chef-lieu ${seat.name_fr} carries no postal code`);
  }
  assert.deepEqual(problems, [], "every wilaya needs a chef-lieu with a postal code before the carriers can agree");

  for (const [label, read] of WILAYA_POSTAL_CARRIERS) {
    const rows = read();
    assert.equal(rows.length, WILAYA_COUNT, `${label}: read ${rows.length} rows, not ${WILAYA_COUNT}`);
    const seen = new Set();
    for (const row of rows) {
      assert.ok(table.has(row.code), `${label}: wilaya ${row.code} matches no wilaya of algeria.json`);
      assert.ok(!seen.has(row.code), `${label}: wilaya ${row.code} appears more than once`);
      seen.add(row.code);
      const { postal_code: want, seat } = table.get(row.code);
      if (row.postal_code !== want)
        problems.push(
          `${label}: wilaya ${row.code} holds ${JSON.stringify(row.postal_code)}, ` +
            `its chef-lieu ${seat.name_fr} (${seat.code_commune}) says ${JSON.stringify(want)}`,
        );
    }
    assert.equal(seen.size, WILAYA_COUNT, `${label}: covers ${seen.size} wilayas, not ${WILAYA_COUNT}`);
  }

  assert.deepEqual(problems, [], `${problems.length} carrier row(s) disagree with their chef-lieu`);
});

test("no wilaya publishes the synthetic NN000 code the fix replaced", () => {
  // Named rather than left to the comparison above, because the two could both pass
  // on a regression that put `NN000` back into the chef-lieu as well: the carriers
  // would agree with each other and with a fabricated value. No Algérie Poste office
  // holds any of the 21, which is what made them fabrications.
  const offenders = [];
  for (const [label, read] of WILAYA_POSTAL_CARRIERS) {
    for (const row of read()) {
      const synthetic = `${String(row.code).padStart(2, "0")}000`;
      // Wilayas 1 to 48 legitimately read NN000: their chef-lieu's office IS 01000,
      // 03000, 16000. The 21 created in 2019 and 2026 inherited their chef-lieu from
      // a pre-reform wilaya, so for them the value can only be synthetic.
      if (row.code > 48 && row.postal_code === synthetic) offenders.push(`${label}: wilaya ${row.code} is back on ${synthetic}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("the fix script agrees that every carrier is corrected", () => {
  // The same acceptance the script's own --check runs, so a carrier that drifts fails
  // here as well as under `node scripts/fix-wilaya-postal-codes.mjs --check`. It is a
  // different question from the comparison above: this one re-derives the mapping and
  // re-validates it against packages/poste/data/postoffices.json, so a postal refresh
  // that retires a chef-lieu's office trips it.
  execFileSync(process.execPath, [join(import.meta.dirname, "../scripts/fix-wilaya-postal-codes.mjs"), "--check"], {
    stdio: "pipe",
  });
});
