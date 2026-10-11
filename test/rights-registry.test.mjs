// The repository gate over the Source rights registry: a package cannot name a
// Source the registry has never classified, and the registry cannot classify it
// with a word outside the vocabulary.
//
// Without the gate the registry is a document, not a rule: a new fetcher could
// add a Source key, schema validation would stay green, and the next release
// would publish it in three formats with no rights decision anywhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { packageSourceRefs, registryErrors, unregisteredSourceErrors } from "../scripts/lib/rights-registry.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("every Source key in published metadata resolves to a rights record", () => {
  const refs = packageSourceRefs(join(ROOT, "packages"));
  assert.ok(refs.length > 0, "the scan found no Source references at all");
  assert.deepEqual(unregisteredSourceErrors(refs), []);
});

test("a Source with no record is reported, with the file that names it", () => {
  const errors = unregisteredSourceErrors([
    { where: "newpkg/data/metadata.json", key: "a-brand-new-ministry" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /newpkg\/data\/metadata\.json/);
  assert.match(errors[0], /a-brand-new-ministry/);
});

/** A well-formed record, so each test below changes exactly one thing. */
const record = (over = {}) => ({
  key: "fixture",
  name: "A fixture Source",
  publisher: "Nobody",
  metadata_keys: ["fixture"],
  access_class: "public-access",
  rights_class: "rights-unconfirmed",
  rights_basis: "none-recorded",
  license_expression: null,
  license_url: null,
  allowed_targets: ["web", "npm", "cdn", "mobile-pack"],
  attribution: { text: "Nobody", url: null },
  notice: "A fixture.",
  evidence: { source_url: "https://example.org", repo_path: null, retrieved_at: "2026-09-02", note: null },
  review_after: "2027-03-02",
  notes: null,
  refusal: null,
  ...over,
});

const registryOf = (...records) => ({
  version: 1,
  updated: "2026-10-11",
  sources: records.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
});

const only = (errors, pattern) => {
  assert.equal(errors.length, 1, `expected one error, got ${errors.length}: ${errors.join(" | ")}`);
  assert.match(errors[0], pattern);
};

test("the shipped registry is well formed", () => {
  assert.deepEqual(registryErrors(), []);
});

test("a well-formed fixture registry passes", () => {
  assert.deepEqual(registryErrors(registryOf(record())), []);
});

test("a rights class outside the vocabulary fails", () => {
  // The tracker's shorthand for the CC0 class. One class, one name: the
  // governance document's token is `public-domain-or-cc0`, and a reader that
  // does not know this one clears nothing, which would quietly empty a release.
  only(registryErrors(registryOf(record({ rights_class: "public-domain" }))), /rights class `public-domain` is outside/);
});

test("an access class outside the vocabulary fails", () => {
  only(registryErrors(registryOf(record({ access_class: "open" }))), /access class `open` is outside/);
});

test("a target outside the vocabulary fails", () => {
  only(
    registryErrors(registryOf(record({ allowed_targets: ["web", "npm", "offline"] }))),
    /target `offline` is outside/,
  );
});

test("a restricted-research Source may list no target", () => {
  only(
    registryErrors(
      registryOf(record({ rights_class: "restricted-research", allowed_targets: ["cdn", "web"] })),
    ),
    /restricted-research Source lists cdn, web; it must list none/,
  );
  assert.deepEqual(
    registryErrors(registryOf(record({ rights_class: "restricted-research", allowed_targets: [] }))),
    [],
  );
});

test("a prohibited Source may list no target", () => {
  only(
    registryErrors(registryOf(record({ rights_class: "prohibited", allowed_targets: ["web"] }))),
    /prohibited Source lists web/,
  );
});

test("a recorded refusal must clear every target in the same change", () => {
  const refusal = { recorded_on: "2026-11-01", summary: "The Operator asked in writing to be removed." };
  only(
    registryErrors(registryOf(record({ refusal }))),
    /a refusal is recorded and web, npm, cdn, mobile-pack are still listed/,
  );
  assert.deepEqual(registryErrors(registryOf(record({ refusal, allowed_targets: [] }))), []);
});

test("the offline targets need the web target they are cleared through", () => {
  const errors = registryErrors(registryOf(record({ allowed_targets: ["npm", "cdn", "mobile-pack"] })));
  assert.equal(errors.length, 2);
  assert.match(errors[0], /`cdn` without `web`/);
  assert.match(errors[1], /`mobile-pack` without `web`/);
});

test("two records cannot claim one key", () => {
  only(
    registryErrors(
      registryOf(record(), record({ key: "other", metadata_keys: ["other", "fixture"] })),
    ),
    /key `fixture` is already claimed by `fixture`|key `fixture` is already claimed by `other`/,
  );
});

test("records must be sorted by key", () => {
  const unsorted = { version: 1, updated: "2026-10-11", sources: [record({ key: "z" }), record({ key: "a" })] };
  assert.match(registryErrors(unsorted).join(" | "), /records must be sorted by `key`/);
});

test("a classification needs checkable evidence and a retrieval date", () => {
  only(
    registryErrors(registryOf(record({ evidence: { source_url: null, repo_path: null, retrieved_at: "2026-09-02", note: null } }))),
    /needs a public `source_url` or a committed `repo_path`/,
  );
  only(
    registryErrors(registryOf(record({ evidence: { source_url: "https://example.org", repo_path: null, retrieved_at: null, note: null } }))),
    /`evidence.retrieved_at` must be an ISO date/,
  );
  only(
    registryErrors(registryOf(record({ evidence: { source_url: null, repo_path: "sources/nowhere.json", retrieved_at: "2026-09-02", note: null } }))),
    /is not in the repository/,
  );
});

test("a record needs a review date and an attribution line", () => {
  only(registryErrors(registryOf(record({ review_after: null }))), /`review_after` must be an ISO date/);
  only(
    registryErrors(registryOf(record({ attribution: { text: "", url: null } }))),
    /`attribution.text` must be the credit line/,
  );
});
