#!/usr/bin/env node
// Promote only the structured Line payloads used by the package from the
// ignored Operator-site cache into durable, offline-rebuildable Sources.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, "osm", "operator-sources");
const readText = (filename) => readFileSync(join(CACHE, filename), "utf8");
const manifest = JSON.parse(readText("manifest.json"));
const receipt = (id) => {
  const value = manifest.responses.find((item) => item.id === id);
  if (!value?.payload_validated) throw new Error(`Missing validated Operator Source: ${id}`);
  return value;
};
const sourceReceipt = (value) => ({
  url: value.source_url,
  retrieved_at: value.retrieved_at,
  payload_bytes: value.payload_bytes,
  payload_sha256: value.payload_sha256,
});

function decodeHtmlAttribute(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

const tiaretReceipt = receipt("etus-tiaret-lines");
const tiaretHtml = readText(tiaretReceipt.filename);
const dataPage = tiaretHtml.match(/\bdata-page="([^"]+)"/)?.[1];
if (!dataPage) throw new Error("ETUS Tiaret Source has no Inertia data-page payload");
const tiaretPage = JSON.parse(decodeHtmlAttribute(dataPage));
if (tiaretPage.component !== "Website/Lines" || !Array.isArray(tiaretPage.props?.lines)) {
  throw new Error("Unexpected ETUS Tiaret Lines payload");
}
const tiaretLines = tiaretPage.props.lines.map((line) => {
  const stations = tiaretPage.props.content?.[line.name];
  if (!Array.isArray(stations) || stations.length < 2) {
    throw new Error(`ETUS Tiaret Line ${line.name} has no Station sequence`);
  }
  return {
    ref: String(line.name),
    terminus1: stations[0],
    terminus2: stations.at(-1),
    source_receipt: sourceReceipt(tiaretReceipt),
  };
});
if (tiaretLines.map((line) => line.ref).join(",") !== "26,27,28,29,30,31,32") {
  throw new Error("ETUS Tiaret current Line set drifted");
}
writeCapture("buses", "etus-tiaret-lines", tiaretLines, {
  url: tiaretReceipt.source_url,
  retrieved: tiaretReceipt.retrieved_at.slice(0, 10),
  records: tiaretLines.length,
  note: "Structured Inertia props extracted from the official Operator Lines page. Source content is used for identity validation; no open reuse license was found.",
});

const etustoReceipt = receipt("etusto-passenger-lines");
const etustoHtml = readText(etustoReceipt.filename);
const etustoLines = [...etustoHtml.matchAll(
  /<h2>\s*Ligne\s+([^—<]+?)\s*—\s*([^/<]+?)\s*\/\s*([^<]+?)\s*<\/h2>/gi,
)].map((match) => ({
  ref: match[1].trim().replace(/\s+/g, ""),
  terminus1: match[2].trim(),
  terminus2: match[3].trim(),
  geometry: "raster_reference_only",
  source_receipt: sourceReceipt(etustoReceipt),
}));
if (etustoLines.map((line) => line.ref).join(",") !== "1,7,1A,9,6") {
  throw new Error("ETUSTO current Line set drifted");
}
writeCapture("buses", "etusto-lines", etustoLines, {
  url: etustoReceipt.source_url,
  retrieved: etustoReceipt.retrieved_at.slice(0, 10),
  records: etustoLines.length,
  note: "Line identities and endpoints extracted from the official Operator page. Raster maps are validation references only and are not redistributed.",
});

const decodeXml = (value) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'");

const bejaiaIndexReceipt = receipt("etus-bejaia-lines-api");
const bejaiaIndex = JSON.parse(readText(bejaiaIndexReceipt.filename))[0];
const bejaiaLinks = [...bejaiaIndex.content.rendered.matchAll(/href="(https:\/\/etusbejaia\.dz\/ligne(\d)\/)"/g)]
  .map((match) => match[2]);
if ([...new Set(bejaiaLinks)].join(",") !== "1,2,3,4,5") {
  throw new Error("ETUS Béjaïa current Line set drifted");
}

