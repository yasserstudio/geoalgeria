// The repository gate over the Source rights registry in @geoalgeria/schema.
//
// Two rules, and the reason each one exists:
//
//  1. Every Source key a package publishes resolves to a registry record. Until
//     this check existed, a fetcher could add a Source and nothing would notice:
//     `metadata.sources[]` is free text, the schema validator reads its shape and
//     not its rights, and the release machinery publishes whatever validated. So
//     the fail-closed rule the governance research asks for has to be a scan of
//     what is on disk rather than a declaration anyone keeps by hand, the same
//     reason the licence rule reads every descriptor instead of a list.
//  2. The registry itself stays inside its vocabulary, and its records stay
//     consistent with the publication rule. A record whose rights class is a typo
//     reads as a classification and clears nothing, which would silently empty a
//     release; a `restricted-research` record carrying targets, or a refused
//     Source still listing them, is a contradiction that must not sit in the file
//     waiting for a reader that trusts it.
//
// The registry data and the reader live in packages/schema, because the Content
// release generator in the app repository reads them from the pinned data
// checkout. This module is the data repository's enforcement of them.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ACCESS_CLASSES,
  PUBLICATION_TARGETS,
  RIGHTS_BASES,
  RIGHTS_CLASSES,
  rightsRecordFor,
  rightsRegistry,
} from "../../packages/schema/index.js";
import { publishedMetadataPaths } from "./licence-terms.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Every `metadata.sources[].key` under `packages/`, with the file that names it.
 * Discovered rather than listed: the point is to read what ships.
 * @param {string} packagesDir
 * @returns {{where: string, key: unknown}[]}
 */
export function packageSourceRefs(packagesDir) {
  const refs = [];
  for (const pkg of readdirSync(packagesDir).sort()) {
    const dir = join(packagesDir, pkg);
    if (!existsSync(join(dir, "package.json"))) continue;
    for (const rel of publishedMetadataPaths(dir)) {
      let meta;
      try {
        meta = JSON.parse(readFileSync(join(dir, rel), "utf-8"));
      } catch {
        continue; // the licence and schema checks report a malformed descriptor
      }
      for (const source of meta?.sources ?? []) refs.push({ where: `${pkg}/${rel}`, key: source?.key });
    }
  }
  return refs;
}

/**
 * Errors (empty when every reference is classified) for a set of Source
 * references.
 * @param {{where: string, key: unknown}[]} refs
 * @param {object} [registry]
 * @returns {string[]}
 */
