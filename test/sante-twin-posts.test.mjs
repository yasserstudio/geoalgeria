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

test("sante twins: the merged record keeps the lower-sequence id and reserves the other", () => {
  for (const pair of report.pairs) {
    assert.ok(pair.absorbed_id, `${pair.kept_id} absorbed no id, so nothing was merged`);
    // Both halves were first published in the same release, so neither id is
    // older. What decides is the sequence number: assignIds numbers a group by
    // name, and the French name is Latin where the Arabic one is not, so the
    // French half always holds the lower one. Consumers migrate one way only.
    assert.ok(
      pair.kept_id < pair.absorbed_id,
      `${pair.kept_id} is not the lower-sequence id of the two; it absorbed ${pair.absorbed_id}`,
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

// The registry publishes the two posts at consecutive ids, but not always: a
// wilaya entered out of order leaves a third post between them. A gap of two is
// allowed on stronger name evidence, and this pins which pairs that reached.
test("sante twins: a gap of two is the exception and each case is named", () => {
  const far = report.pairs.filter((pair) => pair.msp_gap > 1);
  assert.deepEqual(
    far.map((pair) => `${pair.msp_fr}/${pair.msp_ar}`).sort(),
    ["3667/3669", "4399/4401", "4527/4529"],
    "the gap-two pairs are the Bechar mother-and-child EHS and the Barika and Abalessa EPSPs",
  );
  for (const pair of far) assert.equal(pair.msp_gap, 2, "nothing further apart than two ever pairs");
  // the Oran gynaecology EHS is two posts from a different maternity it shares a
  // specialty with, and the gate is what keeps them apart
  const oran = report.refused_candidates.find((c) => c.msp_fr === "5130" && c.msp_ar === "5128");
  assert.ok(oran, "the Oran gynaecology candidate must be reported");
  assert.equal(oran.reason, "name_evidence_too_thin_for_the_gap");
});

// The Blida EPSP: the French post writes the commune Ouled Yaich as "Ouled
// Aiche" and matched the wrong commune on the fragment "Oued", 28 km away, while
// its Arabic twin names the commune outright. Taking the French half's geography
// because it is French shipped the merged record in the wrong commune.
test("sante twins: a merged record is placed by its better-matched half", () => {
  const blida = byId.get("09-epsp-04");
  assert.ok(blida, "09-epsp-04 is not in the shipped data");
  assert.equal(blida.commune, "Ouled Yaich");
  assert.equal(blida.commune_code, "0907");
  // and the Ain Amguel EPSP, whose French post matches no commune at all, keeps
  // the commune its Arabic post names and the OpenStreetMap point inside it
  const amguel = byId.get("11-epsp-02");
  assert.ok(amguel, "11-epsp-02 is not in the shipped data");
  assert.equal(amguel.commune, "Ain Amguel");
  assert.equal(amguel.geo_precision, "exact");
  assert.equal(amguel.refs.osm, "node/4202804189");
});

// An absolute check on the two pinned coordinates, not a relative one: a pin that
// silently drifts to another building still reads "exact" and still validates.
// The radius is small enough that only the Wikidata point itself fits.
test("sante twins: each pinned record sits on its Wikidata coordinate", () => {
  const P625 = {
    Q18785599: { lat: 27.8709, lng: -0.281111, name: "hopital d'Adrar" },
    Q7894776: { lat: 35.693276, lng: -0.639028, name: "centre hospitalier universitaire d'Oran" },
  };
  const metres = (a, b) => {
    const R = 6371000, d = Math.PI / 180;
    const dLat = (b.lat - a.lat) * d, dLng = (b.lng - a.lng) * d;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  for (const [item, point] of Object.entries(P625)) {
    const record = records.find((r) => r.refs?.wikidata === item);
    assert.ok(record, `${item} (${point.name}) is not attached to any record`);
    const off = metres(record, point);
    assert.ok(off <= 50, `${record.id} is ${Math.round(off)} m from ${item}'s P625 coordinate`);
  }
});

// A Wikidata item is one real hospital, so two records citing it are the same
// place published twice. The pins correct WHICH record an item belongs to, and
// that means taking it off the record the matcher had given it to.
test("sante twins: no external identifier is cited by two records", () => {
  const owner = new Map();
  for (const r of records)
    for (const key of ["wikidata", "osm", "msp", "msp_twin"]) {
      const value = r.refs?.[key];
      if (!value) continue;
      const ref = `${key === "msp_twin" ? "msp" : key}:${value}`;
      assert.equal(owner.has(ref), false, `${ref} is on both ${owner.get(ref)} and ${r.id}`);
      owner.set(ref, r.id);
    }
});
