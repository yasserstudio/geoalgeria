// The one question the Source rights registry answers: is this Source cleared
// for this target. Every test here drives that function, because a generator
// that asks it wrongly ships unlicensed data to a phone.
//
// The cases that matter are the "no" ones. A reader that fails open is worse
// than no registry at all, because it looks like a gate.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACCESS_CLASSES,
  NEVER_CLEARED_RIGHTS_CLASSES,
  PUBLICATION_TARGETS,
  RIGHTS_BASES,
  RIGHTS_CLASSES,
  isSourceClearedFor,
  rightsRecordFor,
  rightsRegistry,
  sourcesClearedFor,
} from "../index.js";

/** A record shaped like the shipped ones, cleared everywhere unless overridden. */
const record = (over = {}) => ({
  key: "fixture",
  name: "A fixture Source",
  publisher: "Nobody",
  metadata_keys: ["fixture"],
  access_class: "public-access",
  rights_class: "open-licensed",
  rights_basis: "licence",
  license_expression: "CC0-1.0",
  license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
  allowed_targets: [...PUBLICATION_TARGETS],
  attribution: { text: "Nobody", url: null },
  notice: "A fixture.",
  evidence: { source_url: "https://example.org", repo_path: null, retrieved_at: "2026-09-02", note: null },
  review_after: "2027-09-02",
  notes: null,
  refusal: null,
  ...over,
});

/** A registry of exactly the records given. */
const registryOf = (...records) => ({ version: 1, updated: "2026-10-11", sources: records });

test("the vocabularies are the governance document's", () => {
  assert.deepEqual(ACCESS_CLASSES, [
    "public-access",
    "account-access",
    "permissioned-access",
    "private-research",
  ]);
  assert.deepEqual(RIGHTS_CLASSES, [
    "open-licensed",
    "public-domain-or-cc0",
    "permissioned",
    "rights-unconfirmed",
    "restricted-research",
    "prohibited",
  ]);
  assert.deepEqual(RIGHTS_BASES, [
    "licence",
    "public-domain-statement",
    "written-grant",
    "provider-terms",
    "none-recorded",
  ]);
  assert.deepEqual(PUBLICATION_TARGETS, ["web", "npm", "cdn", "mobile-pack", "live"]);
  assert.deepEqual(NEVER_CLEARED_RIGHTS_CLASSES, ["restricted-research", "prohibited"]);
});

test("a Source with no registry record is cleared for nothing", () => {
  assert.equal(isSourceClearedFor("a-source-nobody-classified", "npm"), false);
  assert.equal(isSourceClearedFor("a-source-nobody-classified", "mobile-pack"), false);
  assert.equal(rightsRecordFor("a-source-nobody-classified"), null);
});

test("a record clears exactly the targets it lists", () => {
  const reg = registryOf(record({ allowed_targets: ["web", "npm"] }));
  assert.equal(isSourceClearedFor("fixture", "web", reg), true);
  assert.equal(isSourceClearedFor("fixture", "npm", reg), true);
  assert.equal(isSourceClearedFor("fixture", "cdn", reg), false);
  assert.equal(isSourceClearedFor("fixture", "mobile-pack", reg), false);
  assert.equal(isSourceClearedFor("fixture", "live", reg), false);
});

test("a target outside the vocabulary is never cleared, however the record reads", () => {
  const reg = registryOf(record({ allowed_targets: ["web", "print", ""] }));
  assert.equal(isSourceClearedFor("fixture", "print", reg), false);
  assert.equal(isSourceClearedFor("fixture", "", reg), false);
  assert.equal(isSourceClearedFor("fixture", undefined, reg), false);
});

test("a restricted-research Source is cleared for nothing, cdn and mobile-pack included", () => {
  // The targets are deliberately wrong here: the class alone has to answer no,
  // so a hand-edited target list cannot publish the SOGRAL timetable captures.
  const reg = registryOf(
    record({ rights_class: "restricted-research", allowed_targets: [...PUBLICATION_TARGETS] }),
  );
  for (const target of PUBLICATION_TARGETS) assert.equal(isSourceClearedFor("fixture", target, reg), false);
});

test("a prohibited Source is cleared for nothing", () => {
  const reg = registryOf(record({ rights_class: "prohibited", allowed_targets: [...PUBLICATION_TARGETS] }));
  for (const target of PUBLICATION_TARGETS) assert.equal(isSourceClearedFor("fixture", target, reg), false);
});

test("a rights class outside the vocabulary is cleared for nothing", () => {
  const reg = registryOf(record({ rights_class: "public-domain", allowed_targets: ["npm"] }));
  assert.equal(isSourceClearedFor("fixture", "npm", reg), false);
});

test("a recorded refusal removes every target", () => {
  const reg = registryOf(
    record({
      allowed_targets: [...PUBLICATION_TARGETS],
      refusal: { recorded_on: "2026-11-01", summary: "The Source owner asked in writing that the data not be redistributed." },
    }),
  );
  for (const target of PUBLICATION_TARGETS) assert.equal(isSourceClearedFor("fixture", target, reg), false);
});

test("one Source answers for every key it was captured under", () => {
  const reg = registryOf(
    record({ key: "osm", metadata_keys: ["osm", "osm-communes"], allowed_targets: ["cdn"] }),
  );
  assert.equal(isSourceClearedFor("osm", "cdn", reg), true);
  assert.equal(isSourceClearedFor("osm-communes", "cdn", reg), true);
  assert.equal(rightsRecordFor("osm-communes", reg).key, "osm");
});

test("sourcesClearedFor lists record keys only, sorted", () => {
  const reg = registryOf(
    record({ key: "b", metadata_keys: ["b", "b-2026"], allowed_targets: ["cdn"] }),
    record({ key: "a", metadata_keys: ["a"], allowed_targets: ["cdn", "npm"] }),
    record({ key: "c", metadata_keys: ["c"], allowed_targets: ["npm"] }),
  );
  assert.deepEqual(sourcesClearedFor("cdn", reg), ["a", "b"]);
  assert.deepEqual(sourcesClearedFor("npm", reg), ["a", "c"]);
  assert.deepEqual(sourcesClearedFor("live", reg), []);
});

test("the shipped registry clears the administrative core for cdn and mobile-pack", () => {
  // ADR 0010: the national core's Wilaya, Daira and Commune rows come from the
  // Sources Web publishes today, so a Content release can carry them.
  for (const key of ["ons", "jora", "osm", "wikidata"]) {
    assert.equal(isSourceClearedFor(key, "cdn"), true, `${key} should be cleared for cdn`);
    assert.equal(isSourceClearedFor(key, "mobile-pack"), true, `${key} should be cleared for mobile-pack`);
  }
});

test("the shipped registry keeps the SOGRAL timetable and third-party tiles out of every target", () => {
  for (const key of ["sogral-timetable", "carto", "esri"]) {
    for (const target of PUBLICATION_TARGETS)
      assert.equal(isSourceClearedFor(key, target), false, `${key} must not be cleared for ${target}`);
  }
});

test("in the shipped registry every key resolves to one record or none", () => {
  const reg = rightsRegistry();
  assert.equal(reg.version, 1);
  const owner = new Map();
  for (const r of reg.sources) {
    for (const key of [r.key, ...r.metadata_keys]) {
      const first = owner.get(key);
      assert.ok(
        first === undefined || first === r.key,
        `key ${key} is claimed by both ${first} and ${r.key}`,
      );
      owner.set(key, r.key);
    }
  }
  assert.ok(owner.size >= reg.sources.length, "every record contributes at least its own key");
});
