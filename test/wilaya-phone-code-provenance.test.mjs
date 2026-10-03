// The sourcing gate on `phone_code` for the eleven wilayas Law 26-06 created.
//
// Every value in the cohort is null today, so a test written only against the real
// ledger would assert nothing about the branch the ticket is about: the day a code
// finally lands. So the rules live in scripts/lib/phone-code-provenance.mjs and run
// twice here, over the real ledger and over synthetic entries that break each rule
// one at a time. The gate is known to bite before the first real code exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  ARTICLE_REFERENCE,
  isOfficialSourceUrl,
  ledgerErrors,
} from "../scripts/lib/phone-code-provenance.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const read = (...parts) => JSON.parse(readFileSync(join(DATA, ...parts), "utf-8"));
const text = (...parts) => readFileSync(join(DATA, ...parts), "utf-8");

const ledger = read("phone-code-provenance.json");
const unified = read("algeria.json");

/** The 2026 cohort, taken from `created` rather than a hardcoded 59 to 69, so the
 *  gate follows the data if another reform ever moves the boundary. */
const COHORT = unified
  .filter((wilaya) => wilaya.created === "2026")
  .map((wilaya) => wilaya.code)
  .sort((a, b) => a - b);

const motherOf = new Map(
  read("wilayas.json").wilayas.map((row) => [row.code, row.mother_wilaya_code]),
);
const codeOf = new Map(unified.map((row) => [row.code, row.phone_code]));
const context = { cohort: COHORT, motherOf, codeOf };

/** The committed ledger with one surgical change, to prove a rule refuses it. */
const mutated = (change) => {
  const copy = structuredClone(ledger);
  change(copy);
  return ledgerErrors(copy, context);
};
const wilaya = (copy, code) => copy.wilayas.find((row) => row.code === code);
/** A citation shape that passes everything except what a case deliberately breaks. */
const citing = (key) => ({
  source_key: key,
  article: "art. 1, p. 5",
  finding: "Allocates the code.",
});

test("the cohort is the eleven wilayas Law 26-06 created", () => {
  assert.equal(COHORT.length, 11);
  assert.deepEqual(
    ledger.wilayas.map((row) => row.code),
    COHORT,
  );
});

test("the committed ledger passes every rule", () => {
  assert.deepEqual(ledgerErrors(ledger, context), []);
});

test("every wilaya of the cohort is a cited official value or a null with a reason", () => {
  for (const row of ledger.wilayas) {
    if (row.phone_code === null) {
      assert.ok(ledger.metadata.reasons[row.reason], `wilaya ${row.code}: unrecorded reason`);
      continue;
    }
    assert.match(row.phone_code, /^0\d{2}$/);
    assert.ok(row.citations?.length, `wilaya ${row.code}: a value with no citation`);
  }
});

test("a null with no recorded reason is refused", () => {
  assert.deepEqual(
    mutated((copy) => {
      delete wilaya(copy, 59).reason;
    }),
    ["wilaya 59 (Aflou): null with no reason"],
  );
  assert.match(
    mutated((copy) => {
      wilaya(copy, 60).reason = "made-up";
    })[0],
    /wilaya 60 \(Barika\): reason made-up is not declared/,
  );
  assert.match(
    mutated((copy) => {
      copy.metadata.reasons["no-official-allocation"].searched = [];
    })[0],
    /records no search/,
  );
});

test("a code with no citation is refused, however well formed it looks", () => {
  assert.match(
    mutated((copy) => {
      wilaya(copy, 69).phone_code = "032";
      delete wilaya(copy, 69).reason;
    })[0],
    /a phone_code with no citation\. An official text or null, never a third option/,
  );
});

test("a code whose citation names no article, item or page is refused", () => {
  // "see JORA" points at a document, not into one.
  const errors = mutated((copy) => {
    const row = wilaya(copy, 59);
    row.phone_code = "032";
    delete row.reason;
    row.citations = [{ source_key: "jora-40-2026", finding: "It says so.", article: "see JORA" }];
  });
  assert.match(errors[0], /jora-40-2026 cites no article, item, page, annex, table or section/);
  assert.ok(ARTICLE_REFERENCE.test("decree n° 26-206, art. 1, items 59 to 69, p. 5"));
  assert.ok(!ARTICLE_REFERENCE.test("see JORA"));
});

