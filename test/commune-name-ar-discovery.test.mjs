// Every commune Arabic name published anywhere under packages/dataset/data agrees
// with the commune registry, found by walking the directory rather than by reading a
// list of carriers.
//
// THE BUG THIS EXISTS FOR. The 25 reviewed name repairs are applied by
// scripts/fix-commune-name-ar.mjs to the carriers named in
// test/lib/commune-name-ar-carriers.mjs, whose header claims to list every file that
// holds a commune `name_ar`. It did not: data/wilaya-capitals.metadata.json quotes
// its Capital commune's Arabic name and was absent, so `--check` could not see it and
// it published برج بوعريرج and إيليزي after both were repaired everywhere else. A
// hand list cannot catch the file nobody thought of, so this guard takes no list: it
// reads every file in the directory, pairs each commune Arabic name it finds with the
// commune the row names, and compares that with the registry.
//
// THE REGISTRY is data/communes_w*.json, the three split commune files, which is what
// every other commune join in this repository resolves against.
//
// HOW A ROW IS RECOGNISED. By field name, not by file:
//   1. a row carrying `commune_name_ar` or `commune_ar` states a commune's Arabic name
//      explicitly, whatever else the row is about (a post office, a wilaya's Capital);
//   2. otherwise a row carrying `code_commune` and `name_ar` IS a commune;
//   3. otherwise a row carrying `name_ar`, `name_fr` and `wilaya_code` and no commune
//      code is a commune published without its code, which is what
//      data/geojson/communes.geojson is.
// The join is the commune code where the row carries one, and (wilaya_code, name_fr)
// where it does not, unique across all 1,541. A row this cannot place is skipped: the
// point is to catch a name that disagrees, never to assert what a file holds.
//
// WHAT IS OUT OF SCOPE, and why, because an exemption is the way this guard would rot:
//   - data/poste/, the generated mirror of @geoalgeria/poste. Its `commune_ar` is
//     Algérie Poste's own label for the commune and not a copy of the registry: 1,919
//     of its rows spell one differently today. It is excluded from the core date pin
//     for the same reason, that it is that package's data and carries its date.
//   - the nine rows of data/communes_new_wilayas.csv listed below, a divergence older
//     than this guard. They are frozen row by row, so a tenth fails here and so does
//     repairing one of the nine without removing it from the list.
// `.sql` carries no field names, so the two SQL carriers cannot be read this way; the
// last test asserts that every file this guard cannot read is in the hand list.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { NAME_AR_CARRIERS } from "./lib/commune-name-ar-carriers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));

/** Every file under packages/dataset/data, as paths relative to it, with "/" separators. */
function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(path));
    else out.push(relative(DATA, path).split(sep).join("/"));
  }
  return out.sort();
}

const FILES = walkFiles(DATA);

/** The mirror, excluded with its reason in the header. */
const isMirror = (file) => file.startsWith("poste/");

/** Formats this guard reads structurally. `.md` holds no rows. */
const READABLE = [".json", ".geojson", ".csv", ".md"];
const extensionOf = (file) => file.slice(file.lastIndexOf("."));

// --- the registry ----------------------------------------------------------
const COMMUNES = ["communes_w1_w23", "communes_w24_w48", "communes_w49_w69"].flatMap((file) =>
  readJson(join(DATA, `${file}.json`)),
);
const BY_CODE = new Map(COMMUNES.map((c) => [c.code_commune, c.name_ar]));
const BY_NAME = new Map(COMMUNES.map((c) => [`${c.wilaya_code}|${c.name_fr}`, c.name_ar]));

// --- the frozen divergence -------------------------------------------------
/** "file wilaya|name_fr" -> the spelling that file carries, for the rows in the header. */
const ALLOWED = new Map([
  ["communes_new_wilayas.csv 64|Hamadia", "الحمادية"],
  ["communes_new_wilayas.csv 65|Aïn Fekka", "عين فكة"],
  ["communes_new_wilayas.csv 66|Guettara", "القطارة"],
  ["communes_new_wilayas.csv 68|M'Cif", "مصيف"],
  ["communes_new_wilayas.csv 68|Benzouh", "بن زوح"],
  ["communes_new_wilayas.csv 68|Medjedel", "مجدل"],
  ["communes_new_wilayas.csv 68|Oultem", "ولتان"],
  ["communes_new_wilayas.csv 68|Djebel Messaad", "جبل مسعد"],
  ["communes_new_wilayas.csv 69|El Meharra", "المهارة"],
]);

// --- reading a row ---------------------------------------------------------
const CODE_KEYS = ["code_commune", "commune_code", "capital_commune_code"];
const AR_KEYS = ["commune_name_ar", "commune_ar"];
const FR_KEYS = ["commune_name_fr", "commune"];

/** A field as an integer, or null when it is not one: a metadata sidecar describes its
 *  own fields in prose under the field's own name. */
