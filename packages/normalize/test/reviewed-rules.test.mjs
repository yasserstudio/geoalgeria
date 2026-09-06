// The reviewed Rule table, as published data.
//
// `rules` is what someone who reads Arabic and not JavaScript opens: every fold
// this package applies, the codepoints it maps, the sentence it asserts about the
// script, and who signed that sentence off and when. This test holds the table to
// that promise, and holds its `from` and `to` to the tables the key path actually
// runs, so the published claim and the applied fold cannot drift apart.

import { test } from "node:test";
import assert from "node:assert/strict";

import { rules } from "../index.js";
import { DECLINED_RULES, FOLD_RULES, NON_FIRING_RULES } from "../src/rules.js";
import { RULE_ENTRIES } from "../src/tables.js";

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

// The published claim is read out of the table the key path runs, so a codepoint
// added to a fold appears in the Rule that fold belongs to without anyone having
// to remember to write it down twice.
test("a table-backed Rule states the codepoints its table actually maps", () => {
  for (const rule of rules) {
    const entries = RULE_ENTRIES.get(rule.id);
    if (!entries) continue;
    assert.deepEqual(rule.from, entries.map(([from]) => from), `${rule.id} states the wrong sources`);
    assert.deepEqual(rule.to, entries.map(([, to]) => to), `${rule.id} states the wrong targets`);
  }
});

test("the Rules with no table are the three applied by construction and the two declined", () => {
  const untabled = rules.filter((rule) => !RULE_ENTRIES.has(rule.id)).map((rule) => rule.id);
  assert.deepEqual(untabled, [
    "any.whitespace",
    "any.case",
    "any.pass-through",
    "ar.definite-article",
    "latn.transliteration",
  ]);
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
