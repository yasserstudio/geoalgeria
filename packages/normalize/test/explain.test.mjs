// `explain`: the keys, plus which Rules fired to produce them.
//
// The point of the package being public is that a loose match can say what made
// it loose. This test holds `explain` to the Golden corpus from both sides: the
// keys it returns are the keys `searchKeys` returns, and the Rules it says fired
// are exactly the ones the corpus case declares it proves.

import { test } from "node:test";
import assert from "node:assert/strict";

import { explain, searchKeys, rules } from "../index.js";
import { corpus } from "../fixtures/corpus.js";
import { NON_FIRING_RULES } from "../src/rules.js";

/** What a case declares it proves, minus the Rules that state a fold not applied. */
const fireable = (kase) => kase.proves.filter((id) => !NON_FIRING_RULES.includes(id));

test("explain returns the same keys as searchKeys, for every corpus case", () => {
  for (const kase of corpus) {
    const { applied, ...keys } = explain(kase.input);
    assert.deepEqual(keys, searchKeys(kase.input), `${JSON.stringify(kase.input)} keys disagree`);
    assert.ok(Array.isArray(applied));
  }
});

// Not sorted: the corpus documents `proves` as the order the key path ran the
// Rules in, and a claim nothing checks rots. The Rules that cannot fire are named
// after the ones that did, so the fired ids keep their order at the front.
test("the Rules explain says fired are the ones the corpus case proves, in that order", () => {
  for (const kase of corpus) {
    assert.deepEqual(
      [...explain(kase.input).applied],
      fireable(kase),
      `${JSON.stringify(kase.input)}: explain and the corpus disagree about which Rules fired`,
    );
  }
});

// A name no Rule touches fires nothing: the empty list is the honest answer, not
// a list with a "nothing happened" entry in it.
test("a pass-through case fires no Rule at all", () => {
  assert.deepEqual(explain("الوادي").applied, []);
  assert.deepEqual(explain("وهران").applied, []);
  assert.deepEqual(explain("").applied, []);
});

test("applied is in the order the Rules ran, without repeats", () => {
  const applied = explain("ﺃﺩﺭﺍﺭ الجـــزائر، قسنطينة").applied;
  // Note what is not here: the presentation form of alef with hamza folds straight
  // to bare alef, so `ar.alef-variants` never sees it and does not claim the fold.
  assert.deepEqual(applied, [
    "ar.presentation-forms-b",
    "any.separators",
    "ar.tatweel",
    "ar.yaa-hamza",
    "any.punctuation",
    "any.whitespace",
    "ar.taa-marbuta-haa",
  ]);
});

test("a loose Rule is reported only when it changed the loose key", () => {
  assert.ok(explain("قسنطينة").applied.includes("ar.taa-marbuta-haa"));
  assert.ok(!explain("تيزي وزو").applied.includes("ar.taa-marbuta-haa"));
});

test("every Rule that can fire is fired by at least one corpus case", () => {
  const fired = new Set(corpus.flatMap((kase) => explain(kase.input).applied));
  for (const rule of rules) {
    if (NON_FIRING_RULES.includes(rule.id)) continue;
    assert.ok(fired.has(rule.id), `no corpus case makes ${rule.id} fire`);
  }
});

test("the explain result shape is exactly what was reviewed", () => {
  const explained = explain("Béjaïa");
  assert.deepEqual(Object.keys(explained).sort(), [
    "applied",
    "conservative",
    "loose",
    "looseDiffers",
    "tokens",
  ]);
  assert.ok(Object.isFrozen(explained.applied), "applied is frozen, a caller cannot edit the record");
});
