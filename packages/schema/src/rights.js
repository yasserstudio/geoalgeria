// The Source rights registry: one record per Source, and the one question a
// publisher asks of it.
//
// Rights lived as free text. `metadata.sources[].license` carries sentences like
// "Factual public listing (ANEM)" and "Data (c) SOGRAL; redistributed for
// reference", which read as terms but grant nothing, so a generator had nothing
// to refuse on: it could put any Source into any artifact and every check stayed
// green. The registry moves that decision into data, keyed by the Source key the
// packages already use, and `isSourceClearedFor` is the whole interface a
// generator needs.
//
// NOT part of the @geoalgeria/schema package surface: the entry point never
// reaches this module, and `rights/registry.json` is excluded from the published
// files, because the registry is a repository file. Consumers import this module
// by path from a pinned data checkout, which is also how the Content release
// generator reads it.
//
// Every default here FAILS CLOSED, which is the opposite of
// `evidenceForSourceKey` in build.js and deliberately so: an unknown Source, a
// key two records claim, an unknown rights class, an unknown target, a malformed
// registry or a recorded refusal all answer "not cleared". The cost of a false
// "no" is a Sector missing from a release, which is visible and fixable; the cost
// of a false "yes" is an unlicensed copy on a phone that cannot be withdrawn
// until that phone activates a newer release.
//
// Vocabulary and the initial classification come from the project's governance
// review and ADR 0010: a Source that Web and npm publish today may also enter
// `cdn` and `mobile-pack`; `restricted-research`, `prohibited` and third-party
// tiles stay out of every target; a recorded refusal removes every target.

import { readFileSync } from "node:fs";

/** How the Source is reached. Says nothing about reuse: the two are separate facts. */
export const ACCESS_CLASSES = [
  "public-access",
  "account-access",
  "permissioned-access",
  "private-research",
];

/** What GeoAlgeria may do with the Source. `public-domain-or-cc0` is the
 *  governance review's token for the class sometimes shorthanded as
 *  "public-domain"; one class, one name. */
export const RIGHTS_CLASSES = [
  "open-licensed",
  "public-domain-or-cc0",
  "permissioned",
  "rights-unconfirmed",
  "restricted-research",
  "prohibited",
];

/** Why the rights class is what it is. `none-recorded` is the honest value for a
 *  Source whose terms were read and found to grant nothing. */
export const RIGHTS_BASES = [
  "licence",
  "public-domain-statement",
  "written-grant",
  "provider-terms",
  "none-recorded",
];

/** The publication targets a record can allow.
 *  `web` geoalgeria.com · `npm` the published packages · `cdn` the signed Content
 *  release on cdn.geoalgeria.com · `mobile-pack` an offline catalog on a device ·
 *  `live` the app's Live layer, served fresh rather than from a release. */
export const PUBLICATION_TARGETS = ["web", "npm", "cdn", "mobile-pack", "live"];

/** Rights classes that clear no target at all, whatever a record's
 *  `allowed_targets` says. Enforced here and not only in validation, so a
 *  hand-edited registry cannot talk the reader into a yes. */
export const NEVER_CLEARED_RIGHTS_CLASSES = ["restricted-research", "prohibited"];

const REGISTRY_URL = new URL("../rights/registry.json", import.meta.url);

let cached;

/**
 * The registry as it stands in this repository. Read once, lazily.
 * @returns {{version: number, updated: string, sources: object[]}}
 */
export function rightsRegistry() {
  if (!cached) cached = JSON.parse(readFileSync(REGISTRY_URL, "utf-8"));
  return cached;
}

/** A registry's records, or [] when it carries none that can be read. */
const recordsOf = (registry) => (Array.isArray(registry?.sources) ? registry.sources : []);

