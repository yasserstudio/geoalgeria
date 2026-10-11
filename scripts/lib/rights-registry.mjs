// The repository gate over the Source rights registry in
// packages/schema/rights/registry.json.
//
// Two rules, and the reason each one exists:
//
//  1. Every Source key a package publishes resolves to a registry record. Until
//     this check existed, a fetcher could add a Source and nothing would notice:
//     `metadata.sources[]` is free text, the schema validator reads its shape and
//     not its rights, and the release machinery publishes whatever validated. So
//     the fail-closed rule has to be a scan of what is on disk rather than a
//     declaration anyone keeps by hand, the same reason the licence rule reads
//     every descriptor instead of a list. The scan reads every published .json
//     and .geojson at any depth, because reading only the top level of the
//     metadata-named files missed seven Sources sitting one level down in two
//     ordinary data files.
//  2. The registry itself stays inside its vocabulary, and its records stay
//     consistent with the publication rule. A record whose rights class is a typo
//     reads as a classification and clears nothing, which would silently empty a
//     release; a `restricted-research` record carrying targets, or a refused
//     Source still listing them, is a contradiction that must not sit in the file
//     waiting for a reader that trusts it.
//
// The registry data and the reader live under packages/schema but are not part of
// that package's surface: the Content release generator reads them by path from a
// pinned data checkout, and this module is the data repository's enforcement of
// them.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ACCESS_CLASSES,
  NEVER_CLEARED_RIGHTS_CLASSES,
  PUBLICATION_TARGETS,
  RIGHTS_BASES,
  RIGHTS_CLASSES,
  rightsRecordFor,
  rightsRegistry,
} from "../../packages/schema/src/rights.js";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Is this string meant as a Source key rather than a citation?
 *
 * `sources` and `source` are overloaded in this repository and carry both:
 *
 *   sources: [{ key: "jora-25-2026", name: ..., url: ... }]  a provenance block
 *   sources: ["yalidine", "guepex"]                          record-level keys
 *   sources: ["JORA n 25 (2026), law 26-06 art. 7, p. 4"]    a prose citation
 *   source:  "msp+osm"                                       record-level keys
 *   source:  "https://www.parisaeroport.fr/"                 a per-leg citation
 *
 * The test is what a citation always has and a key never does: whitespace, a
 * slash, a colon, or nothing but digits. Everything else is meant as a key and
 * must resolve, which is the fail-closed direction. An earlier version also
 * required lowercase, and that read `OSM`, `Wikidata` and the `OSM` half of
 * `msp+OSM` as prose and classified none of them.
 */
const looksLikeSourceKey = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  !/\s/.test(value) &&
  !value.includes("/") &&
  !value.includes(":") &&
  !/^\d+$/.test(value);

/**
 * The shape every registered key is written in. Narrower than
 * `looksLikeSourceKey`, which decides what has to resolve; this decides what may
 * be registered, so a record cannot introduce a key spelled in a way the data
 * would not match.
 */
const IS_SOURCE_KEY = /^[a-z0-9][a-z0-9_.-]*$/;

/** The marker a source entry with no `key` is reported under. */
const NO_KEY = "(no key)";

/**
 * Every Source key one published document declares, first occurrence kept.
 *
 * Read at any depth, in both shapes, because both appear nested: a `sources`
 * array (of provenance objects with a `key`, or of bare keys on a record), and a
 * record's own `source` string, which may name several keys joined by `+`. A
 * value that is not key-shaped is a citation and contributes nothing; a
 * provenance object with no `key` at all is reported, because that is a Source
 * nobody can look up rather than a citation.
 * @param {unknown} document parsed JSON
 * @param {string} where the path to name in an error
 * @returns {{where: string, key: string}[]}
 */
export function sourceRefsInDocument(document, where) {
  const keys = new Set();
  const add = (value) => {
    if (looksLikeSourceKey(value)) keys.add(value);
  };
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value.sources))
      for (const source of value.sources) {
        if (typeof source === "string") add(source);
        else if (source && typeof source === "object")
          keys.add(typeof source.key === "string" && source.key ? source.key : NO_KEY);
      }
    // The whole value decides citation or keys, then every part is a key: a
    // citation never survives the split, and `msp+OSM` is two keys, not one.
    if (looksLikeSourceKey(value.source)) for (const part of value.source.split("+")) add(part);
    for (const [name, child] of Object.entries(value)) if (name !== "sources") walk(child);
  };
  walk(document);
  return [...keys].map((key) => ({ where, key }));
}

/**
 * Every Source key declared by every published .json and .geojson under each
 * package's `data/`, with the file that declares it. Discovered rather than
 * listed: the point is to read what ships.
 * @param {string} packagesDir
 * @returns {{where: string, key: string}[]}
 */
