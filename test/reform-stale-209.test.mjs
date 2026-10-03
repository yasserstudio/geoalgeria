// The reviewed reform-stale corrections of yasserstudio/geoalgeria.com#209 are published,
// and the residual is the documented one rather than whatever the data happens to say.
//
// WHY A SECOND GUARD. test/record-in-declared-wilaya.test.mjs holds the exact SET of
// records their own geometry contradicts, so it fails the day a new one appears. It
// cannot tell a shrinking list from a list someone edited: deleting a group's rows and
// deleting the records both make it pass. This file pins the two numbers that cannot be
// edited into agreement, the 55 corrections and the 303 residual.
//
// WHY IT RE-DERIVES RATHER THAN RESTATES. test/reviewed-overrides-applied.test.mjs
// already checks that every ledger decision was applied field by field. What it cannot
// check is whether the decision was RIGHT. So this file asks the two sources again, per
// record, and independently of the ledger: the commune registry (décret présidentiel
// 26-206 / loi 26-06 for wilayas 59-69, loi 19-12 for 49-58, mirrored in
// packages/dataset/data/wilayas.json) for the reform relation and the commune's wilaya,
// and the unsimplified OpenStreetMap commune outlines for which commune the coordinate
// is actually in. A decision that stops holding fails here even though the ledger still
// describes it accurately.
//
// WHY 303 REMAIN. They are not a tolerance. 55 of the 358 found on 2026-09-29 were a
// stale label a reform explains, and those are corrected. The rest are a coordinate and
// an attribution that disagree with no reform to explain them, a coordinate too rounded
// to join on, or a commune OpenStreetMap ships no relation for;
// research/_wilaya-containment/triage-209.md classifies all 358 and says, per record,
// what would settle it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalCommuneForCode, padCommuneCode } from "../scripts/lib/commune-index.mjs";
import { communeResolver } from "../scripts/lib/build-utils.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => JSON.parse(readFileSync(join(ROOT, ...parts), "utf8"));

// The packages whose ledgers carry a #209 decision, and how many each carries. Stated
// rather than counted, so dropping a package's ledger fails instead of passing quietly.
const CORRECTED = { emploi: 17, jeunesse: 15, poste: 2, sports: 15, telecom: 1, tourisme: 5 };
const TOTAL = 55;
const RESIDUAL = 303;
// The Journal officiel each reform appears in, which its decisions have to cite.
const REFORM_EVIDENCE = {
  2026: [
    "https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf",
    "https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf",
  ],
  2019: ["https://www.joradp.dz/FTP/jo-francais/2019/F2019078.pdf"],
};

const exceptions = read("research", "_wilaya-containment", "record-exceptions.json");
const wilayas = read("packages", "dataset", "data", "wilayas.json").wilayas;
const motherOf = new Map(
  wilayas
    .filter((wilaya) => wilaya.mother_wilaya_code != null)
    .map((wilaya) => [String(wilaya.code).padStart(2, "0"), String(wilaya.mother_wilaya_code).padStart(2, "0")]),
);
const createdIn = new Map(wilayas.map((wilaya) => [String(wilaya.code).padStart(2, "0"), wilaya.created]));
const resolver = communeResolver();

/** A package's #209 decisions: the ones whose patch moves `wilaya_code` and whose
 *  evidence cites a Journal officiel reform, paired with the file they corrected. */
function reformDecisions(pkg) {
  const ledger = read("quality", "overrides", `${pkg}.json`);
  return ledger.decisions
    .filter((decision) => {
      if (decision.patch?.wilaya_code == null) return false;
      const urls = decision.evidence.map((item) => item.url);
      return Object.values(REFORM_EVIDENCE).some((set) => set.every((url) => urls.includes(url)));
    })
    .map((decision) => ({ decision, rows: read("packages", pkg, "data", decision.file) }));
}

test("each package's ledger carries exactly the reviewed reform corrections", () => {
  const found = Object.fromEntries(Object.keys(CORRECTED).map((pkg) => [pkg, reformDecisions(pkg).length]));
  assert.deepEqual(found, CORRECTED);
  assert.equal(
    Object.values(found).reduce((sum, count) => sum + count, 0),
    TOTAL,
  );
});

test("every correction still holds against the registry and the commune outlines", () => {
  for (const pkg of Object.keys(CORRECTED)) {
    for (const { decision, rows } of reformDecisions(pkg)) {
      const where = `${pkg}/${decision.file} ${decision.record_id}`;
      const row = rows.find((candidate) => (candidate.id ?? candidate.name) === decision.record_id);
      assert.ok(row, `${where}: no longer published`);
      const from = decision.expect.wilaya_code;
      const to = decision.patch.wilaya_code;

      // The id never moves, and the coordinate is the one that was reviewed.
      assert.equal(row.lat, decision.expect.lat, `${where}: latitude changed under the review`);
      assert.equal(row.lng, decision.expect.lng, `${where}: longitude changed under the review`);
      assert.equal(row.wilaya_code, to, `${where}: not published in the daughter wilaya`);
      assert.equal(row.review_status, "corrected", `${where}: published without its review receipt`);

      // The reform relation, from the decree table rather than from the ledger, and the
      // Journal officiel the decision cites is the one that reform appears in.
      assert.equal(motherOf.get(to), from, `${where}: wilaya ${to} is not a daughter of wilaya ${from}`);
      const urls = decision.evidence.map((item) => item.url);
      for (const url of REFORM_EVIDENCE[createdIn.get(to)] ?? [])
        assert.ok(
          urls.includes(url),
          `${where}: wilaya ${to} was created in ${createdIn.get(to)} and the decision does not cite ${url}`,
        );

      // The geometry, asked independently of the ledger: exactly one commune outline
      // contains the point, and the registry puts that commune in the daughter wilaya.
      const hits = resolver.containingCommunes(row.lat, row.lng);
      assert.equal(hits.length, 1, `${where}: its coordinate is inside ${hits.length} commune outlines`);
      const canonical = canonicalCommuneForCode(padCommuneCode(hits[0].code_commune));
      assert.equal(
        String(canonical.wilaya_code).padStart(2, "0"),
        to,
        `${where}: the registry puts commune ${canonical.code_commune} in wilaya ${canonical.wilaya_code}`,
      );
      // Where the decision also filled the commune, it is that same commune.
      if (decision.patch.commune_code != null)
        assert.equal(
          decision.patch.commune_code,
          padCommuneCode(hits[0].code_commune),
          `${where}: the commune it filled disagrees with the outline`,
        );
    }
  }
});

test("the residual is the documented 303, and shrank by exactly the 55 corrected", () => {
  assert.equal(exceptions.count, RESIDUAL);
  assert.equal(exceptions.pre_existing, RESIDUAL, "a residual row this batch created is not a residual");
  assert.equal(exceptions.created_by_this_batch, 0);
  // Not one corrected record is still listed as a violation.
  const listed = new Set(
    exceptions.groups.flatMap((group) => group.records.map((record) => `${group.file} ${record.id}`)),
  );
  const corrected = Object.keys(CORRECTED).flatMap((pkg) =>
    reformDecisions(pkg).map(({ decision }) => `packages/${pkg}/data/${decision.file} ${decision.record_id}`),
  );
  assert.equal(corrected.length, TOTAL);
  assert.deepEqual(
    corrected.filter((key) => listed.has(key)),
    [],
    "corrected record(s) still outside the wilaya they declare",
  );
});
