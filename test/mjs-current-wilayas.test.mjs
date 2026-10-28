import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { reconcileCurrentWilayaByCommune } from "../scripts/lib/current-wilaya-by-commune.mjs";
import {
  canonicalCommuneForOfficialArabicLabel,
  canonicalCommuneForOfficialFrenchLabel,
} from "../scripts/lib/commune-index.mjs";

const load = (pkg, file) =>
  JSON.parse(readFileSync(new URL(`../packages/${pkg}/data/${file}`, import.meta.url), "utf8"));
const digest = (rows) =>
  createHash("sha256")
    .update(rows.map((row) => `${row.id}->${row.wilaya_code}`).sort().join("\n"))
    .digest("hex");

const expected = {
  sports: {
    file: "facilities.json",
    count: 267,
    digest: "5cdebacc7e79db0a9870fa989e51bf4232850bad98398451e888511997b379bd",
    byWilaya: { 59: 70, 60: 40, 61: 13, 62: 12, 63: 16, 64: 15, 65: 30, 66: 16, 67: 37, 68: 17, 69: 1 },
  },
  jeunesse: {
    file: "institutions.json",
    count: 128,
    digest: "4c137cda5050f9b9ef0be1236e6e8450cb8c47a0a04be0332b02350c7f4dd565",
    byWilaya: { 59: 25, 60: 10, 61: 9, 62: 4, 63: 9, 64: 7, 65: 12, 66: 8, 67: 23, 68: 20, 69: 1 },
  },
};

for (const [pkg, config] of Object.entries(expected)) {
  test(`${pkg} publishes the exact reviewed current-wilaya reconciliation`, () => {
    const rows = load(pkg, config.file);
    const reconciled = rows.filter((row) => row.source_wilaya_code != null);
    const byWilaya = Object.fromEntries(
      [...new Set(reconciled.map((row) => row.wilaya_code))]
        .sort()
        .map((wilaya) => [wilaya, reconciled.filter((row) => row.wilaya_code === wilaya).length]),
    );
    assert.equal(reconciled.length, config.count);
    assert.equal(digest(reconciled), config.digest);
    assert.deepEqual(byWilaya, config.byWilaya);
    for (const row of reconciled) {
      assert.match(row.commune_code, /^\d{4}$/);
      assert.deepEqual(reconcileCurrentWilayaByCommune(row), {
        wilaya_code: row.wilaya_code,
        source_wilaya_code: row.source_wilaya_code,
        commune_code: row.commune_code,
      });
    }
  });
}

test("MJS reconciliation abstains when the commune label conflicts with the point", () => {
  const aflouConflict = load("sports", "facilities.json").find(({ id }) => id === "00277");
  assert.equal(aflouConflict.commune, "AFLOU");
  assert.equal(aflouConflict.wilaya_code, "03");
  assert.deepEqual(reconcileCurrentWilayaByCommune(aflouConflict), {
    wilaya_code: "03",
    commune_code: null,
  });
});

test("official ONS French labels bridge historical spellings through stable commune codes", () => {
  assert.deepEqual(
    [
      ["03", "BEIDHA", "0312", "59"],
      ["26", "CHAHBOUNIA", "2638", "67"],
      ["32", "EL ABIODH SIDI CHEIKH", "3207", "69"],
    ].map(([wilaya, label, communeCode, currentWilaya]) => {
      const commune = canonicalCommuneForOfficialFrenchLabel(wilaya, label);
      return [String(commune.code_commune).padStart(4, "0"), String(commune.wilaya_code), communeCode, currentWilaya];
    }),
    [
      ["0312", "59", "0312", "59"],
      ["2638", "67", "2638", "67"],
      ["3207", "69", "3207", "69"],
    ],
  );
  assert.equal(canonicalCommuneForOfficialFrenchLabel("03", "not an official commune"), null);
});

test("official ONS Arabic labels resolve only exact unambiguous historical names", () => {
  const boughzoul = canonicalCommuneForOfficialArabicLabel("26", "بوغزول");
  assert.equal(String(boughzoul.code_commune).padStart(4, "0"), "2651");
  assert.equal(String(boughzoul.wilaya_code), "67");
  assert.equal(canonicalCommuneForOfficialArabicLabel("26", "بلدية غير موجودة"), null);
});

test("a former JORA spelling still reconciles a record the reform moved", () => {
  // The SIG writes the names communes carried before the 2026-09-24 renames
  // (JORA n° 25 of 2026, law 26-06). Each point sits in the daughter wilaya, the
  // source states the mother, and only the former spelling names the commune.
  const cases = [
    ["AZIL ABEDELKADER", "05", 35.4745, 5.064, "60", "0515"],
    ["BOUIHI", "13", 34.4692, -1.679, "63", "1343"],
    ["ZMALET EL EMIR ABDELKADE", "14", 34.8994, 2.3082, "64", "1409"],
    ["OULED EMAARAF", "26", 35.815711, 3.029773, "67", "2603"],
  ];
  for (const [commune, source, lat, lng, current, communeCode] of cases) {
    assert.deepEqual(
      reconcileCurrentWilayaByCommune({ commune, wilaya_code: source, lat, lng }),
      { wilaya_code: current, source_wilaya_code: source, commune_code: communeCode },
      commune,
    );
  }
  // A spelling no commune of the containing wilaya ever carried still abstains.
  assert.deepEqual(
    reconcileCurrentWilayaByCommune({ commune: "NOT A COMMUNE", wilaya_code: "13", lat: 34.4692, lng: -1.679 }),
    { wilaya_code: "13", commune_code: null },
  );
});
