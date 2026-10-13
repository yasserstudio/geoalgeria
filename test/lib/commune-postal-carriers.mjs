// Every file in packages/dataset that carries a commune `postal_code`, and how to
// read it.
//
// Shared for the same reason test/lib/commune-carriers.mjs and
// test/lib/commune-name-ar-carriers.mjs are: a guard that checks one carrier and
// not the others is the drift it exists to prevent. The three lists are not the
// same list, which is why they are three readers and not one: the wilaya rows of
// data/sql/full.sql carry a postal code of their own (the chef-lieu's),
// data/geojson/communes.geojson carries one without a commune code, and the three
// ecommerce flattenings carry one with neither a code nor a coordinate.
//
// Each reader returns rows in the carrier's own shape, read with the carrier's own
// expression rather than with a helper the fix script also uses, so a reader's
// mistake and a writer's mistake cannot cancel out.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = join(ROOT, "packages", "dataset", "data");
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

/** The table every mirror must agree with: `code_commune` -> postal code. */
export function postalTable() {
  const out = new Map();
  for (const wilaya of readJson("algeria.json")) {
    for (const commune of wilaya.communes) out.set(commune.code_commune, code(commune.postal_code));
  }
  return out;
}

/**
 * Every carrier of a commune `postal_code`.
 * [label, () => { code: number|null, wilaya_code: number, name_fr: string, postal_code: string|null }[]]
 *
 * `code` is null for the carriers that publish no commune code; those rows are
 * addressed by (wilaya_code, name_fr), which is unique across all 1,541.
 */
export const POSTAL_CARRIERS = [
  [
    "data/communes_w*.json",
    () =>
      ["communes_w1_w23", "communes_w24_w48", "communes_w49_w69"]
        .flatMap((file) => readJson(`${file}.json`))
        .map((c) => ({
          code: c.code_commune,
          wilaya_code: c.wilaya_code,
          name_fr: c.name_fr,
          postal_code: code(c.postal_code),
        })),
  ],
  [
    "data/algeria.json",
    () =>
      readJson("algeria.json").flatMap((wilaya) =>
        wilaya.communes.map((c) => ({
          code: c.code_commune,
          wilaya_code: c.wilaya_code,
          name_fr: c.name_fr,
          postal_code: code(c.postal_code),
        })),
      ),
  ],
  [
    "data/geojson/communes.geojson",
    () =>
      readJson("geojson", "communes.geojson").features.map((f) => ({
        code: null,
        wilaya_code: f.properties.wilaya_code,
        name_fr: f.properties.name_fr,
        postal_code: code(f.properties.postal_code),
      })),
  ],
  [
    // name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune
    "data/csv/communes.csv",
    () =>
      csvRows(readText("csv", "communes.csv"), 8).map((f) => ({
        code: Number(f[7]),
        wilaya_code: Number(f[2]),
        name_fr: f[0],
        postal_code: code(f[4]),
      })),
  ],
  [
    // (id, 'name_fr', 'name_ar', wilaya_code, 'daira', 'postal'|NULL, lat, lng, code_commune)
    // Anchored at the end of the row and keyed on the trailing commune code, so the
    // SQL-escaped apostrophes (M''fatha) are read rather than dropped. The wilaya
    // rows print nine fields too, and their point is never NULL, so the commune
    // rows are the ones whose sixth field is a postal code and not a daira name.
    "data/sql/full.sql",
    () => {
      const re =
        /^ {2}\(\d+, '((?:[^']|'')*)', '(?:[^']|'')*', (\d+), '(?:[^']|'')*', ('\d+'|NULL), (?:-?[\d.]+|NULL), (?:-?[\d.]+|NULL), (\d+)\)[,;]$/;
      const rows = [];
      for (const line of readText("sql", "full.sql").split("\n")) {
        const m = line.match(re);
        if (!m) continue;
        rows.push({
          code: Number(m[4]),
          wilaya_code: Number(m[2]),
          name_fr: m[1].replace(/''/g, "'"),
          postal_code: sqlCode(m[3]),
        });
      }
      return rows;
    },
  ],
  [
    "data/ecommerce/communes.json",
    () =>
      readJson("ecommerce", "communes.json").map((row) => ({
        code: null,
        wilaya_code: row.wilaya_code,
        name_fr: row.commune_name_fr,
        postal_code: code(row.postal_code),
      })),
  ],
  [
    // id,commune_name_fr,commune_name_ar,daira_name_fr,wilaya_code,wilaya_name_fr,wilaya_name_ar,postal_code
    "data/ecommerce/communes.csv",
    () =>
      csvRows(readText("ecommerce", "communes.csv"), 8).map((f) => ({
        code: null,
        wilaya_code: Number(f[4]),
        name_fr: f[1],
        postal_code: code(f[7]),
      })),
  ],
  [
    // (id, 'commune_fr', 'commune_ar', 'daira', wilaya_code, 'wilaya_fr', 'wilaya_ar', 'postal'|NULL)
    "data/ecommerce/communes.sql",
    () => {
      const re =
        /^ {2}\(\d+, '((?:[^']|'')*)', '(?:[^']|'')*', '(?:[^']|'')*', (\d+), '(?:[^']|'')*', '(?:[^']|'')*', ('\d+'|NULL)\)[,;]$/;
      const rows = [];
      for (const line of readText("ecommerce", "communes.sql").split("\n")) {
        const m = line.match(re);
        if (!m) continue;
        rows.push({
          code: null,
          wilaya_code: Number(m[2]),
          name_fr: m[1].replace(/''/g, "'"),
          postal_code: sqlCode(m[3]),
        });
      }
      return rows;
    },
  ],
];
