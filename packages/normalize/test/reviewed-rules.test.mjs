// The reviewed Rule table, as published data.
//
// `rules` is what someone who reads Arabic and not JavaScript opens: every fold
// this package applies, the codepoints it maps, the sentence it asserts about the
// script, and who signed that sentence off and when. This test holds the table to
// that promise, and holds its `from` and `to` to the tables the key path actually
// runs, so the published claim and the applied fold cannot drift apart.

import { test } from "node:test";
import assert from "node:assert/strict";

import { conservativeKey, looseKey, rules } from "../index.js";
import { DECLINED_RULES, FOLD_RULES, NON_FIRING_RULES, RULES_WITHOUT_A_TABLE } from "../src/rules.js";

const CLASSES = new Set(["canonical", "conservative", "loose", "declined"]);
const SCRIPTS = new Set(["arab", "latn", "any"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

test("the table is every Rule, the declined ones last, in the reviewed order", () => {
  assert.deepEqual(
    rules.map((rule) => rule.id),
    [...FOLD_RULES.map((rule) => rule.id), ...DECLINED_RULES.map((rule) => rule.id)],
  );
});

test("every Rule carries every field, populated", () => {
  for (const rule of rules) {
    assert.deepEqual(Object.keys(rule).sort(), ["class", "from", "id", "reviewed", "script", "to", "why"]);
    assert.ok(CLASSES.has(rule.class), `${rule.id} has class ${rule.class}`);
    assert.ok(SCRIPTS.has(rule.script), `${rule.id} has script ${rule.script}`);
    assert.ok(rule.why.length > 20, `${rule.id} has no rationale`);
    assert.ok(rule.from.length > 0, `${rule.id} states no codepoint sequence it maps from`);
    assert.equal(rule.from.length, rule.to.length, `${rule.id} maps ${rule.from.length} sequences to ${rule.to.length}`);
    for (const sequence of [...rule.from, ...rule.to]) assert.equal(typeof sequence, "string");
  }
});

test("every Rule carries a review record", () => {
  for (const rule of rules) {
    assert.deepEqual(Object.keys(rule.reviewed).sort(), ["reviewedAt", "reviewedBy"]);
    assert.ok(rule.reviewed.reviewedBy.length > 0, `${rule.id} is reviewed by nobody`);
    assert.match(rule.reviewed.reviewedAt, ISO_DATE, `${rule.id} has no review date`);
  }
});

// The published sequences are checked through the public key functions, one probe
// per stated pair, so the table is held to what a caller can observe rather than
// to the table it was read from. A Rule that claims a fold the keys do not perform
// fails here even though both sides come from the same source.
//
// The probe puts the sequence between two letters, because a removal and a word
// boundary are only visible in context: `a<from>b` keys to `ab` when the sequence
// is removed, to `a b` when it ends a word, and to `a<to>b` otherwise.
const probe = (rule, from) => (rule.class === "loose" ? looseKey : conservativeKey)(`a${from}b`);
const expected = (to) => (to === "" ? "ab" : to === " " ? "a b" : `a${to}b`);

test("every Rule the package applies folds exactly what it says it folds", () => {
  for (const rule of rules) {
    if (rule.class === "declined") continue;
    rule.from.forEach((from, i) => {
      assert.equal(
        probe(rule, from),
        expected(rule.to[i]),
        `${rule.id} says ${JSON.stringify(from)} maps to ${JSON.stringify(rule.to[i])}, and the keys disagree`,
      );
    });
  }
});

test("neither declined Rule folds what it declines", () => {
  for (const rule of rules.filter((r) => r.class === "declined")) {
    rule.from.forEach((from, i) => {
      assert.notEqual(conservativeKey(`a${from}b`), expected(rule.to[i]), `${rule.id} is being applied`);
      assert.notEqual(looseKey(`a${from}b`), expected(rule.to[i]), `${rule.id} is being applied by the Loose key`);
    });
  }
});

test("the Rules with no table are the three applied by construction and the two declined", () => {
  assert.deepEqual(
    [...RULES_WITHOUT_A_TABLE, ...DECLINED_RULES.map((rule) => rule.id)],
    ["any.whitespace", "any.case", "any.pass-through", "ar.definite-article", "latn.transliteration"],
  );
});

test("the Rules that state a fold the package does not apply are named", () => {
  assert.deepEqual(NON_FIRING_RULES, ["any.pass-through", "ar.definite-article", "latn.transliteration"]);
});

test("the table is frozen through and through", () => {
  assert.ok(Object.isFrozen(rules));
  for (const rule of rules) {
    assert.ok(Object.isFrozen(rule), `${rule.id} is not frozen`);
    assert.ok(Object.isFrozen(rule.from), `${rule.id}.from is not frozen`);
    assert.ok(Object.isFrozen(rule.to), `${rule.id}.to is not frozen`);
    assert.ok(Object.isFrozen(rule.reviewed), `${rule.id}.reviewed is not frozen`);
  }
  assert.throws(() => {
    rules[0].why = "edited";
  }, "a Rule cannot be rewritten by a caller");
});

test("every declined Rule states the fold it declines and is proved by a corpus case", async () => {
  const { corpus } = await import("../fixtures/corpus.js");
  const proved = new Set(corpus.flatMap((kase) => kase.proves));
  for (const rule of rules.filter((r) => r.class === "declined")) {
    assert.ok(rule.from.length > 0 && rule.to.length > 0, `${rule.id} does not say what it declines`);
    assert.ok(proved.has(rule.id), `no corpus case shows ${rule.id} staying declined`);
  }
});
