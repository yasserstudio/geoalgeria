// Guards the Wilaya lineage (#359): the wilaya each Commune belonged to on the
// 58-wilaya map and on the 48-wilaya map, and the texts that say so.
//
// WHY. A consumer joining 2024 statistics (58 wilayas) or older ones (48) to
// today's 69 wilayas had to rebuild the reforms by hand. The two codes are
// carried on every commune record, so they can drift from the lineage table
// the same way any repeated field drifts; every carrier is held to it here.
//
// The 48-wilaya map is Law 84-09 as it stood just before Law 19-12, so the 24
// communes Ordonnance 97-14 moved into Algiers count as Algiers (16). El Borma
// (3021) is the one place the dataset departs from the text that created a wilaya, and it is pinned below so
// the departure cannot change silently.
//
// Each carrier is read with its own expression on purpose, as in the other
// carrier tests: a reader's mistake and a writer's mistake must not cancel out.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "packages", "dataset");
const readText = (...p) => readFileSync(join(DATASET, "data", ...p), "utf-8");
const read = (...p) => JSON.parse(readText(...p));
const research = (file) =>
  JSON.parse(readFileSync(join(ROOT, "research", "_wilaya-lineage", file), "utf-8"));

const lineage = read("wilaya-lineage.json");
const wilayas = read("wilayas.json").wilayas;
const byCode = new Map(lineage.wilayas.map((w) => [w.code, w]));
const communes = ["communes_w1_w23", "communes_w24_w48", "communes_w49_w69"].flatMap((f) =>
  read(`${f}.json`),
);
const articles = research("creation-articles.json");
const ord97 = research("ordonnance-97-14.json");

const EL_BORMA = 3021;

test("the lineage table has one row per wilaya, with codes in range", () => {
  assert.deepEqual(
    lineage.wilayas.map((w) => w.code),
    Array.from({ length: 69 }, (_, i) => i + 1),
  );
  for (const w of lineage.wilayas) {
    assert.ok(Number.isInteger(w.wilaya_code_58) && w.wilaya_code_58 >= 1 && w.wilaya_code_58 <= 58, `${w.code}`);
    assert.ok(Number.isInteger(w.wilaya_code_48) && w.wilaya_code_48 >= 1 && w.wilaya_code_48 <= 48, `${w.code}`);
  }
});

test("each wilaya maps to itself where it existed, else to its mother wilaya", () => {
  for (const w of wilayas) {
    const row = byCode.get(w.code);
    assert.equal(row.created, w.created, `created of ${w.code}`);
    if (w.code <= 48) {
      assert.equal(row.wilaya_code_58, w.code, `${w.code} on the 58 map`);
      assert.equal(row.wilaya_code_48, w.code, `${w.code} on the 48 map`);
    } else if (w.code <= 58) {
      assert.equal(row.wilaya_code_58, w.code, `${w.code} on the 58 map`);
      assert.equal(row.wilaya_code_48, w.mother_wilaya_code, `${w.code} on the 48 map`);
    } else {
      assert.equal(row.wilaya_code_58, w.mother_wilaya_code, `${w.code} on the 58 map`);
      assert.equal(row.wilaya_code_48, w.mother_wilaya_code, `${w.code} on the 48 map`);
    }
    // The two maps nest: a wilaya's 48-era parent is its 58-era parent's.
    assert.equal(byCode.get(row.wilaya_code_58).wilaya_code_48, row.wilaya_code_48, `${w.code} nests`);
  }
});

