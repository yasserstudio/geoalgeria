// Guards the @geoalgeria/livraison fetcher's operator tag parsing.
//
// The bug class this exists for: the operating carrier is not a field in the
// Yalidine relay table, it is a "[...]" tag inside the stop-desk's name. On
// 2026-10-25 three rows came back with the brackets lost, so splitName() read
// no operator, and the malformed-stop-desk guard in main() aborted the whole
// refresh before anything was written. That guard is doing its job, but it
// fires at the end of a five-source pull, which makes a one-token upstream slip
// cost a full fetch and tells nobody which shape broke.
//
// So the shapes are asserted against the function instead. Every check on this
// rule otherwise reads committed JSON, where the three desks already carry the
// right operator: the parse could break again and `pnpm validate` would stay
// green until the next refresh.
//
// The rule being guarded is deliberately narrow. A trailing token becomes the
// operator only when it maps to a known carrier in OPERATOR_VARIANTS, the same
// condition the paren form already uses. Nothing is inferred from the feed a
// row arrived on: the Yalidine table is a federated relay map that lists other
// carriers' desks, so the endpoint does not identify the operator.

import { test } from "node:test";
import assert from "node:assert/strict";

import { splitName } from "../packages/livraison/scripts/fetch.mjs";

test("the three rows that lost their brackets upstream on 2026-10-25", () => {
  // Stray closing bracket, no opening one.
  assert.deepEqual(splitName("Agence Tlemcen El-Kiffane EasyAndSpeed]"), {
    name: "Agence Tlemcen El-Kiffane",
    operator: "easyandspeed",
  });
  // No brackets at all.
  assert.deepEqual(splitName("Agence Centre Ville La Gare Guepex"), {
    name: "Agence Centre Ville La Gare",
    operator: "guepex",
  });
  assert.deepEqual(splitName("Agence Centre Ville Sétif 1014 Yalidine"), {
    name: "Agence Centre Ville Sétif 1014",
    operator: "yalidine",
  });
});

test("the well-formed shapes are untouched", () => {
  assert.deepEqual(splitName("Agence Tlemcen Amandiers [EasyAndSpeed]"), {
    name: "Agence Tlemcen Amandiers",
    operator: "easyandspeed",
  });
  assert.deepEqual(splitName("Agence Sétif (1014 Logement) [Yalidine]"), {
    name: "Agence Sétif (1014 Logement)",
    operator: "yalidine",
  });
  // A variant spelling still resolves to the carrier id, not the tag text.
  assert.deepEqual(splitName("Agence Oran [Ghanzoh Express by Yalidine]"), {
    name: "Agence Oran",
    operator: "yalidine",
  });
});

test("a trailing token that is not a carrier stays in the name", () => {
  // The locality case the paren rule exists for: "Adrar" is not a carrier, so
  // the parens are part of the name and the new trailing rule must not strip
  // the word either.
  assert.deepEqual(splitName("Agence El Hataba (Adrar)"), {
    name: "Agence El Hataba (Adrar)",
    operator: null,
  });
  assert.deepEqual(splitName("Agence Centre Ville La Gare"), {
    name: "Agence Centre Ville La Gare",
    operator: null,
  });
  // Nothing before the token, so there is no name to split off and no tag.
  assert.deepEqual(splitName("Yalidine"), { name: "Yalidine", operator: null });
});

test("an operator the registry does not know is never invented", () => {
  // A bare trailing token that maps to nothing leaves the desk with no
  // operator, so main()'s malformed guard still fires rather than the fetcher
  // picking a carrier.
  assert.deepEqual(splitName("Agence Béjaïa Centre Fastolivraison"), {
    name: "Agence Béjaïa Centre Fastolivraison",
    operator: null,
  });
});
