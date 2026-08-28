import test from "node:test";
import assert from "node:assert/strict";
import {
  applyReviewedOverrides,
  validateReviewLedger,
} from "../index.js";

const rows = [
  {
    id: "sante:16-00001",
    name: "Old name",
    source: "msp",
    lat: 36.7657,
    lng: 3.0587,
    geo_precision: "exact",
    geo_method: "official_locator",
  },
  {
    id: "sante:16-00002",
    name: "Duplicate",
    source: "msp",
    lat: null,
    lng: null,
    geo_precision: null,
    geo_method: null,
  },
];

const ledger = (decisions) => ({
  schema_version: 1,
  dataset: "sante",
  reviewer: "reviewer@example.com",
  reviewed_at: "2026-08-28",
  decisions,
});

const evidence = [
  {
    url: "https://example.com/official-record",
    checked_at: "2026-08-28",
  },
];

test("review ledger keeps review status separate from publication action", () => {
  const invalid = validateReviewLedger(
    ledger([
      {
        file: "sante.json",
        record_id: "sante:16-00002",
        status: "duplicate",
        publish_action: "patch",
        expect: { name: "Duplicate" },
        patch: { name: "Changed" },
        evidence,
      },
    ]),
  );
  assert.match(invalid.errors.join("\n"), /patch requires status "corrected"/);
});

test("change evidence must be a genuinely public URL", () => {
  for (const url of [
    "http://127.0.0.1/evidence",
    "http://192.168.1.5/evidence",
    "https://user:secret@example.com/evidence",
    "http://[::1]/evidence",
    "http://[::ffff:127.0.0.1]/evidence",
  ]) {
    const invalid = validateReviewLedger(
      ledger([
        {
          file: "sante.json",
          record_id: "sante:16-00001",
          status: "corrected",
          publish_action: "patch",
          expect: { name: "Old name" },
          patch: { name: "Reviewed name" },
          evidence: [{ url, checked_at: "2026-08-28" }],
        },
      ]),
    );
    assert.match(invalid.errors.join("\n"), /must be a public http\(s\) URL/);
  }
});

test("review provenance rejects nonexistent calendar dates", () => {
  const invalid = validateReviewLedger({
    ...ledger([]),
    reviewed_at: "2026-02-30",
  });
  assert.match(invalid.errors.join("\n"), /reviewed_at must be an ISO date/);

  const invalidEvidence = validateReviewLedger(
    ledger([
      {
        file: "sante.json",
        record_id: "sante:16-00001",
        status: "corrected",
        publish_action: "patch",
        expect: { name: "Old name" },
        patch: { name: "Reviewed name" },
        evidence: [
          { url: "https://example.com/evidence", checked_at: "2026-02-30" },
        ],
      },
    ]),
  );
  assert.match(invalidEvidence.errors.join("\n"), /checked_at must be an ISO date/);
});

test("reviewed patches and exclusions apply without mutating source rows", () => {
  const result = applyReviewedOverrides(
    rows,
    ledger([
      {
        file: "sante.json",
        record_id: "sante:16-00001",
        status: "corrected",
        publish_action: "patch",
        reviewer: "first reviewer",
        reviewed_at: "2026-08-27T12:00:00Z",
        expect: { name: "Old name", lat: 36.7657, lng: 3.0587 },
        patch: { name: "Reviewed name", lat: 36.766, lng: 3.059 },
        evidence,
      },
      {
        file: "sante.json",
        record_id: "sante:16-00002",
        status: "duplicate",
        publish_action: "exclude",
        expect: { ...rows[1] },
        evidence,
      },
    ]),
    { file: "sante.json" },
  );

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].name, "Reviewed name");
  assert.equal(result.records[0].lat, 36.766);
  assert.equal(result.records[0].review_status, "corrected");
  assert.equal(result.records[0].reviewed_at, "2026-08-27T12:00:00Z");
  assert.equal(result.records[0].reviewed_by, "first reviewer");
  assert.deepEqual(result.records[0].review_evidence, [
    "https://example.com/official-record",
  ]);
  assert.equal(rows[0].name, "Old name");
  assert.deepEqual(result.stats, {
    reviewed: 2,
    patched: 1,
    excluded: 1,
    kept: 0,
  });
});