test("every citation names a listed source, and every new wilaya cites its creating article", () => {
  const keys = new Set(lineage.metadata.sources.map((s) => s.key));
  for (const s of lineage.metadata.sources) {
    assert.match(s.url, /^https:\/\/www\.(joradp|ons)\.dz\//, `${s.key} url`);
  }
  const all = [...lineage.wilayas, ...lineage.exceptions].flatMap((w) => w.citations);
  for (const c of all) assert.ok(keys.has(c.source), `unknown source ${c.source}`);
  for (const t of lineage.transfers) assert.ok(keys.has(t.source), `unknown source ${t.source}`);

  for (const a of articles.wilayas) {
    const row = byCode.get(a.wilaya_code);
    const law = a.wilaya_code <= 58 ? "law-19-12" : "law-26-06";
    const names = a.wilaya_code <= 58 ? "decret-21-117" : "decret-26-206";
    const creating = row.citations.find((c) => c.source === law);
    assert.ok(creating, `${a.wilaya_code} cites ${law}`);
    assert.equal(creating.article, `art. 3 (law 84-09 art. ${a.article})`, `${a.wilaya_code} article`);
    assert.equal(creating.communes_in_text, a.count_in_text, `${a.wilaya_code} count`);
    assert.equal(a.communes.length, a.count_in_text, `${a.wilaya_code} extract length`);
    assert.ok(row.citations.some((c) => c.source === names), `${a.wilaya_code} cites ${names}`);
  }
  assert.deepEqual(
    articles.wilayas.map((a) => a.wilaya_code),
    Array.from({ length: 21 }, (_, i) => i + 49),
  );
});

test("the creating articles list exactly the communes of wilayas 49-69, El Borma aside", () => {
  const excepted = new Set(lineage.exceptions.map((e) => e.code_commune));
  for (const a of articles.wilayas) {
    const inText = a.communes.map((c) => c.code_commune).filter((code) => !excepted.has(code)).sort();
    const inData = communes
      .filter((c) => c.wilaya_code === a.wilaya_code)
      .map((c) => c.code_commune)
      .sort();
    assert.deepEqual(inData, inText, `wilaya ${a.wilaya_code}`);
  }
});

test("communes of wilayas 1-48 never moved: no creating article lists them, and they keep their code", () => {
  const listed = new Set(articles.wilayas.flatMap((a) => a.communes.map((c) => c.code_commune)));
  for (const c of communes.filter((c) => c.wilaya_code <= 48)) {
    if (c.code_commune !== EL_BORMA) assert.ok(!listed.has(c.code_commune), `${c.code_commune} is listed`);
    assert.equal(c.wilaya_code_58, c.wilaya_code, `${c.code_commune} on the 58 map`);
    assert.equal(c.wilaya_code_48, c.wilaya_code, `${c.code_commune} on the 48 map`);
  }
});

test("El Borma stays in Ouargla, as a pinned and sourced exception", () => {
  assert.deepEqual(
    lineage.exceptions.map((e) => e.code_commune),
    [EL_BORMA],
    "a new exception needs its own pinned test",
  );
  const [e] = lineage.exceptions;
  assert.equal(e.wilaya_code, 30);
  assert.equal(e.wilaya_code_58, 30);
  assert.equal(e.wilaya_code_48, 30);
  assert.equal(e.listed_under_wilaya_code, 55);
  assert.deepEqual(
    e.citations.map((c) => c.source),
    ["law-19-12", "law-19-12", "ons-code-geo-2021"],
  );
  assert.match(e.citations[0].article, /52 bis 6, item 14/);
  // Each reading of Law 19-12 at the page it is printed on, French edition first
  // (JORA n° 78 of 18 December 2019; the Arabic edition runs one page later).
  assert.equal(e.citations[0].page, "p. 15 (Arabic edition p. 16)");
  assert.match(e.citations[1].article, /law 84-09 art\. 34\b/);
  assert.equal(e.citations[1].page, "p. 13 (Arabic edition p. 14)");

  // The text does list it under Touggourt; the dataset does not, on purpose.
  const touggourt = articles.wilayas.find((a) => a.wilaya_code === 55);
  assert.equal(touggourt.communes.at(-1).code_commune, EL_BORMA);
  assert.equal(touggourt.count_in_text, 14);

  const record = communes.find((c) => c.code_commune === EL_BORMA);
  assert.equal(record.name_fr, "El Borma");
  assert.equal(record.wilaya_code, 30);
  assert.equal(record.wilaya_code_58, 30);
  assert.equal(record.wilaya_code_48, 30);
});

// A second reading of the 58-map codes of wilayas 59-69, from a source the rows above
// are not checked against: their communes still carry the ONS code they had on the
// 58-wilaya map, whose leading digits are that map's wilaya. wilayas.json's
// mother_wilaya_code, which the lineage rows are held to, is a separate field.
test("wilayas 59-69 take the ONS prefix of their communes as their 58-map code", () => {
  for (const w of lineage.wilayas.filter((w) => w.code >= 59)) {
    const prefixes = new Set(
      communes.filter((c) => c.wilaya_code === w.code).map((c) => Math.floor(c.code_commune / 100)),
    );
    assert.deepEqual([...prefixes], [w.wilaya_code_58], `wilaya ${w.code}`);
  }
});

// The lineage file says which published commune lists lack the two codes, so a
// consumer can tell a missing field from a missing file. Every list under data/
// whose name says commune either carries wilaya_code_58 or is named there.
test("every commune list without the two codes is named in not_carried_by", () => {
  const named = lineage.metadata.not_carried_by.map((entry) => entry.split(":")[0]);
  const covers = (path) =>
    named.some((glob) => (glob.endsWith("/*") ? path.startsWith(glob.slice(0, -1)) : path === glob));
  const walk = (dir) =>
    readdirSync(join(DATASET, dir), { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`],
    );
  const lists = walk("data").filter(
    (p) => /commune/.test(p.split("/").at(-1)) && !/\.(metadata\.json|md)$/.test(p),
  );
  assert.ok(lists.length >= 10, `only ${lists.length} commune lists found`);
  for (const p of lists) {
    if (readFileSync(join(DATASET, p), "utf-8").includes("wilaya_code_58")) continue;
    assert.ok(covers(p), `${p} lacks wilaya_code_58 and is not in metadata.not_carried_by`);
  }
});

test("the 24 communes of Ordonnance 97-14 are Alger on the 48 map", () => {
  assert.equal(ord97.communes.length, 24);
  assert.deepEqual(
    lineage.transfers.map((t) => t.code_commune),
    ord97.communes.map((c) => c.code_commune).sort((a, b) => a - b),
  );
  const from = {};
  for (const t of lineage.transfers) {
    from[t.from_wilaya_code] = (from[t.from_wilaya_code] ?? 0) + 1;
    assert.equal(t.to_wilaya_code, 16);
    assert.equal(t.effective, "1997-07-31");
    const c = communes.find((x) => x.code_commune === t.code_commune);
    assert.equal(c.wilaya_code, 16, `${t.code_commune}`);
    assert.equal(c.wilaya_code_48, 16, `${t.code_commune}`);
  }
  assert.deepEqual(from, { 9: 4, 35: 6, 42: 14 });
  assert.ok(byCode.get(16).citations.some((c) => c.source === "ordonnance-97-14"));
});

/** Every file carrying the two fields: [label, () => {code, w, w58, w48}[]] */
const CARRIERS = [
  [
    "data/communes_w*.json",
    () => communes.map((c) => ({ code: c.code_commune, w: c.wilaya_code, w58: c.wilaya_code_58, w48: c.wilaya_code_48 })),
  ],
  [
    "data/algeria.json",
    () =>
      read("algeria.json").flatMap((wil) =>
        wil.communes.map((c) => ({ code: c.code_commune, w: c.wilaya_code, w58: c.wilaya_code_58, w48: c.wilaya_code_48 })),
      ),
  ],
  [
    "data/geojson/communes.geojson",
    () =>
      read("geojson", "communes.geojson").features.map(({ properties: p }) => ({
        code: null,
        w: p.wilaya_code,
        w58: p.wilaya_code_58,
        w48: p.wilaya_code_48,
      })),
  ],
  [
    "data/csv/communes.csv",
    () => {
      const [head, ...rows] = readText("csv", "communes.csv").trim().split(/\r?\n/);
      const col = head.split(",");
      const at = (name) => col.indexOf(name);
      return rows.map((r) => {
        const f = r.split(",");
        assert.equal(f.length, col.length, r);
        return {
          code: Number(f[at("code_commune")]),
          w: Number(f[at("wilaya_code")]),
          w58: Number(f[at("wilaya_code_58")]),
          w48: Number(f[at("wilaya_code_48")]),
        };
      });
    },
  ],
  [
    "data/sql/full.sql",
    () => {
      const sql = readText("sql", "full.sql");
      assert.match(sql, /wilaya_code_58 INTEGER NOT NULL/);
      assert.match(sql, /wilaya_code_48 INTEGER NOT NULL/);
      assert.match(
        sql,
        /INSERT INTO communes \(id, name_fr, name_ar, wilaya_code, daira, postal_code, latitude, longitude, code_commune, wilaya_code_58, wilaya_code_48\) VALUES/,
      );
      const re =
        /^ {2}\(\d+, '(?:[^']|'')*', '(?:[^']|'')*', (\d+), '(?:[^']|'')*', (?:'\d+'|NULL), (?:-?[\d.]+|NULL), (?:-?[\d.]+|NULL), (\d+), (\d+), (\d+)\)[,;]$/;
      const out = [];
      for (const line of sql.split("\n")) {
        const m = line.match(re);
        if (m) out.push({ w: Number(m[1]), code: Number(m[2]), w58: Number(m[3]), w48: Number(m[4]) });
      }
      return out;
    },
  ],
];

for (const [label, load] of CARRIERS) {
  test(`${label} carries the lineage codes of every commune`, () => {
    const rows = load();
    assert.equal(rows.length, 1541, `${label} row count`);
    for (const r of rows) {
      const row = byCode.get(r.w);
      assert.ok(row, `${label}: unknown wilaya ${r.w}`);
      assert.equal(r.w58, row.wilaya_code_58, `${label} ${r.code ?? ""} in wilaya ${r.w}: wilaya_code_58`);
      assert.equal(r.w48, row.wilaya_code_48, `${label} ${r.code ?? ""} in wilaya ${r.w}: wilaya_code_48`);
    }
  });
}

test("the package exposes the lineage as a lazy getter, and types it", () => {
  const geo = createRequire(import.meta.url)(join(DATASET, "index.js"));
  const descriptor = Object.getOwnPropertyDescriptor(geo, "wilayaLineage");
  assert.equal(typeof descriptor?.get, "function", "wilayaLineage is not a lazy getter");
  assert.equal(geo.wilayaLineage.wilayas.length, 69);
  assert.equal(geo.wilayaLineage.wilayas.find((w) => w.code === 59).wilaya_code_58, 3);
  const c = geo.communes.find((x) => x.wilaya_code === 59);
  assert.equal(c.wilaya_code_58, 3);
  assert.equal(c.wilaya_code_48, 3);

  const types = readFileSync(join(DATASET, "types", "index.d.ts"), "utf-8");
  assert.match(types, /wilaya_code_58: number;/);
  assert.match(types, /wilaya_code_48: number;/);
  assert.match(types, /interface WilayaLineage\b/);
  assert.match(types, /readonly wilayaLineage: algeriaGeodata\.WilayaLineage;/);
});
