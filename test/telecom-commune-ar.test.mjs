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

import {
  canonicalCommuneForSite,
  communeArForSite,
  resolvedByArabicLabelAlone,
} from "../scripts/lib/telecom-commune-ar.mjs";
import { canonicalCommuneForCurrentLabel } from "../scripts/lib/commune-index.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => JSON.parse(readFileSync(join(ROOT, ...parts), "utf8"));
const FILES = ["5g-djezzy.json", "5g-mobilis.json", "5g-ooredoo.json"];
const records = FILES.flatMap((file) => read("packages", "telecom", "data", file));
const capture = read("sources", "telecom", "mobilis-5g.json");

// One definition of "resolves", shared with the generator, so a guard cannot pass
// against a rule the build no longer applies.
const resolved = (row) => canonicalCommuneForSite(row);

test("a resolved record carries the registry's Arabic commune name", () => {
  const wrong = records
    .filter((row) => resolved(row) && row.commune_ar !== resolved(row).name_ar)
    .map((row) => `${row.id} ${row.commune}: ${row.commune_ar} is not ${resolved(row).name_ar}`);
  assert.deepEqual(wrong, [], "record(s) published with a commune_ar the registry does not use");
  // Pinned, so a rule that silently stops resolving anything fails here rather than
  // passing an empty check.
  const counts = {
    registry: records.filter((row) => resolved(row)).length,
    operatorLabel: records.filter((row) => !resolved(row) && row.commune_ar).length,
    noLabel: records.filter((row) => !resolved(row) && !row.commune_ar).length,
  };
  assert.deepEqual(counts, { registry: 3013, operatorLabel: 56, noLabel: 1024 });
  assert.equal(counts.registry + counts.operatorLabel + counts.noLabel, records.length);
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

// The published records are no use for testing the pins: the generator has already
// rewritten their commune_ar, so the rewritten value resolves on its own and the pins
// could be deleted with every assertion above still green. These drive the helper with
// the label the operator actually published, straight out of the committed capture.
const mobilisSite = (row) => {
  const [lat, lng] = String(row.coordonnes).split(",").map(Number);
  return {
    wilaya_code: String(row.wilaya_id).padStart(2, "0"),
    commune: row.commune,
    commune_ar: row.commune_ar ?? null,
    commune_code: null,
    lat,
    lng,
  };
};

test("a pinned operator spelling resolves from the raw captured label", () => {
  // The registry name each pin resolves to, and the spelling the 2026-10-27 capture
  // actually carries. Remove PINNED_OPERATOR_COMMUNE and both of these go red.
  const expected = [
    { commune: "FIL FILA", captured: "فلفلة فلفلة", nameAr: "فلفلة" },
    { commune: "BIR EL OUIDEN", captured: "بئر العرش", nameAr: "بين الويدان" },
  ];
  for (const { commune, captured, nameAr } of expected) {
    const rows = capture.filter((row) => row.commune === commune);
    assert.ok(rows.length, `${commune}: not in the Mobilis capture`);
    for (const row of rows) {
      assert.equal(row.commune_ar, captured, `${commune}: the capture no longer carries this spelling`);
      const site = mobilisSite(row);
      // Neither the French nor the Arabic label resolves on its own, which is the whole
      // reason the pin exists.
      assert.equal(
        canonicalCommuneForCurrentLabel(site.wilaya_code, site.commune, site.commune_ar),
        null,
        `${commune}: now resolves on its own, so the pin should be retired`,
      );
      assert.equal(communeArForSite(site), nameAr, `${commune} (${row.id})`);
    }
  }
});

test("an Arabic-only match is corroborated by the record's own point", () => {
  // The Arabic column is the one the operators rewrite, so a record that resolves on it
  // alone has its point checked against the resolved commune's outline. 237 records take
  // that path. One is refused: mobilis-022a883976 calls itself DELY BRAHIM and carries
  // دالي ابراهيم, the registry name of commune 1623, but its point is inside 1652 El
  // Achour. It falls back to the operator's label, which is the same string here, so the
  // published data does not move; what moves is that the record no longer claims a
  // commune its own coordinate refutes.
  const arabicOnly = records.filter((row) => resolvedByArabicLabelAlone(row));
  const refused = arabicOnly.filter((row) => !canonicalCommuneForSite(row));
  assert.equal(arabicOnly.length, 237);
  assert.deepEqual(
    refused.map((row) => row.id),
    ["mobilis-022a883976"],
  );
  // It publishes the operator's own label for its own row, matched on the coordinate
  // rather than on the commune name: three other DELY BRAHIM rows do sit inside 1623 and
  // take the registry spelling, so the two differ by a hamza here.
  for (const row of refused) {
    const raw = capture.find((item) => item.coordonnes === `${row.lat},${row.lng}`);
    assert.ok(raw, `${row.id}: not found in the capture by coordinate`);
    assert.equal(row.commune_ar, raw.commune_ar);
  }
});
