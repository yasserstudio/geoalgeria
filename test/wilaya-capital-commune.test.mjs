// Guards `capital_commune_code`, the Capital (chef-lieu) of every wilaya.
//
// The bug this exists for: the field did not exist, so a consumer that needed a
// wilaya's capital derived it from the wilaya's name. That resolves 65 of 69 and
// silently fails on 4: wilaya 16 has no commune called "Alger" (the chef-lieu is
// Alger Centre), and 53, 54 and 57 spell the commune differently from the wilaya
// ("Ain Salah", "Ain Guezzam", "El-M'ghaier"). The field is the decreed answer,
// read off décret n° 84-79 (1-48), décret présidentiel n° 21-117 (49-58) and
// décret présidentiel n° 26-206 (59-69), never off a name.
//
// The checks, in order of what they would catch:
//   1. the join holds: every capital is a commune, of that same wilaya, and no
//      two wilayas claim the same commune. A code shifted by one row fails here.
//   2. all five carriers agree, so a hand-edit of one file is caught.
//   3. the wilaya's own capital point EQUALS the centre of its capital commune, to
//      the digit, in every file that carries a wilaya point, and that point is
//      inside the capital commune's own OpenStreetMap outline.
//   4. the documented meaning is present, because the value is only correct
//      relative to it.
//
// WHY EQUALITY AND CONTAINMENT, NOT A NEAREST-CENTRE SEARCH. This check used to ask
// which commune centre the wilaya point was nearest, and require it to be the
// capital's. That rule passes on wrong data: wilaya 52's point sat 8.8 km from the
// centre of Beni-Abbes and still answered Beni-Abbes, because the next centre is
// further away than the error is. It is also two claims about one town, so a reader
// who wants the seat of a wilaya has to pick one of them. Rule 9 of
// docs/adr/0001-coordinate-review-by-independent-votes.md (Owner, 2026-10-01)
// collapses them: a wilaya capital point IS its capital commune's centre, so there
// is one point to verify per capital, and it is verified the way every other
// published point is, by containment in the commune's own outline
// (test/commune-centre-in-commune.test.mjs states that standard and why it replaced
// a distance). Containment is run here on the wilaya point itself rather than
// inferred from equality, so a point that stops agreeing fails both checks.
//
// NO EXEMPTIONS, EITHER SIDE. None of the 69 capital communes is in
// research/_commune-centres/containment-exceptions.json, and that is asserted: an
// exception added there must not quietly become an exemption here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset");
const readText = (...p) => readFileSync(join(DATA, ...p), "utf-8");
const read = (...p) => JSON.parse(readText(...p));
const readResearch = (...p) =>
  JSON.parse(readFileSync(join(ROOT, "research", "_commune-centres", ...p), "utf-8"));

const communes = ["communes_w1_w23", "communes_w24_w48", "communes_w49_w69"].flatMap((f) =>
  read("data", `${f}.json`),
);
const byCode = new Map(communes.map((c) => [c.code_commune, c]));

/** Every file in packages/dataset that carries the field: [label, () => {code: capital}] */
const COPIES = [
  [
    "data/algeria.json",
    () => Object.fromEntries(read("data", "algeria.json").map((w) => [w.code, w.capital_commune_code])),
  ],
  [
    "data/wilayas.json",
    () =>
      Object.fromEntries(
        read("data", "wilayas.json").wilayas.map((w) => [w.code, w.capital_commune_code]),
      ),
  ],
  ["data/wilayas.csv", () => fromCsv("data", "wilayas.csv")],
  ["data/csv/wilayas.csv", () => fromCsv("data", "csv", "wilayas.csv")],
  ["data/sql/full.sql", () => fromSql()],
];

function fromCsv(...p) {
  const [head, ...rows] = readText(...p).trim().split(/\r?\n/);
  const col = head.split(",");
  const [ci, cap] = [col.indexOf("code"), col.indexOf("capital_commune_code")];
  assert.ok(ci >= 0 && cap >= 0, `${p.join("/")}: no code/capital_commune_code column`);
  return Object.fromEntries(
    rows.map((r) => {
      const f = r.split(",");
      return [Number(f[ci]), Number(f[cap])];
    }),
  );
}

function fromSql() {
  const text = readText("data", "sql", "full.sql");
  const out = {};
  // (code, 'name_fr', 'name_ar', phone, postal, lat, lng, 'created', capital)
  const re = /^ {2}\((\d+), .*, '(?:original|2019|2026)', (\d+)\)[,;]$/gm;
  for (const m of text.matchAll(re)) out[Number(m[1])] = Number(m[2]);
  return out;
}

