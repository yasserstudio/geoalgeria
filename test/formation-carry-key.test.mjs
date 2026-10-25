// The @geoalgeria/formation-professionnelle carry key decides which committed id
// a rebuilt record is pinned back to, and it is built from the establishment's
// Arabic name because `code` alone repeats on five records.
//
// The bug this guards (empirically, #306): takwin.dz corrected the spacing of
// 1,788 Arabic names between the June and October captures, running words apart
// that it had previously run together. A key that reads a name byte for byte
// takes each correction for a different place, so a rebuild retired 1,788 ids
// and minted 1,819 for a refresh in which no establishment moved. Spacing is
// presentation, not identity: the key folds it away, while the published name
// keeps the source's corrected spelling.
//
// Collapsing runs of whitespace is not enough. June has no space at all where
// October has one, so the two keys only meet if the whitespace is removed
// outright.

import { test } from "node:test";
import assert from "node:assert/strict";
import { carryKeyOf } from "../packages/formation-professionnelle/scripts/fetch.mjs";
import { carryOverIds } from "../scripts/lib/v2-transforms.mjs";

// The real pair from the capture diff: code 0100, the Adrar directorate. June
// ran "\u0627\u0644\u062A\u0643\u0648\u064A\u0646" into "\u0648" and "\u0627\u0644\u0645\u0647\u0646\u064A\u064A\u0646" into "\u0623\u062F\u0631\u0627\u0631"; October spaces both and
// doubles the space before the wilaya.
const JUNE = "\u0645\u062F\u064A\u0631\u064A\u0629 \u0627\u0644\u062A\u0643\u0648\u064A\u0646\u0648 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0645\u0647\u0646\u064A\u064A\u0646\u0623\u062F\u0631\u0627\u0631";
const OCTOBER = "\u0645\u062F\u064A\u0631\u064A\u0629 \u0627\u0644\u062A\u0643\u0648\u064A\u0646 \u0648 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0645\u0647\u0646\u064A\u064A\u0646  \u0623\u062F\u0631\u0627\u0631";

test("the carry key folds the spacing the portal corrected", () => {
  assert.notEqual(JUNE, OCTOBER);
  assert.equal(
    carryKeyOf({ code: "0100", type: "dfep", name: OCTOBER }),
    carryKeyOf({ code: "0100", type: "dfep", name: JUNE }),
  );
});

test("the carry key folds every space shape a name can pick up", () => {
  const base = { code: "0104", type: "insfp" };
  // U+0020 SPACE, U+00A0 NO-BREAK SPACE, U+202F NARROW NO-BREAK SPACE,
  // U+2009 THIN SPACE, U+3000 IDEOGRAPHIC SPACE, U+0009 TAB, U+000A LINE FEED,
  // U+200B ZERO WIDTH SPACE, U+200C ZWNJ, U+200D ZWJ, U+FEFF ZERO WIDTH
  // NO-BREAK SPACE, and U+0640 ARABIC TATWEEL, the elongation padding.
  const spaces = [" ", "\u00A0", "\u202F", "\u2009", "\u3000", "\u0009", "\u000A", "\u200B", "\u200C", "\u200D", "\uFEFF", "\u0640"];
  const want = carryKeyOf({ ...base, name: "\u0645\u0631\u0643\u0632" });
  for (const space of spaces) {
    const name = `\u0645\u0631${space}\u0643\u0632`;
    assert.equal(
      carryKeyOf({ ...base, name }),
      want,
      `U+${space.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")} is not folded`,
    );
  }
});

test("the carry key still tells two different establishments apart", () => {
  const name = "\u0645\u0631\u0643\u0632";
  const a = carryKeyOf({ code: "0104", type: "insfp", name });
  assert.notEqual(carryKeyOf({ code: "0105", type: "insfp", name }), a);
  assert.notEqual(carryKeyOf({ code: "0104", type: "cfpa", name }), a);
  assert.notEqual(carryKeyOf({ code: "0104", type: "insfp", name: `${name}\u0629` }), a);
});

test("a respaced name keeps its committed id through carryOverIds", () => {
  const committed = [{ id: "00001", code: "0100", type: "dfep", name: JUNE }];
  const rows = [{ id: "00001-1", code: "0100", type: "dfep", name: OCTOBER }];
  carryOverIds(rows, committed, carryKeyOf, "formation-professionnelle", new Set());
  assert.equal(rows[0].id, "00001");
  assert.equal(rows[0].name, OCTOBER, "the published name keeps the corrected spacing");
});