test("a Wikipedia or directory source is refused however it declares itself", () => {
  const errors = mutated((copy) => {
    copy.metadata.sources.push({
      key: "wiki-aflou",
      name: "Aflou, Wikipédia",
      url: "https://fr.wikipedia.org/wiki/Aflou",
      document_date: "2026-09-30",
      retrieved: "2026-10-01",
      evidence_type: "official",
    });
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /is not an official source/);
  assert.ok(!isOfficialSourceUrl("https://fr.wikipedia.org/wiki/Aflou"));
  assert.ok(!isOfficialSourceUrl("https://"));
  assert.ok(!isOfficialSourceUrl("http://www.joradp.dz/x.pdf"), "plain http is not a source");
  assert.ok(isOfficialSourceUrl("https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026040.pdf"));
  assert.ok(isOfficialSourceUrl("https://www.interieur.gov.dz/anything"));
});

test("a code copied from the wilaya it was split from is refused", () => {
  // Aflou (59) was split from Laghouat (3), which carries 029. A silent "029" on
  // Aflou is exactly the derivation the Owner rule forbids, and it is invisible in
  // the value, so the ledger has to declare the coincidence and name its text.
  assert.equal(codeOf.get(motherOf.get(59)), "029");
  const silent = mutated((copy) => {
    const row = wilaya(copy, 59);
    row.phone_code = "029";
    delete row.reason;
    row.citations = [citing("jora-40-2026")];
    row.source_keys = ["jora-40-2026"];
  });
  assert.equal(silent.length, 2);
  assert.match(silent[0], /must set same_as_mother_wilaya true/);
  assert.match(silent[1], /no mother_note/);

  // Declared, and the allocating text named: that is a sourced value, not a copy.
  assert.deepEqual(
    mutated((copy) => {
      const row = wilaya(copy, 59);
      row.phone_code = "029";
      delete row.reason;
      row.citations = [
        {
          source_key: "arpce-numbering",
          article: "decision of 22 February 2008, zone table",
          finding: "Aflou's territory falls in the zone the Authority numbers 029.",
        },
      ];
      row.same_as_mother_wilaya = true;
      row.mother_note =
        "The same value as wilaya 3 because both lie in one numbering zone, which the Authority states; not carried over from wilaya 3.";
    }),
    [],
  );

  // And a citation that justifies itself by the origin wilaya is refused outright.
  assert.match(
    mutated((copy) => {
      const row = wilaya(copy, 60);
      row.phone_code = "033";
      delete row.reason;
      row.citations = [
        {
          source_key: "jora-40-2026",
          article: "art. 1",
          finding: "Carried over from the mother wilaya Batna.",
        },
      ];
      row.same_as_mother_wilaya = true;
      row.mother_note = "Same as Batna.";
    }).join(" "),
    /points at the wilaya it was split from, not at an official text/,
  );
});

test("a source with no document date and no reason for that is refused", () => {
  assert.match(
    mutated((copy) => {
      copy.metadata.sources.find((s) => s.key === "arpce-numbering").date_note = "";
    })[0],
    /document_date is null with no date_note/,
  );
  assert.match(
    mutated((copy) => {
      copy.metadata.sources.find((s) => s.key === "jora-40-2026").document_date = "June 2026";
    })[0],
    /document_date must be an ISO date/,
  );
});

test("the four published carriers agree with the ledger", () => {
  const expected = new Map(ledger.wilayas.map((row) => [row.code, row.phone_code]));
  const fromUnified = codeOf;
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
  const insert = text("sql", "full.sql").match(/INSERT INTO wilayas \(([^)]*)\) VALUES\n([\s\S]*?);\n/);
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
    assert.equal(fromUnified.get(code), phone, `algeria.json: wilaya ${code}`);
    assert.equal(geojson.get(code), phone, `geojson/wilayas.geojson: wilaya ${code}`);
    assert.equal(csv.get(code), phone, `csv/wilayas.csv: wilaya ${code}`);
    assert.equal(sql.get(code), phone, `sql/full.sql: wilaya ${code}`);
  }
});

test("the package exposes the ledger so a consumer can read the reason", async () => {
  const { default: geoalgeria } = await import(join(ROOT, "packages", "dataset", "index.js"));
  assert.deepEqual(geoalgeria.phoneCodeProvenance, ledger);

  // The .d.ts IS the public API for a TypeScript consumer, and `validate-packages`
  // exempts this package, so a getter added to index.js alone compiles to TS2339
  // with nothing complaining. Pin both halves.
  const declarations = readFileSync(
    join(ROOT, "packages", "dataset", "types", "index.d.ts"),
    "utf-8",
  );
  assert.match(declarations, /readonly phoneCodeProvenance: algeriaGeodata\.PhoneCodeProvenance;/);
  assert.match(declarations, /export interface PhoneCodeProvenance \{/);
});
