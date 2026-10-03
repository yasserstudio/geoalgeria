// The containment guard's own reference is now proved, not trusted.
//
// test/commune-centre-in-commune.test.mjs holds 1,541 commune centres to polygons
// that live in one committed 3.7 MB file reduced from a 52 MB gitignored Overpass
// pull. `pnpm validate` re-pulls nothing, so before this file a hand edit to a
// single coordinate of a single ring could move a commune's verdict and no test
// anywhere would notice: the guard would keep passing, against a reference it had
// no way to recognise. What follows is that recognition, and the red proof that it
// bites is `boundaryCacheHash` disagreeing on a moved coordinate, asserted below
// over the real committed cache.
//
// Why the digest is a sidecar and why it is canonical rather than a byte hash:
// scripts/lib/boundary-cache-provenance.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  CACHE_FILE,
  PROVENANCE_ALGORITHM,
  PROVENANCE_FILE,
  QUERY_TEMPLATE,
  boundaryCacheHash,
  canonicalCacheForm,
  osmBaseDate,
  relationIdentity,
  serialiseCache,
} from "../scripts/lib/boundary-cache-provenance.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH = join(ROOT, "research", "_commune-centres");
const CACHE_PATH = join(RESEARCH, CACHE_FILE);
const cacheBytes = readFileSync(CACHE_PATH, "utf-8");
const cache = JSON.parse(cacheBytes);
const provenance = JSON.parse(readFileSync(join(RESEARCH, PROVENANCE_FILE), "utf-8"));

test(`${PROVENANCE_FILE} records the digest of the cache it names`, () => {
  assert.equal(provenance.document, CACHE_FILE, "the sidecar must name the document it covers");
  assert.equal(provenance.algorithm, PROVENANCE_ALGORITHM);
  assert.match(provenance.sha256, /^[0-9a-f]{64}$/);
  assert.ok(provenance.canonical_form, "the sidecar must state the serialisation the digest is taken over");
  assert.equal(
    boundaryCacheHash(cache),
    provenance.sha256,
    `${CACHE_FILE} does not match the digest recorded in ${PROVENANCE_FILE}. Either the cache was edited ` +
      "by hand, in which case revert it, or it was rebuilt without rewriting its provenance, in which case " +
      "run `node scripts/build-commune-boundary-cache.mjs --write`.",
  );
});

test("the cache records the pull it was reduced from", () => {
  assert.equal(cache.endpoint, "https://overpass-api.de/api/interpreter");
  assert.match(cache.timestamp_osm_base, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(cache.query, QUERY_TEMPLATE, "the cache must record the Overpass query it was pulled with");
  assert.match(cache.relation_ids_sha256, /^[0-9a-f]{64}$/);

  // The relation identity is a claim about the rows beside it, so it is checked
  // against them rather than taken on trust: a cache whose relation ids were
  // swapped for another wilaya's would otherwise still look self-consistent.
  assert.deepEqual(relationIdentity(cache), {
    relation_count: cache.relation_count,
    relation_ids_sha256: cache.relation_ids_sha256,
  });

  // `generated` is the OSM base's date, not the run's, which is what makes a
  // rebuild from an unchanged OSM base a no-diff rebuild.
  assert.equal(cache.generated, osmBaseDate(cache.timestamp_osm_base));
});

test("the committed cache is byte-identical to what the builder writes from it", () => {
  // Determinism, held as a test rather than as a claim in a comment: the builder's
  // serialisation is a pure function of the document, so re-emitting the committed
  // cache cannot produce a diff. Without this, "an unchanged OSM base yields no
  // diff" would rest on the writer never drifting.
  assert.equal(serialiseCache(cache), cacheBytes);
});

test("the digest states the content, not the formatting", () => {
  // Key order and indentation must not move it, or the gate becomes a formatting
  // gate and a real failure gets re-rolled as "just a reformat".
  const { communes, ...envelope } = cache;
  const reordered = {
    communes: [...communes].reverse(),
    ...Object.fromEntries(Object.entries(envelope).reverse()),
  };
  assert.equal(boundaryCacheHash(reordered), boundaryCacheHash(cache));
  assert.notEqual(canonicalCacheForm(cache), cacheBytes, "the canonical form is not the file's own bytes");
});

test("a moved coordinate breaks the digest", () => {
  // The red proof, kept. One ordinate of one ring of one commune, moved by the
  // rounding step's own precision, which is the smallest edit that can change a
  // containment verdict.
  const tampered = structuredClone(cache);
  const row = tampered.communes.find((c) => c.usable);
  row.outer[0][0][0] = Number((row.outer[0][0][0] + 0.00001).toFixed(cache.precision));
  assert.notEqual(boundaryCacheHash(tampered), boundaryCacheHash(cache));

  // And so does an edited envelope: a hand-lowered tolerance or a faked OSM base
  // is the same defect as a moved ring, so the digest covers them too.
  for (const patch of [{ tolerance_deg: 0.005 }, { timestamp_osm_base: "2026-01-01T00:00:00Z" }])
    assert.notEqual(boundaryCacheHash({ ...cache, ...patch }), boundaryCacheHash(cache));
});
