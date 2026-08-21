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
  ["cliniques", "cliniques.json", "cliniquesByWilaya"],
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
  ["cliniques", "cliniques.json", "cliniqueById"],
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
  ["cliniques", "cliniques.json", "cliniquesByType", "type"],
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

// aviation gained a second natural key when IATA codes were backfilled. Both
// lookups must reach every record, and neither may be fooled by a null code:
// `iata` is typed nullable on purpose, so an unguarded `a.iata === code` would
// hand back the first uncoded airport for airportByIata(null).
test("aviation: airportByIcao and airportByIata reach every record, and null matches nothing", async () => {
  const m = await pkg("aviation");
  const rows = data("aviation", "airports.json");

  for (const [fn, field] of [[m.airportByIcao, "icao"], [m.airportByIata, "iata"]]) {
    assert.equal(typeof fn, "function", `aviation exports no lookup for ${field}`);
    const coded = rows.filter((r) => r[field] != null);
    assert.ok(coded.length > 0, `no ${field} values to test with`);
    for (const r of coded) {
      assert.equal(fn(r[field])?.id, r.id, `${field} lookup missed ${r[field]}`);
      assert.equal(fn(r[field].toLowerCase())?.id, r.id, `${field} lookup is case-sensitive`);
    }
    for (const empty of [null, undefined, ""])
      assert.equal(fn(empty), null, `${field} lookup returned a record for ${JSON.stringify(empty)}`);
    assert.equal(fn("ZZZ"), null, `${field} lookup returned a record for a code that does not exist`);
  }
});

