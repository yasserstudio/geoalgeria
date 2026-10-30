// Guards the @geoalgeria/livraison ZR Express office parser.
//
// ZR Express is the one carrier in this package whose pin arrives inside the link
// instead of behind it: each office row links
// `google.com/maps/search/?api=1&query=<lat>,<lng>`. Three things about that page can
// quietly produce wrong data, and each gets a test here rather than a count check on the
// committed JSON, which would stay green until the next refresh.
//
//  1. The leading number on a row is the index of the list as rendered, 001..080 straight
//     down a sort by wilaya. It looks like a branch code and is not one: inserting a
//     single office in Adrar renumbers every row after it. Ids must not be built from it.
//  2. Three of the 80 rows put a place-name search in `query=` instead of a coordinate
//     ("Hub Dellys Dellys Boumerdès Algerie"). That is an address. Handing it to Google
//     would geocode a stop-desk from its address, which this dataset never does, so the
//     row has to come through with no link and a reason.
//  3. The office name is published in Arabic only, and four offices share the commune of
//     Constantine, so wilaya + commune does not name an office. The ids of the ones that
//     collide carry a digest of the Arabic name, which must depend on that name alone and
//     not on the row's position, or every id moves when ZR reorders the page.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseZrExpress } from "../packages/livraison/scripts/fetch.mjs";

// A wilaya coder standing in for the flagship registry, so the fixture stays small.
const CODES = { adrar: 1, constantine: 25, oran: 31, boumerdes: 35 };
const toWilaya = (name) =>
  CODES[String(name).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")] ?? null;

// Six rows copied from https://www.zrexpress.net/en/offices (2026-10-25), with the
// styling attributes the parser keys on kept and everything else dropped.
const row = (idx, href, nameAr, wilaya, commune, chip) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer" class="bureau-row zr-offices-row" style="display:grid">` +
  `<div class="mono" style="font-size:12px;color:var(--muted)">${idx}</div>` +
  `<div><div style="display:flex"><div style="font-family:var(--f-display);font-size:17px;letter-spacing:-0.01em;line-height:1.25">${nameAr}</div></div></div>` +
  `<div style="font-size:14px">${wilaya}</div>` +
  `<div style="font-size:14px;color:var(--muted)">${commune}</div>` +
  `<div><span class="chip" style="background:transparent">${chip}</span></div>` +
  `</a>`;

const pinned = (lat, lng) =>
  `https://www.google.com/maps/search/?api=1&amp;query=${lat}%2C${lng}`;

const FIXTURE =
  row("001", pinned("27.87776595194334", "-0.28428690891282976"), "مكتب أدرار", "Adrar", "Adrar", "★ Centre de tri") +
  row("041", pinned("36.31349540107195", "6.622879267785798"), "مكتب قسنطينة", "Constantine", "Constantine", "★ Centre de tri") +
  row("043", pinned("36.31349540107195", "6.622879267785798"), "مكتب زواغي", "Constantine", "Constantine", "Bureau") +
  row("044", pinned("36.2653051270532", "6.592828846422557"), "مكتب المدينة الجديدة", "Constantine", "Constantine", "Bureau") +
  row("052", pinned("35.708936447497415", "-0.5918772328422617"), "مكتب المرشد", "Oran", "Oran", "Bureau") +
  row("059", "https://www.google.com/maps/search/?api=1&amp;query=Hub%20Dellys%20Dellys%20Boumerd%C3%A8s%20Algerie", "مكتب دلس", "Boumerdes", "Dellys", "Bureau");

test("every office row is parsed, with the wilaya its own column declares", () => {
  const rows = parseZrExpress(FIXTURE, toWilaya);
  assert.equal(rows.length, 6);
  assert.deepEqual(
    rows.map((r) => r.cardWilaya),
    [1, 25, 25, 25, 31, 35],
  );
  assert.equal(rows[0].name, "ZR Express Adrar");
  assert.equal(rows[0].commune, "Adrar");
  assert.equal(rows[0].name_ar, "مكتب أدرار");
  assert.equal(rows[0].address, null);
});

test("the pin comes out of the link itself, with no shortlink to resolve", () => {
  const [adrar] = parseZrExpress(FIXTURE, toWilaya);
  assert.match(adrar.link, /query=27\.87776595194334%2C-0\.28428690891282976$/);
});

test("the row number is a display index, so no id is built from it", () => {
  const ids = parseZrExpress(FIXTURE, toWilaya).map((r) => r.id);
  for (const id of ids) {
    assert.doesNotMatch(id, /\b0\d\d\b/, `${id} carries a row number`);
  }
  assert.equal(ids[0], "zr-express-01-adrar");
});

test("a row whose query is a place name, not a coordinate, is carried with a reason", () => {
  const dellys = parseZrExpress(FIXTURE, toWilaya).at(-1);
  assert.equal(dellys.id, "zr-express-35-dellys");
  assert.equal(dellys.link, null, "a place-name search must never be resolved as a pin");
  assert.equal(dellys.noPin, "row links a place-name search, not a coordinate");
});

test("offices sharing a commune get distinct ids, and a lone office keeps a bare one", () => {
  const rows = parseZrExpress(FIXTURE, toWilaya);
  const ids = rows.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  // Oran and Adrar hold one office each in this fixture, so neither needs a digest.
  assert.equal(ids[0], "zr-express-01-adrar");
  assert.equal(ids[4], "zr-express-31-oran");
  for (const id of [ids[1], ids[2], ids[3]]) {
    assert.match(id, /^zr-express-25-constantine-[0-9a-f]{4}$/);
  }
});

test("a colliding id depends on the office's own name, not on where the row sits", () => {
  const rows = parseZrExpress(FIXTURE, toWilaya);
  // Same page, Constantine's three offices listed in the opposite order.
  const reordered = parseZrExpress(
    row("041", pinned("36.2653051270532", "6.592828846422557"), "مكتب المدينة الجديدة", "Constantine", "Constantine", "Bureau") +
      row("042", pinned("36.31349540107195", "6.622879267785798"), "مكتب زواغي", "Constantine", "Constantine", "Bureau") +
      row("043", pinned("36.31349540107195", "6.622879267785798"), "مكتب قسنطينة", "Constantine", "Constantine", "★ Centre de tri"),
    toWilaya,
  );
  const byName = (list) => new Map(list.map((r) => [r.name_ar, r.id]));
  const before = byName(rows);
  for (const [nameAr, id] of byName(reordered)) {
    assert.equal(id, before.get(nameAr), `${nameAr} changed id when the page was reordered`);
  }
});

test("a row in a wilaya the registry does not know is left out, never guessed", () => {
  const rows = parseZrExpress(
    row("001", pinned("27.8", "-0.28"), "مكتب", "Wilaya-That-Does-Not-Exist", "Somewhere", "Bureau"),
    toWilaya,
  );
  assert.deepEqual(rows, []);
});
