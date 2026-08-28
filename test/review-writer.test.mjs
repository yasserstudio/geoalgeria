import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writePackageV2 } from "../scripts/lib/v2-transforms.mjs";

const row = {
  id: "sante:16-00001",
  name: "Old name",
  wilaya_code: "16",
  commune_code: null,
  commune: null,
  lat: 36.7657,
  lng: 3.0587,
  geo_precision: "exact",
  geo_method: "official_locator",
  source: "msp",
};

const evidence = [
  {
    url: "https://example.com/health-register",
    checked_at: "2026-08-28",
  },
];

const ledger = (expect = { name: "Old name" }) => ({
  schema_version: 1,
  dataset: "sante",
  reviewer: "reviewer@example.com",
  reviewed_at: "2026-08-28",
  decisions: [
    {
      file: "sante.json",
      record_id: row.id,
      status: "corrected",
      publish_action: "patch",
      expect,
      patch: { name: "Reviewed name" },
      evidence,
    },
  ],
});

const write = (dir, reviewLedger) =>
  writePackageV2({
    pkg: "sante",
    dir,
    files: [{ file: "sante.json", rows: [{ ...row }] }],
    meta: {
      sources: [
        {
          key: "msp",
          name: "Ministry of Health",
          license: "Open data",
          evidence_type: "official",
        },
      ],
      license: "Open data",
    },
    updated: "2026-08-28",
    retrieved: "2026-08-28",
    reviewLedger,
  });

test("canonical writer applies the reviewed ledger before validation and emit", () => {
  const dir = mkdtempSync(join(tmpdir(), "geoalgeria-review-writer-"));
  const result = write(dir, ledger());
  const emitted = JSON.parse(readFileSync(join(dir, "sante.json"), "utf8"));
  assert.equal(emitted[0].name, "Reviewed name");
  assert.deepEqual(result.review, {
    reviewed: 1,
    patched: 1,
    excluded: 0,
    kept: 0,
  });
});

test("canonical writer rejects stale reviewed corrections before emitting data", () => {
  const dir = mkdtempSync(join(tmpdir(), "geoalgeria-review-stale-"));
  assert.throws(() => write(dir, ledger({ name: "Older upstream name" })), /stale decision/);
});