/**
 * The record for a Source key, or null. A record's own `key` and every key in
 * its `metadata_keys` resolve to it, because one Source is captured under
 * several keys: `osm`, `osm-communes` and `osm-admin-centre-2026-09-29` are
 * three captures of OpenStreetMap, not three Sources with three sets of rights.
 *
 * A key two records claim resolves to **neither**. Ambiguity is not a tie to
 * break: the two records can disagree about the class, the targets or a refusal,
 * and taking the first match would make the answer depend on the order of the
 * file. Validation reports the clash; until it is fixed, nothing is cleared.
 * @param {string} sourceKey
 * @param {{sources?: object[]}} [registry]
 * @returns {object|null}
 */
export function rightsRecordFor(sourceKey, registry = rightsRegistry()) {
  if (typeof sourceKey !== "string" || !sourceKey) return null;
  let found = null;
  for (const record of recordsOf(registry)) {
    const claims =
      record?.key === sourceKey ||
      (Array.isArray(record?.metadata_keys) && record.metadata_keys.includes(sourceKey));
    if (!claims) continue;
    if (found && found !== record) return null;
    found = record;
  }
  return found;
}

/**
 * Is this Source cleared for this target? The only question the registry
 * answers, and the gate the Content release build runs on every selected Source.
 * @param {string} sourceKey a Source key, as a package's metadata.sources[].key spells it
 * @param {"web"|"npm"|"cdn"|"mobile-pack"|"live"} target
 * @param {{sources?: object[]}} [registry]
 * @returns {boolean} true only when a record says so and nothing overrides it
 */
export function isSourceClearedFor(sourceKey, target, registry = rightsRegistry()) {
  if (!PUBLICATION_TARGETS.includes(target)) return false;
  const record = rightsRecordFor(sourceKey, registry);
  if (!record) return false;
  if (!RIGHTS_CLASSES.includes(record.rights_class)) return false;
  if (NEVER_CLEARED_RIGHTS_CLASSES.includes(record.rights_class)) return false;
  // A refusal is a fact about the Source owner's will, not a target list to
  // edit: once recorded it outranks whatever targets the record still carries.
  if (record.refusal) return false;
  return Array.isArray(record.allowed_targets) && record.allowed_targets.includes(target);
}

/**
 * Every key that resolves to a record cleared for a target, sorted: each cleared
 * record's own key and all of its `metadata_keys`.
 *
 * Alias-aware on purpose. A caller holding a record's `source` value tests it
 * against this set, and a set of record keys alone would answer no for a capture
 * key that is in fact cleared.
 * @param {"web"|"npm"|"cdn"|"mobile-pack"|"live"} target
 * @param {{sources?: object[]}} [registry]
 * @returns {string[]}
 */
export function sourcesClearedFor(target, registry = rightsRegistry()) {
  const keys = new Set();
  for (const record of recordsOf(registry)) {
    if (!isSourceClearedFor(record?.key, target, registry)) continue;
    keys.add(record.key);
    for (const alias of record.metadata_keys ?? [])
      if (isSourceClearedFor(alias, target, registry)) keys.add(alias);
  }
  return [...keys].sort();
}

/**
 * May a dataset enter this target, and if not, which of its Sources stop it?
 * The selection rule a Content release runs per dataset: the dataset enters only
 * if every Source contributing a published field is cleared.
 *
 * Fails closed on metadata that names no Source, because a dataset with no
 * declared provenance has not been cleared, it has merely not been asked.
 * @param {{sources?: {key?: string}[]}} metadata a package's data/metadata.json
 * @param {"web"|"npm"|"cdn"|"mobile-pack"|"live"} target
 * @param {{sources?: object[]}} [registry]
 * @returns {{cleared: boolean, blocking: string[]}} blocking is sorted and deduplicated
 */
export function clearanceForMetadata(metadata, target, registry = rightsRegistry()) {
  const declared = Array.isArray(metadata?.sources) ? metadata.sources : [];
  const blocking = new Set();
  for (const source of declared) {
    const key = typeof source?.key === "string" && source.key ? source.key : null;
    if (!key) blocking.add("(no key)");
    else if (!isSourceClearedFor(key, target, registry)) blocking.add(key);
  }
  return { cleared: declared.length > 0 && blocking.size === 0, blocking: [...blocking].sort() };
}