const bejaiaServiceHours = {
  "1": [
    { period: "regular", days: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"], first_departure: "06:30", last_departure: "18:20", operates: true },
    { period: "friday", days: ["friday"], first_departure: null, last_departure: null, operates: false },
  ],
  "2": [
    { period: "regular", days: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"], first_departure: "05:50", last_departure: "18:50", operates: true },
    { period: "friday", days: ["friday"], first_departure: "06:15", last_departure: "18:05", operates: true },
  ],
  "3": [
    { period: "regular", days: ["sunday", "monday", "tuesday", "wednesday", "thursday"], first_departure: "05:50", last_departure: "18:50", operates: true },
    { period: "friday", days: ["friday"], first_departure: "06:15", last_departure: "18:05", operates: true },
    { period: "saturday", days: ["saturday"], first_departure: "06:00", last_departure: "18:50", operates: true },
  ],
  "4": [
    { period: "regular", days: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"], first_departure: "05:50", last_departure: "18:30", operates: true },
    { period: "friday", days: ["friday"], first_departure: "07:00", last_departure: "18:30", operates: true },
  ],
  "5": [
    { period: "regular", days: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"], direction_from: "GARE ROUTIERE", direction_to: "IGHZER OUZARIF", first_departure: "06:30", last_departure: "20:00", operates: true },
    { period: "friday", days: ["friday"], direction_from: "GARE ROUTIERE", direction_to: "IGHZER OUZARIF", first_departure: "06:30", last_departure: "17:30", operates: true },
    { period: "regular", days: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"], direction_from: "IGHZER OUZARIF", direction_to: "GARE ROUTIERE", first_departure: "05:10", last_departure: "20:45", operates: true },
    { period: "friday", days: ["friday"], direction_from: "IGHZER OUZARIF", direction_to: "GARE ROUTIERE", first_departure: "06:45", last_departure: "17:30", operates: true },
  ],
};

const bejaiaTimetablePanels = {
  "1": ["circulation", "weekday", "friday"],
  "2": ["circulation", "weekday", "friday"],
  "3": ["circulation", "weekday", "friday", "saturday"],
  "4": ["circulation", "weekday", "friday"],
  "5": ["outbound-circulation", "outbound-weekday", "outbound-friday", "inbound-circulation", "inbound-weekday", "inbound-friday"],
};

const bejaiaLines = ["1", "2", "3", "4", "5"].map((ref) => {
  const pageReceipt = receipt(`etus-bejaia-line-${ref}-page`);
  const kmlReceipt = receipt(`etus-bejaia-line-${ref}-kml`);
  const pagePayload = JSON.parse(readText(pageReceipt.filename))[0];
  const page = pagePayload.content.rendered;
  const kml = readText(kmlReceipt.filename);
  const title = decodeXml(kml.match(/<Document>[\s\S]*?<name>([^<]+)<\/name>/)?.[1]?.trim() ?? "");
  const endpoints = title.match(/^LIGNE\s+\d+\s*:\s*(.+?)\s*\/\s*(.+)$/i);
  const roundTripKm = page.match(/Longueur de la ligne \(Km\) Aller\/Retour\s*:\s*(?:<strong>)?\s*([\d.,]+)/i)?.[1];
  const stopCount = page.match(/Nombre d.arr(?:êts|ets)(\s+principaux)?\/Ligne\s*:\s*(?:<strong>)?\s*(\d+)/i);
  if (!endpoints || !roundTripKm || !stopCount || !kml.includes("<LineString>")) {
    throw new Error(`Unexpected ETUS Béjaïa Line ${ref} page or KML payload`);
  }
  const normalizeEndpoint = (value) => ({
    "GERE ROUTIERE": "GARE ROUTIERE",
    "IGHER OUZARIF": "IGHZER OUZARIF",
  })[value] ?? value;
  const timetableReceipts = bejaiaTimetablePanels[ref]
    .map((panel) => receipt(`etus-bejaia-line-${ref}-timetable-${panel}`));
  if (timetableReceipts.some((item) => !page.includes(item.source_url))) {
    throw new Error(`ETUS Béjaïa Line ${ref} timetable image is no longer linked by the current page`);
  }
  return {
    ref,
    source_title: title,
    terminus1: normalizeEndpoint(endpoints[1].trim()),
    terminus2: normalizeEndpoint(endpoints[2].trim()),
    round_trip_km: Number(roundTripKm.replace(",", ".")),
    stop_count: Number(stopCount[2]),
    stop_count_kind: stopCount[1] ? "major" : "total",
    page_url: pagePayload.link,
    map_id: kmlReceipt.map_id,
    geometry: "official_embedded_map_reference",
    service_hours: bejaiaServiceHours[ref],
    timetable_receipts: timetableReceipts.map(sourceReceipt),
    page_receipt: sourceReceipt(pageReceipt),
    map_receipt: sourceReceipt(kmlReceipt),
  };
});
writeCapture("buses", "etus-bejaia-lines", bejaiaLines, {
  url: bejaiaIndexReceipt.source_url,
  retrieved: receipt("etus-bejaia-line-1-page").retrieved_at.slice(0, 10),
  records: bejaiaLines.length,
  note: "Rights-safe projection of Line identities, endpoints, round-trip distances, typed stop counts and timetable-image transcriptions linked by the official WordPress REST API. Embedded KML maps validate identity but their geometry is not retained. Per-record receipts preserve upstream URLs, retrieval timestamps, byte counts and payload SHA-256 hashes for the API, maps and timetable panels.",
});

const msilaHomeReceipt = receipt("etus-msila-home");
const msilaHome = readText(msilaHomeReceipt.filename);
const msilaSlugs = [...msilaHome.matchAll(/href="https:\/\/etus-msila\.dz\/page\/(la-ligne-[^"/?#]+)"/g)]
  .map((match) => match[1]);
if ([...new Set(msilaSlugs)].sort().join(",") !== "la-ligne-10,la-ligne-11,la-ligne-12,la-ligne-16") {
  throw new Error("ETUS M'Sila current Line set drifted");
}
const msilaDefinitions = [
  { ref: "17", terminus1: "محطة القطب الجامعي", terminus2: "محطة حي 800 مسكن", stop_count: 29, diagram_ids: ["etus-msila-line-17-diagram", "etus-msila-line-17-stop-diagram"] },
  { ref: "11", terminus1: "محطة القطب الجامعي", terminus2: "محطة المسافرين الجديدة", stop_count: 27, diagram_ids: ["etus-msila-line-11-diagram"] },
  { ref: "12", terminus1: "محطة القطب الجامعي", terminus2: "موقف أولاد أحمد", stop_count: 26, diagram_ids: ["etus-msila-line-12-diagram"] },
  { ref: "16", terminus1: "محطة لوكاد", terminus2: "موقف المويلحة", stop_count: 23, diagram_ids: ["etus-msila-line-16-diagram"] },
];
const msilaLines = msilaDefinitions.map((definition) => {
  const pageReceipt = receipt(`etus-msila-line-${definition.ref}-page`);
  const page = readText(pageReceipt.filename);
  const diagramReceipts = definition.diagram_ids.map(receipt);
  if (diagramReceipts.some((item) => !page.includes(item.source_url))) {
    throw new Error(`ETUS M'Sila Line ${definition.ref} diagram is no longer linked by the current page`);
  }
  return {
    ref: definition.ref,
    terminus1: definition.terminus1,
    terminus2: definition.terminus2,
    stop_count: definition.stop_count,
    stop_count_kind: "total",
    geometry: "official_route_diagram_reference",
    page_url: pageReceipt.source_url,
    page_receipt: sourceReceipt(pageReceipt),
    diagram_receipts: diagramReceipts.map(sourceReceipt),
  };
});
writeCapture("buses", "etus-msila-lines", msilaLines, {
  url: msilaHomeReceipt.source_url,
  retrieved: msilaHomeReceipt.retrieved_at.slice(0, 10),
  records: msilaLines.length,
  note: "Rights-safe projection of Line identities, endpoints and total stop counts transcribed from official route diagrams. The diagrams validate the facts but their map pixels and geometry are not redistributed. Per-record receipts preserve the official page and image hashes.",
});

console.log(`promoted ${tiaretLines.length} ETUS Tiaret, ${etustoLines.length} ETUSTO, ${bejaiaLines.length} ETUS Béjaïa and ${msilaLines.length} ETUS M'Sila official Lines`);
