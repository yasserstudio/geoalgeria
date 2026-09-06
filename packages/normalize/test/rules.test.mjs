// The Rule identifiers, and the two Rules that were declined.
//
// Every fold this package applies carries a stable id, so the reviewed table that
// follows can attach a review record to a Rule that already exists rather than
// renaming the folds under it. This is the one test that reads the catalogue as
// data: it is the table's own integrity, not the key path's behaviour.

import { test } from "node:test";
import assert from "node:assert/strict";

import { conservativeKey, looseKey } from "../index.js";
import { corpus } from "../fixtures/corpus.js";
import { DECLINED_RULES, FOLD_RULES, RULES_WITHOUT_A_TABLE } from "../src/rules.js";
import { TABLE_RULE_IDS } from "../src/tables.js";

const CLASSES = new Set(["canonical", "conservative", "loose"]);
const SCRIPTS = new Set(["arab", "latn", "any"]);

// A snapshot, in table order. A Rule id is a name a corpus case, a review record
// and, from the next release, a caller's `explain` output all hold on to, so one
// changing is a decision and not a rename.
const IDS = [
  "ar.presentation-forms-b",
  "ar.presentation-forms-a",
  "ar.lam-alef-ligature",
  "ar.tatweel",
  "ar.marks",
  "latn.combining-marks",
  "any.invisible",
  "ar.alef-variants",
  "ar.waw-hamza",
  "ar.yaa-hamza",
  "ar.indic-digits",
  "ar.extended-indic-digits",
  "latn.accents",
  "latn.extended-a",
  "latn.extended-b",
  "any.separators",
  "any.punctuation",
  "any.whitespace",
  "any.case",
  "any.pass-through",
  "ar.alef-maqsura-yaa",
  "ar.taa-marbuta-haa",
];

test("the Rule ids are the ones that were reviewed, in table order", () => {
  assert.deepEqual(FOLD_RULES.map((rule) => rule.id), IDS);
});

test("every Rule carries an id, a class, a script and a sentence a speaker can argue with", () => {
  for (const rule of FOLD_RULES) {
    assert.match(rule.id, /^(ar|latn|any)\.[a-z0-9-]+$/, `${rule.id} is not a well-formed id`);
    assert.ok(CLASSES.has(rule.class), `${rule.id} has class ${rule.class}`);
    assert.ok(SCRIPTS.has(rule.script), `${rule.id} has script ${rule.script}`);
    assert.ok(rule.why.length > 20, `${rule.id} has no rationale`);
  }
});

test("the ids are unique", () => {
  assert.equal(new Set(FOLD_RULES.map((rule) => rule.id)).size, FOLD_RULES.length);
});

test("only the two loose equivalences are classed loose", () => {
  const loose = FOLD_RULES.filter((rule) => rule.class === "loose").map((rule) => rule.id);
  assert.deepEqual(loose.sort(), ["ar.alef-maqsura-yaa", "ar.taa-marbuta-haa"]);
});

// Every fold is either a table of codepoints or one of the few rules the key path
// applies by construction. Nothing folds without a Rule id above it.
test("every table of codepoints names a Rule, and every Rule is a table or is applied by construction", () => {
  const ids = new Set(FOLD_RULES.map((rule) => rule.id));
  for (const id of TABLE_RULE_IDS) assert.ok(ids.has(id), `the tables carry ${id}, which is not a Rule`);
  for (const rule of FOLD_RULES) {
    assert.ok(
      TABLE_RULE_IDS.includes(rule.id) || RULES_WITHOUT_A_TABLE.includes(rule.id),
      `${rule.id} is neither a table nor declared as applied by construction`,
    );
  }
});

test("every Rule is exercised by at least one corpus case", () => {
  const proved = new Set(corpus.flatMap((kase) => kase.proves));
  for (const rule of FOLD_RULES) {
    assert.ok(proved.has(rule.id), `no corpus case proves ${rule.id}`);
  }
});

test("every Rule a corpus case claims to prove exists", () => {
  const ids = new Set(FOLD_RULES.map((rule) => rule.id));
  for (const kase of corpus) {
    for (const id of kase.proves) {
      assert.ok(ids.has(id), `${JSON.stringify(kase.input)} proves ${id}, which is not a Rule`);
    }
  }
});

// The two rules that were considered and refused. They are recorded so that a
// later session re-adding one has to argue with the reason rather than discover
// the question fresh.
test("the declined rules are recorded with their reasons", () => {
  assert.deepEqual(DECLINED_RULES.map((rule) => rule.id), ["ar.definite-article", "latn.transliteration"]);
  for (const rule of DECLINED_RULES) {
    assert.equal(rule.class, "declined");
    assert.ok(rule.why.length > 40, `${rule.id} has no reason`);
  }
});

test("neither declined rule is applied", () => {
  assert.equal(conservativeKey("الوادي"), "الوادي");
  assert.equal(looseKey("الوادي"), "الوادي");
  assert.equal(conservativeKey("بجاية"), "بجاية");
});
