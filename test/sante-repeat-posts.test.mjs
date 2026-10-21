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
import { conservativeKey, looseKey } from "../packages/normalize/index.js";
import { mergeRepeatPosts, mspPosts } from "../packages/sante/scripts/fetch.mjs";

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

// `msp_kept` is the post in the DUPLICATED language, not whichever post the
// record is published under. For a bilingual record those are two different
// posts: `refs.msp` is its French post and `refs.msp_twin` its Arabic one, so an
// Arabic repeat pair that merges into a bilingual record has to name the twin.
// Naming the primary instead puts the wrong id in a published retirement note,
// and nothing in the schema or the counts would show it.
test("sante repeats: every merged pair is one record citing both posts", () => {
  for (const pair of report.pairs) {
    const record = byId.get(pair.kept_id);
    assert.ok(record, `${pair.kept_id} is not in the shipped data`);
    assert.equal(record.type, pair.type);
    assert.equal(record.wilaya_code, pair.wilaya_code);
    assert.equal(record.refs.msp_repeat, pair.msp_repeat);
    // the repeat post is in a language the record already publishes, which is
    // what separates a repeat post from a twin post
    const name = pair.language === "fr" ? record.name_fr : record.name_ar;
    assert.ok(name, `${pair.kept_id} cites a ${pair.language} repeat post but has no ${pair.language} name`);
    const langPost =
      pair.language === "fr" || !record.name_fr ? record.refs.msp : record.refs.msp_twin;
    assert.equal(
      pair.msp_kept,
      langPost,
      `${pair.kept_id}: msp_kept names ${pair.msp_kept}, but its ${pair.language} post is ${langPost}`,
    );
    assert.ok(mspPosts(record).includes(pair.msp_kept));
    // and every array in the pair describes [kept, absorbed] in that order, so
    // side 0 is the name the kept post published
    assert.equal(pair.conservative_keys[0], conservativeKey(name));
    assert.equal(pair.wilaya_codes[0], record.wilaya_code);
    assert.equal(pair.communes[0], record.commune_code);
  }
});

