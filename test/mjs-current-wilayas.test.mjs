import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { reconcileMjsCurrentWilaya } from "../scripts/lib/mjs-current-wilaya.mjs";

const load = (pkg, file) =>
  JSON.parse(readFileSync(new URL(`../packages/${pkg}/data/${file}`, import.meta.url), "utf8"));
const digest = (rows) =>
  createHash("sha256")
    .update(rows.map((row) => `${row.id}->${row.wilaya_code}`).sort().join("\n"))
    .digest("hex");

const expected = {
  sports: {
    file: "facilities.json",
    count: 255,
    digest: "be82341ee2690113d0a2285671b6ad306952f24bc8358be58cdffd8e5ef3beb8",
    byWilaya: { 59: 66, 60: 40, 61: 13, 62: 12, 63: 16, 64: 15, 65: 30, 66: 16, 67: 30, 68: 16, 69: 1 },
  },
  jeunesse: {
    file: "institutions.json",
    count: 121,
    digest: "8d7d37dc44a18d90166d6057fa2594e38149423ac89437e239b3ef466e816e4c",
    byWilaya: { 59: 23, 60: 10, 61: 9, 62: 4, 63: 9, 64: 7, 65: 12, 66: 8, 67: 19, 68: 19, 69: 1 },
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
      assert.deepEqual(reconcileMjsCurrentWilaya(row), {
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
  assert.deepEqual(reconcileMjsCurrentWilaya(aflouConflict), {
    wilaya_code: "03",
    commune_code: null,
  });
});
