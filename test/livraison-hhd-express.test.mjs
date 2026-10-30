// Guards the @geoalgeria/livraison HHD Express agency parser.
//
// HHD Express is the one carrier here whose list is not on the page that shows it. hhd.dz
// renders the first six agencies server-side behind an "Afficher les 80 agences" button,
// so the markup is a preview; the eighty are a static array compiled into the client chunk
// that draws the section, and the chunk's name changes on every deploy. Two things can
// therefore break quietly, and both are tested here rather than by a count check on the
// committed JSON, which would stay green until the next refresh:
//
//  1. Finding the chunk. The page names its own client components in the flight payload
//     (`:I[<module>,["…/chunks/<hash>.js", …],"AgencyDirectory"]`), so the directory's own
//     bundle is the last chunk of its own list. Guessing by hash, or fetching all twelve
//     scripts the page loads, is what this avoids.
//  2. Reading the array. It is a JS object literal, not JSON: bare keys, and a value is
//     single-quoted wherever it holds a double quote. `phones` puts a real bracket inside
//     every entry, so a bracket count alone would stop at the first one.
//
// Ids are minted from the wilaya and the commune because an entry carries no record key
// at all, and the two Sétif agencies are told apart by a digest of their own names.

import { test } from "node:test";
import assert from "node:assert/strict";

import { hhdChunkCandidates, parseHhd } from "../packages/livraison/scripts/fetch.mjs";

// Copied verbatim from the chunk hhd.dz served on 2026-10-25, trimmed to the cases that
// decide something: a plain agency, a single-quoted address holding a double quote, the
// agency that publishes no Maps link, the two Sétif agencies sharing one commune, and the
// El Meniaa agency HHD files under wilaya 47.
const ARRAY = String.raw`[{wilaya:"01",wilayaName:"Adrar",city:"Adrar",name:"HHD Express Adrar",phones:["0770645065"],address:"حي 20 اوت رقم 3 مقابل المسجد",map:"https://maps.app.goo.gl/5mNV3Q7ip3mc8EKC8"},{wilaya:"02",wilayaName:"Chlef",city:"Chettia",name:"HHD Express Chlef",phones:["0770754291"],address:'طريق تنس العمارة "ب" بلدية, الطريق الوطني رقم 19, 02, Chlef 02000',map:"https://maps.app.goo.gl/1DnqdaKrEc4edcY26"},{wilaya:"04",wilayaName:"Oum El Bouaghi",city:"Ain Fekroune",name:"HHD Express Oum El Bouaghi ( Ain Fekroune )",phones:["0770669964"]},{wilaya:"19",wilayaName:"Sétif",city:"Setif",name:"HHD Express Sétif ( El Hidhab )",phones:["0770663304"],address:"HIDHAB",map:"https://maps.app.goo.gl/CKowsje14AJewKNq6"},{wilaya:"19",wilayaName:"Sétif",city:"Setif",name:"HHD EXPRESS Sétif ( EL HIDHAB 2)",phones:["0770663307"],address:"HIDHAB",map:"https://maps.app.goo.gl/CKowsje14AJewKNq7"},{wilaya:"29",wilayaName:"Mascara",city:"Mascara",name:"HHD Express Mascara",phones:["0770663310"],address:"Mascara",map:"https://www.google.com/maps?q=35.407306,0.148472"},{wilaya:"47",wilayaName:"Ghardaïa",city:"El Meniaa",name:"HHD EXPRESS EL MENIAA",phones:["0770373306"],address:"حي حفرة العباس",map:"https://maps.app.goo.gl/JCXrsX9Wh6CHS4FZ8"}]`;

// The chunk's shape: the array is one of several modules the minifier packed into it.
const CHUNK = `80218,e=>{let t=[{id:"x"}]},80219,e=>{"use strict";let s=${ARRAY};`;

// The page's shape: the flight payload's client-component manifest, then the script tags.
// AgencyDirectory's own chunk is last in its own list; the two before it are shared.
const PAGE = [
  '<script>self.__next_f.push([1,"1a:I[27875,[\\"/_next/static/immutable/chunks/27h234rrgg_el.js\\",\\"/_next/static/immutable/chunks/0xdq0p5lurkuv.js\\"],\\"SmoothScroll\\"]\\n',
  '1b:I[49005,[\\"/_next/static/immutable/chunks/27h234rrgg_el.js\\",\\"/_next/static/immutable/chunks/0xdq0p5lurkuv.js\\",\\"/_next/static/immutable/chunks/07rvxox9t1ug9.js\\"],\\"AgencyDirectory\\"]\\n"])</script>',
  '<script src="/_next/static/immutable/chunks/0as93-hrkv5ee.js" async=""></script>',
  '<script src="/_next/static/immutable/chunks/27h234rrgg_el.js" async=""></script>',
  '<script src="/_next/static/immutable/chunks/0xdq0p5lurkuv.js" async=""></script>',
  '<script src="/_next/static/immutable/chunks/07rvxox9t1ug9.js" async=""></script>',
].join("");

