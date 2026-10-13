// The registry's REPEAT posts: an establishment entered twice in the SAME
// language, which is a different defect from the French/Arabic twin posts and is
// not reachable by the twin rule, since that rule pairs one language with the
// other. Checked against the reviewed report the generator writes beside the data
// (quality/sante-repeat-posts.json).
//
// The bug class this exists for: a facility published twice splits its names, its
// coordinate and anything joined to it, and one of the two copies can sit in the
// wrong wilaya entirely. None of that fails the schema. The merge that fixes it
// retires a public id, so the opposite failure matters too: a pair the rule
// cannot prove must stay two records and say why.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { conservativeKey } from "../packages/normalize/index.js";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const records = read("../packages/sante/data/sante.json");
const retired = read("../packages/sante/data/retired-ids.json");
const report = read("../quality/sante-repeat-posts.json");

const byId = new Map(records.map((r) => [r.id, r]));
const retiredIds = new Set(retired.ids);

test("sante repeats: the report describes the merge it claims", () => {
  assert.equal(report.dataset, "sante");
  assert.ok(report.pairs.length > 0, "the report has to describe the merge it claims");
  assert.equal(report.merged, report.pairs.length);
  assert.equal(report.kept, report.kept_candidates.length);
});

test("sante repeats: every merged pair is one record citing both posts", () => {
  for (const pair of report.pairs) {
    const record = byId.get(pair.kept_id);
    assert.ok(record, `${pair.kept_id} is not in the shipped data`);
    assert.equal(record.refs.msp, pair.msp_kept);
    assert.equal(record.refs.msp_repeat, pair.msp_repeat);
    assert.equal(record.type, pair.type);
    assert.equal(record.wilaya_code, pair.wilaya_code);
    // the repeat post is in a language the record already publishes, which is
    // what separates a repeat post from a twin post
    const name = pair.language === "fr" ? record.name_fr : record.name_ar;
    assert.ok(name, `${pair.kept_id} cites a ${pair.language} repeat post but has no ${pair.language} name`);
  }
});

test("sante repeats: an absorbed id is retired and forwarded", () => {
  for (const pair of report.pairs) {
    assert.ok(pair.absorbed_id, `${pair.kept_id} absorbed no id, so nothing was merged`);
    assert.equal(byId.has(pair.absorbed_id), false, `${pair.absorbed_id} is still live`);
    assert.ok(retiredIds.has(pair.absorbed_id), `${pair.absorbed_id} is not reserved`);
    const migration = retired.migrations?.[pair.absorbed_id];
    assert.ok(migration, `${pair.absorbed_id} retired with no migration entry`);
    assert.equal(migration.merged_into, pair.kept_id);
    assert.deepEqual(migration.msp_posts, [pair.msp_kept, pair.msp_repeat]);
    assert.ok(
      migration.note.includes(pair.kept_id) && migration.note.includes(pair.msp_kept),
      `${pair.absorbed_id}'s migration note does not say where it went`,
    );
  }
});

// The invariant the merge exists to establish, read off the shipped data rather
// than off the report: within one type and one language, the registry's own name
// is published once. The fold is @geoalgeria/normalize's conservative key, the
// same one the generator gates on, so a spacing or hamza variant cannot slip a
// second copy through.
test("sante repeats: one name, one language, one record", () => {
  const owner = new Map();
  for (const r of records)
    for (const [lang, name] of [["fr", r.name_fr], ["ar", r.name_ar]]) {
      if (!name) continue;
      const key = `${r.type}|${lang}|${conservativeKey(name)}`;
      assert.equal(
        owner.has(key),
        false,
        `${r.type} is published twice in ${lang} as ${JSON.stringify(name)}: ${owner.get(key)} and ${r.id}`,
      );
      owner.set(key, r.id);
    }
});

// The weaker signal the measurement started from: two records of one type and
// wilaya whose locality folds to the same key in the same language. It catches
// the merges above and five more pairs that the registry gives two different
// names, so they stay two records: the two Arris hospitals, which the registry
// itself numbers 1 and 2, and the two Skikda and two Ouargla hospitals, in each
// language. Each is named here, because "kept" is a decision and not an absence
// of one.
test("sante repeats: a pair the registry names differently stays two records", () => {
  for (const candidate of report.kept_candidates) {
    assert.ok(candidate.reason, "a kept candidate has to carry its reason");
    const [a, b] = candidate.msp;
    assert.notEqual(a, b);
    for (const post of candidate.msp) {
      const live = records.filter(
        (r) => r.refs?.msp === post || r.refs?.msp_twin === post || r.refs?.msp_repeat === post,
      );
      assert.equal(live.length, 1, `MSP post ${post} was kept apart but is on ${live.length} records`);
    }
  }
  assert.deepEqual(
    report.kept_candidates.map((c) => c.msp.join("/")).sort(),
    ["3887/3890", "4804/4814", "4809/4825", "5104/5109", "5112/5117"],
    "the kept pairs are the numbered Arris hospitals, the two Skikda ones and the two Ouargla ones",
  );
  for (const candidate of report.kept_candidates)
    assert.equal(candidate.reason, "names_differ");
});

// The Jijel hospital the registry filed under Djelfa: post 4727 carries the
// Arabic name of the Jijel EPH and the wilaya tag of Djelfa, so it shipped as a
// Djelfa record with no commune at all. It is the one merge that crosses a
// wilaya, and it is allowed only because a single side of the pair is placed.
test("sante repeats: the Jijel hospital filed under Djelfa goes home", () => {
  const jijel = report.pairs.find((p) => p.msp_repeat === "4727");
  assert.ok(jijel, "the Djelfa-filed Jijel post must be reported");
  assert.equal(jijel.cross_wilaya, true);
  assert.equal(jijel.wilaya_code, "18");
  assert.equal(jijel.absorbed_id, "17-eph-11");
  const record = byId.get(jijel.kept_id);
  assert.equal(record.commune, "Jijel");
  assert.equal(
    records.some((r) => r.refs?.msp === "4727"),
    false,
    "post 4727 is still a record of its own",
  );
});

// A repeat post is only ever a post in a language the record already has, and no
// post belongs to two records: that is what makes refs.msp_repeat resolvable.
test("sante repeats: one registry post belongs to exactly one record", () => {
  const owner = new Map();
  for (const r of records)
    for (const post of [r.refs?.msp, r.refs?.msp_twin, r.refs?.msp_repeat]) {
      if (post == null) continue;
      assert.equal(owner.has(post), false, `MSP post ${post} is on both ${owner.get(post)} and ${r.id}`);
      owner.set(post, r.id);
    }
});
