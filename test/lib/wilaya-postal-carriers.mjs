// Every file in packages/dataset that carries a wilaya `postal_code`, and how to
// read it.
//
// Shared for the same reason test/lib/commune-postal-carriers.mjs is: a guard that
// checks one carrier and not the others is the drift it exists to prevent. The two
// lists are not the same list, which is why they are two readers and not one: the
// wilaya rows of data/sql/full.sql are told apart from the commune rows by their
// `created` literal and not by their field count, and packages/dataset/algeria.geojson
// carries a wilaya postal code at the package root rather than under data/.
//
// Each reader returns rows in the carrier's own shape, read with the carrier's own
// expression rather than with a helper scripts/fix-wilaya-postal-codes.mjs also
// uses, so a reader's mistake and a writer's mistake cannot cancel out.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKAGE = join(ROOT, "packages", "dataset");
const DATA = join(PACKAGE, "data");
const readText = (...p) => readFileSync(join(DATA, ...p), "utf-8");
const readJson = (...p) => JSON.parse(readText(...p));

/** Rows of a CSV whose fields never contain a comma, as arrays of fields. */
const csvRows = (text, width) =>
  text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(","))
    .filter((fields) => fields.length === width);

/** An absent postal code is one value, however the carrier spells it. */
const code = (value) => (value === undefined || value === null || value === "" || value === "NULL" ? null : String(value));

/** The value inside one SQL string literal, or null for the NULL literal. */
const sqlCode = (field) => (field === "NULL" ? null : field.slice(1, -1).replace(/''/g, "'"));

/**
 * The table every carrier must agree with: wilaya code -> its chef-lieu commune's
 * postal code. It is a join over algeria.json's own tables, `capital_commune_code`
 * then that commune's `postal_code`, so the claim being checked is "a wilaya's code
 * is its chef-lieu's" and not "a wilaya's code is whatever algeria.json's wilaya
 * object happens to say" (private tracker #293: that object was one of the five
 * carriers holding the synthetic value).
 */
export function chefLieuPostalTable() {
  const wilayas = readJson("algeria.json");
  const communes = new Map();
  for (const wilaya of wilayas) for (const commune of wilaya.communes) communes.set(commune.code_commune, commune);
  const out = new Map();
  for (const wilaya of wilayas) {
    const seat = communes.get(wilaya.capital_commune_code);
    out.set(Number(wilaya.code), { postal_code: seat ? code(seat.postal_code) : undefined, seat });
  }
  return out;
}

/**
 * Every carrier of a wilaya `postal_code`.
 * [label, () => { code: number, postal_code: string|null }[]]
 */
export const WILAYA_POSTAL_CARRIERS = [
  [
    "data/algeria.json",
    () => readJson("algeria.json").map((w) => ({ code: Number(w.code), postal_code: code(w.postal_code) })),
  ],
  [
    "data/geojson/wilayas.geojson",
    () =>
      readJson("geojson", "wilayas.geojson").features.map((f) => ({
        code: Number(f.properties.code),
        postal_code: code(f.properties.postal_code),
      })),
  ],
  [
    "algeria.geojson",
    () =>
      JSON.parse(readFileSync(join(PACKAGE, "algeria.geojson"), "utf-8")).features.map((f) => ({
        code: Number(f.properties.code),
        postal_code: code(f.properties.postal_code),
      })),
  ],
  [
    // code,name_fr,name_ar,phone_code,postal_code,latitude,longitude,created,capital_commune_code
    "data/csv/wilayas.csv",
    () => csvRows(readText("csv", "wilayas.csv"), 9).map((f) => ({ code: Number(f[0]), postal_code: code(f[4]) })),
  ],
  [
    // (code, 'name_fr', 'name_ar', 'phone'|NULL, 'postal'|NULL, lat, lng, 'created', capital)
    // The commune rows print nine fields too, so the discriminator is the `created`
    // literal in the eighth field, which no commune row carries. Read here with this
    // file's own expression: scripts/lib/full-sql-rows.mjs holds the same rule for the
    // writers, and a test that imported it would stop being a second opinion.
    "data/sql/full.sql",
    () => {
      const re =
        /^ {2}\((\d+), '(?:[^']|'')*', '(?:[^']|'')*', (?:'[^']*'|NULL), ('\d+'|NULL), (?:-?[\d.]+|NULL), (?:-?[\d.]+|NULL), '(?:original|2019|2026)', \d+\)[,;]$/;
      const rows = [];
      for (const line of readText("sql", "full.sql").split("\n")) {
        const m = line.match(re);
        if (!m) continue;
        rows.push({ code: Number(m[1]), postal_code: sqlCode(m[2]) });
      }
      return rows;
    },
  ],
];