test("the chunk to fetch is the one the page names, not a guess at the hash", () => {
  const urls = hhdChunkCandidates(PAGE);
  // AgencyDirectory's own bundle is tried first, so the live run makes one request for
  // the page and one for the chunk.
  assert.equal(urls[0], "https://hhd.dz/_next/static/immutable/chunks/07rvxox9t1ug9.js");
  assert.deepEqual(urls.slice(1, 3), [
    "https://hhd.dz/_next/static/immutable/chunks/0xdq0p5lurkuv.js",
    "https://hhd.dz/_next/static/immutable/chunks/27h234rrgg_el.js",
  ]);
});

test("a page that no longer names the component still offers every script it loads", () => {
  const urls = hhdChunkCandidates(PAGE.replace("AgencyDirectory", "AgencyList"));
  assert.equal(urls.length, 4);
  assert.ok(urls.includes("https://hhd.dz/_next/static/immutable/chunks/07rvxox9t1ug9.js"));
  // Nothing is listed twice, however many components share a chunk.
  assert.equal(new Set(urls).size, urls.length);
});

test("the agency array is read out of the chunk the page compiles it into", () => {
  const rows = parseHhd(CHUNK);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].id, "hhd-express-01-adrar");
  assert.equal(rows[0].name, "HHD Express Adrar");
  assert.equal(rows[0].commune, "Adrar");
  assert.equal(rows[0].cardWilaya, 1);
  assert.equal(rows[0].link, "https://maps.app.goo.gl/5mNV3Q7ip3mc8EKC8");
});

test("a single-quoted address holding a double quote survives the JSON conversion", () => {
  // The minifier picks the other delimiter when a value contains a double quote, which is
  // legal JS and not JSON. Chlef's address is the live case.
  const chlef = parseHhd(CHUNK).find((r) => r.id === "hhd-express-02-chettia");
  assert.equal(chlef.address, 'طريق تنس العمارة "ب" بلدية, الطريق الوطني رقم 19, 02, Chlef 02000');
});

test("the bracket inside every entry's phones does not end the scan early", () => {
  // `phones` is an array, so a scan that counted brackets without tracking strings would
  // stop inside the first agency and return nothing.
  assert.equal(parseHhd(CHUNK).at(-1).id, "hhd-express-47-el-meniaa");
});

test("ids are minted from the wilaya and the commune, there being no record key", () => {
  const rows = parseHhd(CHUNK);
  assert.deepEqual(rows.slice(0, 3).map((r) => r.id), [
    "hhd-express-01-adrar",
    "hhd-express-02-chettia",
    "hhd-express-04-ain-fekroune",
  ]);
});

test("two agencies in one commune are told apart by a digest of their own names", () => {
  const setif = parseHhd(CHUNK).filter((r) => r.commune === "Setif");
  assert.equal(setif.length, 2);
  assert.equal(new Set(setif.map((r) => r.id)).size, 2);
  for (const r of setif) assert.match(r.id, /^hhd-express-19-setif-[0-9a-f]{4}$/);
  // The digest depends on the agency's name and nothing else, so reordering the list
  // leaves both ids exactly where they are.
  const reversed = `[{${ARRAY.slice(2, -2).split("},{").reverse().join("},{")}}]`;
  const rows = parseHhd(CHUNK.replace(ARRAY, reversed));
  assert.deepEqual(
    rows.filter((r) => r.commune === "Setif").map((r) => r.id).sort(),
    setif.map((r) => r.id).sort(),
  );
});

test("a commune with one agency keeps a plain id, no digest", () => {
  assert.equal(parseHhd(CHUNK).find((r) => r.commune === "Adrar").id, "hhd-express-01-adrar");
});

test("the brand prefix is re-cased and the rest of HHD's own name is kept", () => {
  // HHD writes it "HHD Express" on some rows and "HHD EXPRESS" on others, and the rest of
  // the name is what tells Sétif's two agencies apart, so only the prefix is normalized.
  const names = parseHhd(CHUNK).map((r) => r.name);
  assert.ok(names.includes("HHD Express Sétif (El Hidhab 2)"));
  assert.ok(names.includes("HHD Express Oum El Bouaghi (Ain Fekroune)"));
  assert.ok(names.includes("HHD Express El Meniaa"));
});

test("an agency with no Maps link comes through with none, to be logged not geocoded", () => {
  const row = parseHhd(CHUNK).find((r) => r.id === "hhd-express-04-ain-fekroune");
  assert.equal(row.link, null);
});

test("the wilaya cross-checked against the pin is the one HHD declares", () => {
  // HHD files El Meniaa, wilaya 58 since 2021, under its pre-reform parent Ghardaïa. The
  // parser carries the declared code through unchanged; main()'s cross-check decides.
  assert.equal(parseHhd(CHUNK).at(-1).cardWilaya, 47);
});

test("an entry with no usable wilaya or commune is left out rather than guessed", () => {
  const rows = parseHhd(CHUNK.replace('wilaya:"01"', 'wilaya:"0"').replace('city:"Chettia"', 'city:""'));
  assert.equal(rows.length, 5);
  assert.ok(!rows.some((r) => r.commune === "Adrar" || r.commune === "Chettia"));
});

test("a chunk with no agency array yields nothing instead of throwing", () => {
  assert.deepEqual(parseHhd('80219,e=>{let s=[{id:"x"}]}'), []);
});
