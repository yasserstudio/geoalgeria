// The source store must produce byte-stable captures (sorted keys, canonical
// layout) and a manifest that round-trips — that stability is what makes a
// re-fetch diffable at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The store roots itself at the repo's sources/; use a throwaway package name
// so tests never touch real captures.
import { stableStringify, writeCapture, readCapture, captureMeta } from "../scripts/lib/source-store.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = `test-tmp-${process.pid}`;
const DIR = join(REPO, "sources", PKG);

test("stableStringify sorts keys at every depth and leaves array order alone", () => {
  const a = stableStringify({ b: 1, a: { z: [3, 1, 2], y: 0 } });
  const b = stableStringify({ a: { y: 0, z: [3, 1, 2] }, b: 1 });
  assert.equal(a, b);
  assert.ok(a.indexOf('"a"') < a.indexOf('"b"'));
  assert.deepEqual(JSON.parse(a).a.z, [3, 1, 2]);
});

test("writeCapture/readCapture round-trip, manifest fields, byte stability", (t) => {
  t.after(() => rmSync(DIR, { recursive: true, force: true }));

  const payload = [{ z: 1, a: "é" }, { a: null, z: 2 }];
  const file = writeCapture(PKG, "demo", payload, { url: "https://example.dz/x", retrieved: "2026-08-03" });
  assert.ok(existsSync(file));

  // Round-trip
  assert.deepEqual(readCapture(PKG, "demo"), payload);

  // Manifest
  const meta = captureMeta(PKG, "demo");
  assert.equal(meta.url, "https://example.dz/x");
  assert.equal(meta.retrieved, "2026-08-03");
  assert.equal(meta.records, 2);
  assert.match(meta.sha256, /^[0-9a-f]{64}$/);
  assert.ok(meta.bytes > 0);

  // Re-capture of an identical payload (keys shuffled) is byte-identical.
  const before = readFileSync(file, "utf-8");
  writeCapture(PKG, "demo", [{ a: "é", z: 1 }, { z: 2, a: null }], { url: "https://example.dz/x", retrieved: "2026-08-03" });
  assert.equal(readFileSync(file, "utf-8"), before);

  // A sibling capture merges into the manifest without clobbering the first.
  writeCapture(PKG, "demo-2", { ok: true }, { url: "https://example.dz/y", retrieved: "2026-08-03" });
  assert.equal(captureMeta(PKG, "demo").url, "https://example.dz/x");
  assert.equal(captureMeta(PKG, "demo-2").url, "https://example.dz/y");
});

test("readCapture on a missing capture explains how to populate it", () => {
  assert.throws(() => readCapture(PKG, "never-fetched"), /run the package fetcher/);
  assert.equal(captureMeta(PKG, "never-fetched"), null);
});

test("hardening: names are validated, non-plain payloads refused, hand edits detected", (t) => {
  const pkg = `${PKG}-h`;
  t.after(() => rmSync(join(REPO, "sources", pkg), { recursive: true, force: true }));

  assert.throws(() => writeCapture("../escape", "x", {}, { url: "u" }), /invalid pkg/);
  assert.throws(() => writeCapture(pkg, "Bad_Name", {}, { url: "u" }), /invalid source/);
  assert.throws(() => writeCapture(pkg, "map", new Map([["a", 1]]), { url: "u" }), /non-plain object/);

  const file = writeCapture(pkg, "ok", { a: 1 }, { url: "u" });
  writeFileSync(file, '{\n  "a": 2\n}\n');
  assert.throws(() => readCapture(pkg, "ok"), /does not match its manifest sha256/);
});

test("writeCapture requires a source url", () => {
  assert.throws(() => writeCapture(PKG, "x", {}, {}), /meta\.url is required/);
  assert.ok(!existsSync(join(DIR, "x.json")));
});
