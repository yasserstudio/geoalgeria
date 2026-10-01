// The sourcing gate on `phone_code` for the eleven wilayas Law 26-06 created.
//
// The Owner rule is that a code for wilayas 59 to 69 is taken from an official
// text or it is not published at all: never derived from the mother wilaya, never
// lifted from an encyclopaedia or a directory. The data alone cannot show that,
// because a derived "029" and a decreed "029" are the same three characters. So
// the ledger in data/phone-code-provenance.json carries the evidence, and this
// file is the gate: every wilaya in the cohort is either a cited official value
// or a null with a recorded reason, and the four published carriers agree with
// the ledger down to the last one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const read = (...parts) => JSON.parse(readFileSync(join(DATA, ...parts), "utf-8"));
const text = (...parts) => readFileSync(join(DATA, ...parts), "utf-8");

/** The 2026 cohort: the wilayas Law 26-06 created, so the ones with no code of record. */
const COHORT = Array.from({ length: 11 }, (_, index) => 59 + index);

const ledger = read("phone-code-provenance.json");
const sourceKeys = new Set(ledger.metadata.sources.map((source) => source.key));
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

test("the ledger covers wilayas 59 to 69 exactly once each, in order", () => {
  assert.deepEqual(
    ledger.wilayas.map((wilaya) => wilaya.code),
    COHORT,
  );
});