// The report's second signal has to be real, not decoration: the loose key folds
// ة with ه and ى with ي on top of the conservative key the gate reads, and the
// claim made in the report note is that it agrees on every pair merged here and
// separates every pair kept apart. Asserted rather than asserted-in-prose.
test("sante repeats: the loose key agrees on every merge and splits every keep", () => {
  for (const pair of report.pairs) {
    assert.deepEqual(pair.names.map(conservativeKey), pair.conservative_keys);
    assert.deepEqual(pair.names.map(looseKey), pair.loose_keys);
    assert.equal(pair.conservative_keys[0], pair.conservative_keys[1], `${pair.kept_id}: the gate's own key disagrees`);
    assert.equal(pair.loose_keys[0], pair.loose_keys[1], `${pair.kept_id}: the loose key disagrees with the merge`);
  }
  for (const candidate of report.kept_candidates) {
    assert.deepEqual(candidate.names.map(conservativeKey), candidate.conservative_keys);
    assert.deepEqual(candidate.names.map(looseKey), candidate.loose_keys);
    const where = candidate.msp.join("/");
    assert.notEqual(candidate.conservative_keys[0], candidate.conservative_keys[1], `${where}: kept apart on equal keys`);
    assert.notEqual(candidate.loose_keys[0], candidate.loose_keys[1], `${where}: the loose key would have merged it`);
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
      const live = records.filter((r) => mspPosts(r).includes(post));
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
// Arabic name of the Jijel EPH, جيجل, and the wilaya tag of Djelfa, so it shipped
// as a Djelfa record with no commune at all. The name is the evidence, and it is
// the one merge that crosses a wilaya. The pair's arrays are [kept, absorbed], so
// the Jijel side comes first and the Djelfa side second.
test("sante repeats: the Jijel hospital filed under Djelfa goes home", () => {
  const jijel = report.pairs.find((p) => p.msp_repeat === "4727");
  assert.ok(jijel, "the Djelfa-filed Jijel post must be reported");
  assert.equal(jijel.cross_wilaya, true);
  assert.equal(jijel.wilaya_code, "18");
  assert.equal(jijel.msp_kept, "4729");
  assert.equal(jijel.absorbed_id, "17-eph-11");
  assert.deepEqual(jijel.wilaya_codes, ["18", "17"]);
  assert.deepEqual(jijel.communes, ["1801", null]);
  for (const name of jijel.names) assert.match(name, /جيجل$/);
  const record = byId.get(jijel.kept_id);
  assert.equal(record.commune, "Jijel");
  assert.equal(
    records.some((r) => r.refs?.msp === "4727"),
    false,
    "post 4727 is still a record of its own",
  );
});

// The cross-wilaya gate, on a fixture rather than on the one case the live data
// happens to carry. An identical title across two wilayas is not evidence by
// itself, because commune names repeat across Algeria, so the merge is allowed
// only when the KEPT side is the placed one. Reversing that would move an
// establishment into a wilaya nothing but a registry tag put it in, and the
// record would keep its wilaya, its id and its emptiness.
const repeatPost = (over) => ({
  lang: "ar",
  type: "eph",
  locality: "جيجل",
  specialty: null,
  title: "المؤسسة العمومية الاستشفائية جيجل",
  slug: "x",
  commune: null,
  communeHow: null,
  ...over,
});
const placedIn = (code, name) => ({
  commune: { code_commune: code, name_fr: name, name_ar: "جيجل", latitude: 36.8, longitude: 5.76 },
  communeHow: "exact",
});

test("sante repeats: a cross-wilaya merge never moves a record into the unplaced wilaya", () => {
  // the bilingual side is the UNPLACED one, so it would win repeatKeeper and
  // absorb the only post anything placed
  const unplacedBilingual = {
    fr: repeatPost({ lang: "fr", title: "Etablissement Public Hospitalier Jijel", wilayaCode: 17, msp_id: 4728 }),
    ar: repeatPost({ wilayaCode: 17, msp_id: 4729 }),
  };
  const placedMono = { fr: null, ar: repeatPost({ wilayaCode: 18, msp_id: 4727, ...placedIn(1801, "Jijel") }) };
  const { slots, verdicts } = mergeRepeatPosts([unplacedBilingual, placedMono]);
  assert.equal(slots.length, 2, "neither post may be absorbed when the kept side is unplaced");
  assert.equal(slots.every((s) => s.repeat === null), true);
  const candidate = verdicts.find((v) => v.msp?.join("/") === "4727/4729");
  assert.ok(candidate, "the refusal has to be reported, not silently dropped");
  assert.equal(candidate.merged, false);
  assert.equal(candidate.reason, "different_wilaya");

  // and the allowed direction, which is the live Jijel case: the placed side is
  // the one the record stays on
  const placedBilingual = {
    fr: repeatPost({ lang: "fr", title: "Etablissement Public Hospitalier Jijel", wilayaCode: 18, msp_id: 4728, ...placedIn(1801, "Jijel") }),
    ar: repeatPost({ wilayaCode: 18, msp_id: 4729, ...placedIn(1801, "Jijel") }),
  };
  const unplacedMono = { fr: null, ar: repeatPost({ wilayaCode: 17, msp_id: 4727 }) };
  const ok = mergeRepeatPosts([placedBilingual, unplacedMono]);
  assert.equal(ok.slots.length, 1);
  assert.equal(ok.slots[0].repeat.msp_id, 4727);
  assert.equal(ok.slots[0].ar.wilayaCode, 18, "the surviving record stays in the placed wilaya");
  const merged = ok.verdicts.find((v) => v.merged);
  assert.equal(merged.reason, "same_title_one_placement");
  assert.equal(merged.msp_kept, "4729", "the kept post is the one in the duplicated language");
  assert.equal(merged.msp_repeat, "4727");
});

// An empty fold is not agreement. `conservativeKey` keeps no punctuation, so a
// placeholder title such as "-" or "..." folds to the empty string, and two
// placeholders in one wilaya and type would otherwise read as the same name and
// retire a public id between them. The registry carries no such title today,
// which is exactly why this is a fixture: the rule has to hold before one
// appears, not after a refresh has already merged two unrelated establishments.
test("sante repeats: a title that folds to nothing is never a shared name", () => {
  for (const placeholder of ["-", "...", "( )"]) {
    assert.equal(conservativeKey(placeholder), "", `${placeholder} is not a punctuation-only title`);
    const blank = (msp_id) => ({
      fr: null,
      ar: repeatPost({ wilayaCode: 18, msp_id, title: placeholder, locality: placeholder, ...placedIn(1801, "Jijel") }),
    });
    const { slots, verdicts } = mergeRepeatPosts([blank(9001), blank(9002)]);
    assert.equal(slots.length, 2, `${placeholder}: two placeholder posts were folded into one record`);
    assert.equal(slots.every((s) => s.repeat === null), true, `${placeholder}: a placeholder was absorbed`);
    // neither key buckets, so the pair is never even a candidate
    assert.deepEqual(verdicts, [], `${placeholder}: an empty key still raised a candidate`);
  }

  // and the gate itself refuses an empty key however the candidate arrives: here
  // the locality folds to a real key and buckets the pair, while the titles the
  // merge would read fold to nothing
  const named = (msp_id) => ({
    fr: null,
    ar: repeatPost({ wilayaCode: 18, msp_id, title: "...", ...placedIn(1801, "Jijel") }),
  });
  const { slots, verdicts } = mergeRepeatPosts([named(9003), named(9004)]);
  assert.equal(slots.length, 2, "the gate agreed on two empty keys");
  assert.equal(slots.every((s) => s.repeat === null), true);
  assert.equal(verdicts.length, 1, "the locality bucket should have raised the candidate");
  assert.equal(verdicts[0].merged, false);
  assert.equal(verdicts[0].reason, "no_name_key");
});

// mergeRepeatPosts returns its decision; it never writes it back onto the slots
// it was handed, so a caller cannot half-apply a merge by reading the input.
test("sante repeats: the merge does not mutate the slots it is given", () => {
  const input = [
    { fr: null, ar: repeatPost({ wilayaCode: 18, msp_id: 4729, ...placedIn(1801, "Jijel") }) },
    { fr: null, ar: repeatPost({ wilayaCode: 18, msp_id: 4727, ...placedIn(1801, "Jijel") }) },
  ];
  const before = JSON.stringify(input);
  const { slots } = mergeRepeatPosts(input);
  assert.equal(JSON.stringify(input), before, "the input slots were written to");
  assert.equal(slots.length, 1);
  // equally placed and both monolingual, so the record stays on the post the
  // registry published first
  assert.equal(slots[0].ar.msp_id, 4727);
  assert.equal(slots[0].repeat.msp_id, 4729);
});

// A repeat post is only ever a post in a language the record already has, and no
// post belongs to two records: that is what makes refs.msp_repeat resolvable.
test("sante repeats: one registry post belongs to exactly one record", () => {
  const owner = new Map();
  for (const r of records)
    for (const post of mspPosts(r)) {
      assert.equal(owner.has(post), false, `MSP post ${post} is on both ${owner.get(post)} and ${r.id}`);
      owner.set(post, r.id);
    }
});
