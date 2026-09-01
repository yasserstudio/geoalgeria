#!/usr/bin/env node
/**
 * Capture public operator/source evidence for the local bus feasibility audit.
 * Lossless response captures stay under the ignored research/buses/osm/ directory;
 * they are not package inputs and must not be published without a source-rights
 * review.
 *
 * Usage:
 *   node research/buses/collect-operator-sources.mjs
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";
import { stableStringify } from "../../scripts/lib/source-store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(HERE, "osm", "operator-sources");
const MANIFEST = join(OUTPUT, "manifest.json");
const json = (value) => `${stableStringify(value)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceSpecSha256 = (source) => sha256(stableStringify(source));

const sources = [
  {
    id: "etus-tiaret-lines",
    operator_id: "etus-tiaret",
    kind: "official_page",
    url: "https://www.etus-tiaret.dz/ar/lines",
    filename: "etus-tiaret-lines.html",
    expected_text: "data-page=",
    reuse_status: "validation_only_all_rights_reserved",
  },
  {
    id: "etusto-home",
    operator_id: "etusto",
    kind: "official_page",
    url: "http://etusto.dz/",
    filename: "etusto-home.html",
    expected_text: "ETUSTO",
  },
  {
    id: "etusto-passenger-lines",
    operator_id: "etusto",
    kind: "official_page",
    url: "http://etusto.dz/espv.html",
    filename: "etusto-passenger-lines.html",
    expected_text: "TIMIZART LOGHBAR",
  },
  ...[
    ["1", "1lSsQzOo8pZY7ayY3y97O_X5Pn1_LkCc", "ADRAR OUFARNOU"],
    ["2", "1VK-8bdLxv9AC0zifGTHiTNpYkadihcc", "UNIVERSITE"],
    ["3", "1sTCj6svdW1NKRiplo19ZnBAxfB_N5C4", "BVD AMIROUCHE"],
    ["4", "1_hnbjP6GLHh9pMQHiO7l5eiaTtkE8jw", "SIDI AHMED"],
    ["5", "1YX4Zd8vFfkPXSMeXOfuo1IlDtcmSe-4", "IGHER OUZARIF"],
  ].flatMap(([ref, mapId, destination]) => [
    {
      id: `etus-bejaia-line-${ref}-page`,
      operator_id: "etus-bejaia",
      kind: "official_page",
      url: `https://etusbejaia.dz/ligne${ref}/`,
      filename: `etus-bejaia-line-${ref}.html`,
      line_ref: ref,
      expected_text: mapId,
    },
    {
      id: `etus-bejaia-line-${ref}-kml`,
      operator_id: "etus-bejaia",
      kind: "official_embedded_map_export",
      url: `https://www.google.com/maps/d/kml?mid=${mapId}&forcekml=1`,
      filename: `etus-bejaia-line-${ref}.kml`,
      line_ref: ref,
      map_id: mapId,
      expected_text: destination,
    },
  ]),
  {
    id: "etus-mascara-lines",
    operator_id: "etus-mascara",
    kind: "official_page",
    url: "http://etusmascara.dz/exploi.html",
    filename: "etus-mascara-lines.html",
    expected_text: "1tmHKvSMzC04PYwZt2r_VG6XJwN-qZfs",
  },
  ...[
    ["08", "1tmHKvSMzC04PYwZt2r_VG6XJwN-qZfs"],
    ["02", "1PMwuGBYJVHV88V_oSxgRgQVUFtL-vyg"],
    ["16", "15KGgyUDuLcWrYoxMz1kCtz8x8t8bAdg"],
    ["01", "1yX3CZ7j9YHPzUcu9_8DDiCrg6OJcvlg"],
    ["17", "1ZuSudpU1FQHw3d6c3NLXUSCxIKp2viQ"],
    ["05", "1tPlHDmps5ta7q6vtL-xxorfkIgg6g4I"],
  ].map(([ref, mapId]) => ({
    id: `etus-mascara-line-${ref}-kml`,
    operator_id: "etus-mascara",
    kind: "official_embedded_map_export",
    url: `https://www.google.com/maps/d/kml?mid=${mapId}&forcekml=1`,
    filename: `etus-mascara-line-${ref}.kml`,
    line_ref: ref,
    map_id: mapId,
  })),
  {
    id: "etus-souk-ahras-network",
    operator_id: "etus-souk-ahras",
    kind: "official_page",
    url: "http://etus-soukahras.dz/#chabaka",
    filename: "etus-souk-ahras-network.html",
    expected_text: "شبكة الخطوط",
  },
  {
    id: "etus-oran-server",
    operator_id: "etus-oran",
    kind: "official_public_tracker_metadata",
    url: "https://gps.etusoran.dz/api/server",
    filename: "etus-oran-server.json",
  },
  ...[
    ["setifis-bus", "etus-setif", "org.bussetif.manager", "Setifis BUS"],
    ["cirta-bus", "etusc-constantine", "org.buscirta.manager", "Cirta Bus"],
    ["bouna-bus", "etus-annaba", "org.busannaba.manager", "bouna bus"],
    ["kotama-mob", "etus-jijel", "org.busjijel.manager", "KOTAMA Mob"],
    ["bus-rusicada", "etus-skikda", "org.skikdabus.manager", "Bus Rusicada"],
    ["ouargla-bus", "etus-ouargla", "org.ouareglabus.manager", "Ouargla Bus"],
    ["etus-ouargla-pay", "etus-ouargla", "ouargla.routes.devcloud", "Etus Ouargla Pay"],
    ["etus-oran-pay", "etus-oran", "oran.routes.devcloud", "Etus Oran Pay"],
  ].map(([id, operatorId, appId, title]) => ({
    id: `${id}-play-listing`,
    operator_id: operatorId,
    kind: "third_party_app_listing",
    url: `https://play.google.com/store/apps/details?id=${appId}&hl=en`,
    filename: `${id}-play-listing.html.gz`,
    compression: "gzip",
    expected_text: title,
  })),
  {
    id: "dzairtransport-home",
    operator_id: null,
    kind: "legacy_journey_planner_page",
    url: "https://www.dzairtransport.com/",
    filename: "dzairtransport-home.html",
    expected_text: "Cette version n&rsquo;est plus mise à jour",
  },
  {
    id: "dzairtransport-station-search-probe",
    operator_id: null,
    kind: "legacy_public_api_probe",
    url: "https://www.dzairtransport.com/api/dzt-getstops.php?v=6&search=a",
    filename: "dzairtransport-station-search-a.json",
  },
];

function validatePayload(source, body) {
  if (body.length === 0) throw new Error(`${source.id}: empty response`);
  const text = body.toString("utf8");
  if (["official_page", "third_party_app_listing", "legacy_journey_planner_page"].includes(source.kind) && !/<html\b/i.test(text)) {
    throw new Error(`${source.id}: response is not HTML`);
  }
  if (source.kind === "official_embedded_map_export" && !/<kml\b/i.test(text)) {
    throw new Error(`${source.id}: response is not KML`);
  }
  if (source.kind === "official_embedded_map_export" && !/<LineString\b/i.test(text)) {
    throw new Error(`${source.id}: KML has no LineString geometry`);
  }
  if (source.kind === "official_public_tracker_metadata") {
    const metadata = JSON.parse(text);
    if (!String(metadata.attributes?.title ?? "").toLowerCase().includes("etus oran")) {
      throw new Error(`${source.id}: unexpected tracker metadata`);
    }
  }
  if (source.kind === "legacy_public_api_probe") {
    const rows = JSON.parse(text);
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 100
      || rows.some((row) => !row.scode || !row.sname || !row.cname || !row.ltype)) {
      throw new Error(`${source.id}: unexpected bounded station response`);
    }
  }
  if (source.expected_text && !text.toLowerCase().includes(source.expected_text.toLowerCase())) {
    throw new Error(`${source.id}: expected source identity text is missing`);
  }
}

async function capture(source) {
  const response = await fetch(source.url, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
    headers: {
      "user-agent": "GeoAlgeria bus-source audit (https://github.com/yasserstudio/geoalgeria)",
    },
  });
  if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);

  const body = Buffer.from(await response.arrayBuffer());
  validatePayload(source, body);
  const storedBody = source.compression === "gzip" ? gzipSync(body, { level: 9 }) : body;
  writeFileSync(join(OUTPUT, source.filename), storedBody);

  return {
    id: source.id,
    operator_id: source.operator_id,
    kind: source.kind,
    line_ref: source.line_ref ?? null,
    map_id: source.map_id ?? null,
    source_url: source.url,
    final_url: response.url,
    filename: source.filename,
    retrieved_at: new Date().toISOString(),
    status: response.status,
    content_type: response.headers.get("content-type"),
    bytes: storedBody.length,
    sha256: sha256(storedBody),
    payload_bytes: body.length,
    payload_sha256: sha256(body),
    local_compression: source.compression ?? null,
    source_spec_sha256: sourceSpecSha256(source),
    payload_validated: true,
    reuse_status: source.reuse_status ?? "no_open_license_found",
  };
}

mkdirSync(OUTPUT, { recursive: true });
const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : null;
const sourceIds = new Set(sources.map((source) => source.id));
const receipts = new Map((previous?.responses ?? [])
  .filter((receipt) => sourceIds.has(receipt.id))
  .map((receipt) => [receipt.id, receipt]));
const failures = [];

function verifiedCachedReceipt(source) {
  const receipt = receipts.get(source.id);
  const filename = join(OUTPUT, source.filename);
  if (!receipt || !existsSync(filename)) return null;
  const storedBody = readFileSync(filename);
  const bodySha256 = sha256(storedBody);
  if (receipt.source_spec_sha256 !== sourceSpecSha256(source)
    || receipt.filename !== source.filename || receipt.bytes !== storedBody.length || receipt.sha256 !== bodySha256) return null;
  const body = source.compression === "gzip" ? gunzipSync(storedBody) : storedBody;
  if (receipt.payload_bytes !== body.length || receipt.payload_sha256 !== sha256(body)) return null;
  validatePayload(source, body);
  return receipt;
}

function writeManifest() {
  const missing = sources.filter((source) => !receipts.has(source.id)).map((source) => source.id);
  const manifest = {
    generated_at: new Date().toISOString(),
    collection_status: missing.length > 0
      ? "partial"
      : failures.length > 0 ? "complete_with_verified_cache" : "complete",
    note: "Local research evidence only. Public access does not grant republication rights; no open license was found for these operator sources.",
    response_count: receipts.size,
    expected_response_count: sources.length,
    missing,
    failures,
    responses: [...receipts.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
  writeFileSync(MANIFEST, json(manifest));
  return manifest;
}

for (const source of sources) {
  try {
    if (receipts.has(source.id) && !verifiedCachedReceipt(source)) receipts.delete(source.id);
  } catch {
    receipts.delete(source.id);
  }
}
writeManifest();

for (const source of sources) {
  try {
    const receipt = await capture(source);
    receipts.set(receipt.id, receipt);
    console.log(`${receipt.id}: ${receipt.bytes} bytes`);
  } catch (error) {
    const cached = verifiedCachedReceipt(source);
    const failure = {
      id: source.id,
      error: error instanceof Error ? error.message : String(error),
      reused_verified_cache: Boolean(cached),
      cached_retrieved_at: cached?.retrieved_at ?? null,
    };
    failures.push(failure);
    console.warn(`${source.id}: fetch failed${cached ? "; kept verified cache" : ""}`);
    if (!cached) receipts.delete(source.id);
  }
  writeManifest();
}

const manifest = writeManifest();
console.log(`Manifest: research/buses/osm/operator-sources/manifest.json (${manifest.response_count}/${manifest.expected_response_count} responses, ${manifest.collection_status})`);
if (manifest.missing.length > 0) process.exitCode = 1;
