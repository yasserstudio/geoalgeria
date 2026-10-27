// `commune_ar` is the official ONS Arabic name of the commune a 5G site resolves to,
// not the operator's spelling of it.
//
// WHY. The operators rewrite that column between pulls and they do it badly. The
// 2026-10-27 Mobilis capture moved 109 existing records' Arabic commune label, and
// scored against the commune registry in packages/dataset, 83 of the 109 matched it
// before and only 53 after: a definite article prepended to a name that already carried
// one (الميلية to ال الميلية, الكريمية to ال الكريمية), a word duplicated (فلفلة to
// فلفلة فلفلة), or a different commune entirely (بئر الويدان to بئر العرش, which names
// commune 1908 in wilaya 19, not anything in Skikda). Mirroring that column meant
// shipping it, so the generator now publishes the registry's name wherever the record
// resolves to a canonical commune, and the operator's own label only where nothing does.
//
// WHAT RESOLVES. The commune code when the record carries one, else an exact current or
// former commune label inside the declared wilaya (scripts/lib/commune-index.mjs), else
// one of the few operator spellings telecom pins by hand. Containment is deliberately
// NOT a resolution path: 69 of the 89 records whose point falls in exactly one commune
// outline name something other than that commune, usually a neighbourhood inside it
// (BAINS ROMAINS inside Hammamet, HAMMA ANASSERS inside Mohamed Belouzdad), and
// relabelling those would change what the record says rather than how it spells it.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { communeArForSite } from "../scripts/lib/telecom-commune-ar.mjs";
import { canonicalCommuneForCode, canonicalCommuneForCurrentLabel } from "../scripts/lib/commune-index.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => JSON.parse(readFileSync(join(ROOT, ...parts), "utf8"));
const FILES = ["5g-djezzy.json", "5g-mobilis.json", "5g-ooredoo.json"];
const records = FILES.flatMap((file) => read("packages", "telecom", "data", file));
const capture = read("sources", "telecom", "mobilis-5g.json");

/** The canonical commune a record resolves to by code or by label, or null. */
const resolved = (row) =>
  (row.commune_code ? canonicalCommuneForCode(row.commune_code) : null) ??
  canonicalCommuneForCurrentLabel(row.wilaya_code, row.commune, row.commune_ar);

test("a resolved record carries the registry's Arabic commune name", () => {
  const wrong = records
    .filter((row) => resolved(row) && row.commune_ar !== resolved(row).name_ar)
    .map((row) => `${row.id} ${row.commune}: ${row.commune_ar} is not ${resolved(row).name_ar}`);
  assert.deepEqual(wrong, [], "record(s) published with a commune_ar the registry does not use");
});

test("the five labels the 2026-10 Mobilis capture broke are published from the registry", () => {
  // Each pair is the operator's own French label and the Arabic name the registry uses
  // for the commune it names. The operator's 2026-10-27 spelling is in the capture and
  // must not reach the published record.
  const expected = {
    "EL MILIA": "الميلية",
    "EL KARIMIA": "الكريمية",
    "FIL FILA": "فلفلة",
    "BIR EL OUIDEN": "بين الويدان",
    "BENI ABBES": "بني عباس",
  };
  for (const [commune, nameAr] of Object.entries(expected)) {
    const rows = records.filter((row) => row.commune === commune);
    assert.ok(rows.length, `${commune}: no published record to check`);
    for (const row of rows) assert.equal(row.commune_ar, nameAr, `${commune} (${row.id})`);
    // The operator did publish something else for this commune, so the test is proving a
    // rewrite happened rather than that the capture happened to agree.
    const operator = capture.find((item) => item.commune === commune)?.commune_ar;
    assert.ok(operator, `${commune}: not in the Mobilis capture`);
    assert.notEqual(operator, nameAr, `${commune}: the capture already agrees, so this case proves nothing`);
  }
});

test("the operator's own label survives only where no commune resolves", () => {
  const byCommune = new Map(capture.map((item) => [item.commune, item.commune_ar ?? null]));
  for (const row of records) {
    if (resolved(row)) continue;
    const operator = row.operator === "mobilis" ? (byCommune.get(row.commune) ?? null) : null;
    assert.equal(
      row.commune_ar,
      operator,
      `${row.id} ${row.commune}: nothing resolves, so the operator's label is what publishes`,
    );
  }
});

test("the helper is what the published data was built with, record for record", () => {
  // The generator and this guard must not drift apart: re-derive every published value.
  for (const row of records) {
    assert.equal(
      communeArForSite(row),
      row.commune_ar,
      `${row.id} ${row.commune}: the generator's rule no longer produces the published value`,
    );
  }
});
