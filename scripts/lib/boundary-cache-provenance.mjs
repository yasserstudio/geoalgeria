// The proof that research/_commune-centres/commune-boundaries.json is still the
// file scripts/build-commune-boundary-cache.mjs reduced from OpenStreetMap, and
// not something a hand edit walked.
//
// WHY THIS EXISTS. test/commune-centre-in-commune.test.mjs holds all 1,541 commune
// centres to commune polygons the repository does not publish: they are reduced
// once from a 52 MB gitignored `out geom` Overpass pull into a 3.7 MB committed
// cache. `pnpm validate` never re-pulls and never rebuilds, so until this file the
// guard's own reference was unproved: moving one coordinate of one ring moves the
// verdict for that commune and no test anywhere would say so.
//
// WHY A SIDECAR AND NOT A FIELD IN THE CACHE. A digest cannot sit inside the
// document it covers without first defining itself away, so the hash would have to
// be taken over "the file minus the hash field", and every reader would need that
// rule to agree with the writer's. Worse, it would put the payload and its proof in
// one file: one edit, one place, and the diff a reviewer reads has nothing to
// disagree with. The digest therefore lives in
// research/_commune-centres/commune-boundaries.provenance.json, which carries only
// what the cache cannot say about itself. Weakening the guard now takes two edits
// to two committed files in one diff, and the test compares one against the other.
//
// WHY CANONICAL AND NOT A BYTE HASH. The cache is written with a hand-rolled
// envelope and one commune per line, so a byte hash would gate the formatting
// rather than the data: a re-indent, a reordered envelope key or a changed line
// ending would fail a file whose geometry nobody touched, and a failure that can
// mean "reformatted" is a failure people learn to re-roll. The digest is taken over
// a canonical serialisation instead, so a failure always means the content changed.
// The whole document is covered, envelope provenance included, because
// `timestamp_osm_base` or `tolerance_deg` edited by hand is the same defect as a
// moved coordinate.

import { createHash } from "node:crypto";

export const PROVENANCE_ALGORITHM = "sha256";
export const CACHE_FILE = "commune-boundaries.json";
export const PROVENANCE_FILE = "commune-boundaries.provenance.json";

export const CANONICAL_FORM =
  "sha256 over JSON.stringify of the whole document with every object's keys sorted ascending " +
  "and `communes` sorted by code_commune ascending, so the digest states the content and not the " +
  "file's indentation, key order or line endings";

/** The `out geom` pull the cache is reduced from, as a reproducible template. */
export const QUERY_TEMPLATE =
  "[out:json][timeout:900];\nrel(id:<the osm_relation_id values in this file, ascending, comma separated>);\nout geom;\n";

/** The cache's own note, set on every write so a re-emit cannot keep a stale one. */
export const CACHE_NOTE =
  "The commune outlines test/commune-centre-in-commune.test.mjs reads. Reduced from the 52 MB `out geom` " +
  "pull, which stays local: outer and inner rings stitched from the relation's way members, simplified " +
  "with Douglas-Peucker at tolerance_deg and rounded to 5 decimals. Undated in effect: refresh it in " +
  "place with `node scripts/build-commune-boundary-cache.mjs --fetch-geometry --write` and review the " +
  "diff. Every stored centre's verdict was proved identical against the unsimplified rings before this " +
  "file was written; `margin_m` is each centre's distance to the reduced boundary, negative-free because " +
  "it is an unsigned distance, so a small value marks a row where the reduction is close to doing the " +
  "deciding. `generated` is the date of `timestamp_osm_base`, not of the run, so rebuilding from an " +
  "unchanged OSM base writes the same bytes. The content digest that proves this file was not hand " +
  `edited is ${PROVENANCE_FILE}.`;

// The envelope's declared key order, so a re-emit of a cache written by an older
// builder lands in the same shape as a fresh rebuild. Any key not named here is
// kept, appended, rather than silently dropped.
const ENVELOPE_ORDER = [
  "generated",
  "source",
  "endpoint",
  "timestamp_osm_base",
  "query",
  "relation_count",
  "relation_ids_sha256",
  "licence",
  "note",
  "tolerance_deg",
  "precision",
  "count",
];

const sha256 = (text) => createHash("sha256").update(text, "utf-8").digest("hex");