/** Every file in packages/dataset that carries a wilaya point: [label, () => {code: [lng, lat]}] */
const POINTS = [
  [
    "data/algeria.json",
    () => Object.fromEntries(read("data", "algeria.json").map((w) => [w.code, [w.longitude, w.latitude]])),
  ],
  ["data/csv/wilayas.csv", () => pointsFromCsv("data", "csv", "wilayas.csv")],
  ["data/sql/full.sql", () => pointsFromSql()],
  ["data/geojson/wilayas.geojson", () => pointsFromGeojson("data", "geojson", "wilayas.geojson")],
  ["algeria.geojson", () => pointsFromGeojson("algeria.geojson")],
];

function pointsFromCsv(...p) {
  const [head, ...rows] = readText(...p).trim().split(/\r?\n/);
  const col = head.split(",");
  const [ci, lat, lng] = [col.indexOf("code"), col.indexOf("latitude"), col.indexOf("longitude")];
  assert.ok(ci >= 0 && lat >= 0 && lng >= 0, `${p.join("/")}: no code/latitude/longitude column`);
  return Object.fromEntries(
    rows.map((r) => {
      const f = r.split(",");
      return [Number(f[ci]), [Number(f[lng]), Number(f[lat])]];
    }),
  );
}

function pointsFromSql() {
  const text = readText("data", "sql", "full.sql");
  const out = {};
  // (code, 'name_fr', 'name_ar', 'phone', 'postal', lat, lng, 'created', capital)
  const re = /^ {2}\((\d+), .*, (-?[\d.]+), (-?[\d.]+), '(?:original|2019|2026)', \d+\)[,;]$/gm;
  for (const m of text.matchAll(re)) out[Number(m[1])] = [Number(m[3]), Number(m[2])];
  return out;
}

function pointsFromGeojson(...p) {
  return Object.fromEntries(
    read(...p).features.map((ft) => [Number(ft.properties.code), ft.geometry.coordinates.map(Number)]),
  );
}

