import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import test, { after, before } from "node:test";

import { assertRepoUnchanged, repoStatus } from "./lib/repo-clean.mjs";

// The app keeps its own fork of the flagship data (repaired communes, postal
// fixes, its own spellings). These fixtures copy the app's four carriers in
// their real formatting so the fixer is exercised the way the app runs it.
const REPO = join(import.meta.dirname, "..");
const FIXTURES = join(import.meta.dirname, "fixtures/app-carriers");
const SCRIPT = join(import.meta.dirname, "../scripts/fix-jo-corrections.mjs");
const CARRIERS = ["algeria.json", "communes.geojson", "wilayas.geojson", "wilaya-boundaries.geojson"];

// The fixer patches this repo's own carriers alongside the --target ones, so
// every run here is pointed at a throwaway copy of them with --root. Without it
// a --write under test rewrites tracked files and reverts whatever edit was in
// progress. Only packages/dataset is copied, minus the postal mirror: no
// correction reads either of those.
function repoCopy(dir) {
  const root = join(dir, "repo");
  mkdirSync(join(root, "packages", "dataset"), { recursive: true });
  cpSync(join(REPO, "packages/dataset/data"), join(root, "packages/dataset/data"), {
    recursive: true,
    filter: (src) => !src.includes(`${sep}data${sep}poste`),
  });
  cpSync(join(REPO, "packages/dataset/algeria.geojson"), join(root, "packages/dataset/algeria.geojson"));
  return root;
}

function appCopy() {
  const dir = mkdtempSync(join(tmpdir(), "jo-target-"));
  for (const file of CARRIERS) cpSync(join(FIXTURES, file), join(dir, file));
  repoCopy(dir);
  return dir;
}

function fix(dir, mode, files = CARRIERS) {
  const args = [SCRIPT, ...(mode ? [mode] : []), "--root", join(dir, "repo")];
  for (const file of files) args.push("--target", join(dir, file));
  return execFileSync(process.execPath, args, { stdio: "pipe", encoding: "utf8" });
}

// Every test below runs the fixer with --write, and none of it may reach a
// tracked file. This brackets the whole file, so a test added later trips it too.
let tracked;
before(() => {
  tracked = repoStatus();
});
after(() => assertRepoUnchanged(tracked));

const readJson = (dir, file) => JSON.parse(readFileSync(join(dir, file), "utf8"));
const commune = (doc, code) => doc.flatMap((w) => w.communes).find((c) => c.code_commune === code);

test("the app's algeria.json takes the corrections and keeps its own repairs", () => {
  const dir = appCopy();
  fix(dir, "--write", ["algeria.json"]);
  const doc = readJson(dir, "algeria.json");

  assert.equal(commune(doc, 527).name_fr, "Lemsane");
  assert.equal(commune(doc, 527).postal_code, "05999", "a fork-only postal code survives");
  assert.equal(commune(doc, 516).name_ar, "آريس");
  assert.deepEqual(
    [commune(doc, 2653).name_fr, commune(doc, 2653).latitude, commune(doc, 2653).longitude, commune(doc, 2653).daira],
    ["Deux Bassins", 36.46947, 3.299409, "Tablat"],
  );
  assert.equal(doc.find((w) => w.code === 28).name_fr, "M'Sila");
  // The app wrote wilaya 65 "Aïn Oussara" and its seat "Ain Oussera": both are
  // published readings the correction replaces.
  assert.equal(doc.find((w) => w.code === 65).name_fr, "Aïn Ouessara");
  assert.equal(commune(doc, 1731).name_fr, "Aïn Ouessara");
  assert.equal(commune(doc, 1731).daira, "Aïn Ouessara");
});

