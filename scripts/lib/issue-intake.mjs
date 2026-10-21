// The decisions behind `.github/workflows/issue-intake.yml`, kept pure so they
// can be tested without GitHub.
//
// What the workflow does to a newly opened public issue: mark it needs-triage,
// label it with the dataset it names when that dataset is a real package, and
// mirror it onto the private tracker. What it never does: reply in public. The
// Owner answers community issues; automation only files and labels them.

import { parseIssueFormYaml } from "./issue-forms.mjs";

/** Applied to every new issue, forms included, so nothing lands unmarked. */
export const TRIAGE_LABEL = "needs-triage";

/** Dataset labels are namespaced, so they never collide with a type label. */
export const DATASET_LABEL_PREFIX = "data:";

/** The dropdown option that means "I could not tell", which names no package. */
export const UNKNOWN_DATASET_OPTION = "other / not sure";

/** The correction form's dataset field, by label and by id. */
export const DATASET_FIELD_LABEL = "Which dataset?";

/**
 * The dataset vocabulary comes from the correction form's own dropdown, which
 * `test/issue-forms.test.mjs` already pins to `packages/`. One list, so a new
 * package cannot be labelled here while the form still cannot report it.
 */
export function datasetSlugsFromForm(formYaml) {
  const form = parseIssueFormYaml(formYaml);
  const dropdown = (form?.body ?? []).find((el) => el?.id === "dataset");
  const options = dropdown?.attributes?.options;
  if (!Array.isArray(options)) throw new Error("the correction form has no dataset dropdown");
  return options.filter((option) => option !== UNKNOWN_DATASET_OPTION);
}

/**
 * Read a submitted issue form back into its fields. GitHub renders each one as
 * an `### <label>` heading followed by the value, and an unanswered optional
 * field as `_No response_`. A blank issue parses to an empty map, which is the
 * point: the caller then falls back to the title.
 */
export function parseFormBody(body) {
  const fields = new Map();
  if (typeof body !== "string") return fields;
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let label = null;
  let buffer = [];
  const flush = () => {
    if (label === null) return;
    const value = buffer.join("\n").trim();
    fields.set(label, value === "_No response_" ? "" : value);
  };
  for (const line of lines) {
    const heading = /^###[ \t]+(.*\S)[ \t]*$/.exec(line);
    if (heading) {
      flush();
      label = heading[1];
      buffer = [];
      continue;
    }
    if (label !== null) buffer.push(line);
  }
  flush();
  return fields;
}

/**
 * The dataset an issue is about, or null. The form's own answer wins; otherwise
 * the title is scanned, because the site's correction link puts the slug there
 * and because a blank issue has no fields at all. Hyphens are kept while
 * tokenizing, so `protection-civile` survives, and the longest match wins so a
 * compound slug is never shadowed by a shorter one.
 */
export function detectDataset({ title = "", body = "", slugs }) {
  const known = new Set(slugs);
  const answered = parseFormBody(body).get(DATASET_FIELD_LABEL);
  if (answered && known.has(answered)) return answered;

  const tokens = String(title).toLowerCase().split(/[^a-z0-9-]+/u).filter(Boolean);
  const candidates = [];
  for (const token of tokens) {
    if (known.has(token)) candidates.push(token);
    // "buses:line:etusa-16" tokenizes whole; its leading segment still names
    // the package, and a trailing one ("etusa-16") never matches a slug.
    for (const part of token.split("-")) if (known.has(part)) candidates.push(part);
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return candidates[0];
}

/** The dataset label for a slug. */
export function datasetLabel(slug) {
  return `${DATASET_LABEL_PREFIX}${slug}`;
}

/** The labels to add to a public issue, given what it already carries. */
export function labelsToAdd({ existing = [], dataset = null, availableLabels = null }) {
  const have = new Set(existing);
  const add = [];
  if (!have.has(TRIAGE_LABEL)) add.push(TRIAGE_LABEL);
  if (dataset) {
    const label = datasetLabel(dataset);
    // A dataset label is only applied when the repo already has it: adding an
    // unknown name through the API would CREATE it, and labels on the public
    // repo are the Owner's to define, not a workflow's.
    const exists = availableLabels === null || new Set(availableLabels).has(label);
    if (exists && !have.has(label)) add.push(label);
  }
  return add;
}

/** Title prefix that ties a mirror on the private tracker to its public issue. */
export function mirrorPrefix(number) {
  return `[public #${number}]`;
}

/** The mirror's title. GitHub caps issue titles at 256 characters. */
export function mirrorTitle(number, title) {
  const prefix = mirrorPrefix(number);
  const full = `${prefix} ${String(title ?? "").trim()}`.trim();
  return full.length <= 256 ? full : `${full.slice(0, 255)}…`;
}

/**
 * Is this public issue already mirrored? Matching is on the title prefix, which
 * `mirrorTitle` always writes, so a re-run finds the existing mirror instead of
 * filing a second one. `#12` must not match `#123`, hence the whole prefix
 * including its closing bracket.
 */
export function findMirror(issues, number) {
  const prefix = mirrorPrefix(number);
  return issues.find((issue) => typeof issue?.title === "string" && issue.title.startsWith(prefix)) ?? null;
}

/**
 * The mirror body: a pointer, not a copy. The public thread stays the record of
 * what the reporter said; this is the internal card that tracks it, so it
 * carries the link, who opened it, how it was classified, and nothing the Owner
 * would have to re-read in two places.
 */
export function mirrorBody({ url, number, author, dataset, labels = [], formFields = null }) {
  const lines = [
    `Mirror of public issue ${url}`,
    "",
    `- Public: ${mirrorPrefix(number)} ${url}`,
    `- Opened by: ${author ? `@${author}` : "unknown"}`,
    `- Dataset: ${dataset ?? "not identified"}`,
    `- Public labels: ${labels.length > 0 ? labels.join(", ") : "none"}`,
  ];
  const record = formFields?.get?.("Record id or scope");
  const evidence = formFields?.get?.("Evidence or source URL");
  if (record) lines.push(`- Record id or scope: ${record}`);
  if (evidence) lines.push(`- Evidence: ${evidence}`);
  lines.push(
    "",
    "Read the report in the public thread and reply there yourself: the intake",
    "workflow never posts a public comment.",
  );
  return lines.join("\n");
}
