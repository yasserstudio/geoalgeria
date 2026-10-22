#!/usr/bin/env node
// Intake for a newly opened public issue, run by
// `.github/workflows/issue-intake.yml`. The decisions live in
// `lib/issue-intake.mjs`; this is the IO around them.
//
// Three things happen, in this order, and each one is skippable on its own:
//   1. the issue is marked needs-triage unless it already is;
//   2. it gets a `data:<slug>` label when it names a real package AND that
//      label already exists on the repo;
//   3. it is mirrored onto the private tracker, once.
//
// It never comments in public. It exits 0 when the tracker token is absent, so
// the labelling half keeps working before the Owner creates the secret and the
// workflow is not red while it waits.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  TRIAGE_LABEL,
  datasetSlugsFromForm,
  parseFormBody,
  detectDataset,
  labelsToAdd,
  mirrorTitle,
  mirrorBody,
  findMirror,
  mirrorPrefix,
} from "./lib/issue-intake.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORRECTION_FORM = join(ROOT, ".github", "ISSUE_TEMPLATE", "data-correction.yml");
const API = process.env.GITHUB_API_URL || "https://api.github.com";

const notice = (message) => console.log(`::notice::${message}`);
const warn = (message) => console.log(`::warning::${message}`);

async function api(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function main() {
  const eventPath = requireEnv("GITHUB_EVENT_PATH");
  const repo = requireEnv("GITHUB_REPOSITORY");
  const token = requireEnv("GITHUB_TOKEN");
  const event = JSON.parse(readFileSync(eventPath, "utf-8"));
  const issue = event.issue;
  if (!issue) throw new Error("the event carries no issue");
  if (issue.pull_request) {
    notice(`#${issue.number} is a pull request, nothing to do`);
    return;
  }

  const existing = (issue.labels ?? []).map((l) => (typeof l === "string" ? l : l.name));
  const slugs = datasetSlugsFromForm(readFileSync(CORRECTION_FORM, "utf-8"));
  const fields = parseFormBody(issue.body);
  const dataset = detectDataset({ title: issue.title, body: issue.body, slugs });

  // The label pass. `availableLabels` is the repo's own list, so an unknown
  // dataset label is skipped rather than silently created by the API.
  const repoLabels = (await api(`/repos/${repo}/labels?per_page=100`, { token })) ?? [];
  const add = labelsToAdd({
    existing,
    dataset,
    availableLabels: repoLabels.map((l) => l.name),
  });
  if (add.length > 0) {
    await api(`/repos/${repo}/issues/${issue.number}/labels`, {
      token,
      method: "POST",
      body: { labels: add },
    });
    notice(`#${issue.number} labelled ${add.join(", ")}`);
  } else {
    notice(`#${issue.number} already carries ${TRIAGE_LABEL}`);
  }
  if (dataset && !add.some((l) => l.startsWith("data:")) && !existing.includes(`data:${dataset}`)) {
    notice(`#${issue.number} names ${dataset}, but the repo has no data:${dataset} label yet`);
  }

  // The mirror pass.
  const trackerToken = process.env.TRACKER_ISSUES_TOKEN;
  const tracker = process.env.TRACKER_REPO || "yasserstudio/geoalgeria.com";
  if (!trackerToken) {
    notice(`no tracker token, so #${issue.number} was not mirrored to ${tracker}`);
    return;
  }

  // Idempotency, belt and braces: the search index lags behind a just-created
  // issue, so the recent-issues scan is what actually catches a re-run minutes
  // after the first one, and the search catches an older mirror the scan has
  // already slid past.
  const recent =
    (await api(`/repos/${tracker}/issues?state=all&sort=created&direction=desc&per_page=100`, {
      token: trackerToken,
    })) ?? [];
  const query = encodeURIComponent(`repo:${tracker} in:title "${mirrorPrefix(issue.number)}"`);
  const searched = await api(`/search/issues?q=${query}&per_page=100`, { token: trackerToken });
  const known = [...recent, ...(searched?.items ?? [])];
  const already = findMirror(known, issue.number);
  if (already) {
    notice(`#${issue.number} is already mirrored as ${already.html_url ?? already.number}`);
    return;
  }

  const mirror = await api(`/repos/${tracker}/issues`, {
    token: trackerToken,
    method: "POST",
    body: {
      title: mirrorTitle(issue.number, issue.title),
      body: mirrorBody({
        url: issue.html_url,
        number: issue.number,
        author: issue.user?.login,
        dataset,
        labels: existing.concat(add),
        formFields: fields,
      }),
      labels: [TRIAGE_LABEL],
    },
  });
  if (!mirror) {
    warn(`${tracker} is not reachable with the tracker token, so #${issue.number} was not mirrored`);
    return;
  }
  notice(`#${issue.number} mirrored as ${mirror.html_url}`);
}

main().catch((error) => {
  console.log(`::error::${error.message}`);
  process.exitCode = 1;
});
