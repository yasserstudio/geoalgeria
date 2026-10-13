import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
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

// --- --target scoping -------------------------------------------------------
// The fixer ran every one of its writers at module level, against the repo it
// lives in, even when --target named a copy somewhere else: during #243 that put
// El Euch (3427) back on a superseded centroid in csv/communes.csv and
// sql/full.sql while the suite passed, because the test suite's own --target run
// rewrote two tracked files (private tracker #247). #252's supersede guard made
// that particular revert harmless; the scoping stayed wrong, and it is invisible
// while the repo's own carriers are already correct, since every writer then
// produces byte-identical content. So the copy is drifted first, in one carrier
// per writer, and then the whole copy must come out untouched.

/** Every file under `dir`, as a path -> contents map. */
function treeOf(dir, base = dir) {
  const out = new Map();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) for (const [k, v] of treeOf(path, base)) out.set(k, v);
    else out.set(relative(base, path), readFileSync(path, "utf8"));
  }
  return out;
}

/**
 * Drift EVERY output the fixer queues, one recorded value each, so the scoping
 * assertion cannot pass on a writer that simply had nothing to write. The test
 * below checks the count the fixer reports against this list, so a writer added
 * later that is not drifted here fails rather than passing silently.
 */
function driftRepoCopy(repo) {
  const pkg = join(repo, "packages", "dataset");
  const data = join(pkg, "data");
  const edit = (path, change) => writeFileSync(path, change(readFileSync(path, "utf8")));
  const editData = (relPath, change) => edit(join(data, relPath), change);
  const editJson = (relPath, change) =>
    editData(relPath, (text) => {
      const doc = JSON.parse(text);
      change(doc);
      return `${JSON.stringify(doc, null, 2)}\n`;
    });
  /** Set one field of the CSV rows a predicate picks, keeping the line endings. */
  const editCsv = (relPath, pick, index, value) =>
    editData(relPath, (text) =>
      text
        .split("\n")
        .map((line) => {
          if (!pick(line)) return line;
          const carriage = line.endsWith("\r") ? "\r" : "";
          const fields = (carriage ? line.slice(0, -1) : line).split(",");
          fields[index] = value;
          return fields.join(",") + carriage;
        })
        .join("\n"),
    );
  /** Replace a substring on the SQL rows a predicate picks. */
  const editSql = (relPath, pick, from, to) =>
    editData(relPath, (text) => text.split("\n").map((line) => (pick(line) ? line.replace(from, to) : line)).join("\n"));
  const nameAr = (doc, code, value) => {
    const row = doc.find((c) => c.code_commune === code);
    assert.ok(row, `commune ${code} is in this split file`);
    row.name_ar = value;
  };

  // The three split files, one recorded name_ar per wilaya range. They are keyed on
  // code_commune and the ecommerce joins read name_fr, so a name_ar drift is safe.
  editJson("communes_w1_w23.json", (doc) => nameAr(doc, 516, "أريس"));
  editJson("communes_w24_w48.json", (doc) => nameAr(doc, 2606, "أولاد دايد"));
  editJson("communes_w49_w69.json", (doc) => nameAr(doc, 319, "أفلو"));

  // algeria.json, wilayas.json and both wilaya GeoJSONs: wilaya 28 is recorded as
  // "M'sila", which `expect` accepts as the old reading.
  editJson("algeria.json", (doc) => {
    for (const wilaya of doc) if (wilaya.code === 28) wilaya.name_fr = "M'sila";
  });
  editJson("wilayas.json", (doc) => {
    for (const wilaya of doc.wilayas) if (wilaya.code === 28) wilaya.name_fr = "M'sila";
  });
  editJson(join("geojson", "wilayas.geojson"), (doc) => {
    for (const feature of doc.features) if (feature.properties.code === 28) feature.properties.name_fr = "M'sila";
  });
  // The commune GeoJSON is placed by name, and Lemcene is commune 527's old one.
  editJson(join("geojson", "communes.geojson"), (doc) => {
    for (const feature of doc.features) {
      if (feature.properties.wilaya_code === 5 && feature.properties.name_fr === "Lemsane") {
        feature.properties.name_fr = "Lemcene";
      }
    }
  });
  // dairas.json: the fixer recounts the two dairas a commune moved between, so a
  // wrong count there is drift it must correct.
  editJson("dairas.json", (doc) => {
    const tablat = doc.find((daira) => daira.wilaya_code === 26 && daira.name_fr === "Tablat");
    assert.ok(tablat, "daira Tablat is in wilaya 26");
    tablat.commune_count = 999;
  });
  // The ecommerce carriers are keyed on the commune name, so their drift goes in
  // the denormalized wilaya name.
  editJson(join("ecommerce", "communes.json"), (rows) => {
    for (const row of rows) if (row.wilaya_code === 28) row.wilaya_name_fr = "M'sila";
  });
  // id,commune_fr,commune_ar,daira,wilaya_code,wilaya_fr,wilaya_ar,postal
  editCsv(join("ecommerce", "communes.csv"), (line) => line.split(",")[4] === "28", 5, "M'sila");
  editSql(join("ecommerce", "communes.sql"), (line) => line.includes(", 28, 'M''Sila', "), "'M''Sila'", "'M''sila'");

  // name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune
  editCsv(join("csv", "communes.csv"), (line) => /,527\r?$/.test(line), 0, "Lemcene");
  // code,name_fr,name_ar,phone_code,postal_code,latitude,longitude,created,capital
  editCsv(join("csv", "wilayas.csv"), (line) => line.startsWith("28,"), 1, "M'sila");
  // code,name_ar,name_fr,name_en,created,… ,capital_commune_code
  editCsv("wilayas.csv", (line) => line.startsWith("28,"), 2, "M'sila");
  // wilaya_code,wilaya_name_fr,commune_name_ar,commune_name_fr, rebuilt every run
  editCsv("communes_new_wilayas.csv", (line) => line.startsWith("59,"), 1, "not a wilaya name");
  // (id, 'name_fr', …, code_commune): keyed on the trailing code
  editSql(join("sql", "full.sql"), (line) => line.endsWith(", 527),"), "'Lemsane'", "'Lemcene'");

  // The three delivery tables, whose wilaya label is rebuilt from algeria.json.
  for (const provider of ["yalidine", "zr_express", "maystro"]) {
    editJson(join("delivery", `${provider}.json`), (doc) => {
      doc.zones[0].wilaya_name_fr = "not a wilaya name";
    });
  }

  // The repo-root atlas GeoJSON, whose properties are rebuilt from algeria.json.
  edit(join(pkg, "algeria.geojson"), (text) => {
    const doc = JSON.parse(text);
    doc.features[0].properties.name_en = "not a wilaya name";
    return `${JSON.stringify(doc, null, 2)}\n`;
  });
}

/** Every output the fixer queues when no --target narrows it. */
const QUEUED_OUTPUTS = 20;

test("a --target run writes the targets and nothing else", () => {
  const dir = appCopy();
  const repo = join(dir, "repo");
  driftRepoCopy(repo);

  // Every writer has something to write, or the assertion below is vacuous for the
  // ones that do not. A dry run with no --target reports what the fixer would
  // touch, so this is also the check that the drift list keeps up with the writers.
  const dry = execFileSync(process.execPath, [SCRIPT, "--root", repo], { stdio: "pipe", encoding: "utf8" });
  assert.match(dry, new RegExp(`^${QUEUED_OUTPUTS} carrier\\(s\\) need an update$`, "m"));

  const snapshot = treeOf(repo);
  fix(dir, "--write", ["algeria.json"]);

  const after = treeOf(repo);
  const written = [...snapshot.keys()].filter((path) => after.get(path) !== snapshot.get(path));
  assert.deepEqual(written, [], `${written.length} file(s) outside --target were written`);
  assert.deepEqual([...after.keys()].sort(), [...snapshot.keys()].sort(), "a file outside --target was added or removed");
});
