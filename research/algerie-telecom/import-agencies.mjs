#!/usr/bin/env node
// Imports a response obtained through the operator's normal search flow.
// Research output only: no network calls, package emission, or publication.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBoundaries, pointInGeometry, WILAYA_CODES } from "../../packages/schema/index.js";
import { captureSha256, writeCapture } from "../../scripts/lib/source-store.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const endpoint = "https://www.algerietelecom.dz/ar/trouver_mon-agence-search";
const hash = (value) => createHash("sha256").update(value).digest("hex");

export function parseCoordinate(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^[+-]?\s*\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const number = Number(value.trim().replace(/^([+-])\s+/, "$1").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function reviewResponse(input, boundaries) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input?.retrieved_at ?? "") ||
      !Number.isFinite(Date.parse(input.retrieved_at)) ||
      new Date(input.retrieved_at).toISOString().slice(0, 10) !== input.retrieved_at) {
    throw new Error("retrieved_at must be the actual retrieval date (YYYY-MM-DD)");
  }
  if (!Number.isInteger(input.source_wilaya) || input.source_wilaya < 1 || input.source_wilaya > 58 ||
      typeof input.source_commune !== "string" ||
      (!input.source_commune.trim() && !(input.source_commune === "" &&
        (input.response?.commune === "" || input.response?.commune === null)))) {
    throw new Error("Supply the source wilaya (1–58) and selected commune label/value");
  }
  if (input.response?.resultat !== "ok" || !Array.isArray(input.response.content)) {
    throw new Error("Expected a successful locator JSON response; errors are not empty directories");
  }
  if (!(boundaries instanceof Map) || !boundaries.size) throw new Error("Wilaya polygons required");
  const receipt = captureSha256(input);
  const coordinates = new Map();
  const sourceIds = new Set();
  const candidates = input.response.content.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
        !["type", "adresse", "latitude", "longitude"].every((key) => Object.hasOwn(raw, key))) {
      throw new Error(`Agency ${index}: response does not match the observed locator contract`);
    }
    if (raw.code_wilaya != null && Number(raw.code_wilaya) !== input.source_wilaya) {
      throw new Error(`Agency ${index}: source wilaya contradicts the supplied search scope`);
    }
    const sourceId = raw.id == null ? null : String(raw.id).trim();
    if (sourceId !== null) {
      if (!/^\d+$/.test(sourceId) || sourceIds.has(sourceId)) throw new Error(`Agency ${index}: invalid or duplicate source id`);
      sourceIds.add(sourceId);
    }
    const lat = parseCoordinate(raw.latitude);
    const lng = parseCoordinate(raw.longitude);
    const valid = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const containing = valid ? [...boundaries]
      .filter(([, geometry]) => pointInGeometry(lng, lat, geometry)).map(([code]) => code).sort() : [];
    const reasons = [];
    if (!valid) reasons.push("invalid_coordinate");
    else if (!containing.length) reasons.push("outside_all_wilaya_boundaries");
    else if (containing.length > 1) reasons.push("ambiguous_wilaya_boundary");
    else if (containing[0] !== String(input.source_wilaya).padStart(2, "0")) reasons.push("source_wilaya_mismatch");
    if (typeof raw.adresse !== "string" || !raw.adresse.trim()) reasons.push("missing_address");
    if (typeof raw.type !== "string" || !raw.type.trim()) reasons.push("missing_type");
    if (typeof raw.commune === "string" && /NON\s+OPERATIONNEL/i.test(raw.commune.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
      reasons.push("non_operational");
    }
    const candidate = {
      // Keep receipt-local identity alongside the operator's ID, when supplied.
      candidate_id: `${receipt}:${index}`,
      source_id: sourceId,
      raw: structuredClone(raw),
      lat: valid ? lat : null, lng: valid ? lng : null,
      geo_precision: valid ? "exact" : null,
      geo_method: valid ? "operator_point" : null,
      containing_wilayas: containing, reasons,
    };
    if (valid) {
      const key = `${lat},${lng}`;
      if (!coordinates.has(key)) coordinates.set(key, []);
      coordinates.get(key).push(candidate);
    }
    return candidate;
  });
  for (const group of coordinates.values()) {
    if (group.length > 1) for (const candidate of group) candidate.reasons.push("shared_coordinate");
  }
  return {
    usage: "internal-review-only", source_url: endpoint,
    retrieved_at: input.retrieved_at, source_wilaya: input.source_wilaya,
    search_scope: input.source_commune === "" ? "wilaya" : "commune",
    source_commune: input.source_commune, source_sha256: receipt,
    count: candidates.length, flagged: candidates.filter((row) => row.reasons.length).length,
    candidates,
  };
}

const scopeFor = (input) => input.source_commune === "" ? `wilaya-${input.source_wilaya}-all` :
  `wilaya-${input.source_wilaya}-commune-${hash(input.source_commune).slice(0, 16)}`;

export function reviewBatch(input, boundaries) {
  const inputs = Array.isArray(input) ? input : [input];
  if (!inputs.length) throw new Error("No response envelopes supplied");
  const scopes = new Set();
  return inputs.map((envelope) => {
    const review = reviewResponse(envelope, boundaries);
    const scope = scopeFor(envelope);
    if (scopes.has(scope)) throw new Error(`Duplicate search scope: ${scope}`);
    scopes.add(scope);
    return { input: envelope, review, scope };
  });
}

function main() {
  if (process.argv.length !== 3) throw new Error("Usage: node import-agencies.mjs <response-envelope.json>");
  const input = JSON.parse(readFileSync(resolve(process.argv[2]), "utf8"));
  const boundaryBytes = readFileSync(join(here, "../../packages/dataset/data/geojson/wilaya-boundaries.geojson"));
  const boundaries = loadBoundaries(JSON.parse(boundaryBytes));
  if (boundaries.size !== WILAYA_CODES.length || WILAYA_CODES.some((code) => !boundaries.has(code))) {
    throw new Error("Incomplete wilaya polygons");
  }
  // Validate the entire batch before writing any scope.
  const batch = reviewBatch(input, boundaries);
  mkdirSync(join(here, "review"), { recursive: true });
  for (const { input: envelope, review, scope } of batch) {
    writeCapture("algerie-telecom", scope, envelope, {
      provenance: "owner_supplied_artifact", retrieved: envelope.retrieved_at, records: review.count,
      note: `User-supplied response from ${endpoint}; scope ${envelope.source_wilaya}/${envelope.source_commune}. Not independently fetched.`,
    });
    writeFileSync(join(here, "review", `${scope}.json`), `${JSON.stringify({ ...review, boundary_sha256: hash(boundaryBytes) }, null, 2)}\n`);
  }
  const completed = [], pending = [];
  for (let code = 1; code <= 58; code++) {
    const path = join(here, "review", `wilaya-${code}-all.json`);
    if (existsSync(path)) {
      const review = JSON.parse(readFileSync(path, "utf8"));
      completed.push({ source_wilaya: code, count: review.count, flagged: review.flagged, retrieved_at: review.retrieved_at });
    } else pending.push(code);
  }
  writeFileSync(join(here, "review", "national-status.json"), `${JSON.stringify({ usage: "internal-review-only", expected_source_wilayas: 58, complete: pending.length === 0, completed, pending }, null, 2)}\n`);
  console.log(`${completed.length}/58 source wilayas captured; ${pending.length} pending. Research only.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
