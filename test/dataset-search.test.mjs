// `search()` on the `geoalgeria` package (#358): ranked Wilayas, Dairas and
// Communes, folded by `@geoalgeria/normalize`, each carrying its Match class.
//
// Everything here goes through the package's public surface, the way a consumer
// would, except the Match class proof: the Golden corpus publishes `matchCases`
// so that every consumer proves its own classifier against them, and the
// package's classifier is private, so that one test reaches `search.js` by path.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { matchCases } from "../packages/normalize/fixtures/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "packages", "dataset");
const require = createRequire(import.meta.url);
const geo = require(join(DATASET, "index.js"));
const { search } = geo;

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));
const expectations = readJson(join(DATASET, "fixtures", "search-expectations.json"));
const snapshot = readJson(join(ROOT, "test", "fixtures", "find-commune-snapshot.json"));

const CLASS_RANK = { exact: 0, prefix: 1, loose: 2 };
const TYPE_RANK = { wilaya: 0, daira: 1, commune: 2 };

/** The fields the shared fixture compares, so it stays readable in both languages. */
const brief = (r) => ({
  type: r.type,
  code: r.code,
  match: r.match,
  ...(r.matched ? { matched: r.matched } : {}),
});

test("search is exported next to the existing API", () => {
  assert.equal(typeof search, "function");
  const types = readFileSync(join(DATASET, "types", "index.d.ts"), "utf-8");
  assert.match(types, /search\(\s*query: string,\s*options\?: algeriaGeodata\.SearchOptions\s*\): algeriaGeodata\.SearchResult\[\]/);
  const manifest = readJson(join(DATASET, "package.json"));
  assert.ok(manifest.dependencies?.["@geoalgeria/normalize"], "geoalgeria must depend on @geoalgeria/normalize");
});

test("every case in the shared expectations file holds", () => {
  for (const kase of expectations.cases) {
    const got = search(kase.query, kase.options).map(brief);
    const head = kase.complete ? got : got.slice(0, kase.results.length);
    assert.deepEqual(head, kase.results, `${kase.id}: ${JSON.stringify(kase.query)} (${kase.note})`);
  }
});

test("the shared expectations file is well formed", () => {
  const ids = new Set();
  for (const kase of expectations.cases) {
    assert.deepEqual(Object.keys(kase).sort(), ["complete", "id", "note", "options", "query", "results"]);
    assert.ok(!ids.has(kase.id), `${kase.id} is used twice`);
    ids.add(kase.id);
  }
});

test("a result carries exactly the published fields", () => {
  const [wilaya] = search("Oran");
  assert.deepEqual(wilaya, {
    type: "wilaya",
    code: 31,
    name_fr: "Oran",
    name_ar: "وهران",
    wilaya_code: 31,
    match: "exact",
  });

  const commune = search("Oran", { types: ["commune"] })[0];
  assert.equal(commune.code, 3101);
  assert.equal(commune.wilaya_code, 31);
  assert.equal(commune.name_ar, "وهران");

  // A Daira row has no Arabic name yet; the field is there, and null.
  const daira = search("Oran", { types: ["daira"] })[0];
  assert.deepEqual(Object.keys(daira).sort(), ["code", "match", "name_ar", "name_fr", "type", "wilaya_code"]);
  assert.equal(daira.wilaya_code, 31);

  const former = search("Lemcene")[0];
  assert.equal(former.matched, "former");
  assert.equal(former.name_fr, "Lemsane", "a Former-name hit still shows the current name");
});

test("results are ranked: Match class, then Wilaya, Daira, Commune, then name order", () => {
  for (const query of ["ain", "sidi", "oran", "بني", "عين", "el", "ورقله", "b"]) {
    const results = search(query, { limit: Infinity });
    assert.ok(results.length > 0, `${query} finds nothing`);
    for (let i = 1; i < results.length; i++) {
      const a = results[i - 1];
      const b = results[i];
      const order =
        CLASS_RANK[a.match] - CLASS_RANK[b.match] ||
        TYPE_RANK[a.type] - TYPE_RANK[b.type];
      assert.ok(order <= 0, `${query}: ${JSON.stringify(a)} is ranked before ${JSON.stringify(b)}`);
    }
  }
});

test("folding: harakat, alef and hamza variants, accents, case", () => {
  const top = (q) => brief(search(q)[0]);
  assert.deepEqual(top("ورقلة"), { type: "wilaya", code: 30, match: "exact" });
  assert.deepEqual(top("وَرْقْلَة"), { type: "wilaya", code: 30, match: "exact" });
  for (const spelling of ["أدرار", "ادرار", "إدرار", "آدرار"]) {
    assert.deepEqual(top(spelling), { type: "wilaya", code: 1, match: "exact" }, spelling);
  }
  assert.deepEqual(top("BEJAIA"), { type: "wilaya", code: 6, match: "exact" });
  assert.deepEqual(top("Béjaïa"), { type: "wilaya", code: 6, match: "exact" });
});

