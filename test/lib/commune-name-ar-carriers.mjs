// Every file in packages/dataset that carries a commune `name_ar`, and how to read it.
//
// Shared for the same reason test/lib/commune-carriers.mjs is: a guard that checks
// one carrier and not the others is the drift it exists to prevent. The point
// carriers and the name carriers are not the same list - the two ecommerce
// flattenings hold a name but no coordinate, and the three split commune files
// hold both - so the two readers are separate rather than one list used for both.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { splitSqlRow, sqlUnquote } from "../../scripts/lib/sql-rows.mjs";

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

/**
 * Every carrier of a commune `name_ar`.
 * [label, () => { code: number|null, wilaya_code: number, name_fr: string, name_ar: string }[]]
 *
 * `code` is null for the carriers that publish no commune code; those rows are
 * addressed by (wilaya_code, name_fr), which is unique across all 1,541.
 */
export const NAME_AR_CARRIERS = [
  [
    "data/communes_w*.json",
    () =>
      ["communes_w1_w23", "communes_w24_w48", "communes_w49_w69"]
        .flatMap((file) => readJson(`${file}.json`))
        .map((c) => ({
          code: c.code_commune,
          wilaya_code: c.wilaya_code,
          name_fr: c.name_fr,
          name_ar: c.name_ar,
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
          name_ar: c.name_ar,
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
        name_ar: f.properties.name_ar,
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
        name_ar: f[1],
      })),
  ],
  [
    // (id, 'name_fr', 'name_ar', wilaya_code, 'daira', 'postal', lat, lng, code_commune)
    "data/sql/full.sql",
    () => {
      const rows = [];
      for (const line of readText("sql", "full.sql").split("\n")) {
        const match = /^ {2}\((.*)\)[,;]$/.exec(line);
        if (!match) continue;
        const fields = splitSqlRow(match[1]);
        // Wilaya rows print 9 fields too since `capital_commune_code`; their
        // `created` literal is what tells them apart.
        if (fields.length !== 9 || /^'(?:original|2019|2026)'$/.test(fields[7])) continue;
        rows.push({
          code: Number(fields[8]),
          wilaya_code: Number(fields[3]),
          name_fr: sqlUnquote(fields[1]),
          name_ar: sqlUnquote(fields[2]),
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
        name_ar: row.commune_name_ar,
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
        name_ar: f[2],
      })),
  ],
  [
    // (id, 'commune_fr', 'commune_ar', 'daira', wilaya_code, 'wilaya_fr', 'wilaya_ar', 'postal')
    "data/ecommerce/communes.sql",
    () => {
      const rows = [];
      for (const line of readText("ecommerce", "communes.sql").split("\n")) {
        const match = /^ {2}\((.*)\)[,;]$/.exec(line);
        if (!match) continue;
        const fields = splitSqlRow(match[1]);
        if (fields.length !== 8) continue;
        rows.push({
          code: null,
          wilaya_code: Number(fields[4]),
          name_fr: sqlUnquote(fields[1]),
          name_ar: sqlUnquote(fields[2]),
        });
      }
      return rows;
    },
  ],
];
