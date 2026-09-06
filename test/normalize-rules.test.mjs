// The review gate over @geoalgeria/normalize's Rule table. The package publishes
// the orthographic equivalences GeoAlgeria asserts about Algerian Arabic as data
// anyone can argue with, which is worth nothing if a Rule can enter without a
// reviewer or without a corpus case proving it. These tests pin the five ways the
// gate fails, one fixture per way, against the real table as the passing case.
import { test } from "node:test";
import assert from "node:assert/strict";

import { REVIEWED_RULE_ORDER, normalizeRuleErrors } from "../scripts/lib/normalize-rules.mjs";
import { rules } from "../packages/normalize/index.js";
import { corpus } from "../packages/normalize/fixtures/corpus.js";

const REVIEWED = { reviewedBy: "yasserstudio", reviewedAt: "2026-09-06" };
const rule = (id, extra = {}) => ({
  id,
  class: "conservative",
  script: "any",
  from: ["a"],
  to: ["b"],
  why: "a sentence long enough to be a rationale a reader can argue with",
  reviewed: REVIEWED,
  ...extra,
});
const kase = (proves) => ({ input: "x", conservative: "x", loose: "x", tokens: ["x"], proves, note: "n" });

test("the shipped table and corpus pass the gate", () => {
  assert.deepEqual(normalizeRuleErrors({ rules, corpus }), []);
});

test("a Rule with no review record fails", () => {
  const errors = normalizeRuleErrors({
    rules: [rule("any.case", { reviewed: undefined })],
    corpus: [kase(["any.case"])],
    order: ["any.case"],
  });
  assert.deepEqual(errors, [
    "normalize/src/rules.js: any.case has no review record, so nobody signed off on what it asserts",
  ]);
});

test("a review record with no reviewer or no date fails", () => {
  const noDate = normalizeRuleErrors({
    rules: [rule("any.case", { reviewed: { reviewedBy: "yasserstudio", reviewedAt: "" } })],
    corpus: [kase(["any.case"])],
    order: ["any.case"],
  });
  assert.equal(noDate.length, 1);
  assert.match(noDate[0], /reviewedAt/);
});

test("a Rule no corpus case proves fails", () => {
  assert.deepEqual(
    normalizeRuleErrors({ rules: [rule("any.case")], corpus: [kase([])], order: ["any.case"] }),
    ["normalize/fixtures/corpus.js: no corpus case proves any.case, so the Rule is asserted and never exercised"],
  );
});

test("a corpus case naming a Rule that is not in the table fails", () => {
  assert.deepEqual(
    normalizeRuleErrors({
      rules: [rule("any.case")],
      corpus: [kase(["any.case"]), kase(["ar.invented"])],
      order: ["any.case"],
    }),
    ['normalize/fixtures/corpus.js: the case "x" proves ar.invented, which is not a Rule in the table'],
  );
});

test("a repeated identifier fails", () => {
  const errors = normalizeRuleErrors({
    rules: [rule("any.case"), rule("any.case")],
    corpus: [kase(["any.case"])],
    order: ["any.case", "any.case"],
  });
  assert.deepEqual(errors, [
    "normalize/src/rules.js: any.case appears 2 times in the Rule table, an id names one Rule",
  ]);
});

test("a table whose order is not the reviewed one fails", () => {
  assert.deepEqual(
    normalizeRuleErrors({
      rules: [rule("any.whitespace"), rule("any.case")],
      corpus: [kase(["any.case", "any.whitespace"])],
      order: ["any.case", "any.whitespace"],
    }),
    [
      "normalize/src/rules.js: the Rule table order is not the reviewed one: position 1 is any.whitespace, the reviewed order has any.case (2 Rules against 2 reviewed)",
    ],
  );
});

// The committed order is the fixture the gate compares against, and it lives here
// rather than in the package, so that reordering the table in rules.js is a change
// two files have to agree on instead of one file rewriting its own expectation.
test("the committed order is the table the package ships", () => {
  assert.deepEqual(rules.map((r) => r.id), REVIEWED_RULE_ORDER);
});
