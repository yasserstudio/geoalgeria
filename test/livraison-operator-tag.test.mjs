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

import { splitName, parseYalidine, pinFor } from "../packages/livraison/scripts/fetch.mjs";

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

// The tags the live table actually carries, checked against it on 2026-10-25. All
// five resolve to a carrier already in carriers.seed.json, so none needed a new
// mapping invented for it.
test("every operator tag shape the live table carries resolves", () => {
  const cases = [
    // Double-escaped entity: the page serves "&amp;amp;" for the "&" in the brand.
    ["Agence freha [Easy&amp;amp;speed]", "Agence freha", "easyandspeed"],
    ["Agence Béchar (Jet d&#039;eau) [EasyAndSpeed]", "Agence Béchar (Jet d'eau)", "easyandspeed"],
    ["Agence les Pins Maritime [Yalitec]", "Agence les Pins Maritime", "yalitec"],
    ["Agence de Canastel [SpeedMail]", "Agence de Canastel", "speedmail"],
    ["Agence Sidi Achour [GHANZOH Express By Yalidine]", "Agence Sidi Achour", "yalidine"],
    // Paren form, and the brand is spelled with a space while the id has a hyphen.
    ["Agence BAB Ezzouar DOUZI (Zimou Express)", "Agence BAB Ezzouar DOUZI", "zimou-express"],
    ["Agence de Sidi Abdellah [Zimou-Express]", "Agence de Sidi Abdellah", "zimou-express"],
  ];
  for (const [raw, name, operator] of cases) {
    assert.deepEqual(splitName(raw), { name, operator }, raw);
  }
});

// A Maps link in this table can carry a third number after the pair, which is the
// zoom level and not part of the coordinate. Reading it as one would put the desk
// in the sea.
test("a maps link's trailing zoom is not read as a coordinate", () => {
  const row = (id, name, commune, q) =>
    `<tr><td>${id}</td><td>w</td><td>${commune}</td><td>${name}</td><td>addr</td>` +
    `<td><a href="https://maps.google.com/?q=${q}">map</a></td></tr>`;
  const parsed = parseYalidine(
    row("80102", "Agence Béchar [EasyAndSpeed]", "Béchar", "31.6179505,-2.2146708,16") +
      row("150401", "Agence freha [Easy&amp;amp;speed]", "Freha", "36.7560789,4.3159564,20") +
      row("195505", "Agence Centre Ville Sétif 1014 Yalidine", "Sétif", "36.19528768347021,5.434247999999999"),
  );
  assert.deepEqual(
    parsed.map((r) => [r.id, r.operator, r.lat, r.lng]),
    [
      ["80102", "easyandspeed", 31.6179505, -2.2146708],
      ["150401", "easyandspeed", 36.7560789, 4.3159564],
      ["195505", "yalidine", 36.19528768347021, 5.434247999999999],
    ],
  );
});

// A carded desk is re-geocoded from scratch on every run, so its coordinate hangs on
// one HTTP request. These are the two ways that bit in #306.
test("a published card whose link will not resolve keeps its coordinate", () => {
  // anderson-16-sidi-abdellah and anderson-25-ali-mendjeli: both cards still
  // published with a Maps link, both dropped by the 2026-10-25 run because the link
  // did not resolve. Dropping a desk also retires its id, so this has to carry over.
  const sidiAbdellah = { lat: 36.6805625, lng: 2.8560625 };
  const aliMendjeli = { lat: 36.2664, lng: 6.6007 };
  assert.deepEqual(pinFor(null, sidiAbdellah), { ...sidiAbdellah, verdict: "carried" });
  assert.deepEqual(pinFor(null, aliMendjeli), { ...aliMendjeli, verdict: "carried" });
  // Nothing committed and nothing resolved is a desk we cannot place at all.
  assert.equal(pinFor(null, undefined), null);
});

// An operator pin is verified evidence however far it moves the desk (Owner rule,
// 2026-10-25), so anderson-56-djanet takes the 9.4 km move its own card link states and
// keeps its id and its `exact` precision. The guard against a link pointing somewhere
// else is the wilaya cross-check in main(), which drops a carded desk whose pin lands
// outside the wilaya its card declares.
test("an operator's own pin moves the desk however far it moved", () => {
  const djanet = { lat: 24.55814, lng: 9.48326 };
  const movedPin = { lat: 24.47183, lng: 9.512349 };
  assert.deepEqual(pinFor(movedPin, djanet), { ...movedPin, verdict: "fresh" });
  // A desk with no committed coordinate takes whatever the link gives.
  assert.deepEqual(pinFor(movedPin, undefined), { ...movedPin, verdict: "fresh" });
});
