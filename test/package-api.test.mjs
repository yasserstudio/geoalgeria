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
  ["protection-civile", "protection-civile.json", "unitsByWilaya"],
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
  ["protection-civile", "protection-civile.json", "unitById"],
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

/**
 * Value lookups: every export that filters the data on one of its own fields.
 * [package, data file, export name, the record field it claims to filter on]
 *
 * Driven by EVERY distinct value in the file, not just the first — a lookup
 * that reads a renamed field returns [] for every input, and asserting the
 * per-value totals sum back to the record count catches both that and a
 * partial mismatch (e.g. a case-normalization that only fits some values).
 */
const BY_VALUE = [
  ["sports", "facilities.json", "facilitiesByType", "type"],
  ["jeunesse", "institutions.json", "institutionsByType", "type"],
  ["agriculture", "agriculture.json", "institutionsByType", "type"],
  ["ferroviaire", "stations.json", "stationsByType", "type"],
  ["formation-professionnelle", "establishments.json", "establishmentsByType", "type"],
  ["ooredoo", "stores.json", "storesByType", "type"],
  ["enseignement-superieur", "institutions.json", "institutionsByType", "type"],
  ["enseignement-superieur", "institutions.json", "institutionsBySector", "sector"],
  ["industrie-pharmaceutique", "industrie-pharmaceutique.json", "manufacturersByNature", "nature"],
  ["livraison", "stopdesks.json", "stopdesksByCarrier", "operator"],
  ["banques", "branches.json", "branchesByBank", "bank_id"],
  ["buses", "lines.json", "linesByOperator", "operator"],
  ["protection-civile", "protection-civile.json", "unitsByStatut", "statut"],
];

for (const [name, file, fnName, field] of BY_VALUE) {
  test(`${name}: ${fnName} matches every ${field} present in the data`, async () => {
    const m = await pkg(name);
    const fn = m[fnName];
    assert.equal(typeof fn, "function", `${name} exports no ${fnName}`);

    const rows = data(name, file);
    const values = [...new Set(rows.map((r) => r[field]).filter((v) => v != null))];
    assert.ok(values.length > 0, `${name}.${file} carries no ${field} values to test with`);

    let matched = 0;
    for (const v of values) {
      const hits = fn(v);
      assert.ok(hits.length > 0, `${fnName}(${JSON.stringify(v)}) returned no records`);
      matched += hits.length;
    }
    // Every record carrying the field must be reachable through the lookup.
    const withField = rows.filter((r) => r[field] != null).length;
    assert.equal(matched, withField, `${fnName} reached ${matched} of ${withField} records`);
  });
}
