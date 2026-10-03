// Guards the `created` cohort of every wilaya carrier in packages/dataset.
//
// The bug this exists for: `created` was published as "2025" for wilayas 59-69
// while every README, the JO citation and the app's own pages said April 2026.
// 2025 is when the reform was announced (2025-11-16); the wilayas became
// official when Law n° 26-06 took effect (JO n° 25 of 5 April 2026). A consumer
// reading `created` as "the year this wilaya became official", which is what the
// field means, got the wrong year for exactly the 11 newest wilayas, and the
// "2025 territorial reform" drift in llms.txt came from the same value.
//
// The check: `created` is a closed cohort per code range, so it is pinned by
// range rather than by spot-checking one wilaya. Five files carry it in three
// spellings, so all five are asserted against the same expectation, and the
// documented meaning is asserted too, because the value is only correct
// relative to that sentence.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset");
const readText = (...p) => readFileSync(join(DATA, ...p), "utf-8");
const read = (...p) => JSON.parse(readText(...p));

/** The year each code range became official, per the law that created it. */
const COHORTS = [
  { from: 1, to: 48, string: "original", number: 1984, law: "Law 84-09 (1984)" },
  { from: 49, to: 58, string: "2019", number: 2019, law: "Law 19-12 (2019)" },
  { from: 59, to: 69, string: "2026", number: 2026, law: "Law n° 26-06 (April 2026)" },
];

const cohortOf = (code) => COHORTS.find((c) => code >= c.from && code <= c.to);

/** Every file in packages/dataset carrying `created`: [label, spelling, () => {code: value}] */
const COPIES = [
  [
    "data/algeria.json",
    "string",
    () => Object.fromEntries(read("data", "algeria.json").map((w) => [w.code, w.created])),
  ],
  [
    "data/wilayas.json",
    "number",
    () => Object.fromEntries(read("data", "wilayas.json").wilayas.map((w) => [w.code, w.created])),
  ],
  ["data/wilayas.csv", "number", () => fromCsv("data", "wilayas.csv", Number)],
  ["data/csv/wilayas.csv", "string", () => fromCsv("data", "csv", "wilayas.csv", String)],
  ["data/sql/full.sql", "string", () => fromSql()],
];

function fromCsv(...args) {
  const cast = args.pop();
  const [head, ...rows] = readText(...args).trim().split(/\r?\n/);
  const col = head.split(",");
  const [ci, cr] = [col.indexOf("code"), col.indexOf("created")];
  assert.ok(ci >= 0 && cr >= 0, `${args.join("/")}: no code/created column`);
  return Object.fromEntries(
    rows.map((r) => {
      const f = r.split(",");
      return [Number(f[ci]), cast(f[cr])];
    }),
  );
}

function fromSql() {
  // (code, 'name_fr', 'name_ar', phone, postal, latitude, longitude, created, capital)
  const re = /^ {2}\((\d+), .*, '([^']*)', \d+\)[,;]$/gm;
  const out = {};
  for (const m of readText("data", "sql", "full.sql").matchAll(re)) out[Number(m[1])] = m[2];
  return out;
}

for (const [label, spelling, load] of COPIES) {
  test(`${label}: created is the year each wilaya became official`, () => {
    const created = load();
    assert.equal(Object.keys(created).length, 69, `${label}: expected 69 wilayas`);

    const wrong = [];
    for (const [rawCode, value] of Object.entries(created)) {
      const code = Number(rawCode);
      const cohort = cohortOf(code);
      assert.ok(cohort, `${label}: wilaya ${code} is outside 1-69`);
      const want = cohort[spelling];
      if (value !== want) {
        wrong.push(`wilaya ${code}: ${JSON.stringify(value)}, expected ${JSON.stringify(want)} (${cohort.law})`);
      }
    }
    assert.deepEqual(wrong, [], `${label}: ${wrong.length} wrong created value(s)\n  ${wrong.join("\n  ")}`);
  });

  test(`${label}: exactly wilayas 59-69 carry the 2026 reform cohort`, () => {
    const created = load();
    const reform = COHORTS[2];
    const carrying = Object.keys(created)
      .filter((code) => created[code] === reform[spelling])
      .map(Number)
      .sort((a, b) => a - b);
    assert.deepEqual(carrying, [59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69], `${label}: wrong 2026 cohort`);
  });

  test(`${label}: 2025, the year the 59-69 reform was announced, is not a created value`, () => {
    const values = new Set(Object.values(load()).map(String));
    assert.ok(!values.has("2025"), `${label}: still carries created 2025`);
  });
}

test("data/wilayas.json: each reform year matches the created of the wilayas it added", () => {
  const { metadata, wilayas } = read("data", "wilayas.json");
  const byYear = new Map(metadata.reforms.map((r) => [r.year, r]));
  assert.deepEqual([...byYear.keys()].sort(), [1984, 2019, 2026]);
  for (const cohort of COHORTS) {
    assert.ok(byYear.has(cohort.number), `no reform for ${cohort.number}`);
    const codes = wilayas.filter((w) => w.created === cohort.number).map((w) => w.code);
    assert.equal(codes.length, cohort.to - cohort.from + 1, `reform ${cohort.number} cohort size`);
  }
});

test("the meaning of created is documented where consumers read it", () => {
  const MEANING = /year (?:a|the) wilaya became official/i;
  const docs = [
    ["packages/dataset/types/index.d.ts", readText("types", "index.d.ts")],
    ["packages/dataset/data/README.md", readText("data", "README.md")],
    ["CONTEXT.md", readFileSync(join(ROOT, "CONTEXT.md"), "utf-8")],
  ];
  for (const [label, text] of docs) {
    assert.match(text, MEANING, `${label}: does not state what created means`);
  }
});
