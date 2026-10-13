// `@geoalgeria/pharmacies` routes names strictly by script, so `name_ar` holds
// Arabic and `name_fr` Latin. OpenStreetMap often writes one tag as
// "Pharmacie X صيدلية X", and the old router classified the whole string by "does
// it contain an Arabic letter", so 28 records shipped a `name_ar` that was mostly
// Latin (#256).
//
// Each field is checked by the positive class, every letter belongs to that
// field's own script, not by the absence of one other script: Algeria writes place
// names in three scripts, and two records carry Neo-Tifinagh, which a
// "no Latin in name_ar" check would wave through.
//
// The same string comparison also decided which records were one place, as exact
// lowercase text, so "Pharmacie bouchekouf صيدلية بوشقوف" never equalled the plain
// "بوشقوف" six metres away and one Oued Endja pharmacy shipped twice. A Double
// mapping is now found on a shared Loose name key, and this test is the standing
// check that none survives.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ARABIC_LETTER, LATIN_LETTER, TIFINAGH_LETTER, looseNameKeys } from "../scripts/lib/name-script.mjs";
import { looseKey } from "../packages/normalize/index.js";
import { haversine } from "../scripts/lib/build-utils.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "pharmacies", "data");
const records = JSON.parse(readFileSync(join(DATA, "pharmacies.json"), "utf-8"));

// The generator owns the ignored-word list, because which words say only
// "pharmacy" is a fact about this dataset. This is that list; the parity test below
// reads the generator's source so this copy cannot drift from it and leave the
// dataset-wide check asserting a different rule than the build applies.
const WORDS = ["pharmacie", "pharmacy", "pharmacia", "officine", "صيدلية", "الصيدلية", "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ"];
const PHARMACY_WORDS = new Set(WORDS.map(looseKey));

test("the ignored-word list here is the one the generator uses", () => {
  const source = readFileSync(join(DATA, "..", "scripts", "fetch.mjs"), "utf-8");
  const literal = source.match(/const PHARMACY_WORDS = new Set\(\s*\[([^\]]*)\]/);
  assert.ok(literal, "could not find PHARMACY_WORDS in the pharmacies generator");
  const generator = literal[1].split(",").map((w) => w.trim().replace(/^"|"$/g, "")).filter(Boolean);
  assert.deepEqual(generator, WORDS);
});

// Which letters each published name field may hold, and the scripts it may not.
const FIELD_SCRIPT = {
  name_ar: { own: ARABIC_LETTER, foreign: { Latin: LATIN_LETTER, Tifinagh: TIFINAGH_LETTER } },
  name_fr: { own: LATIN_LETTER, foreign: { Arabic: ARABIC_LETTER, Tifinagh: TIFINAGH_LETTER } },
};

for (const [field, { own, foreign }] of Object.entries(FIELD_SCRIPT)) {
  test(`${field} holds letters of its own script only`, () => {
    const wrong = [];
    for (const record of records) {
      const value = record[field];
      if (!value) continue;
      for (const [script, test_] of Object.entries(foreign)) {
        if (test_.test(value)) wrong.push(`${record.id} ${JSON.stringify(value)} holds ${script}`);
      }
      // And it is a name, not punctuation that happened to survive a split.
      if (!own.test(value)) wrong.push(`${record.id} ${JSON.stringify(value)} holds no letter of its own script`);
    }
    assert.deepEqual(wrong, []);
  });
}

// Tifinagh belongs to neither published field, and must not be lost either: the two
// records that carry it keep it on `name`, which is the raw OpenStreetMap tag.
test("a Tifinagh name is kept on `name` rather than dropped", () => {
  const tifinagh = records.filter((r) => [r.name, r.name_fr, r.name_ar].some((v) => v && TIFINAGH_LETTER.test(v)));
  assert.ok(tifinagh.length > 0, "expected the dataset to still carry a Tifinagh name");
  for (const record of tifinagh) {
    assert.ok(TIFINAGH_LETTER.test(record.name ?? ""), `${record.id}: Tifinagh is not on \`name\``);
  }
});

test("no two pharmacies within 40 m share a Loose name key", () => {
  // Bucketed by ~111 m of latitude/longitude so the scan stays linear; a pair
  // closer than 40 m is always in the same or an adjacent cell.
  const CELL = 0.001;
  const keyed = records.map((r) => ({ r, keys: looseNameKeys([r.name, r.name_fr, r.name_ar], PHARMACY_WORDS) }));
  const cells = new Map();
  keyed.forEach((entry, index) => {
    const cell = `${Math.floor(entry.r.lat / CELL)},${Math.floor(entry.r.lng / CELL)}`;
    if (!cells.has(cell)) cells.set(cell, []);
    cells.get(cell).push(index);
  });

  const collisions = [];
  keyed.forEach((entry, index) => {
    if (!entry.keys.size) return;
    const cy = Math.floor(entry.r.lat / CELL);
    const cx = Math.floor(entry.r.lng / CELL);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const other of cells.get(`${cy + dy},${cx + dx}`) ?? []) {
          if (other <= index) continue;
          const shared = [...entry.keys].filter((key) => keyed[other].keys.has(key));
          if (!shared.length) continue;
          if (haversine(entry.r.lat, entry.r.lng, keyed[other].r.lat, keyed[other].r.lng) > 40) continue;
          collisions.push(`${entry.r.id} / ${keyed[other].r.id} share ${shared.join(", ")}`);
        }
      }
    }
  });
  assert.deepEqual(collisions, []);
});