test("stale decisions fail instead of landing on changed upstream data", () => {
  assert.throws(
    () =>
      applyReviewedOverrides(
        [{ ...rows[0], name: "Upstream changed" }],
        ledger([
          {
            file: "sante.json",
            record_id: "sante:16-00001",
            status: "corrected",
            publish_action: "patch",
            expect: { name: "Old name" },
            patch: { name: "Reviewed name" },
            evidence,
          },
        ]),
        { file: "sante.json" },
      ),
    /stale decision/,
  );
});

test("every patched field must carry its previous value", () => {
  const validation = validateReviewLedger(
    ledger([
      {
        file: "sante.json",
        record_id: "sante:16-00001",
        status: "corrected",
        publish_action: "patch",
        expect: { name: "Old name" },
        patch: { lat: 36.766 },
        evidence,
      },
    ]),
  );
  assert.match(validation.errors.join("\n"), /expect.lat is required/);
});

test("an absent-value expectation safely adds a shared optional field", () => {
  const baseline = { ...rows[0] };
  delete baseline.name_ar;
  const decision = {
    file: "sante.json",
    record_id: baseline.id,
    status: "corrected",
    publish_action: "patch",
    expect: { name: baseline.name },
    expect_absent: ["name_ar"],
    patch: { name_ar: "الاسم الصحيح" },
    evidence,
  };
  const result = applyReviewedOverrides([baseline], ledger([decision]), {
    file: "sante.json",
  });
  assert.equal(result.records[0].name_ar, "الاسم الصحيح");
  assert.throws(
    () =>
      applyReviewedOverrides(
        [{ ...baseline, name_ar: "اسم من المصدر" }],
        ledger([decision]),
        { file: "sante.json" },
      ),
    /expected absent field.*now present/,
  );
});

test("exclusions must expect the complete baseline record", () => {
  assert.throws(
    () =>
      applyReviewedOverrides(
        rows,
        ledger([
          {
            file: "sante.json",
            record_id: "sante:16-00002",
            status: "duplicate",
            publish_action: "exclude",
            expect: { id: rows[1].id, name: rows[1].name },
            evidence,
          },
        ]),
        { file: "sante.json" },
      ),
    /exclusion expect must cover the full record/,
  );
});

test("exclusion snapshots compare nested values completely", () => {
  const nestedRow = {
    ...rows[1],
    refs: { osm: "node/1", wikidata: "Q1" },
  };
  assert.throws(
    () =>
      applyReviewedOverrides(
        [nestedRow],
        ledger([
          {
            file: "sante.json",
            record_id: nestedRow.id,
            status: "duplicate",
            publish_action: "exclude",
            expect: { ...nestedRow, refs: { osm: "node/1" } },
            evidence,
          },
        ]),
        { file: "sante.json" },
      ),
    /stale decision/,
  );
});

test("unknown ids, forbidden identity changes, and unsupported new fields fail", () => {
  assert.throws(
    () =>
      applyReviewedOverrides(
        rows,
        ledger([
          {
            file: "sante.json",
            record_id: "missing",
            status: "verified",
            publish_action: "keep",
            expect: { name: "Missing" },
          },
        ]),
        { file: "sante.json" },
      ),
    /unknown record missing/,
  );

  const identityChange = validateReviewLedger(
    ledger([
      {
        file: "sante.json",
        record_id: "sante:16-00001",
        status: "corrected",
        publish_action: "patch",
        expect: { name: "Old name" },
        patch: { id: "new-id" },
        evidence,
      },
    ]),
  );
  assert.match(identityChange.errors.join("\n"), /id cannot be changed/);

  assert.throws(
    () =>
      applyReviewedOverrides(
        rows,
        ledger([
          {
            file: "sante.json",
            record_id: "sante:16-00001",
            status: "corrected",
            publish_action: "patch",
            expect: { invented_domain_field: null },
            patch: { invented_domain_field: "value" },
            evidence,
          },
        ]),
        { file: "sante.json" },
      ),
    /does not exist on the baseline record or the shared optional-field vocabulary/,
  );
});
