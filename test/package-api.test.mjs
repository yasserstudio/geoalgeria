// Public-API smoke tests for the scoped data packages.
//
// These guard a bug class the data validator cannot see by construction: the
// loaders in index.js compare a caller-supplied key against a field in the
// committed JSON, so a v2 type change (wilaya_code int → zero-padded string,
// id int → zero-padded string) turns a lookup into a silent `[]` / `null` for
// EVERY input while the data itself stays perfectly valid. Two packages shipped
// exactly that. One row per lookup here; add a row when a package gains one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = (name) => import(join(ROOT, "packages", name, "index.js"));
const data = (name, file) =>
  JSON.parse(readFileSync(join(ROOT, "packages", name, "data", file), "utf-8"));

/** [package, data file, name of the *ByWilaya export] */
const BY_WILAYA = [
  ["livraison", "stopdesks.json", "stopdesksByWilaya"],
  ["industrie-pharmaceutique", "industrie-pharmaceutique.json", "manufacturersByWilaya"],
  ["jeunesse", "institutions.json", "institutionsByWilaya"],
  ["sports", "facilities.json", "facilitiesByWilaya"],
  ["formation-professionnelle", "establishments.json", "establishmentsByWilaya"],
  ["enseignement-superieur", "institutions.json", "institutionsByWilaya"],
  ["aviation", "airports.json", "airportsByWilaya"],
  ["agriculture", "agriculture.json", "institutionsByWilaya"],
  ["ferroviaire", "stations.json", "stationsByWilaya"],
  ["gares-routieres", "stations.json", "stationsByWilaya"],
  ["ooredoo", "stores.json", "storesByWilaya"],
  ["pharmacies", "pharmacies.json", "pharmaciesByWilaya"],
  ["tourisme", "lodging.json", "byWilaya"],
];

for (const [name, file, fnName] of BY_WILAYA) {
  test(`${name}: ${fnName} accepts both the string and the numeric wilaya code`, async () => {
    const m = await pkg(name);
    const fn = m[fnName];
    assert.equal(typeof fn, "function", `${name} exports no ${fnName}`);

    // Alger (16) exists in every dataset listed above.
    assert.ok(fn("16").length > 0, `${fnName}("16") returned no records`);
    assert.ok(fn(16).length > 0, `${fnName}(16) returned no records`);
    assert.equal(fn("16").length, fn(16).length);

    // Zero-padding path: a code the package actually carries, in both forms.
    const code = data(name, file)[0].wilaya_code;
    assert.match(String(code), /^\d{2}$/, `${name} wilaya_code is not a 2-digit string`);
    assert.ok(fn(code).length > 0, `${fnName}("${code}") returned no records`);
    assert.equal(fn(Number(code)).length, fn(code).length);
  });
}

/** [package, data file, name of the *ById export] */
const BY_ID = [
  ["jeunesse", "institutions.json", "institutionById"],
  ["sports", "facilities.json", "facilityById"],
  ["formation-professionnelle", "establishments.json", "establishmentById"],
  ["enseignement-superieur", "institutions.json", "institutionById"],
  ["industrie-pharmaceutique", "industrie-pharmaceutique.json", "manufacturerById"],
  ["livraison", "carriers.json", "carrierById"],
];

for (const [name, file, fnName] of BY_ID) {
  test(`${name}: ${fnName} resolves an id that exists in the data`, async () => {
    const m = await pkg(name);
    const fn = m[fnName];
    assert.equal(typeof fn, "function", `${name} exports no ${fnName}`);
    const id = data(name, file)[0].id;
    assert.ok(fn(id), `${fnName}(${JSON.stringify(id)}) returned null`);
    // Zero-padded numeric ids must still resolve from their unpadded number.
    if (/^\d+$/.test(String(id))) {
      assert.ok(fn(Number(id)), `${fnName}(${Number(id)}) returned null`);
    }
  });
}