export function unregisteredSourceErrors(refs, registry = rightsRegistry()) {
  const errors = [];
  for (const { where, key } of refs) {
    if (typeof key !== "string" || !key) {
      errors.push(`${where}: a source has no \`key\`, so its rights cannot be looked up`);
      continue;
    }
    if (!rightsRecordFor(key, registry))
      errors.push(
        `${where}: source \`${key}\` has no record in the Source rights registry ` +
          `(packages/schema/rights/registry.json): add one, or list the key under an existing record's \`metadata_keys\``,
      );
  }
  return errors;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Rights classes that may list no target at all, whatever else a record says. */
const NO_TARGET_CLASSES = new Set(["restricted-research", "prohibited"]);

/**
 * Errors (empty when the registry is well formed) for the registry document.
 * @param {object} registry
 * @returns {string[]}
 */
export function registryErrors(registry = rightsRegistry()) {
  const errors = [];
  if (!Number.isInteger(registry?.version) || registry.version < 1)
    errors.push("registry: `version` must be a positive integer, so a release report can name it");
  if (!ISO_DATE.test(registry?.updated ?? "")) errors.push("registry: `updated` must be an ISO date");
  const records = registry?.sources;
  if (!Array.isArray(records) || records.length === 0) {
    errors.push("registry: `sources` must be a non-empty array of records");
    return errors;
  }

  const claimedBy = new Map();
  const keys = records.map((record) => record?.key);
  if (JSON.stringify(keys) !== JSON.stringify([...keys].sort()))
    errors.push("registry: records must be sorted by `key`, so a diff reads as one changed record");

  for (const record of records) {
    const key = record?.key;
    const at = `registry/${key ?? "(no key)"}`;
    if (typeof key !== "string" || !key) {
      errors.push(`${at}: a record needs a non-empty \`key\``);
      continue;
    }
    for (const field of ["name", "publisher"])
      if (typeof record[field] !== "string" || !record[field])
        errors.push(`${at}: \`${field}\` must be a non-empty string`);

    if (!ACCESS_CLASSES.includes(record.access_class))
      errors.push(
        `${at}: access class \`${record.access_class}\` is outside the vocabulary (${ACCESS_CLASSES.join(", ")})`,
      );
    if (!RIGHTS_CLASSES.includes(record.rights_class))
      errors.push(
        `${at}: rights class \`${record.rights_class}\` is outside the vocabulary (${RIGHTS_CLASSES.join(", ")})`,
      );
    if (!RIGHTS_BASES.includes(record.rights_basis))
      errors.push(
        `${at}: rights basis \`${record.rights_basis}\` is outside the vocabulary (${RIGHTS_BASES.join(", ")})`,
      );

    if (!Array.isArray(record.metadata_keys)) errors.push(`${at}: \`metadata_keys\` must be an array`);
    else
      for (const alias of [key, ...record.metadata_keys]) {
        const first = claimedBy.get(alias);
        if (first !== undefined && first !== key)
          errors.push(`${at}: key \`${alias}\` is already claimed by \`${first}\`; one key, one record`);
        claimedBy.set(alias, key);
      }

    const targets = record.allowed_targets;
    if (!Array.isArray(targets)) {
      errors.push(`${at}: \`allowed_targets\` must be an array`);
    } else {
      for (const target of targets)
        if (!PUBLICATION_TARGETS.includes(target))
          errors.push(
            `${at}: target \`${target}\` is outside the vocabulary (${PUBLICATION_TARGETS.join(", ")})`,
          );
      if (JSON.stringify(targets) !== JSON.stringify([...new Set(targets)]))
        errors.push(`${at}: \`allowed_targets\` repeats a target`);
      if (NO_TARGET_CLASSES.has(record.rights_class) && targets.length)
        errors.push(
          `${at}: a ${record.rights_class} Source lists ${targets.join(", ")}; it must list none, ` +
            `because the reader answers no for every target and a list that says otherwise is a lie in the file`,
        );
      if (record.refusal && targets.length)
        errors.push(
          `${at}: a refusal is recorded and ${targets.join(", ")} are still listed; a recorded refusal ` +
            `removes every target, so clear the list in the same change`,
        );
      // ADR 0010 reaches `cdn` and `mobile-pack` through what Web and npm already
      // publish. A record that offers an offline copy of something Web does not
      // even serve has no basis in the rule it is standing on.
      for (const downstream of ["cdn", "mobile-pack"])
        if (targets.includes(downstream) && !targets.includes("web"))
          errors.push(
            `${at}: \`${downstream}\` without \`web\`: ADR 0010 clears the offline targets through what ` +
              `Web and npm publish today, so a Source Web does not publish has no basis for them`,
          );
    }

    if (record.refusal) {
      if (!ISO_DATE.test(record.refusal.recorded_on ?? ""))
        errors.push(`${at}: \`refusal.recorded_on\` must be an ISO date`);
      if (typeof record.refusal.summary !== "string" || !record.refusal.summary)
        errors.push(`${at}: \`refusal.summary\` must say what was refused`);
    }

    const attribution = record.attribution;
    if (!attribution || typeof attribution.text !== "string" || !attribution.text)
      errors.push(`${at}: \`attribution.text\` must be the credit line this Source is published with`);

    const evidence = record.evidence;
    if (!evidence || typeof evidence !== "object") {
      errors.push(`${at}: \`evidence\` must record what the classification was read from`);
    } else {
      if (!evidence.source_url && !evidence.repo_path)
        errors.push(
          `${at}: \`evidence\` needs a public \`source_url\` or a committed \`repo_path\`; a classification ` +
            `nobody can check is not evidence`,
        );
      if (!ISO_DATE.test(evidence.retrieved_at ?? ""))
        errors.push(`${at}: \`evidence.retrieved_at\` must be an ISO date: terms change, so a URL alone is not durable`);
      if (evidence.repo_path && !existsSync(join(REPO_ROOT, evidence.repo_path)))
        errors.push(`${at}: \`evidence.repo_path\` ${evidence.repo_path} is not in the repository`);
    }

    if (!ISO_DATE.test(record.review_after ?? ""))
      errors.push(`${at}: \`review_after\` must be an ISO date: a classification with no review date never expires`);
  }
  return errors;
}
