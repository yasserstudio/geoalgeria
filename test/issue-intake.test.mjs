// The intake workflow's decisions, which are the parts that can be wrong
// quietly: a dataset read off the wrong field, a label created that nobody
// authorized, or a second mirror on the private tracker every time the job
// re-runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  TRIAGE_LABEL,
  UNKNOWN_DATASET_OPTION,
  datasetSlugsFromForm,
  parseFormBody,
  detectDataset,
  labelsToAdd,
  datasetLabel,
  mirrorTitle,
  mirrorPrefix,
  mirrorBody,
  findMirror,
} from "../scripts/lib/issue-intake.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FORM = readFileSync(join(ROOT, ".github", "ISSUE_TEMPLATE", "data-correction.yml"), "utf-8");
const SLUGS = datasetSlugsFromForm(FORM);

// --- the dataset vocabulary ------------------------------------------------

test("the vocabulary comes from the form and drops the unknown option", () => {
  assert.ok(SLUGS.includes("poste"));
  assert.ok(SLUGS.includes("protection-civile"));
  assert.ok(SLUGS.includes("geoalgeria"));
  assert.ok(!SLUGS.includes(UNKNOWN_DATASET_OPTION));
});

// --- reading a submitted form ----------------------------------------------

const SUBMITTED = [
  "### Which dataset?",
  "",
  "pharmacies",
  "",
  "### Record id or scope",
  "",
  "pharmacies:osm:node/123",
  "",
  "### What is wrong, and what should it be?",
  "",
  "Field: name_ar",
  "Current value: x",
  "",
  "### Evidence or source URL",
  "",
  "https://www.openstreetmap.org/node/123",
  "",
  "### Anything else?",
  "",
  "_No response_",
].join("\n");

test("parseFormBody reads each field and empties an unanswered one", () => {
  const fields = parseFormBody(SUBMITTED);
  assert.equal(fields.get("Which dataset?"), "pharmacies");
  assert.equal(fields.get("Record id or scope"), "pharmacies:osm:node/123");
  assert.equal(fields.get("What is wrong, and what should it be?"), "Field: name_ar\nCurrent value: x");
  assert.equal(fields.get("Evidence or source URL"), "https://www.openstreetmap.org/node/123");
  assert.equal(fields.get("Anything else?"), "");
});

test("parseFormBody returns nothing for a blank issue", () => {
  assert.equal(parseFormBody("just some prose").size, 0);
  assert.equal(parseFormBody(null).size, 0);
});

// --- detecting the dataset -------------------------------------------------

test("the form's own answer wins", () => {
  assert.equal(detectDataset({ title: "Data correction: poste", body: SUBMITTED, slugs: SLUGS }), "pharmacies");
});

test("the title is read when there is no form, as the site's link leaves it", () => {
  assert.equal(
    detectDataset({ title: "Data correction: buses buses:line:etusa-16", body: "", slugs: SLUGS }),
    "buses",
  );
  assert.equal(
    detectDataset({ title: "Data correction: protection-civile 1601-02", body: "", slugs: SLUGS }),
    "protection-civile",
  );
});

test("a compound slug is not shadowed by a shorter match", () => {
  assert.equal(
    detectDataset({ title: "Wrong wilaya in enseignement-superieur", body: "", slugs: SLUGS }),
    "enseignement-superieur",
  );
});

test("other / not sure and an unknown word identify nothing", () => {
  const answered = ["### Which dataset?", "", UNKNOWN_DATASET_OPTION].join("\n");
  assert.equal(detectDataset({ title: "Something is off", body: answered, slugs: SLUGS }), null);
  assert.equal(detectDataset({ title: "Add a traffic dataset", body: "", slugs: SLUGS }), null);
});

// --- labelling -------------------------------------------------------------

test("needs-triage is added once and never twice", () => {
  assert.deepEqual(labelsToAdd({ existing: [], dataset: null, availableLabels: [] }), [TRIAGE_LABEL]);
  assert.deepEqual(labelsToAdd({ existing: [TRIAGE_LABEL], dataset: null, availableLabels: [] }), []);
});

test("a dataset label is applied only when the repo already has it", () => {
  assert.deepEqual(
    labelsToAdd({ existing: [TRIAGE_LABEL], dataset: "poste", availableLabels: ["data:poste", "data"] }),
    ["data:poste"],
  );
  assert.deepEqual(
    labelsToAdd({ existing: [TRIAGE_LABEL], dataset: "poste", availableLabels: ["data"] }),
    [],
  );
  assert.deepEqual(
    labelsToAdd({ existing: [TRIAGE_LABEL, "data:poste"], dataset: "poste", availableLabels: ["data:poste"] }),
    [],
  );
});

test("the dataset label is namespaced", () => {
  assert.equal(datasetLabel("gares-routieres"), "data:gares-routieres");
});

// --- mirroring -------------------------------------------------------------

test("the mirror title carries the public number as a prefix", () => {
  assert.equal(mirrorTitle(267, "Data correction: poste"), "[public #267] Data correction: poste");
});

test("an overlong title is clipped to GitHub's limit", () => {
  const title = mirrorTitle(1, "x".repeat(400));
  assert.equal(title.length, 256);
  assert.ok(title.startsWith("[public #1] "));
  assert.ok(title.endsWith("…"));
});

test("findMirror matches the whole prefix, so #12 is not #123", () => {
  const issues = [{ title: "[public #123] something" }, { title: "unrelated" }];
  assert.equal(findMirror(issues, 12), null);
  assert.equal(findMirror(issues, 123).title, "[public #123] something");
  assert.equal(findMirror([], 1), null);
});

test("re-running finds the mirror it filed the first time", () => {
  const filed = [{ title: mirrorTitle(267, "Data correction: poste"), html_url: "u" }];
  assert.ok(findMirror(filed, 267));
});

test("the mirror body links back and says the Owner replies", () => {
  const body = mirrorBody({
    url: "https://github.com/yasserstudio/geoalgeria/issues/267",
    number: 267,
    author: "someone",
    dataset: "pharmacies",
    labels: [TRIAGE_LABEL, "data", "correction"],
    formFields: parseFormBody(SUBMITTED),
  });
  assert.match(body, /https:\/\/github\.com\/yasserstudio\/geoalgeria\/issues\/267/);
  assert.ok(body.includes(mirrorPrefix(267)));
  assert.match(body, /Opened by: @someone/);
  assert.match(body, /Dataset: pharmacies/);
  assert.match(body, /Record id or scope: pharmacies:osm:node\/123/);
  assert.match(body, /Evidence: https:\/\/www\.openstreetmap\.org\/node\/123/);
  assert.match(body, /never posts a public comment/);
});

test("the mirror body holds up with nothing identified", () => {
  const body = mirrorBody({ url: "u", number: 9, author: null, dataset: null });
  assert.match(body, /Opened by: unknown/);
  assert.match(body, /Dataset: not identified/);
  assert.match(body, /Public labels: none/);
});