test("a loose match ranks below an exact one", () => {
  const loose = search("ورقله");
  assert.ok(loose.length > 0);
  assert.ok(loose.every((r) => r.match === "loose" || r.match === "prefix" || r.match === "exact"));
  assert.equal(loose[0].match, "loose");
  assert.equal(search("ورقلة")[0].match, "exact");
});

test("types filter and limit", () => {
  assert.equal(search("ain").length, 10, "the default limit is 10");
  assert.equal(search("ain", { limit: 3 }).length, 3);
  assert.equal(search("ain", { limit: 0 }).length, 0);
  assert.ok(search("ain", { limit: 500 }).length > 100);

  for (const types of [["wilaya"], ["daira"], ["commune"], ["wilaya", "commune"]]) {
    const results = search("ain", { types, limit: Infinity });
    assert.ok(results.length > 0, `${types} finds nothing`);
    assert.ok(results.every((r) => types.includes(r.type)), `${types} let another type through`);
  }

  assert.throws(() => search("ain", { types: ["communes"] }), TypeError);
});

test("an empty query returns []", () => {
  for (const query of ["", "   ", "-", undefined, null]) {
    assert.deepEqual(search(query), [], JSON.stringify(query));
  }
});

test("Former names from the name history match and are flagged", () => {
  // Every Former name finds its own record, flagged, unless the current name
  // already folds to the same Conservative key.
  const history = geo.nameHistory;
  const entries = [
    ...history.wilayas.map((e) => ({ type: "wilaya", code: e.code, e })),
    ...history.communes.map((e) => ({ type: "commune", code: e.code_commune, e })),
  ];
  let flagged = 0;
  for (const { type, code, e } of entries) {
    for (const former of [...e.former_names_fr, ...e.former_names_ar]) {
      const hit = search(former, { types: [type], limit: Infinity }).find((r) => r.code === code);
      assert.ok(hit, `${former} no longer finds ${type} ${code}`);
      assert.equal(hit.match, "exact", `${former} should be an exact match on ${type} ${code}`);
      if (hit.matched === "former") flagged++;
    }
  }
  assert.ok(flagged > 50, `only ${flagged} Former names were flagged`);

  // A current-name hit carries no `matched` key at all.
  assert.equal("matched" in search("Oran")[0], false);
});

test("the classifier agrees with every match case of the Golden corpus", () => {
  const { matchClass } = require(join(DATASET, "search.js"));
  for (const kase of matchCases) {
    assert.equal(matchClass(kase.query, kase.name), kase.class, `${kase.id}: ${kase.note}`);
  }
});

test("findCommune output is unchanged", () => {
  for (const { query, codes } of snapshot.queries) {
    assert.deepEqual(
      geo.findCommune(query).map((c) => c.code_commune),
      codes,
      `findCommune(${JSON.stringify(query)}) changed`
    );
  }
});

test("search works from ESM as well as CommonJS", async () => {
  const esm = (await import(pathToFileURL(join(DATASET, "index.js")).href)).default;
  assert.deepEqual(esm.search("Oran"), search("Oran"));
});

test("where Node cannot require an ES module, search() says what it needs and the rest still loads", () => {
  // Node 18, 20.0 to 20.18 and 22.0 to 22.11 cannot require() an ES module;
  // later versions turn that off with --no-experimental-require-module.
  const script = `
    const geo = require(${JSON.stringify(join(DATASET, "index.js"))});
    const seen = [];
    for (let i = 0; i < 2; i++) {
      try { geo.search("Oran"); seen.push(null); }
      catch (e) { seen.push({ message: e.message, cause: e.cause && e.cause.code }); }
    }
    console.log(JSON.stringify({ wilayas: geo.wilayas.length, communes: geo.findCommune("Oran").length, seen }));
  `;
  const out = execFileSync(process.execPath, ["--no-experimental-require-module", "-e", script], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const { wilayas, communes, seen } = JSON.parse(out);
  assert.equal(wilayas, 69, "the package must still load");
  assert.ok(communes > 0, "findCommune must still work");
  for (const error of seen) {
    assert.ok(error, "search() must throw where the ES module cannot load");
    assert.match(error.message, /^geoalgeria: search\(\) needs Node 20\.19\+ or 22\.12\+/);
    assert.ok(error.message.includes(process.version), "the message names the running Node");
    assert.doesNotMatch(error.message, /dynamic import/, "not Node's advice to edit the package");
    assert.equal(error.cause, "ERR_REQUIRE_ESM");
  }
});