/** Recursively key-sorted JSON. Arrays keep their order; the caller sorts rows. */
function canonicalise(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalise(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/**
 * The canonical serialisation the digest is taken over: the whole cache document,
 * key-sorted, with the commune rows in code order so a reordered file hashes the
 * same as an ordered one and only the content decides.
 */
export function canonicalCacheForm(cache) {
  const communes = [...(cache.communes ?? [])].sort((a, b) => a.code_commune - b.code_commune);
  return canonicalise({ ...cache, communes });
}

/** The digest the provenance sidecar records. */
export function boundaryCacheHash(cache) {
  return sha256(canonicalCacheForm(cache));
}

/** The ascending relation ids the pull asked Overpass for, and their digest. */
export function relationIdentity(cache) {
  const ids = [
    ...new Set(
      (cache.communes ?? [])
        .map((c) => c.osm_relation_id)
        .filter((id) => Number.isInteger(id)),
    ),
  ].sort((a, b) => a - b);
  return { relation_count: ids.length, relation_ids_sha256: sha256(ids.join(",")) };
}

/**
 * The pull's own date, taken from the OSM base the pull carries rather than from
 * the clock or a constant in the builder, so rebuilding from an unchanged OSM base
 * yields no diff.
 */
export function osmBaseDate(timestampOsmBase) {
  if (typeof timestampOsmBase !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(timestampOsmBase);
  return match ? match[1] : null;
}

/**
 * Normalise the envelope so both the rebuild and a plain re-emit of the committed
 * cache write the same bytes: `generated` follows the OSM base, and the pull's
 * query and relation identity are recorded beside the endpoint that served it.
 */
export function sealEnvelope(cache) {
  const { communes, ...envelope } = cache;
  const sealed = {
    ...envelope,
    generated: osmBaseDate(envelope.timestamp_osm_base) ?? envelope.generated,
    query: QUERY_TEMPLATE,
    ...relationIdentity(cache),
    note: CACHE_NOTE,
    count: communes.length,
  };
  const ordered = {};
  for (const key of ENVELOPE_ORDER) if (key in sealed) ordered[key] = sealed[key];
  for (const key of Object.keys(sealed)) if (!(key in ordered)) ordered[key] = sealed[key];
  return { ...ordered, communes };
}

/** The sidecar document, carrying only what the cache cannot say about itself. */
export function provenanceDocument(cache) {
  // Sealed first, so the digest is of the document that will be on disk and not of
  // whatever shape the caller happened to hold.
  const sealed = sealEnvelope(cache);
  return {
    document: CACHE_FILE,
    generated: sealed.generated,
    algorithm: PROVENANCE_ALGORITHM,
    canonical_form: CANONICAL_FORM,
    sha256: boundaryCacheHash(sealed),
    note:
      `The content digest of ${CACHE_FILE}, held outside it so the geometry and its proof are two ` +
      "committed files rather than one. test/boundary-cache-provenance.test.mjs recomputes it and fails " +
      "if the cache does not match, which is what stops a hand edit to a ring from quietly moving a " +
      "containment verdict. It covers the whole document, the envelope's own Overpass endpoint, " +
      "timestamp_osm_base, query and relation identity included, so nothing here repeats them. " +
      "Rebuild both with `node scripts/build-commune-boundary-cache.mjs --fetch-geometry --write`, or " +
      "re-emit them from the committed cache with `node scripts/build-commune-boundary-cache.mjs --write`.",
  };
}

/**
 * The committed cache's bytes: a pretty envelope with one commune per line. The
 * 188,000 reduced vertices cost 8.5 MB of indentation under a plain 2-space
 * stringify, and a commune whose outline moved is exactly one changed line here.
 */
export function serialiseCache(cache) {
  const { communes, ...envelope } = sealEnvelope(cache);
  const head = JSON.stringify(envelope, null, 2).replace(/\n}$/, "");
  return `${head},\n  "communes": [\n${communes.map((c) => `    ${JSON.stringify(c)}`).join(",\n")}\n  ]\n}\n`;
}

/** The sidecar's bytes. */
export const serialiseProvenance = (cache) => `${JSON.stringify(provenanceDocument(cache), null, 2)}\n`;
