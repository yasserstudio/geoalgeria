import assert from "node:assert/strict";
import test from "node:test";
import { canonicalBusRef } from "../research/buses/candidate-identity.mjs";

test("Sétif Line names override conflicting generic OSM refs", () => {
  assert.equal(canonicalBusRef({ name: "ETUS SETIF 101", ref: "1" }), "101");
  assert.equal(canonicalBusRef({ name: "ETUS SETIF 104", ref: "1" }), "104");
});

test("Sétif branch suffixes remain part of canonical Line identity", () => {
  assert.equal(canonicalBusRef({ name: "ETUS SETIF 106 A", ref: "106" }), "106A");
  assert.equal(canonicalBusRef({ name: "ETUS SETIF 106 b", ref: "106" }), "106B");
});

test("other Operators retain tagged refs and direction suffix cleanup", () => {
  assert.equal(canonicalBusRef({ name: "ETUS 29 Reverse", ref: "29 Reverse" }), "29");
  assert.equal(canonicalBusRef({ name: "1A — Timizart", ref: null }), "1A");
});
