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
// Every default here FAILS CLOSED, which is the opposite of
// `evidenceForSourceKey` in build.js and deliberately so: an unknown Source, an
// unknown rights class, an unknown target, a malformed record or a recorded
// refusal all answer "not cleared". The cost of a false "no" is a Sector missing
// from a release, which is visible and fixable; the cost of a false "yes" is an
// unlicensed copy on a phone that cannot be withdrawn until that phone activates
// a newer release.
//
// Vocabulary and the initial classification come from the governance research
// (app docs/research/public-data-governance-and-licensing.md) and ADR 0010:
// a Source that Web and npm publish today may also enter `cdn` and
// `mobile-pack`; `restricted-research`, `prohibited` and third-party tiles stay
// out of every target; a recorded refusal removes every target.

import { readFileSync } from "node:fs";

/** How the Source is reached. Says nothing about reuse: the two are separate facts. */
export const ACCESS_CLASSES = [
  "public-access",
  "account-access",
  "permissioned-access",
  "private-research",
];

/** What GeoAlgeria may do with the Source. `public-domain-or-cc0` is the
 *  governance document's token for the class the tracker shorthands as
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
 * The registry as shipped. Read once, lazily: importing the contract must not
 * cost a file read for the consumers that never ask a rights question.
 * @returns {{version: number, updated: string, sources: object[]}}
 */
export function rightsRegistry() {
  if (!cached) cached = JSON.parse(readFileSync(REGISTRY_URL, "utf-8"));
  return cached;
}

/**
 * The record for a Source key, or null. A record's own `key` and every key in
 * its `metadata_keys` resolve to it, because one Source is captured under
 * several keys: `osm`, `osm-communes` and `osm-admin-centre-2026-09-29` are
 * three captures of OpenStreetMap, not three Sources with three sets of rights.
 * @param {string} sourceKey
 * @param {{sources?: object[]}} [registry]
 * @returns {object|null}
 */
export function rightsRecordFor(sourceKey, registry = rightsRegistry()) {
  if (typeof sourceKey !== "string" || !sourceKey) return null;
  for (const record of registry?.sources ?? []) {
    if (record?.key === sourceKey) return record;
    if (Array.isArray(record?.metadata_keys) && record.metadata_keys.includes(sourceKey)) return record;
  }
  return null;
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
 * Every Source key cleared for a target, record keys only (not their
 * `metadata_keys` aliases), sorted. The set a release's Sector selection is
 * derived from, so adding a permission is one record change.
 * @param {"web"|"npm"|"cdn"|"mobile-pack"|"live"} target
 * @param {{sources?: object[]}} [registry]
 * @returns {string[]}
 */
export function sourcesClearedFor(target, registry = rightsRegistry()) {
  return (registry?.sources ?? [])
    .filter((record) => isSourceClearedFor(record?.key, target, registry))
    .map((record) => record.key)
    .sort();
}