test("the app's communes.geojson is matched by old name and corrected", () => {
  const dir = appCopy();
  fix(dir, "--write", ["algeria.json", "communes.geojson"]);
  const features = readJson(dir, "communes.geojson").features;
  const at = (wilaya, name) =>
    features.find((f) => f.properties.wilaya_code === wilaya && f.properties.name_fr === name);

  assert.equal(at(5, "Lemsane")?.properties.postal_code, "05999");
  const deuxBassins = at(26, "Deux Bassins");
  assert.deepEqual(deuxBassins?.geometry.coordinates, [3.299409, 36.46947]);
  assert.equal(deuxBassins?.properties.daira, "Tablat");
  assert.equal(at(65, "Aïn Ouessara")?.properties.daira, "Aïn Ouessara");
  assert.equal(features.length, 4);
});

test("the app's wilayas.geojson takes the wilaya renames in its own formatting", () => {
  const dir = appCopy();
  fix(dir, "--write", ["wilayas.geojson"]);
  const text = readFileSync(join(dir, "wilayas.geojson"), "utf8");
  const names = Object.fromEntries(
    JSON.parse(text).features.map((f) => [f.properties.code, f.properties.name_fr]),
  );
  assert.deepEqual(names, { 28: "M'Sila", 65: "Aïn Ouessara" });
  assert.ok(text.startsWith("{\n  "), "stays pretty-printed");
  assert.ok(!text.endsWith("\n"), "gains no trailing newline");
});

/** Every leaf path whose value differs between two JSON documents. */
function changedPaths(before, after, path = "") {
  if (typeof before !== "object" || before === null) return before === after ? [] : [path];
  return Object.keys({ ...before, ...after }).flatMap((key) =>
    changedPaths(before[key], after?.[key], path ? `${path}.${key}` : key),
  );
}

test("only corrected fields move, and a corrected copy passes --check", () => {
  const dir = appCopy();
  assert.throws(() => fix(dir, "--check"), "an uncorrected copy fails --check");
  fix(dir, "--write");
  assert.doesNotThrow(() => fix(dir, "--check"), "a corrected copy is stable");

  assert.deepEqual(changedPaths(readJson(FIXTURES, "algeria.json"), readJson(dir, "algeria.json")).sort(), [
    "0.communes.0.name_fr", // Lemcene
    "0.communes.1.name_ar", // Arris
    "1.communes.0.daira", // Deux Bassins
    "1.communes.0.latitude",
    "1.communes.0.longitude",
    "1.communes.0.name_fr",
    "2.name_fr", // M'Sila
    "3.communes.0.daira", // Aïn Ouessara
    "3.communes.0.name_fr",
    "3.name_fr",
  ]);
  assert.equal(
    readFileSync(join(dir, "wilaya-boundaries.geojson"), "utf8"),
    readFileSync(join(FIXTURES, "wilaya-boundaries.geojson"), "utf8"),
  );
});

test("a drifted copy stops the run and names what drifted", () => {
  const dir = appCopy();
  const doc = readJson(dir, "algeria.json");
  commune(doc, 527).name_fr = "Lemcen";
  writeFileSync(join(dir, "algeria.json"), `${JSON.stringify(doc, null, 2)}\n`);
  const before = readFileSync(join(dir, "wilayas.geojson"), "utf8");

  assert.throws(() => fix(dir, "--write"), (error) => /algeria\.json 527 name_fr/.test(error.stderr));
  assert.equal(readFileSync(join(dir, "wilayas.geojson"), "utf8"), before, "no carrier is half-written");
});

test("a commune point the fixer cannot place stops the run", () => {
  const dir = appCopy();
  const doc = readJson(dir, "communes.geojson");
  doc.features.find((f) => f.properties.name_fr === "Lemcene").properties.name_fr = "Lemcéne";
  writeFileSync(join(dir, "communes.geojson"), `${JSON.stringify(doc, null, 2)}\n`);

  assert.throws(
    () => fix(dir, "--write"),
    (error) => /communes\.geojson/.test(error.stderr) && /Lemsane/.test(error.stderr),
  );
});

test("commune points are only corrected beside the algeria.json they must agree with", () => {
  const dir = appCopy();
  assert.throws(
    () => fix(dir, "--write", ["communes.geojson"]),
    (error) => /algeria\.json/.test(error.stderr),
  );
});
