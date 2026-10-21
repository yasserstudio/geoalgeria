// The repository gate over the Source rights registry: a package cannot name a
// Source the registry has never classified, and the registry cannot classify it
// with a word outside the vocabulary.
//
// Without the gate the registry is a document, not a rule: a new fetcher could
// add a Source key, schema validation would stay green, and the next release
// would publish it in three formats with no rights decision anywhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  packageSourceRefs,
  registryErrors,
  registryWarnings,
  sourceRefsInDocument,
  unregisteredSourceErrors,
} from "../scripts/lib/rights-registry.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("every Source key in published data resolves to a rights record", () => {
  const refs = packageSourceRefs(join(ROOT, "packages"));
  assert.ok(refs.length > 0, "the scan found no Source references at all");
  assert.deepEqual(unregisteredSourceErrors(refs), []);
});

test("the scan reaches Sources no metadata-named file declares", () => {
  // The first version of this scan only read `sources` at the top level of
  // metadata.json and *.metadata.json, and these seven keys are what it missed:
  // they sit under `metadata.sources` in two ordinary data files.
  const keys = new Set(packageSourceRefs(join(ROOT, "packages")).map((r) => r.key));
  for (const key of [
    "jora-25-2026",
    "jora-25-2026-ar",
    "jora-40-2026",
    "jora-52-2026",
    "arpce-numbering",
    "arpce-numbering-plan-2007",
    "algerie-telecom-numerotations",
  ])
    assert.ok(keys.has(key), `the scan should have found ${key}`);
});

test("a document declares its Sources at any depth, in `sources` and in `source`", () => {
  assert.deepEqual(
    sourceRefsInDocument(
      {
        metadata: { sources: [{ key: "jora-25-2026" }, { key: "arpce-numbering" }] },
        rows: [
          { id: 1, source: "msp" },
          { id: 2, source: "wikidata+osm" },
          { id: 3, source: "msp" },
        ],
      },
      "pkg/data/x.json",
    ),
    [
      { where: "pkg/data/x.json", key: "jora-25-2026" },
      { where: "pkg/data/x.json", key: "arpce-numbering" },
      { where: "pkg/data/x.json", key: "msp" },
      { where: "pkg/data/x.json", key: "wikidata" },
      { where: "pkg/data/x.json", key: "osm" },
    ],
  );
});

test("a document reads a GeoJSON feature's properties.source", () => {
  assert.deepEqual(
    sourceRefsInDocument(
      { type: "FeatureCollection", features: [{ properties: { source: "dgpc" }, geometry: null }] },
      "pkg/data/geojson/x.geojson",
    ),
    [{ where: "pkg/data/geojson/x.geojson", key: "dgpc" }],
  );
});

test("a citation URL in `source` is not a Source key", () => {
  // @geoalgeria/aviation cites each flight leg to the page that publishes the
  // service, in the same `source` field other packages put a Source key in.
  // Those pages are cited, never redistributed, so they are not Sources here.
  assert.deepEqual(
    sourceRefsInDocument(
      [{ id: "alg-cdg", source: "https://www.parisaeroport.fr/" }, { id: "alg", source: "anac" }],
      "packages/aviation/data/routes.json",
    ),
    [{ where: "packages/aviation/data/routes.json", key: "anac" }],
  );
});

test("prose in a `source` or `sources` position is a citation, not a key", () => {
  // packages/dataset/data/osm-links.metadata.json describes itself in `source`,
  // and packages/dataset/data/wilayas.json and name-history.json cite official
  // texts as strings in `sources`. A key is lowercase with no spaces; these are
  // sentences, so they name no Source to look up.
  assert.deepEqual(
    sourceRefsInDocument(
      { title: "links", source: "OpenStreetMap administrative relations, via Overpass" },
      "pkg/data/x.metadata.json",
    ),
    [],
  );
  assert.deepEqual(
    sourceRefsInDocument(
      { metadata: { sources: ["Office National des Statistiques: Code Geographique National 2021"] } },
      "pkg/data/wilayas.json",
    ),
    [],
  );
});

test("a key-shaped string that is not a registered key is an error, not a citation", () => {
  // The shape rule used to require lowercase, so every one of these slipped
  // through as "prose" and the Source behind it was never classified.
  for (const document of [{ id: 1, source: "OSM" }, { id: 1, sources: ["Wikidata"] }])
    assert.equal(
      unregisteredSourceErrors(sourceRefsInDocument(document, "pkg/data/x.json")).length,
      1,
      JSON.stringify(document),
    );
  assert.match(
    unregisteredSourceErrors(sourceRefsInDocument({ id: 1, source: "OSM" }, "pkg/data/x.json"))[0],
    /source `OSM` resolves to no single record/,
  );
});

test("every part of a joined `source` is checked, not only the first", () => {
  // `msp+OSM` used to resolve msp and drop OSM on the floor.
  const refs = sourceRefsInDocument({ id: 1, source: "msp+OSM" }, "pkg/data/x.json");
  assert.deepEqual(refs.map((r) => r.key), ["msp", "OSM"]);
  assert.equal(unregisteredSourceErrors(refs).length, 1);
});

