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
//   3. the wilaya's own capital point lands nearest the centre of the capital
//      commune. That point comes from OpenStreetMap and the commune centres are
//      an independent table, so this catches a capital assigned to the wrong
//      commune of the right wilaya, which check 1 cannot see. Wilaya 16 is the
//      one declared exception and is asserted as such, not skipped: the decree
//      says Alger and the point sits in Kouba.
//   4. the documented meaning is present, because the value is only correct
//      relative to it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset");
const readText = (...p) => readFileSync(join(DATA, ...p), "utf-8");
const read = (...p) => JSON.parse(readText(...p));

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

/** Equirectangular approximation, plenty for "which commune centre is nearest". */
function km([lngA, latA], [lngB, latB]) {
  const x = (lngA - lngB) * Math.cos((((latA + latB) / 2) * Math.PI) / 180) * 111.32;
  return Math.hypot(x, (latA - latB) * 110.57);
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

// The wilaya's capital point is an OpenStreetMap admin_centre; the commune
// centres are a separate table. Wilaya 16 is the one place where the two
// disagree and the legal text wins, so it is pinned rather than tolerated.
const POINT_EXCEPTIONS = {
  16: {
    capital: 1601,
    nearest: 1618,
    why:
      "décret n° 84-79 fixes the chef-lieu of the wilaya d'Alger as Alger, which is the commune " +
      "Alger Centre (1601); the wilaya's OpenStreetMap-derived point falls in Kouba (1618)",
  },
};

test("wilaya capitals: the wilaya's capital point lands in the capital commune", () => {
  const wilayas = read("data", "algeria.json");
  const placed = communes.filter(
    (c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude),
  );
  const wrong = [];
  for (const w of wilayas) {
    const point = [w.longitude, w.latitude];
    let nearest = null;
    let best = Infinity;
    for (const c of placed) {
      const d = km(point, [c.longitude, c.latitude]);
      if (d < best) {
        best = d;
        nearest = c;
      }
    }
    const expected = POINT_EXCEPTIONS[w.code];
    if (expected) {
      assert.equal(
        w.capital_commune_code,
        expected.capital,
        `wilaya ${w.code} is a declared exception with capital ${expected.capital}: ${expected.why}`,
      );
      assert.equal(
        nearest.code_commune,
        expected.nearest,
        `wilaya ${w.code}: the exception says the point is nearest ${expected.nearest}, ` +
          `it is nearest ${nearest.code_commune} (${nearest.name_fr}). Re-read the exception ` +
          `before widening it: ${expected.why}`,
      );
      continue;
    }
    if (nearest.code_commune !== w.capital_commune_code) {
      wrong.push(
        `wilaya ${w.code}: capital ${w.capital_commune_code} ` +
          `(${byCode.get(w.capital_commune_code)?.name_fr}) but the wilaya point is nearest ` +
          `${nearest.code_commune} (${nearest.name_fr}, ${best.toFixed(1)} km)`,
      );
    }
  }
  assert.deepEqual(
    wrong,
    [],
    `${wrong.length} capital(s) contradicted by the wilaya point\n  ${wrong.join("\n  ")}`,
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
