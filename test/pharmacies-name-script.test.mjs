// `@geoalgeria/pharmacies` routes names strictly by script, so `name_ar` is Arabic
// and `name_fr` Latin. OpenStreetMap often writes one tag as "Pharmacie X صيدلية X",
// and the old router classified the whole string by "does it contain an Arabic
// letter", so 28 records shipped a `name_ar` that was mostly Latin (#256).
//
// The same string comparison also decided de-duplication, as exact lowercase text,
// so "Pharmacie bouchekouf صيدلية بوشقوف" never equalled the plain "بوشقوف" six
// metres away and one Oued Endja pharmacy shipped twice. De-duplication now
// compares Loose keys per script, and this test is the standing check that no pair
// survives it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ARABIC_LETTER, LATIN_LETTER, PHARMACY_WORDS, nameKeys } from "../scripts/lib/name-script.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "pharmacies", "data");
const records = JSON.parse(readFileSync(join(DATA, "pharmacies.json"), "utf-8"));

const DEG = Math.PI / 180;
const M_PER_DEG = 111_320;
const metres = (a, b) =>
  Math.hypot((a.lng - b.lng) * Math.cos(a.lat * DEG) * M_PER_DEG, (a.lat - b.lat) * M_PER_DEG);

test("name_ar carries no Latin letter", () => {
  const wrong = records
    .filter((r) => r.name_ar && LATIN_LETTER.test(r.name_ar))
    .map((r) => `${r.id} ${JSON.stringify(r.name_ar)}`);
  assert.deepEqual(wrong, []);
});

test("name_fr carries no Arabic letter", () => {
  const wrong = records
    .filter((r) => r.name_fr && ARABIC_LETTER.test(r.name_fr))
    .map((r) => `${r.id} ${JSON.stringify(r.name_fr)}`);
  assert.deepEqual(wrong, []);
});

test("no two pharmacies within 40 m share a name key", () => {
  // Bucketed by ~111 m of latitude/longitude so the scan stays linear; a pair
  // closer than 40 m is always in the same or an adjacent cell.
  const CELL = 0.001;
  const keyed = records.map((r) => ({ r, keys: nameKeys([r.name, r.name_fr, r.name_ar], PHARMACY_WORDS) }));
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
          if (metres(entry.r, keyed[other].r) > 40) continue;
          collisions.push(`${entry.r.id} / ${keyed[other].r.id} share ${shared.join(", ")}`);
        }
      }
    }
  });
  assert.deepEqual(collisions, []);
});