/** Ray casting over one ring of [lng, lat] pairs. */
function inRing(lng, lat, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Inside any outer ring and no inner ring. The bbox is a reject, not the answer. */
function insideCommune(lng, lat, boundary) {
  const [w, s, e, n] = boundary.bbox;
  if (lng < w || lng > e || lat < s || lat > n) return false;
  return (
    boundary.outer.some((r) => inRing(lng, lat, r)) && !boundary.inner.some((r) => inRing(lng, lat, r))
  );
}

test("wilaya capitals: the commune table loaded", () => {
  assert.equal(communes.length, 1541, `got ${communes.length} communes`);
});

for (const [label, load] of COPIES) {
  test(`${label}: every capital is a commune of its own wilaya, and none is shared`, () => {
    const capitals = load();
    assert.equal(Object.keys(capitals).length, 69, `${label}: expected 69 wilayas`);

    const wrong = [];
    const claimedBy = new Map();
    for (const [rawCode, cap] of Object.entries(capitals)) {
      const code = Number(rawCode);
      if (!Number.isInteger(cap)) {
        wrong.push(`wilaya ${code}: capital_commune_code is ${JSON.stringify(cap)}`);
        continue;
      }
      const commune = byCode.get(cap);
      if (!commune) {
        wrong.push(`wilaya ${code}: capital ${cap} is not a commune code`);
      } else if (Number(commune.wilaya_code) !== code) {
        wrong.push(
          `wilaya ${code}: capital ${cap} is ${commune.name_fr}, a commune of wilaya ${commune.wilaya_code}`,
        );
      }
      if (claimedBy.has(cap)) {
        wrong.push(`wilaya ${code}: capital ${cap} is already the capital of wilaya ${claimedBy.get(cap)}`);
      } else {
        claimedBy.set(cap, code);
      }
    }
    assert.deepEqual(wrong, [], `${label}: ${wrong.length} bad capital(s)\n  ${wrong.join("\n  ")}`);
  });
}

test("wilaya capitals: all five carriers in packages/dataset agree", () => {
  const [[baseLabel, baseLoad], ...rest] = COPIES;
  const base = baseLoad();
  for (const [label, load] of rest) {
    const other = load();
    for (const code of Object.keys(base)) {
      assert.equal(
        other[code],
        base[code],
        `wilaya ${code}: ${label} has ${other[code]}, ${baseLabel} has ${base[code]}`,
      );
    }
  }
});

// ADR 0001 rule 9. The wilaya point is not a second claim about the seat, it is the
// capital commune's centre, so it is compared with no tolerance at all: a rounded
// copy is a different number and would put two values in circulation again.
const capitals = Object.fromEntries(
  read("data", "algeria.json").map((w) => [w.code, w.capital_commune_code]),
);

for (const [label, load] of POINTS) {
  test(`${label}: the wilaya point is its capital commune's centre, to the digit`, () => {
    const points = load();
    assert.equal(Object.keys(points).length, 69, `${label}: expected 69 wilaya points`);

    const wrong = [];
    for (const [rawCode, cap] of Object.entries(capitals)) {
      const code = Number(rawCode);
      const commune = byCode.get(cap);
      const point = points[code];
      assert.ok(point, `${label}: no point for wilaya ${code}`);
      if (point[0] !== commune.longitude || point[1] !== commune.latitude) {
        wrong.push(
          `wilaya ${code}: carries [${point}] but its capital ${cap} ` +
            `(${commune.name_fr}) is at [${commune.longitude}, ${commune.latitude}]`,
        );
      }
    }
    assert.deepEqual(
      wrong,
      [],
      `${label}: ${wrong.length} wilaya point(s) that are not their capital commune's centre\n  ${wrong.join("\n  ")}`,
    );
  });
}

test("wilaya capitals: the wilaya point is inside its capital commune's own outline", () => {
  const boundaries = readResearch("commune-boundaries.json");
  const exceptionsDoc = readResearch("containment-exceptions.json");
  const keyOf = (wilaya, name) => `${Number(wilaya)}|${name}`;
  const BOUNDARIES = new Map(boundaries.communes.map((c) => [keyOf(c.wilaya_code, c.name_fr), c]));
  const EXCEPTED = new Set(
    [...exceptionsDoc.exceptions, ...exceptionsDoc.no_boundary].map((e) => keyOf(e.wilaya_code, e.name_fr)),
  );

  const points = Object.fromEntries(
    read("data", "algeria.json").map((w) => [w.code, [w.longitude, w.latitude]]),
  );
  const outside = [];
  const excepted = [];
  for (const [rawCode, cap] of Object.entries(capitals)) {
    const commune = byCode.get(cap);
    const key = keyOf(commune.wilaya_code, commune.name_fr);
    const boundary = BOUNDARIES.get(key);
    assert.ok(boundary?.usable, `wilaya ${rawCode}: no usable outline for capital ${cap} (${commune.name_fr})`);
    if (EXCEPTED.has(key)) excepted.push(`wilaya ${rawCode}: capital ${cap} (${commune.name_fr})`);
    const [lng, lat] = points[Number(rawCode)];
    if (!insideCommune(lng, lat, boundary))
      outside.push(`wilaya ${rawCode}: [${lng}, ${lat}] is outside ${commune.name_fr} (${cap})`);
  }
  assert.deepEqual(
    excepted,
    [],
    `${excepted.length} capital commune(s) in containment-exceptions.json; a capital point has no exemption\n  ${excepted.join("\n  ")}`,
  );
  assert.deepEqual(
    outside,
    [],
    `${outside.length} wilaya point(s) outside their own capital commune\n  ${outside.join("\n  ")}`,
  );
});

test("wilaya capitals: every wilaya's source is recorded", () => {
  const meta = read("data", "wilaya-capitals.metadata.json");
  assert.equal(meta.field, "capital_commune_code");
  assert.equal(meta.capitals.length, 69);

  const keys = new Set(meta.sources.map((s) => s.key));
  const capitals = Object.fromEntries(
    read("data", "algeria.json").map((w) => [w.code, w.capital_commune_code]),
  );
  for (const row of meta.capitals) {
    assert.equal(
      row.capital_commune_code,
      capitals[row.code],
      `wilaya ${row.code}: the sidecar says ${row.capital_commune_code}, the data says ${capitals[row.code]}`,
    );
    assert.ok(keys.has(row.source), `wilaya ${row.code}: unknown source key ${row.source}`);
    assert.match(row.citation, /^art\. 1er, item \d+, pp?\. \d+$/, `wilaya ${row.code}: citation`);
  }
  for (const s of meta.sources) {
    assert.ok(s.name && s.url && s.evidence_type && s.covers, `source ${s.key} is incomplete`);
  }
});

test("wilaya capitals: the meaning is written down", () => {
  const types = readText("types", "index.d.ts");
  assert.match(types, /capital_commune_code: number;/);
  assert.match(types, /chefs-lieux/, "types/index.d.ts should name the decrees");

  const schemaDoc = readText("data", "README.md");
  assert.match(schemaDoc, /`capital_commune_code`/, "data/README.md field table");

  const glossary = readFileSync(join(ROOT, "CONTEXT.md"), "utf-8");
  assert.match(glossary, /\*\*Capital\*\*:/, "CONTEXT.md should define Capital");
  assert.match(glossary, /capital_commune_code/, "CONTEXT.md should name the field");
});
