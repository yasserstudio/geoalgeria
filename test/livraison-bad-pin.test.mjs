// Guards the @geoalgeria/livraison wilaya cross-check for carded carriers.
//
// A carded desk is re-geocoded every run by resolving the carrier's own Google Maps
// link. When that link resolves into a wilaya the card does not declare, the two
// statements contradict each other and the run has no way to tell which is right, so
// the desk is dropped rather than published at either point (Owner decision, 25 Oct).
// The earlier behaviour, re-shipping the coordinate the desk published last quarter,
// presented a stale point as this run's verified one; it is gone.
//
// The one disagreement that is not a contradiction: a wilaya a reform created against a
// card still printing the wilaya it was carved out of. That is tested against the PARENT
// the flagship registry records, for the 2021 reform (49-58) exactly as for the 2026 one
// (59-69), and never by code range: a range test shipped `noest-55a` (card 55, pin 53,
// 400 km apart, unrelated parents) and dropped HHD's El Meniaa (card 47, pin 58, and 58
// IS Ghardaia's child).

import { test } from "node:test";
import assert from "node:assert/strict";

import { badPinDrop, motherWilayas } from "../packages/livraison/scripts/fetch.mjs";

const desk = (over = {}) => ({ id: "anderson-16-zeralda", cardWilaya: 16, lat: 36.71, lng: 2.84, ...over });

test("badPinDrop: a pin in the wilaya the card declares is kept", () => {
  assert.equal(badPinDrop(desk(), 16), null);
});

test("badPinDrop: the registry is the source of the parent mapping, not this file", () => {
  const mothers = motherWilayas();
  assert.equal(mothers.get(58), 47, "El Meniaa was carved out of Ghardaia in 2021");
  assert.equal(mothers.get(60), 5, "Barika's wilaya was carved out of Batna in 2026");
  assert.equal(mothers.get(53), 11, "In Salah was carved out of Tamanrasset, never out of 55");
  assert.equal(mothers.get(47), undefined, "a 1984 wilaya has no parent");
});

test("badPinDrop: a 2026 wilaya agrees with the parent code the card still prints", () => {
  // anderson-5-barika resolves to 60 against card 05: the reform promotion, not a bad pin.
  assert.equal(badPinDrop(desk({ id: "anderson-5-barika", cardWilaya: 5 }), 60), null);
  assert.equal(badPinDrop(desk({ id: "noest-26b", cardWilaya: 26 }), 67), null);
});

test("badPinDrop: a 2021 wilaya agrees with the parent code the card still prints", () => {
  // The bug this test exists for: HHD files El Meniaa (58) under Ghardaia (47), the
  // wilaya it was carved out of in 2021, and a code-range rule dropped the only desk
  // the carrier publishes there.
  assert.equal(badPinDrop(desk({ id: "hhd-express-58-el-meniaa", cardWilaya: 47 }), 58), null);
  assert.equal(badPinDrop(desk({ id: "x-30-touggourt", cardWilaya: 30 }), 55), null);
});

test("badPinDrop: a reform wilaya that is NOT the card's child still drops the desk", () => {
  // noest-55a: card 55 (Touggourt, out of 30), pin 53 (In Salah, out of 11). Both are
  // reform wilayas and they are unrelated, so the pin contradicts the card.
  assert.ok(badPinDrop(desk({ id: "noest-55a", cardWilaya: 55 }), 53));
  // A 2021 wilaya against a card naming a different 1984 wilaya: 58 is Ghardaia's, not 16's.
  assert.ok(badPinDrop(desk({ cardWilaya: 16 }), 58));
  // The relation is one-way: a card printing the CHILD against a pin in the parent is
  // still a contradiction, because the child's territory left the parent.
  assert.ok(badPinDrop(desk({ id: "x-58-el-meniaa", cardWilaya: 58 }), 47));
});

test("badPinDrop: a card that declares no wilaya has nothing to contradict", () => {
  assert.equal(badPinDrop(desk({ cardWilaya: null }), 31), null);
});

test("badPinDrop: a pin in a different ≤58 wilaya drops the desk", () => {
  assert.ok(badPinDrop(desk(), 31));
});

test("badPinDrop: the reason names the card id, the declared wilaya and the resolved coordinate", () => {
  const reason = badPinDrop(desk({ id: "anderson-33-in-amenas", cardWilaya: 33, lat: 36.75, lng: 3.06 }), 16);
  assert.match(reason, /anderson-33-in-amenas/);
  assert.match(reason, /card 33/);
  assert.match(reason, /pin 16/);
  assert.match(reason, /36\.75,3\.06/);
});

test("badPinDrop: the desk is dropped even though it already ships a good point", () => {
  // The committed record is not consulted at all any more: nothing in the input can
  // turn a contradicted pin back into a shippable one.
  const reason = badPinDrop(desk(), 31);
  assert.ok(reason);
  assert.doesNotMatch(reason, /kept/);
});
