// The Conservative keys of the first release, pinned.
//
// The 48 cases the package shipped its Conservative key with. Their keys are the
// byte-stable promise: a catalog published with them is never migrated record by
// record, so a key that moves here is a major version and a full rebuild of every
// installed catalog, never a fix. The list is written out rather than read from
// the fixture on purpose, so that growing the Golden corpus cannot quietly move
// one of the keys the promise is about.

import { test } from "node:test";
import assert from "node:assert/strict";

import { conservativeKey } from "../index.js";

/** @type {ReadonlyArray<readonly [input: string, conservative: string]>} */
const RELEASED = Object.freeze([
  ["Béjaïa", "bejaia"],
  ["Bejaia", "bejaia"],
  ["Be\u0301ja\u0308ia", "bejaia"],
  ["Aïn Témouchent", "ain temouchent"],
  ["Ai\u0308n Te\u0301mouchent", "ain temouchent"],
  ["Bordj Bou Arréridj", "bordj bou arreridj"],
  ["Sidi Bel Abbès", "sidi bel abbes"],
  ["SÉTIF", "setif"],
  ["Ghardaïa", "ghardaia"],
  ["Aïn Defla", "ain defla"],
  ["ÁÍÓÚÑÅÆØ", "aiounaaeo"],
  ["Tlemcen", "tlemcen"],
  ["Constantine", "constantine"],
  ["El M'Ghair", "el m ghair"],
  ["El M\u2019Ghair", "el m ghair"],
  ["M\u2018Sila", "m sila"],
  ["M\u0060Sila", "m sila"],
  ["M\u02bcSila", "m sila"],
  ["Sidi-Bel-Abbes", "sidi bel abbes"],
  ["Sidi\u2010Bel\u2011Abbes", "sidi bel abbes"],
  ["Alger\u2013Centre\u2014Rue\u2012Didouche", "alger centre rue didouche"],
  ["   Oran    El   Bahia  ", "oran el bahia"],
  ["Oran\u00a0El\u0009Bahia", "oran el bahia"],
  ["", ""],
  ["   ", ""],
  ["ب\u0650ج\u064eاي\u064eة", "بجاية"],
  ["بجاية", "بجاية"],
  ["الجـــزائر", "الجزاير"],
  ["تيزي وزو", "تيزي وزو"],
  ["م\u064fح\u064eم\u064e\u0651د\u0650ي\u064e\u0651ة", "محمدية"],
  ["رحم\u0670ن", "رحمن"],
  ["أدرار", "ادرار"],
  ["إدرار", "ادرار"],
  ["آدرار", "ادرار"],
  ["ٱدرار", "ادرار"],
  ["ا\u0654درار", "ادرار"],
  ["مسؤول", "مسوول"],
  ["بئر العاتر", "بير العاتر"],
  ["ﺃﺩﺭﺍﺭ", "ادرار"],
  ["ﺍﻟﺠﺰﺍﺋﺮ", "الجزاير"],
  ["ﻻﻟﺔ", "لالة"],
  ["ﭐدرار", "ادرار"],
  ["قسنطينة", "قسنطينة"],
  ["مصطفى", "مصطفى"],
  ["حي ٣٤٥ وهران", "حي 345 وهران"],
  ["حي ۳۴۵ وهران", "حي 345 وهران"],
  ["Cité 20 Août 1955", "cite 20 aout 1955"],
  ["Wilaya الجزائر 16", "wilaya الجزاير 16"],
]);

test("the pinned snapshot is the 48 cases the first release shipped", () => {
  assert.equal(RELEASED.length, 48);
});

for (const [input, conservative] of RELEASED) {
  test(`the released key holds for ${JSON.stringify(input)}`, () => {
    assert.equal(conservativeKey(input), conservative);
  });
}