// Routes are a RELATION, not a place collection, so they get their own checks:
// every route must resolve to two real endpoints, be directional, carry a source,
// and never be a codeshare (those are excluded at build time, not marked).
test("aviation: routes resolve to endpoints, are directional, and carry a source", async () => {
  const m = await pkg("aviation");
  const routes = m.routes();
  const planned = m.plannedRoutes();
  const endpoints = new Set(m.routeEndpoints().map((e) => e.iata));

  assert.ok(routes.length > 0, "aviation ships no routes");
  for (const r of [...routes, ...planned]) {
    assert.ok(endpoints.has(r.from), `${r.id}: origin ${r.from} is not in routeEndpoints()`);
    assert.ok(endpoints.has(r.to), `${r.id}: destination ${r.to} is not in routeEndpoints()`);
    assert.notEqual(r.from, r.to, `${r.id}: starts and ends at the same airport`);
    assert.ok(r.source && /^https?:\/\//.test(r.source), `${r.id}: no checkable source`);
    assert.ok(["verified", "listed"].includes(r.evidence), `${r.id}: bad evidence tier`);
    assert.ok(r.great_circle_km > 50, `${r.id}: ${r.great_circle_km} km is not a route`);
  }

  // The two collections must not overlap: an announced route is never also a
  // flying one, which is the whole reason they are separate.
  const flying = new Set(routes.map((r) => r.id));
  for (const p of planned)
    assert.ok(!flying.has(p.id), `${p.id} is in both routes() and plannedRoutes()`);
  assert.ok(routes.every((r) => r.planned === false), "routes() leaked a planned route");
  assert.ok(planned.every((r) => r.planned === true), "plannedRoutes() leaked a flying route");

  // routesFrom is departures only, not everything touching the airport.
  const alg = m.routesFrom("alg");
  assert.ok(alg.length > 0, "no routes from ALG");
  assert.ok(alg.every((r) => r.from === "ALG"), "routesFrom returned arrivals");
});

test("aviation: the confirmed Berlin launch stays directional and planned", async () => {
  const m = await pkg("aviation");
  const berlin = m
    .plannedRoutes()
    .filter((r) => r.from === "BER" || r.to === "BER");

  assert.deepEqual(
    berlin.map((r) => ({
      id: r.id,
      flight: r.flight,
      status: r.status,
      days: r.days,
      evidence: r.evidence,
    })),
    [
      {
        id: "alg-ber",
        flight: "AH 2072",
        status: "unclear",
        days: ["mon"],
        evidence: "verified",
      },
      {
        id: "ber-alg",
        flight: "AH 2073",
        status: "unclear",
        days: ["mon"],
        evidence: "verified",
      },
    ],
  );
  assert.ok(
    !m.routes().some((r) => r.from === "BER" || r.to === "BER"),
    "Berlin leaked into the operating-route collection before launch",
  );
  assert.deepEqual(
    m.routeEndpoints().find((e) => e.iata === "BER"),
    {
      iata: "BER",
      name: "Aéroport de Berlin-Brandebourg",
      name_en: "Berlin Brandenburg Airport",
      name_ar: "مطار برلين براندنبرغ",
      lat: 52.361738,
      lng: 13.502341,
      country: "DE",
    },
  );
});

test("aviation: the reported Korea route stays directional and planned", async () => {
  const m = await pkg("aviation");
  const korea = m
    .plannedRoutes()
    .filter((r) => r.from === "ICN" || r.to === "ICN");

  assert.deepEqual(
    korea.map((r) => ({
      id: r.id,
      carrier: r.carrier,
      flight: r.flight,
      status: r.status,
      days: r.days,
      evidence: r.evidence,
    })),
    [
      {
        id: "alg-icn",
        carrier: "AH",
        flight: null,
        status: "unclear",
        days: null,
        evidence: "listed",
      },
      {
        id: "icn-alg",
        carrier: "AH",
        flight: null,
        status: "unclear",
        days: null,
        evidence: "listed",
      },
    ],
  );
  assert.ok(
    !m.routes().some((r) => r.from === "ICN" || r.to === "ICN"),
    "Korea leaked into the operating-route collection before launch",
  );
  assert.deepEqual(
    m.routeEndpoints().find((e) => e.iata === "ICN"),
    {
      iata: "ICN",
      name: "Aéroport international d'Incheon",
      name_en: "Incheon International Airport",
      name_ar: "مطار إنتشون الدولي",
      lat: 37.469101,
      lng: 126.450996,
      country: "KR",
    },
  );
});

test("aviation: the newer schedule sweep preserves direction and lifecycle", async () => {
  const m = await pkg("aviation");
  const byId = new Map(
    [...m.routes(), ...m.plannedRoutes()].map((r) => [r.id, r]),
  );
  const pick = (id) => {
    const r = byId.get(id);
    assert.ok(r, `${id}: route missing`);
    return {
      flight: r.flight,
      status: r.status,
      days: r.days,
      evidence: r.evidence,
      planned: r.planned,
    };
  };

  assert.deepEqual(pick("alg-pvg"), {
    flight: "AH 3082",
    status: "unclear",
    days: ["mon", "wed", "sat"],
    evidence: "verified",
    planned: true,
  });
  assert.deepEqual(pick("pvg-alg"), {
    flight: "AH 3083",
    status: "unclear",
    days: ["tue", "thu", "sun"],
    evidence: "verified",
    planned: true,
  });
  assert.deepEqual(pick("alg-del"), {
    flight: "AH 3104",
    status: "unclear",
    days: ["tue", "thu", "sun"],
    evidence: "listed",
    planned: true,
  });
  assert.deepEqual(pick("del-alg"), {
    flight: "AH 3105",
    status: "unclear",
    days: ["mon", "wed", "fri"],
    evidence: "listed",
    planned: true,
  });

  for (const id of ["alg-bzv", "bzv-alg", "alg-cky", "cky-alg"])
    assert.deepEqual(
      { evidence: pick(id).evidence, planned: pick(id).planned },
      { evidence: "verified", planned: true },
      `${id}: new Africa booking is not a verified planned leg`,
    );

  assert.deepEqual(
    ["alg-los", "los-alg", "alg-doh", "doh-alg"].map((id) => ({
      id,
      ...pick(id),
    })),
    [
      { id: "alg-los", flight: "AH 5354", status: "unclear", days: ["thu"], evidence: "verified", planned: true },
      { id: "los-alg", flight: "AH 5354", status: "unclear", days: ["tue"], evidence: "verified", planned: true },
      { id: "alg-doh", flight: "AH 4078", status: "unclear", days: ["tue", "fri"], evidence: "verified", planned: true },
      { id: "doh-alg", flight: "AH 4079", status: "unclear", days: ["tue", "fri"], evidence: "verified", planned: true },
    ],
  );

  assert.deepEqual(pick("alg-abv"), {
    flight: "AH 5354",
    status: "active",
    days: ["mon"],
    evidence: "verified",
    planned: false,
  });
  assert.deepEqual(pick("abv-alg"), {
    flight: "AH 5354",
    status: "unclear",
    days: ["fri"],
    evidence: "verified",
    planned: true,
  });
  assert.deepEqual(pick("alg-dje"), {
    flight: "AH 4708",
    status: "seasonal",
    days: null,
    evidence: "verified",
    planned: false,
  });
  assert.deepEqual(pick("czl-ssh"), {
    flight: null,
    status: "seasonal",
    days: null,
    evidence: "verified",
    planned: false,
  });

  assert.deepEqual(
    m
      .routeEndpoints()
      .filter((e) => ["BZV", "CKY", "DEL", "DJE", "LOS"].includes(e.iata))
      .map((e) => [e.iata, e.country]),
    [
      ["BZV", "CG"],
      ["CKY", "GN"],
      ["DEL", "IN"],
      ["DJE", "TN"],
      ["LOS", "NG"],
    ],
  );
});
