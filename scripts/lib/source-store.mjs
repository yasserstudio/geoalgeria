// Source store — committed raw captures under sources/<pkg>/.
//
// One canonical LATEST capture per (package, source); git history is the
// archive. Fetchers write through writeCapture() the moment a raw payload
// arrives (before any validation that might abort the run, so the evidence
// survives a failed build). Builds read through readCapture() so a dead or
// WAF-blocked upstream never blocks re-emission.
//
// Payloads are serialized with sorted object keys (array order untouched) so
// a re-fetch that changes nothing produces a byte-identical file and a real
// upstream change produces a reviewable git diff.
//
// Convention details: sources/README.md.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const STORE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "sources");

// pkg and source become path segments; keep them to the documented kebab-case
// so a variable-built name can never escape sources/ or collide with the manifest.
const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
function checkName(kind, value) {
  if (!NAME_RE.test(String(value))) throw new Error(`source store: invalid ${kind} "${value}" (kebab-case only)`);
  return value;
}

// Documented ceiling (sources/README.md): beyond this, capture the trimmed
// projection the build consumes instead of the full pull.
const SIZE_WARN_BYTES = 20_000_000;

// JSON.stringify with object keys sorted at every depth. Arrays keep their
// order: for most sources it is meaningful (and fetchers that receive
// unordered sets should sort before capturing, so reordering noise never
// reaches the diff).
export function stableStringify(value, indent = 2) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      // Payloads come from JSON parsing, so only plain objects belong here. A
      // Map/Set/Date would JSON.stringify to "{}" — a silently empty capture —
      // so refuse loudly instead.
      const proto = Object.getPrototypeOf(v);
      if (proto !== Object.prototype && proto !== null)
        throw new Error(`source store: non-plain object (${v.constructor?.name ?? "unknown"}) in payload`);
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort(v[k])]),
      );
    }
    return v;
  };
  return JSON.stringify(sort(value), null, indent);
}

function manifestPath(pkg) {
  return join(STORE_ROOT, pkg, "manifest.json");
}

function readManifest(pkg) {
  const p = manifestPath(pkg);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : {};
}

/**
 * Persist a raw source payload to sources/<pkg>/<source>.json and record it in
 * sources/<pkg>/manifest.json.
 *
 * @param {string} pkg     package name (directory under sources/)
 * @param {string} source  capture name, kebab-case, no extension (e.g. "osm", "mobilis-5g")
 * @param {*}      payload the raw payload as received (post-parse, pre-transform)
 * @param {object} meta    { url, retrieved?, records?, note? } — url is required;
 *                         retrieved defaults to today; records defaults to
 *                         payload.length when the payload is an array.
 * @returns {string} the path written
 */
export function writeCapture(pkg, source, payload, meta) {
  checkName("pkg", pkg);
  checkName("source", source);
  if (!meta || !meta.url) throw new Error(`writeCapture(${pkg}/${source}): meta.url is required`);
  const dir = join(STORE_ROOT, pkg);
  mkdirSync(dir, { recursive: true });

  const body = stableStringify(payload) + "\n";
  if (Buffer.byteLength(body) > SIZE_WARN_BYTES)
    console.warn(
      `  ⚠ sources/${pkg}/${source}.json is ${(Buffer.byteLength(body) / 1e6).toFixed(0)} MB (> 20 MB) — capture the trimmed projection instead (sources/README.md)`,
    );
  const file = join(dir, `${source}.json`);
  writeFileSync(file, body);

  const manifest = readManifest(pkg);
  manifest[source] = {
    url: meta.url,
    retrieved: meta.retrieved ?? new Date().toISOString().slice(0, 10),
    records: meta.records ?? (Array.isArray(payload) ? payload.length : undefined),
    sha256: createHash("sha256").update(body).digest("hex"),
    bytes: Buffer.byteLength(body),
    ...(meta.note ? { note: meta.note } : {}),
  };
  writeFileSync(manifestPath(pkg), stableStringify(manifest) + "\n");
  return file;
}

/**
 * Read a capture back. Throws with a run-the-fetcher hint when absent.
 * @returns {*} the parsed payload
 */
export function readCapture(pkg, source) {
  checkName("pkg", pkg);
  checkName("source", source);
  const file = join(STORE_ROOT, pkg, `${source}.json`);
  let body;
  try {
    body = readFileSync(file, "utf-8");
  } catch (e) {
    if (e && e.code === "ENOENT")
      throw new Error(
        `sources/${pkg}/${source}.json not found — run the package fetcher once to capture it`,
      );
    throw e;
  }
  // Captures must only be written through writeCapture; a manifest/file hash
  // mismatch means a hand edit or corruption — refuse to build from it.
  const meta = readManifest(pkg)[source];
  if (meta?.sha256) {
    const actual = createHash("sha256").update(body).digest("hex");
    if (actual !== meta.sha256)
      throw new Error(
        `sources/${pkg}/${source}.json does not match its manifest sha256 — re-run the fetcher (captures are never edited by hand)`,
      );
  }
  return JSON.parse(body);
}

/** Manifest entry for a capture, or null if never captured. */
export function captureMeta(pkg, source) {
  checkName("pkg", pkg);
  checkName("source", source);
  return readManifest(pkg)[source] ?? null;
}
