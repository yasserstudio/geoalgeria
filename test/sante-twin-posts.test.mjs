// The committed side of the FR/AR twin recovery: what @geoalgeria/sante actually
// ships, checked against the reviewed report the generator writes beside it
// (quality/sante-twin-recovery.json).
//
// The bug class this exists for: a merge is a public id retirement. If a pair in
// the report never became one record, a facility is still published twice; if a
// kept id is not the older of the two, every consumer holding the id that
// survived the first release has to migrate for nothing; and if an absorbed id
// is not reserved, a later refresh can hand that public join key to a different
// place. None of the three fails the schema.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const records = read("../packages/sante/data/sante.json");
const retired = read("../packages/sante/data/retired-ids.json");
const report = read("../quality/sante-twin-recovery.json");

const byId = new Map(records.map((r) => [r.id, r]));
const retiredIds = new Set(retired.ids);

test("sante twins: every recovered pair is one bilingual record", () => {
  assert.ok(report.pairs.length > 0, "the report has to describe the merge it claims");
  assert.equal(report.recovered, report.pairs.length);
  for (const pair of report.pairs) {
    const record = byId.get(pair.kept_id);
    assert.ok(record, `${pair.kept_id} is not in the shipped data`);
    assert.ok(record.name_fr && record.name_ar, `${pair.kept_id} kept only one language`);
    assert.equal(record.refs.msp, pair.msp_fr);
    assert.equal(record.refs.msp_twin, pair.msp_ar);
    assert.equal(record.wilaya_code, pair.wilaya_code);
    assert.equal(record.type, pair.type);
  }
});

test("sante twins: the merged record keeps the older id and reserves the other", () => {
  for (const pair of report.pairs) {
    assert.ok(pair.absorbed_id, `${pair.kept_id} absorbed no id, so nothing was merged`);
    // ids follow places: the id published first is the one that carries on
    assert.ok(
      pair.kept_id < pair.absorbed_id,
      `${pair.kept_id} is not older than the id it absorbed, ${pair.absorbed_id}`,
    );
    assert.equal(byId.has(pair.absorbed_id), false, `${pair.absorbed_id} is still live`);
    assert.ok(retiredIds.has(pair.absorbed_id), `${pair.absorbed_id} is not reserved`);
    const migration = retired.migrations?.[pair.absorbed_id];
    assert.ok(migration, `${pair.absorbed_id} retired with no migration entry`);
    assert.equal(migration.merged_into, pair.kept_id);
    assert.deepEqual(migration.msp_posts, [pair.msp_fr, pair.msp_ar]);
    assert.ok(
      migration.note.includes(pair.kept_id) && migration.note.includes(pair.msp_fr),
      `${pair.absorbed_id}'s migration note does not say where it went`,
    );
  }
});

test("sante twins: a refused candidate was not merged anyway", () => {
  assert.equal(report.refused, report.refused_candidates.length);
  const twinOf = new Map();
  for (const r of records) if (r.refs?.msp_twin) twinOf.set(r.refs.msp, r.refs.msp_twin);
  for (const candidate of report.refused_candidates) {
    assert.ok(candidate.reason, "a refusal has to carry its reason");
    assert.notEqual(
      twinOf.get(candidate.msp_fr),
      candidate.msp_ar,
      `MSP ${candidate.msp_fr}/${candidate.msp_ar} was refused and paired anyway`,
    );
  }
});

test("sante twins: one registry post belongs to exactly one record", () => {
  const owner = new Map();
  for (const r of records)
    for (const post of [r.refs?.msp, r.refs?.msp_twin]) {
      if (post == null) continue;
      assert.equal(owner.has(post), false, `MSP post ${post} is on both ${owner.get(post)} and ${r.id}`);
      owner.set(post, r.id);
    }
  // msp_twin only ever means "the other-language post of this facility"
  for (const r of records)
    if (r.refs?.msp_twin) assert.ok(r.name_fr && r.name_ar, `${r.id} cites two posts but one language`);
});

// Two Wikidata hospitals that sat on the wrong establishment and were removed
// rather than corrected: both cities carry several, and the token matcher had
// nothing to tell them apart. Each is pinned to its MSP post id, so the pin
// survives a re-pairing.
test("sante twins: the reviewed Wikidata hospitals are on the right records", () => {
  const byItem = new Map(records.filter((r) => r.refs?.wikidata).map((r) => [r.refs.wikidata, r]));
  const adrar = byItem.get("Q18785599");
  assert.ok(adrar, "Q18785599 (hôpital d'Adrar) is not attached");
  assert.equal(adrar.refs.msp, "2359");
  assert.match(adrar.name_fr, /Hospitalier Adrar$/);
  const oran = byItem.get("Q7894776");
  assert.ok(oran, "Q7894776 (CHU d'Oran) is not attached");
  assert.equal(oran.refs.msp, "5139");
  // the CHU, not the EHU: Wikidata's own labels say centre hospitalier
  // universitaire in both languages
  assert.match(oran.name_fr, /^Centre Hospitalo Universitaire/);
  for (const r of [adrar, oran]) {
    assert.equal(r.geo_precision, "exact");
    assert.equal(r.geo_method, "wikidata_point");
  }
});

// The two Algiers facilities the owner located by hand in the previous release.
// Each shipped as two half-records on one point, which the writer's shared-point
// rule has to demote to approximate; the merge is what lets the point publish at
// the precision it was read at.
test("sante twins: merging the Algiers EHS pair restores exact precision", () => {
  for (const id of ["16-ehs-03", "16-ehs-04"]) {
    const r = byId.get(id);
    assert.ok(r, `${id} is not in the shipped data`);
    assert.equal(r.geo_method, "owner_verified");
    assert.equal(r.geo_precision, "exact", `${id} still publishes as approximate`);
    assert.ok(r.name_fr && r.name_ar, `${id} is not bilingual after the merge`);
  }
  // Owner decision of 2026-10-02: the Kabyle given name محند, not the registry's
  // محمد, which stays documented in quality/overrides/sante.json.
  assert.match(byId.get("16-ehs-04").name_ar, /الدكتور معوش محند أمقران$/);
});