function asInteger(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

const present = (row, keys) => keys.find((key) => row[key] !== undefined && row[key] !== null && row[key] !== "");

/**
 * The commune Arabic name a row publishes and the commune it names, or null when the
 * row names no commune or cannot be placed.
 */
function communeNameIn(row) {
  const arKey = present(row, AR_KEYS);
  let nameAr;
  if (arKey) nameAr = row[arKey];
  else if (row.code_commune !== undefined && row.name_ar !== undefined) nameAr = row.name_ar;
  else if (row.name_ar !== undefined && row.name_fr !== undefined && row.wilaya_code !== undefined) nameAr = row.name_ar;
  else return null;
  if (typeof nameAr !== "string" || !nameAr) return null;

  const code = asInteger(row[present(row, CODE_KEYS) ?? ""]);
  if (code !== null) {
    const expected = BY_CODE.get(code);
    return expected === undefined ? null : { where: String(code), nameAr, expected };
  }
  const wilaya = asInteger(row.wilaya_code);
  const nameFr = arKey ? row[present(row, FR_KEYS) ?? ""] : row.name_fr;
  if (wilaya === null || typeof nameFr !== "string" || !nameFr) return null;
  const expected = BY_NAME.get(`${wilaya}|${nameFr}`);
  return expected === undefined ? null : { where: `${wilaya}|${nameFr}`, nameAr, expected };
}

/** Every object inside a parsed JSON document, outermost first. */
function* objectsIn(node) {
  if (Array.isArray(node)) {
    for (const item of node) yield* objectsIn(item);
    return;
  }
  if (node === null || typeof node !== "object") return;
  yield node;
  for (const value of Object.values(node)) yield* objectsIn(value);
}

/** One CSV line into fields, honouring the double-quoted fields the poste mirror uses. */
function splitCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (line[i + 1] === '"') (field += '"'), i++;
      else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === ",") (fields.push(field), (field = ""));
    else field += char;
  }
  fields.push(field);
  return fields;
}

/** A CSV as row objects keyed by its header. */
function csvRowObjects(path) {
  const lines = readFileSync(path, "utf-8").trim().split(/\r?\n/);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(splitCsvLine(line).map((v, i) => [header[i], v])));
}

/** Every commune Arabic name a file publishes, as reports. */
function namesIn(file) {
  const path = join(DATA, file);
  const extension = extensionOf(file);
  let rows;
  if (extension === ".json" || extension === ".geojson") rows = [...objectsIn(readJson(path))];
  else if (extension === ".csv") rows = csvRowObjects(path);
  else return [];
  return rows.map(communeNameIn).filter(Boolean);
}

// --- the checks ------------------------------------------------------------
test("the registry loaded, and the walk found the files", () => {
  assert.equal(COMMUNES.length, 1541, `got ${COMMUNES.length} communes`);
  assert.equal(BY_CODE.size, COMMUNES.length, "two communes share a code_commune");
  assert.equal(BY_NAME.size, COMMUNES.length, "two communes share a (wilaya_code, name_fr)");
  assert.ok(FILES.includes("wilaya-capitals.metadata.json"), "the walk missed the capitals sidecar");
  assert.ok(FILES.includes("geojson/communes.geojson"), "the walk missed the commune GeoJSON");
});

test("every commune Arabic name under packages/dataset/data is the registry's", () => {
  const wrong = [];
  const hit = new Set();
  let checked = 0;
  for (const file of FILES) {
    if (isMirror(file)) continue;
    for (const { where, nameAr, expected } of namesIn(file)) {
      checked++;
      if (nameAr === expected) continue;
      const key = `${file} ${where}`;
      if (ALLOWED.get(key) === nameAr) {
        hit.add(key);
        continue;
      }
      wrong.push(`${key}: carries ${JSON.stringify(nameAr)}, the registry says ${JSON.stringify(expected)}`);
    }
  }
  // Pinned so a rule that stops recognising rows fails here rather than passing empty.
  assert.ok(checked > 9_000, `only ${checked} commune name(s) were placed and compared`);
  assert.deepEqual(wrong, [], `${wrong.length} commune Arabic name(s) disagree with the registry`);
  assert.deepEqual(
    [...ALLOWED.keys()].filter((key) => !hit.has(key)),
    [],
    "a frozen divergence no longer exists; remove its row from ALLOWED",
  );
});

test("a file this guard cannot read structurally is in the carrier hand list", () => {
  // .sql rows carry no field names, so they are read by label in
  // test/lib/commune-name-ar-carriers.mjs. Anything else unreadable is a format this
  // guard has to learn before it can be trusted again.
  const labels = new Set(NAME_AR_CARRIERS.map(([label]) => label));
  const unread = FILES.filter((file) => !isMirror(file) && !READABLE.includes(extensionOf(file))).filter(
    (file) => !labels.has(`data/${file}`),
  );
  assert.deepEqual(unread, [], `${unread.length} file(s) are neither read here nor named as a carrier`);
});