export function packageSourceRefs(packagesDir) {
  const refs = [];
  for (const pkg of readdirSync(packagesDir).sort()) {
    const dir = join(packagesDir, pkg);
    if (!existsSync(join(dir, "package.json"))) continue;
    const read = (path, rel) => {
      let document;
      try {
        document = JSON.parse(readFileSync(path, "utf-8"));
      } catch {
        return; // the licence and schema checks report a malformed file
      }
      refs.push(...sourceRefsInDocument(document, `${pkg}/${rel}`));
    };
    // The root descriptor is in files[], so npm publishes it: a Source named
    // only there would ship unclassified.
    const descriptor = join(dir, "dataset-metadata.json");
    if (existsSync(descriptor)) read(descriptor, "dataset-metadata.json");
    const dataDir = join(dir, "data");
    if (!existsSync(dataDir)) continue;
    const walk = (current) => {
      for (const entry of readdirSync(current).sort()) {
        const path = join(current, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(json|geojson)$/.test(entry)) continue;
        read(path, relative(dir, path).split(sep).join("/"));
      }
    };
    walk(dataDir);
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
    if (typeof key !== "string" || !key || key === NO_KEY) {
      errors.push(`${where}: a source has no \`key\`, so its rights cannot be looked up`);
      continue;
    }
    if (!rightsRecordFor(key, registry))
      errors.push(
        `${where}: source \`${key}\` resolves to no single record in the Source rights registry ` +
          `(packages/schema/rights/registry.json): add a record, or list the key under an existing ` +
          `record's \`metadata_keys\``,
      );
  }
  return errors;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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
    const at = `registry/${key ?? NO_KEY}`;
    if (typeof key !== "string" || !key) {
      errors.push(`${at}: a record needs a non-empty \`key\``);
      continue;
    }
    if (!IS_SOURCE_KEY.test(key))
      errors.push(
        `${at}: the record key \`${key}\` is not key-shaped (${IS_SOURCE_KEY.source}), so the data that ` +
          `names it would never match this record`,
      );
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
        if (alias !== key && !IS_SOURCE_KEY.test(alias))
          errors.push(
            `${at}: metadata key \`${alias}\` is not key-shaped (${IS_SOURCE_KEY.source}), so the data ` +
              `that names it would never match this record`,
          );
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
      if (NEVER_CLEARED_RIGHTS_CLASSES.includes(record.rights_class) && targets.length)
        errors.push(
          `${at}: a ${record.rights_class} Source lists ${targets.join(", ")}; it must list none, ` +
            `because the reader answers no for every target and a list that says otherwise is a lie in the file`,
        );
      if (record.refusal && targets.length)
        errors.push(
          `${at}: a refusal is recorded and ${targets.join(", ")} are still listed; a recorded refusal ` +
            `removes every target, so clear the list in the same change`,
        );
      // `cdn` and `mobile-pack` are cleared through what Web *and* npm already
      // publish. A record that offers an offline copy of something one of them
      // does not carry has no basis for it.
      const missing = ["web", "npm"].filter((upstream) => !targets.includes(upstream));
      if (missing.length)
        for (const downstream of ["cdn", "mobile-pack"])
          if (targets.includes(downstream))
            errors.push(
              `${at}: \`${downstream}\` needs \`web\` and \`npm\`, and ${missing.join(" and ")} ` +
                `${missing.length > 1 ? "are" : "is"} missing: the offline targets are cleared only through ` +
                `what Web and npm publish today`,
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
        errors.push(
          `${at}: \`evidence.retrieved_at\` must be an ISO date: terms change, so a URL alone is not durable`,
        );
      if (evidence.repo_path && !existsSync(join(REPO_ROOT, evidence.repo_path)))
        errors.push(`${at}: \`evidence.repo_path\` ${evidence.repo_path} is not in the repository`);
    }

    if (!ISO_DATE.test(record.review_after ?? ""))
      errors.push(`${at}: \`review_after\` must be an ISO date: a classification with no review date never expires`);
  }
  return errors;
}

/**
 * Warnings (empty when every classification is current) for review dates that
 * have passed.
 *
 * A warning and not an error on purpose: a stale classification is a real
 * problem, and failing the build for it would redden CI on a day nobody changed
 * anything, which teaches people to ignore the gate that does matter.
 * @param {object} [registry]
 * @param {Date} [now]
 * @returns {string[]}
 */
export function registryWarnings(registry = rightsRegistry(), now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const warnings = [];
  for (const record of registry?.sources ?? []) {
    const due = record?.review_after;
    if (ISO_DATE.test(due ?? "") && due < today)
      warnings.push(
        `registry/${record.key}: review_after ${due} has passed; re-read the Source's terms and set a new date`,
      );
  }
  return warnings;
}