test("a string with whitespace, a slash, a colon or only digits is a citation", () => {
  for (const value of [
    "Air Algerie",
    "OpenStreetMap administrative relations, via Overpass",
    "JORA n 25 (2026), law 26-06 art. 7, p. 4",
    "https://www.parisaeroport.fr/",
    "ourairports/airports.csv",
    "ONS:code_geo_2021",
    "2026",
  ]) {
    assert.deepEqual(sourceRefsInDocument({ id: 1, source: value }, "pkg/data/x.json"), [], value);
    assert.deepEqual(sourceRefsInDocument({ sources: [value] }, "pkg/data/x.json"), [], value);
  }
});

test("the scan reads a package's root dataset-metadata.json", () => {
  // It is in files[], so npm publishes it: a Source named only there would ship
  // unclassified.
  const root = mkdtempSync(join(tmpdir(), "geoalgeria-rights-"));
  const pkg = join(root, "somepkg");
  mkdirSync(join(pkg, "data"), { recursive: true });
  writeFileSync(join(pkg, "package.json"), JSON.stringify({ name: "somepkg" }));
  writeFileSync(
    join(pkg, "dataset-metadata.json"),
    JSON.stringify({ "@type": "Dataset", sources: [{ key: "a-root-only-source" }] }),
  );
  writeFileSync(join(pkg, "data", "metadata.json"), JSON.stringify({ sources: [{ key: "msp" }] }));
  assert.deepEqual(packageSourceRefs(root), [
    { where: "somepkg/dataset-metadata.json", key: "a-root-only-source" },
    { where: "somepkg/data/metadata.json", key: "msp" },
  ]);
});

test("a `sources` array of bare keys is read as keys", () => {
  // @geoalgeria/livraison records carry every carrier that lists the stop desk.
  assert.deepEqual(
    sourceRefsInDocument([{ id: 1, sources: ["guepex", "yalidine"] }], "livraison/data/stopdesks.json"),
    [
      { where: "livraison/data/stopdesks.json", key: "guepex" },
      { where: "livraison/data/stopdesks.json", key: "yalidine" },
    ],
  );
});

test("a provenance entry with no key is reported rather than skipped", () => {
  assert.deepEqual(
    unregisteredSourceErrors(sourceRefsInDocument({ sources: [{ name: "someone" }] }, "pkg/data/x.json")),
    ["pkg/data/x.json: a source has no `key`, so its rights cannot be looked up"],
  );
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
      registryOf(record({ rights_class: "restricted-research", allowed_targets: ["web", "npm"] })),
    ),
    /restricted-research Source lists web, npm; it must list none/,
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

test("the offline targets need both targets they are cleared through", () => {
  // cdn and mobile-pack are cleared through what Web *and* npm publish today,
  // so either one missing removes the basis for both.
  for (const [targets, missing] of [
    [["npm", "cdn", "mobile-pack"], "web"],
    [["web", "cdn", "mobile-pack"], "npm"],
  ]) {
    const errors = registryErrors(registryOf(record({ allowed_targets: targets })));
    assert.equal(errors.length, 2, errors.join(" | "));
    assert.match(errors[0], new RegExp("`cdn` needs `web` and `npm`"));
    assert.match(errors[1], new RegExp("`mobile-pack` needs `web` and `npm`"));
    assert.match(errors[0], new RegExp(missing));
  }
  assert.deepEqual(registryErrors(registryOf(record({ allowed_targets: ["web", "npm", "cdn"] }))), []);
});

test("a review date in the past warns and does not fail", () => {
  // A classification nobody has revisited is a real problem and a bad reason to
  // redden CI on a day nobody changed anything.
  const stale = registryOf(record({ review_after: "2020-01-01" }));
  assert.deepEqual(registryErrors(stale), []);
  const warnings = registryWarnings(stale, new Date("2026-10-11T00:00:00Z"));
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /registry\/fixture: review_after 2020-01-01 has passed/);
  assert.deepEqual(registryWarnings(registryOf(record()), new Date("2026-10-11T00:00:00Z")), []);
});

test("the shipped registry has no stale review date today", () => {
  assert.deepEqual(registryWarnings(), []);
});

test("two records cannot claim one key", () => {
  only(
    registryErrors(
      registryOf(record(), record({ key: "other", metadata_keys: ["other", "fixture"] })),
    ),
    /registry\/other: key `fixture` is already claimed by `fixture`/,
  );
});

test("records must be sorted by key", () => {
  const unsorted = {
    version: 1,
    updated: "2026-10-11",
    sources: [record({ key: "z", metadata_keys: ["z"] }), record({ key: "a", metadata_keys: ["a"] })],
  };
  only(registryErrors(unsorted), /records must be sorted by `key`/);
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

test("a metadata key outside the key shape fails", () => {
  // The scan tells a key from a citation by that shape, so a registered key
  // outside it would never be looked up.
  only(
    registryErrors(registryOf(record({ metadata_keys: ["fixture", "Bad Key"] }))),
    /metadata key `Bad Key` is not key-shaped/,
  );
  only(registryErrors(registryOf(record({ key: "Fixture", metadata_keys: [] }))), /is not key-shaped/);
});

test("the public registry cites no document a reader cannot open", () => {
  // The file is public and the decision records are not, so a pointer at one
  // names something nobody outside the project can open.
  const text = readFileSync(join(ROOT, "packages/schema/rights/registry.json"), "utf-8");
  // Word-bounded: MADR is a ministry, not a pointer.
  for (const dangling of [/\bADR\b/, /docs\/adr/, /docs\/research/, /governance review/i])
    assert.ok(!dangling.test(text), `the registry should not mention ${dangling}`);
});
