// Guards the @geoalgeria/livraison wilaya cross-check for carded carriers.
//
// A carded desk is re-geocoded every run by resolving the carrier's own Google Maps
// link. When that link resolves into a wilaya the card does not declare, the two
// statements contradict each other and the run has no way to tell which is right, so
// the desk is dropped rather than published at either point (Owner decision, 25 Oct).
// The earlier behaviour, re-shipping the coordinate the desk published last quarter,
// presented a stale point as this run's verified one; it is gone.
//
// The one disagreement that is not a contradiction: a wilaya the 2026 reform created
// (59-69) against a card still printing its parent's ≤58 code.

import { test } from "node:test";
import assert from "node:assert/strict";

import { badPinDrop } from "../packages/livraison/scripts/fetch.mjs";

const desk = (over = {}) => ({ id: "anderson-16-zeralda", cardWilaya: 16, lat: 36.71, lng: 2.84, ...over });

test("badPinDrop: a pin in the wilaya the card declares is kept", () => {
  assert.equal(badPinDrop(desk(), 16), null);
});

test("badPinDrop: a reform wilaya agrees with the parent code the card still prints", () => {
  // anderson-5-barika resolves to 60 against card 05: the reform promotion, not a bad pin.
  assert.equal(badPinDrop(desk({ id: "anderson-5-barika", cardWilaya: 5 }), 60), null);
  assert.equal(badPinDrop(desk({ id: "noest-26b", cardWilaya: 26 }), 67), null);
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
