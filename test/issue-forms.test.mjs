// The public intake surface, gated.
//
// Community issues arrive through `.github/ISSUE_TEMPLATE/`, and three things
// downstream depend on the exact shape of those files: GitHub refuses a form
// that breaks its schema (and falls back to a blank issue, silently), the site's
// "report a data issue" link prefills the correction form by FIELD ID, and
// `.github/workflows/issue-intake.yml` reads the dataset back out of the
// submitted body by its label. So the ids and the dataset vocabulary are a
// contract, not cosmetics.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseIssueFormYaml,
  formSchemaErrors,
  fieldIds,
  requiredIds,
  datasetSlug,
  NON_DATASET_PACKAGES,
} from "../scripts/lib/issue-forms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = join(ROOT, ".github", "ISSUE_TEMPLATE");

const FORM_FILES = readdirSync(TEMPLATE_DIR)
  .filter((f) => f.endsWith(".yml") && f !== "config.yml")
  .sort();

function readForm(file) {
  return parseIssueFormYaml(readFileSync(join(TEMPLATE_DIR, file), "utf-8"));
}

// --- the reader itself -----------------------------------------------------

test("the reader handles the constructs the forms use", () => {
  const parsed = parseIssueFormYaml(
    [
      "name: Example",
      'labels: ["needs-triage", "data"]',
      "body:",
      "  - type: markdown",
      "    attributes:",
      "      value: |",
      "        line one",
      "        line two",
      "  - type: dropdown",
      "    id: dataset",
      "    attributes:",
      "      label: Which dataset?",
      "      options:",
      "        - poste",
      "        - other / not sure",
      "    validations:",
      "      required: true",
    ].join("\n"),
  );
  assert.equal(parsed.name, "Example");
  assert.deepEqual(parsed.labels, ["needs-triage", "data"]);
  assert.equal(parsed.body[0].attributes.value, "line one\nline two\n");
  assert.equal(parsed.body[1].id, "dataset");
  assert.deepEqual(parsed.body[1].attributes.options, ["poste", "other / not sure"]);
  assert.equal(parsed.body[1].validations.required, true);
});

test("the reader refuses a folded scalar rather than guessing", () => {
  assert.throws(() => parseIssueFormYaml("description: >-\n  folded\n"), /folded scalar/);
});

// --- every form ------------------------------------------------------------

test("there is at least one issue form", () => {
  assert.ok(FORM_FILES.length > 0);
});

for (const file of FORM_FILES) {
  test(`${file} satisfies GitHub's form schema`, () => {
    assert.deepEqual(formSchemaErrors(file, readForm(file)), []);
  });

  test(`${file} applies needs-triage plus a type label`, () => {
    const form = readForm(file);
    assert.ok(Array.isArray(form.labels), `${file} declares no labels`);
    assert.ok(form.labels.includes("needs-triage"), `${file} is missing needs-triage`);
    assert.ok(
      form.labels.some((l) => l !== "needs-triage"),
      `${file} applies no type label`,
    );
  });
}

// --- the correction form, which the site links to --------------------------

test("the correction form keeps the field ids the site prefills", () => {
  const form = readForm("data-correction.yml");
  assert.deepEqual(fieldIds(form), ["dataset", "record", "problem", "evidence", "notes"]);
  assert.deepEqual(requiredIds(form), ["dataset", "record", "problem", "evidence"]);
});

test("the correction form cannot be submitted without evidence", () => {
  const form = readForm("data-correction.yml");
  const evidence = form.body.find((el) => el.id === "evidence");
  assert.equal(evidence.type, "input");
  assert.equal(evidence.validations.required, true);
});

test("the dataset dropdown covers every dataset package", () => {
  const form = readForm("data-correction.yml");
  const dropdown = form.body.find((el) => el.id === "dataset");
  assert.equal(dropdown.type, "dropdown");
  const options = dropdown.attributes.options;
  assert.equal(options[options.length - 1], "other / not sure");

  const slugs = options.slice(0, -1);
  assert.deepEqual(slugs, [...slugs].sort(), "dataset options are not sorted");

  const expected = readdirSync(join(ROOT, "packages"))
    .filter((dir) => !NON_DATASET_PACKAGES.has(dir))
    .filter((dir) => existsSync(join(ROOT, "packages", dir, "package.json")))
    .map((dir) =>
      datasetSlug(JSON.parse(readFileSync(join(ROOT, "packages", dir, "package.json"), "utf-8")).name),
    )
    .sort();
  assert.deepEqual(slugs, expected);
});

// --- the chooser -----------------------------------------------------------

test("the template chooser keeps its contact links", () => {
  const config = parseIssueFormYaml(readFileSync(join(TEMPLATE_DIR, "config.yml"), "utf-8"));
  assert.ok(Array.isArray(config.contact_links) && config.contact_links.length > 0);
  for (const link of config.contact_links) {
    assert.ok(typeof link.name === "string" && link.name.trim() !== "");
    assert.match(link.url, /^https:\/\//);
    assert.ok(typeof link.about === "string" && link.about.trim() !== "");
  }
});
