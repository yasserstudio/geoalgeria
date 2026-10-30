// Guards the @geoalgeria/livraison Swift Express office parser.
//
// Swift Express is the one carrier in this package whose list is not read out of the
// markup at all: swiftexpress.org is a Next.js app that renders its offices server-side,
// so the page HTML carries the array the page itself renders from, inside the streamed
// RSC payload (`self.__next_f.push([1,"…\"offices\":[{…}]…"])`). Reading the payload
// rather than the two card layouts it produces is what makes one ordinary request return
// the whole network, and it is also what can break quietly, so it is tested here rather
// than by a count check on the committed JSON, which would stay green until the refresh.
//
//  1. The payload is JSON inside a JS string literal, so every quote in it is escaped and
//     the array has to be found and unescaped, not regex-matched. `phoneNumbers` puts a
//     real bracket inside the array, and an address may one day hold one too, so the scan
//     has to know when it is inside a string.
//  2. `number` looks like a branch code and is not one: it restates `city.id`, the wilaya.
//     The office's own `id` is a record key ("236" first, "185" second, against a display
//     order of 1, 2), so that is what ids are minted from.
//  3. `city.id` is the wilaya the office declares, and it is what the pin is cross-checked
//     against in main(); `village` is the commune, and it is the only field that tells
//     Alger's four offices apart.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseSwift } from "../packages/livraison/scripts/fetch.mjs";

// Five offices copied verbatim from https://www.swiftexpress.org/fr/offices (2026-10-25),
// then one synthetic sixth, flagged below, for the bracket case the live page has not
// produced yet.
const OFFICES = [
  { id: "236", title: "Adrar", number: "1", address: "A coté de la direction d'agriculture de la wilaya d'adrar", phoneNumbers: ["0558412362", "0663544254"], locationUrl: "https://maps.app.goo.gl/PDepBMasuaVTPbBh7", village: "Adrar", city: { id: "1", name: "Adrar" } },
  { id: "185", title: "Chlef", number: "2", address: "Le quartier des fréres du abbad ( gaz)", phoneNumbers: ["0793655053", "0666379676"], locationUrl: "https://maps.app.goo.gl/Y59hdbEKHAcWoJQC7?g_st=afm", village: "Chlef", city: { id: "2", name: "Chlef" } },
  { id: "210", title: "Alger", number: "16", address: "AADL, Les Bananiers", phoneNumbers: ["0550433332", "0550434852"], locationUrl: "https://maps.app.goo.gl/UjYDh64M1rgZu3eB8", village: "Bab Ezzouar", city: { id: "16", name: "Alger" } },
  { id: "246", title: "Alger", number: "16", address: "Ain Malha, LSP, Batiment B19, Birkhadem", phoneNumbers: ["0560557305"], locationUrl: "https://maps.app.goo.gl/vZKi1sjgebT7SQ1J7", village: "Birkhadem", city: { id: "16", name: "Alger" } },
  { id: "234", title: "Alger", number: "16", address: "Petit Setaouali, Cheraga", phoneNumbers: ["0553897601", "0540079220"], locationUrl: "https://maps.app.goo.gl/1fKqoKYbQ4DPx5Lf8", village: "Cheraga", city: { id: "16", name: "Alger" } },
  // Synthetic: no address on the live page holds a bracket today, and the scan must not
  // depend on that staying true.
  { id: "244", title: "Oum El Bouaghi", number: "4", address: "Route de Constantine [lot 12]", phoneNumbers: ["0770000000"], locationUrl: "https://maps.app.goo.gl/QeTaK9hnxZmmrNtN6", village: "Aïn Fakroun", city: { id: "4", name: "Oum El Bouaghi" } },
];

// The page's own shape: the array lives inside a JS string literal, so it reaches us with
// every quote escaped and surrounded by the rest of the flight payload, which contains an
// unrelated `"offices"` key of its own in the navigation dictionary.
const flight = (offices) =>
  '<script>self.__next_f.push([1,"4:{\\"nav\\":{\\"offices\\":\\"Nos agences\\"}}\\n"])</script>' +
  '<script>self.__next_f.push([1,"5:[\\"$\\",\\"div\\",null,{\\"children\\":[[\\"$\\",\\"$L19\\",null,{\\"offices\\":' +
  JSON.stringify(JSON.stringify(offices)).slice(1, -1) +
  ',\\"locale\\":\\"fr\\"}]]}]\\n"])</script>';

const FIXTURE = flight(OFFICES);

test("the office array is read out of the RSC payload, not the rendered cards", () => {
  const rows = parseSwift(FIXTURE);
  assert.equal(rows.length, 6);
  assert.equal(rows[0].name, "Swift Express Adrar");
  assert.equal(rows[0].commune, "Adrar");
  assert.equal(rows[0].address, "A coté de la direction d'agriculture de la wilaya d'adrar");
  assert.equal(rows[0].link, "https://maps.app.goo.gl/PDepBMasuaVTPbBh7");
});

test("an unrelated \"offices\" key earlier in the payload is not mistaken for the list", () => {
  // The navigation dictionary ships `"offices":"Nos agences"` before the array. Keying on
  // the name alone lands there and parses the whole page dictionary instead.
  assert.ok(FIXTURE.indexOf('\\"offices\\":\\"') < FIXTURE.indexOf('\\"offices\\":['));
  assert.equal(parseSwift(FIXTURE).length, 6);
});

test("a bracket inside the array does not end the scan early", () => {
  // Every office carries a `phoneNumbers` array, and Aïn Fakroun's address holds a literal
  // bracket. A scan that counted brackets without tracking strings would stop at it.
  const rows = parseSwift(FIXTURE);
  assert.equal(rows.at(-1).address, "Route de Constantine [lot 12]");
});

test("ids come from the office's record key, never from the display number", () => {
  const rows = parseSwift(FIXTURE);
  assert.deepEqual(
    rows.map((r) => r.id),
    ["swift-express-236", "swift-express-185", "swift-express-210", "swift-express-246", "swift-express-234", "swift-express-244"],
  );
  // `number` restates the wilaya, so an id built from it would collide for Alger's offices.
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
});

test("the wilaya cross-checked against the pin is the one the office declares", () => {
  assert.deepEqual(
    parseSwift(FIXTURE).map((r) => r.cardWilaya),
    [1, 2, 16, 16, 16, 4],
  );
});

test("several offices in one wilaya are named by their commune", () => {
  const alger = parseSwift(FIXTURE).filter((r) => r.cardWilaya === 16);
  assert.deepEqual(
    alger.map((r) => r.name),
    ["Swift Express Bab Ezzouar", "Swift Express Birkhadem", "Swift Express Cheraga"],
  );
});

test("an office with no usable wilaya or commune is left out rather than guessed", () => {
  const rows = parseSwift(
    flight([
      { ...OFFICES[0], id: "900", city: { id: "0", name: "" } },
      { ...OFFICES[0], id: "901", village: "" },
      OFFICES[1],
    ]),
  );
  assert.deepEqual(rows.map((r) => r.id), ["swift-express-185"]);
});

test("a page with no office array yields nothing instead of throwing", () => {
  assert.deepEqual(parseSwift("<html><body>maintenance</body></html>"), []);
});
