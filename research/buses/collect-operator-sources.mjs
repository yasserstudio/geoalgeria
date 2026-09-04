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
    id: "etus-bejaia-lines-api",
    operator_id: "etus-bejaia",
    kind: "official_api",
    url: "https://etusbejaia.dz/wp-json/wp/v2/pages?slug=itineraires-et-plans-des-lignes&_fields=id,modified,link,content",
    filename: "etus-bejaia-lines-api.json",
    expected_text: "ligne5",
    reuse_status: "factual_reference_no_open_license",
  },
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
      kind: "official_api",
      url: `https://etusbejaia.dz/wp-json/wp/v2/pages?slug=ligne${ref}&_fields=id,modified,link,title,content`,
      filename: `etus-bejaia-line-${ref}.json`,
      line_ref: ref,
      expected_text: mapId,
      reuse_status: "factual_reference_no_open_license",
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
  ...[
    ["1", "circulation", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/1.png"],
    ["1", "weekday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/9.png"],
    ["1", "friday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/10.png"],
    ["2", "circulation", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/0.png"],
    ["2", "weekday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/10-1.png"],
    ["2", "friday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/13.png"],
    ["3", "circulation", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/8.png"],
    ["3", "weekday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/10-2.png"],
    ["3", "friday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/13-1.png"],
    ["3", "saturday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/15.png"],
    ["4", "circulation", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/8-1.png"],
    ["4", "weekday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/11.png"],
    ["4", "friday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/14.png"],
    ["5", "outbound-circulation", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/8.png"],
    ["5", "outbound-weekday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/11.png"],
    ["5", "outbound-friday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/13.png"],
    ["5", "inbound-circulation", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/8_(1).png"],
    ["5", "inbound-weekday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/imported_from_media_libray/Circulation-1.png"],
    ["5", "inbound-friday", "https://etusbejaia.dz/wp-content/uploads/photo-gallery/13_(1).png"],
  ].map(([ref, panel, url]) => ({
    id: `etus-bejaia-line-${ref}-timetable-${panel}`,
    operator_id: "etus-bejaia",
    kind: "official_timetable_image",
    url,
    filename: `etus-bejaia-line-${ref}-timetable-${panel}.png`,
    line_ref: ref,
    reuse_status: "validation_only_all_rights_reserved",
  })),
  {
    id: "etus-msila-home",
    operator_id: "etus-msila",
    kind: "official_page",
    url: "https://etus-msila.dz/",
    filename: "etus-msila-home.html",
    expected_text: "la-ligne-16",
    reuse_status: "validation_only_all_rights_reserved",
  },
  ...[
    ["17", "la-ligne-10", "1704874759-1778.png"],
    ["11", "la-ligne-11", "1707397788-ligne11.png"],
    ["12", "la-ligne-12", "1707397652-lgn%2012.png"],
    ["16", "la-ligne-16", "1707397946-ligne16.png"],
  ].flatMap(([ref, slug, image]) => [
    {
      id: `etus-msila-line-${ref}-page`,
      operator_id: "etus-msila",
      kind: "official_page",
      url: `https://etus-msila.dz/page/${slug}`,
      filename: `etus-msila-line-${ref}.html`,
      line_ref: ref,
      expected_text: `La ligne ${ref}`,
      reuse_status: "validation_only_all_rights_reserved",
    },
    {
      id: `etus-msila-line-${ref}-diagram`,
      operator_id: "etus-msila",
      kind: "official_route_diagram",
      url: `https://etus-msila.dz/uploads/img/photo/${image}`,
      filename: `etus-msila-line-${ref}-diagram.png`,
      line_ref: ref,
      reuse_status: "validation_only_all_rights_reserved",
    },
  ]),
  {
    id: "etus-msila-line-17-stop-diagram",
    operator_id: "etus-msila",
    kind: "official_route_diagram",
    url: "https://etus-msila.dz/uploads/img/photo/1704873204-17.png",
    filename: "etus-msila-line-17-stop-diagram.png",
    line_ref: "17",
    reuse_status: "validation_only_all_rights_reserved",
  },
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
  if (["official_timetable_image", "official_route_diagram"].includes(source.kind)
    && !body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error(`${source.id}: response is not PNG`);
  }
  if (["official_page", "third_party_app_listing", "legacy_journey_planner_page"].includes(source.kind) && !/<html\b/i.test(text)) {
    throw new Error(`${source.id}: response is not HTML`);
  }
  if (source.kind === "official_api") {
    const rows = JSON.parse(text);
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0]?.link || !rows[0]?.content?.rendered) {
      throw new Error(`${source.id}: unexpected WordPress REST payload`);
    }
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
