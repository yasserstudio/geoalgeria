import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const sourceFiles = [
  "operator-inventory.json",
  "batch-01-23.json",
  "batch-24-48.json",
  "batch-49-69.json",
];
const packageFiles = [
  "../../../packages/buses/data/lines.json",
  "../../../packages/buses/data/shapes.json",
  "../../../packages/buses/data/stations.json",
];

const readJson = async (name) =>
  JSON.parse(await readFile(join(directory, name), "utf8"));

const [inventory, ...batches] = await Promise.all(sourceFiles.map(readJson));
const [packageLines, packageShapes, packageStations] = await Promise.all(
  packageFiles.map(readJson),
);
const researchRecords = batches.flatMap((batch) => batch.wilayas);
const researchByCode = new Map(
  researchRecords.map((record) => [Number(record.wilaya_code), record]),
);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(inventory.wilayas.length === 69, "Operator inventory must contain 69 Wilayas");
assert(researchRecords.length === 69, "Research batches must contain 69 Wilayas");
assert(researchByCode.size === 69, "Research batch Wilaya codes must be unique");

const padCode = (value) => String(Number(value)).padStart(2, "0");
const asArray = (value) => (Array.isArray(value) ? value : []);
const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const countByWilaya = (records) => {
  const counts = new Map();
  for (const record of records) {
    const code = padCode(record.wilaya_code);
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
};
const packageLinesByWilaya = countByWilaya(packageLines);
const packageShapesByWilaya = countByWilaya(packageShapes);
const packageStationsByWilaya = countByWilaya(packageStations);

const normalizeDataStatus = (value) => {
  if (value === true) return "available";
  if (value === false) return "not_available";
  if (value === null || value === undefined || value === "") return "unknown";
  if (Array.isArray(value)) return value.length ? "available" : "not_available";
  if (typeof value === "object") return Object.keys(value).length ? "available" : "not_available";

  const text = String(value).toLowerCase();
  if (
    text.includes("not_available") ||
    text.includes("no_operator") ||
    text.includes("no_current") ||
    text.includes("no_public") ||
    text.includes("no_downloadable")
  ) {
    return "not_available";
  }
  if (
    text.includes("claim") ||
    text.includes("fragment") ||
    text.includes("partial") ||
    text.includes("historical") ||
    text.includes("raster") ||
    text.includes("temporary") ||
    text.includes("validation_only") ||
    text.includes("waypoint")
  ) {
    return "partial_or_claimed";
  }
  return "available";
};

const normalizeLiveStatus = (value) => {
  if (value === null || value === undefined || value === false || value === "") {
    return "not_available";
  }
  if (typeof value === "string") {
    const text = value.toLowerCase();
    if (text.includes("no_public") || text.includes("not_available")) {
      return text.includes("claim") ? "claimed_or_protected" : "not_available";
    }
    if (text.startsWith("http://") || text.startsWith("https://")) return "public_endpoint";
  }
  return "claimed_or_protected";
};

const hasOperatorOwnedSource = (sources) =>
  sources.some((source) => {
    const type = String(source.source_type ?? "").toLowerCase();
    return type.includes("official_operator") || type === "operator_domain";
  });

const hasOpenReuseGrant = (sources) =>
  sources.some((source) => {
    const reuse = String(source.reuse_status ?? "").toLowerCase();
    return (
      (reuse.includes("open_license") || reuse.includes("open_data")) &&
      !reuse.includes("no_open") &&
      !reuse.includes("not_open")
    );
  });

const normalizedWilayas = inventory.wilayas.map((inventoryRecord, index) => {
  const expectedCode = index + 1;
  assert(
    Number(inventoryRecord.wilaya_code) === expectedCode,
    `Operator inventory must be sequential at Wilaya ${expectedCode}`,
  );

  const research = researchByCode.get(expectedCode);
  assert(research, `Missing research record for Wilaya ${expectedCode}`);

  const available = research.available_data ?? research.available ?? {};
  const sources = asArray(research.sources);
  const lineRefs = asArray(available.line_refs).map(String);
  const explicitLineCount = Number.isInteger(available.line_count)
    ? available.line_count
    : null;
  const lineCount = explicitLineCount ?? (lineRefs.length || null);
  const operator = research.operator ?? {};
  const registryIds = asArray(inventoryRecord.registry_operator_ids);
  const researchOperatorId = operator.operator_id ?? operator.id ?? null;
  const operatorId = registryIds[0] ?? researchOperatorId;
  const operatorAliases = [
    ...asArray(operator.aliases),
    ...(researchOperatorId && researchOperatorId !== operatorId ? [researchOperatorId] : []),
  ];
  const orderedStations =
    available.ordered_stations ??
    (Number(available.ordered_station_memberships_total) > 0 ? true : undefined);
  const geometry = available.geometry;
  const schedules = available.schedules;
  const live = available.live_endpoints ?? available.live_endpoint;
  const logo = research.logo ?? {};
  const logoVerification = logo.verification ?? "not_verified";

  return {
    wilaya_code: padCode(expectedCode),
    wilaya: {
      fr: inventoryRecord.wilaya_fr,
      ar: inventoryRecord.wilaya_ar,
    },
    legal_operator: {
      status: inventoryRecord.legal_operator_status,
      source_url: inventoryRecord.legal_source_url,
    },
    operator: {
      id: operatorId,
      name: operator.name ?? null,
      kind: operator.kind ?? "public_epic",
      identity_status: operator.identity_status ?? "unknown",
      aliases: [...new Set(operatorAliases)],
      registry_ids: registryIds,
    },
    availability: {
      line_refs: lineRefs,
      line_count: lineCount,
      endpoint_count: asArray(available.endpoints).length,
      ordered_stations: normalizeDataStatus(orderedStations),
      geometry: normalizeDataStatus(geometry),
      schedules: normalizeDataStatus(schedules),
      live_data: normalizeLiveStatus(live),
    },
    sources: {
      count: sources.length,
      operator_owned: hasOperatorOwnedSource(sources),
      open_reuse_grant_found: hasOpenReuseGrant(sources),
    },
    reusable_package: {
      lines: packageLinesByWilaya.get(padCode(expectedCode)) ?? 0,
      shapes: packageShapesByWilaya.get(padCode(expectedCode)) ?? 0,
      stations: packageStationsByWilaya.get(padCode(expectedCode)) ?? 0,
    },
    logo: {
      url: logo.url ?? null,
      verification: logoVerification,
      verified: String(logoVerification).startsWith("verified"),
    },
    conflicts: asArray(research.conflicts),
    blockers: asArray(research.blockers),
    evidence: {
      inventory_record: inventoryRecord,
      research_record: research,
    },
  };
});

const count = (predicate) => normalizedWilayas.filter(predicate).length;
const positiveStatus = (status) => status === "available" || status === "partial_or_claimed";
const summary = {
  wilaya_count: normalizedWilayas.length,
  legal_operator_established: count(
    (row) => row.legal_operator.status === "established_by_reviewed_decree",
  ),
  legal_review_needed: count(
    (row) => row.legal_operator.status !== "established_by_reviewed_decree",
  ),
  operators_with_stable_ids: count((row) => hasText(row.operator.id)),
  wilayas_with_operator_owned_sources: count((row) => row.sources.operator_owned),
  wilayas_with_line_refs_or_counts: count((row) => (row.availability.line_count ?? 0) > 0),
  wilayas_with_ordered_station_evidence: count((row) =>
    positiveStatus(row.availability.ordered_stations),
  ),
  wilayas_with_geometry_evidence: count((row) =>
    positiveStatus(row.availability.geometry),
  ),
  wilayas_with_schedule_evidence: count((row) =>
    positiveStatus(row.availability.schedules),
  ),
  wilayas_with_live_data_leads: count(
    (row) => row.availability.live_data !== "not_available",
  ),
  wilayas_with_verified_logos: count((row) => row.logo.verified),
  wilayas_with_open_reuse_grants_in_audited_operator_sources: count(
    (row) => row.sources.open_reuse_grant_found,
  ),
  wilayas_with_conflicts: count((row) => row.conflicts.length > 0),
  wilayas_with_blockers: count((row) => row.blockers.length > 0),
  wilayas_in_reusable_package: count((row) => row.reusable_package.lines > 0),
  reusable_package_lines: packageLines.length,
  reusable_package_shapes: packageShapes.length,
  reusable_package_stations: packageStations.length,
};

const artifact = {
  schema_version: 1,
  updated: [inventory, ...batches]
    .map((source) => source.updated)
    .filter(Boolean)
    .sort()
    .at(-1),
  scope: "Algeria urban and suburban bus Operators, Wilayas 01-69",
  status: "local_research_artifact_not_for_release",
  generated_from: [...sourceFiles, ...packageFiles],
  normalization_notes: [
    "The legal status establishes Operator identity only; it does not establish current service or data reuse rights.",
    "Availability statuses normalize heterogeneous batch schemas without replacing the underlying evidence.",
    "Available and partial_or_claimed indicate observed data or claims, not permission to import or publish them.",
    "Operator IDs are stable local identifiers and do not claim to be official acronyms.",
    "Operator-source audit availability is kept separate from the reviewed reusable package counts.",
    "Every original per-Wilaya inventory and research record is retained under evidence.",
  ],
  summary,
  wilayas: normalizedWilayas,
};

const statusMark = (status) => {
  if (status === "available" || status === "public_endpoint") return "yes";
  if (status === "partial_or_claimed" || status === "claimed_or_protected") return "lead";
  if (status === "not_available") return "no";
  return "?";
};

const tableRows = normalizedWilayas.map((row) =>
  [
    row.wilaya_code,
    row.wilaya.fr,
    row.operator.id ?? "—",
    row.sources.count,
    row.availability.line_count ?? "—",
    row.reusable_package.lines || "—",
    row.reusable_package.shapes || "—",
    row.reusable_package.stations || "—",
    statusMark(row.availability.ordered_stations),
    statusMark(row.availability.geometry),
    statusMark(row.availability.schedules),
    statusMark(row.availability.live_data),
    row.logo.verified ? "yes" : "no",
    row.blockers.length,
  ].join(" | "),
);

const readme = `# National urban and suburban bus Operator inventory

Local research artifact covering all 69 Algerian Wilayas. It consolidates the legal Operator backbone and three source-audit batches without promoting, publishing, or releasing protected data.

Regenerate with:

\`\`\`sh
node research/buses/national/build-national-inventory.mjs
\`\`\`

## Audit summary

${Object.entries(summary)
  .map(([key, value]) => `- ${key.replaceAll("_", " ")}: ${value}`)
  .join("\n")}

“yes” means observed structured evidence, “lead” means partial, claimed, validation-only, or protected evidence, “no” means unavailable in this audit, and “?” means unknown. Evidence does not imply reuse permission; see each JSON record’s sources, blockers, conflicts, and retained raw evidence.

## Wilaya matrix

Code | Wilaya | Operator ID | Audited sources | Source Line facts | Reusable Lines | Shapes | Stations | Source Station evidence | Source geometry | Schedules | Live | Logo | Blockers
--- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | ---:
${tableRows.join("\n")}
`;

await Promise.all([
  writeFile(join(directory, "all-wilayas.json"), `${JSON.stringify(artifact, null, 2)}\n`),
  writeFile(join(directory, "README.md"), readme),
]);

console.log(JSON.stringify(summary, null, 2));
