// The match classes the published fixture declares.
//
// A query and a name produce one of four classes, and the class follows from the
// keys and the tokens alone. Ranking is not here and never will be: mapping a
// class plus a name kind to a tier is private in the products' shared core.
//
// The classifier below is deliberately test-local rather than an export. The
// package's reviewed public surface is seven root exports and the fixture, and a
// classifier is not one of them, so consumers reimplement these fifteen lines from
// the rule written out in types/fixtures.d.ts and in the three READMEs. What the
// fixture guarantees is that their reimplementation and this one agree, case by
// case, because both are held to the same declared classes.

import { test } from "node:test";
import assert from "node:assert/strict";

import { conservativeKey, looseKey, rules } from "../index.js";
import { matchCases } from "../fixtures/index.js";

const CLASSES = ["exact", "prefix", "loose", "none"];

/** The words a key is joined from. A key is a space-joined token list, so this splits it back. */
const words = (key) => (key === "" ? [] : key.split(" "));

/**
 * The token-boundary rule, written out. `query` is a prefix of `name` when the
 * query has at least one word, no more words than the name, every word but its
 * last equals the name's word at the same position, and its last word is a prefix
 * of the name's word at that position. So a query may stop part way through the
 * last word it typed, and only there: it may not start part way through a word.
 */
const isPrefix = (queryWords, nameWords) => {
  if (queryWords.length === 0 || queryWords.length > nameWords.length) return false;
  const last = queryWords.length - 1;
  for (let i = 0; i < last; i++) if (queryWords[i] !== nameWords[i]) return false;
  return nameWords[last].startsWith(queryWords[last]);
};

/**
 * The four-way decision, from the keys and their tokens only.
 *
 * @param {string} query
 * @param {string} name
 * @returns {"exact" | "prefix" | "loose" | "none"}
 */
const matchClass = (query, name) => {
  const q = conservativeKey(query);
  const n = conservativeKey(name);
  if (q === "") return n === "" ? "exact" : "none";
  if (q === n) return "exact";
  if (isPrefix(words(q), words(n))) return "prefix";
  const ql = looseKey(query);
  const nl = looseKey(name);
  if (ql === nl || isPrefix(words(ql), words(nl))) return "loose";
  return "none";
};

test("every match case produces the class it declares", () => {
  for (const kase of matchCases) {
    assert.equal(
      matchClass(kase.query, kase.name),
      kase.class,
      `${kase.id}: ${JSON.stringify(kase.query)} against ${JSON.stringify(kase.name)} (${kase.note})`,
    );
  }
});

// The boundary rule has a second, shorter statement: the name's key starts with
// the query's key. The two are the same rule because a key is its tokens joined by
// single spaces, so the space positions of a string prefix are the token
// boundaries. It is written both ways in the documentation, so the fixture holds
// them together rather than leaving a consumer to pick the one that is wrong.
test("the token-boundary rule and the string-prefix rule are the same rule", () => {
  for (const kase of matchCases) {
    for (const key of [conservativeKey, looseKey]) {
      const q = key(kase.query);
      const n = key(kase.name);
      assert.equal(
        isPrefix(words(q), words(n)),
        q !== "" && n.startsWith(q),
        `${kase.id}: the two statements of the prefix rule disagree on ${JSON.stringify(q)} against ${JSON.stringify(n)}`,
      );
    }
  }
});

test("the fixture covers all four classes", () => {
  const covered = new Set(matchCases.map((kase) => kase.class));
  assert.deepEqual([...covered].sort(), [...CLASSES].sort());
});

// The two loose rules are the whole reason a loose tier exists, and a loose class
// nothing exercises is a tier that could be deleted without a test noticing.
test("each loose rule causes at least one loose case", () => {
  for (const rule of ["ar.taa-marbuta-haa", "ar.alef-maqsura-yaa"]) {
    const cases = matchCases.filter((kase) => kase.class === "loose" && kase.proves.includes(rule));
    assert.ok(cases.length > 0, `no loose match case is caused by ${rule}`);
  }
});

// A loose case is only honest if the conservative keys really do fail: otherwise it
// is an exact or prefix match wearing a loose label.
test("a loose case is loose because the conservative keys refuse it", () => {
  for (const kase of matchCases.filter((k) => k.class === "loose")) {
    const q = conservativeKey(kase.query);
    const n = conservativeKey(kase.name);
    assert.notEqual(q, n, `${kase.id}: the conservative keys are equal, so this is an exact match`);
    assert.ok(!isPrefix(words(q), words(n)), `${kase.id}: the conservative keys already prefix-match`);
  }
});

// A case naming a Rule that no longer exists proves nothing, and the validator's
// gate reads the Golden corpus rather than this file, so the check lives here.
test("every rule a match case names is a rule in the table", () => {
  const known = new Set(rules.map((rule) => rule.id));
  for (const kase of matchCases) {
    for (const id of kase.proves) {
      assert.ok(known.has(id), `${kase.id} names ${id}, which is not a Rule in the table`);
    }
    if (kase.class !== "loose") {
      assert.deepEqual(kase.proves, [], `${kase.id} is not loose, so no Rule made it what it is`);
    }
  }
});

test("every match case is well formed and its id is unique", () => {
  const ids = new Set();
  for (const kase of matchCases) {
    assert.deepEqual(Object.keys(kase).sort(), ["class", "id", "name", "note", "proves", "query"]);
    assert.ok(kase.query.length > 0, `${kase.id}: an empty query is not a case`);
    assert.ok(kase.name.length > 0, `${kase.id}: an empty name is not a case`);
    assert.ok(CLASSES.includes(kase.class), `${kase.id}: ${kase.class} is not one of the four classes`);
    assert.ok(kase.note.length > 0, `${kase.id}: every case says what it is about`);
    assert.ok(!ids.has(kase.id), `${kase.id} is used twice`);
    ids.add(kase.id);
  }
});