test("every declared source is an official text with a title, a URL and a retrieval date", () => {
  assert.ok(ledger.metadata.sources.length > 0, "the ledger declares no source at all");
  const seen = new Set();
  for (const source of ledger.metadata.sources) {
    assert.ok(nonEmpty(source.key), `source has no key: ${JSON.stringify(source)}`);
    assert.ok(!seen.has(source.key), `duplicate source key ${source.key}`);
    seen.add(source.key);
    assert.ok(nonEmpty(source.name), `${source.key}: no document title`);
    assert.match(source.url, /^https:\/\//, `${source.key}: no URL`);
    assert.match(source.retrieved, /^\d{4}-\d{2}-\d{2}$/, `${source.key}: no retrieval date`);
    assert.equal(
      source.evidence_type,
      "official",
      `${source.key}: only official texts may back a phone_code`,
    );
  }
});

test("every wilaya 59 to 69 is a cited official value or a null with a recorded reason", () => {
  for (const wilaya of ledger.wilayas) {
    const where = `wilaya ${wilaya.code} (${wilaya.name_fr})`;
    assert.ok(nonEmpty(wilaya.name_fr) && nonEmpty(wilaya.name_ar), `${where}: name missing`);

    if (wilaya.phone_code === null) {
      // A null is an answer, but only a reason makes it an auditable one.
      assert.ok(nonEmpty(wilaya.reason), `${where}: null with no reason`);
      const reason = ledger.metadata.reasons[wilaya.reason];
      assert.ok(reason, `${where}: reason ${wilaya.reason} is not declared in metadata.reasons`);
      assert.ok(nonEmpty(reason.statement), `${where}: reason ${wilaya.reason} has no statement`);
      assert.ok(
        Array.isArray(reason.searched) && reason.searched.length > 0,
        `${where}: reason ${wilaya.reason} records no search`,
      );
      for (const entry of reason.searched) {
        assert.ok(nonEmpty(entry.authority), `${wilaya.reason}: a search names no authority`);
        assert.ok(nonEmpty(entry.looked_for), `${entry.authority}: no search terms recorded`);
        assert.ok(nonEmpty(entry.result), `${entry.authority}: no result recorded`);
        assert.ok(
          Array.isArray(entry.source_keys) && entry.source_keys.length > 0,
          `${entry.authority}: no source cited for what was searched`,
        );
        for (const key of entry.source_keys) {
          assert.ok(sourceKeys.has(key), `${entry.authority}: unknown source key ${key}`);
        }
      }
      continue;
    }

    // A value, so it must be a code and it must name the official text it came from.
    assert.match(wilaya.phone_code, /^0\d{2}$/, `${where}: phone_code is not an area code`);
    assert.ok(
      Array.isArray(wilaya.sources) && wilaya.sources.length > 0,
      `${where}: a phone_code with no source. Official text or null, never a third option`,
    );
    for (const citation of wilaya.sources) {
      assert.ok(nonEmpty(citation), `${where}: empty citation`);
    }
    assert.ok(
      Array.isArray(wilaya.source_keys) && wilaya.source_keys.length > 0,
      `${where}: a phone_code citing no declared source`,
    );
    for (const key of wilaya.source_keys) {
      assert.ok(sourceKeys.has(key), `${where}: unknown source key ${key}`);
    }
  }
});

test("no code in the cohort is justified by the mother wilaya", () => {
  // The rule the ledger exists to enforce: a 2026 wilaya's code is never the
  // mother's code carried over. A value identical to the mother's is allowed
  // only when an official text says so, so the citation must not be the mother.
  const wilayas = read("wilayas.json").wilayas;
  const motherOf = new Map(wilayas.map((row) => [row.code, row.mother_wilaya_code]));
  const codeOf = new Map(read("algeria.json").map((row) => [row.code, row.phone_code]));
  for (const wilaya of ledger.wilayas) {
    if (wilaya.phone_code === null) continue;
    const mother = motherOf.get(wilaya.code);
    if (codeOf.get(mother) !== wilaya.phone_code) continue;
    for (const citation of wilaya.sources ?? []) {
      assert.doesNotMatch(
        citation,
        /mother|wilaya d'origine|parent/i,
        `wilaya ${wilaya.code}: its code matches wilaya ${mother} and the citation points at the mother, not at an official text`,
      );
    }
  }
});

test("the four published carriers agree with the ledger", () => {
  const expected = new Map(ledger.wilayas.map((wilaya) => [wilaya.code, wilaya.phone_code]));

  const unified = new Map(read("algeria.json").map((row) => [row.code, row.phone_code]));
  const geojson = new Map(
    read("geojson", "wilayas.geojson").features.map((feature) => [
      feature.properties.code,
      feature.properties.phone_code,
    ]),
  );

  const csvRows = text("csv", "wilayas.csv").trim().split("\n");
  const csvColumns = csvRows[0].split(",");
  const csvCode = csvColumns.indexOf("code");
  const csvPhone = csvColumns.indexOf("phone_code");
  assert.ok(csvCode >= 0 && csvPhone >= 0, "csv/wilayas.csv lost a column this test reads");
  const csv = new Map(
    csvRows.slice(1).map((row) => {
      const cells = row.split(",");
      return [Number(cells[csvCode]), cells[csvPhone] === "" ? null : cells[csvPhone]];
    }),
  );

  // Read the wilaya INSERT by its own column list, so a column added beside
  // phone_code (a capital, a seat code) moves this test instead of breaking it.
  const dump = text("sql", "full.sql");
  const insert = dump.match(/INSERT INTO wilayas \(([^)]*)\) VALUES\n([\s\S]*?);\n/);
  assert.ok(insert, "sql/full.sql: the wilaya INSERT did not parse");
  const sqlColumns = insert[1].split(",").map((name) => name.trim());
  const sqlCode = sqlColumns.indexOf("code");
  const sqlPhone = sqlColumns.indexOf("phone_code");
  assert.ok(sqlCode >= 0 && sqlPhone >= 0, "sql/full.sql lost a column this test reads");
  const sql = new Map();
  for (const row of insert[2].split("\n")) {
    const tuple = row.trim().replace(/^\(/, "").replace(/\),?$/, "");
    const cells = tuple.match(/'(?:[^']|'')*'|[^,]+/g)?.map((cell) => cell.trim());
    assert.equal(cells?.length, sqlColumns.length, `sql/full.sql: ${row}`);
    const phone = cells[sqlPhone];
    sql.set(
      Number(cells[sqlCode]),
      phone === "NULL" ? null : phone.slice(1, -1).replaceAll("''", "'"),
    );
  }
  assert.equal(sql.size, 69, "sql/full.sql wilaya rows did not parse");

  for (const [code, phone] of expected) {
    assert.equal(unified.get(code), phone, `algeria.json: wilaya ${code}`);
    assert.equal(geojson.get(code), phone, `geojson/wilayas.geojson: wilaya ${code}`);
    assert.equal(csv.get(code), phone, `csv/wilayas.csv: wilaya ${code}`);
    assert.equal(sql.get(code), phone, `sql/full.sql: wilaya ${code}`);
  }
});

test("the package exposes the ledger so a consumer can read the reason", async () => {
  const { default: geoalgeria } = await import(
    join(ROOT, "packages", "dataset", "index.js")
  );
  assert.deepEqual(geoalgeria.phoneCodeProvenance, ledger);
});
