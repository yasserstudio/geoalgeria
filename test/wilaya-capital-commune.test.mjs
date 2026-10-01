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
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { inCommuneOutline } from "../scripts/lib/commune-resolver.mjs";

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

/** One of the dataset's plain comma-joined CSVs, by column name: the named columns'
 *  indexes and the split rows. The header is read rather than a width assumed, because a
 *  column has been appended to these files twice this batch. */
function csvColumns(p, ...names) {
  const [head, ...rows] = readText(...p).trim().split(/\r?\n/);
  const col = head.split(",");
  const at = names.map((n) => col.indexOf(n));
  assert.ok(
    at.every((i) => i >= 0),
    `${p.join("/")}: missing column(s) ${names.filter((_, i) => at[i] < 0).join(", ")}`,
  );
  return { at, rows: rows.map((r) => r.split(",")) };
}

function fromCsv(...p) {
  const { at: [ci, cap], rows } = csvColumns(p, "code", "capital_commune_code");
  return Object.fromEntries(rows.map((f) => [Number(f[ci]), Number(f[cap])]));
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
  const { at: [ci, lat, lng], rows } = csvColumns(p, "code", "latitude", "longitude");
  return Object.fromEntries(rows.map((f) => [Number(f[ci]), [Number(f[lng]), Number(f[lat])]]));
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
// copy is a different number and would put two values in circulation again. The
// comparison is numeric, after parsing, so a re-serialised `36.7763350` would pass;
// what it rules out is a different value, which is what two claims about one town
// actually look like.
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
  // Keyed on code_commune, which both files carry for every row. The containment guard
  // next door keys on (wilaya_code, name_fr) because data/geojson/communes.geojson has
  // no code; nothing read here has that problem, and a rename must not break a check on
  // a stable code.
  const BOUNDARIES = new Map(boundaries.communes.map((c) => [c.code_commune, c]));
  assert.equal(BOUNDARIES.size, boundaries.communes.length, "the boundary cache has duplicate code_commune keys");
  const EXCEPTED = new Set(
    [...exceptionsDoc.exceptions, ...exceptionsDoc.no_boundary].map((e) => e.code_commune),
  );
  assert.ok(
    [...EXCEPTED].every((c) => Number.isInteger(c)),
    "an exception row with no code_commune cannot be matched, so it would read as no exception",
  );

  const points = Object.fromEntries(
    read("data", "algeria.json").map((w) => [w.code, [w.longitude, w.latitude]]),
  );
  const outside = [];
  const excepted = [];
  for (const [rawCode, cap] of Object.entries(capitals)) {
    const commune = byCode.get(cap);
    const boundary = BOUNDARIES.get(cap);
    assert.ok(boundary?.usable, `wilaya ${rawCode}: no usable outline for capital ${cap} (${commune.name_fr})`);
    if (EXCEPTED.has(cap)) excepted.push(`wilaya ${rawCode}: capital ${cap} (${commune.name_fr})`);
    const [lng, lat] = points[Number(rawCode)];
    if (!inCommuneOutline(lng, lat, boundary))
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

// The writer and the reader, against each other. Every other --check script in this
// repository is driven from its test, so a carrier this file does not read still fails.
test("wilaya capitals: the point writer agrees that nothing is stale", () => {
  assert.doesNotThrow(() =>
    execFileSync(
      process.execPath,
      [join(import.meta.dirname, "../scripts/fix-wilaya-capital-points.mjs"), "--check"],
      { stdio: "pipe" },
    ),
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

  // And the point rule, because a wilaya point that reads like a point of its own is
  // the thing rule 9 removes. Every surface that documents the field says what the
  // coordinates are, or a consumer goes on treating them as a second claim.
  for (const [where, text] of [
    ["types/index.d.ts", types],
    ["data/README.md", schemaDoc],
    ["CONTEXT.md", glossary],
  ])
    assert.match(
      text,
      /capital commune|capital's centre|Capital's centre/,
      `${where} should say that a wilaya's latitude/longitude is its capital commune's centre`,
    );
});
