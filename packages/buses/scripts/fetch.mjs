// @geoalgeria/buses — build Algeria's urban bus networks (line-level).
// Multi-operator umbrella; first operator: ETUSA (Alger). v1 ships line attributes
// (termini, stop counts, communes/stations served) from fr.wikipedia. Per-stop and
// per-line GEOMETRY is deferred to v1.1 — OSM `route=bus` coverage tagged ETUSA is
// currently thin (~10 relations vs ~122 lines), so we don't fabricate geometry.
// Raws staged in research/buses/. Run: node scripts/fetch.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toCSV } from "../../../scripts/lib/build-utils.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const DATA = join(HERE, "..", "data");

// ---- Operator #1: ETUSA (Alger) ----
const etusa = JSON.parse(readFileSync(join(ROOT, "research/buses/etusa-lines-clean.json"), "utf-8"));
const lines = etusa.lines.map((l) => ({
  id: `etusa-${l.line}`,
  operator: "ETUSA",
  network: "Alger",
  line: l.line,
  terminus1: l.terminus1 || null,
  terminus2: l.terminus2 || null,
  stops: l.stops ?? null,
  communes_served: l.communes_served || [],
  stations_served: l.stations_served || [],
  wilaya_code: "16", // ETUSA = urban/suburban Alger
  source: etusa.source,
}));

lines.sort((a, b) => a.operator.localeCompare(b.operator) || String(a.line).localeCompare(String(b.line), undefined, { numeric: true }));

const metadata = {
  source: "ETUSA (Établissement de transport urbain et suburbain d'Alger) — line list via fr.wikipedia",
  origin: etusa.source,
  license: "Line data from Wikipedia (CC BY-SA 4.0) — attribution + share-alike. Operator: ETUSA. See README.",
  lines: lines.length,
  operators: [...new Set(lines.map((l) => l.operator))],
  by_operator: lines.reduce((a, l) => ((a[l.operator] = (a[l.operator] || 0) + 1), a), {}),
  with_stop_count: lines.filter((l) => l.stops != null).length,
  wilayas_covered: new Set(lines.map((l) => l.wilaya_code)).size,
  coverage_note: "v1 covers 50 ETUSA lines (fr.wikipedia 'Lignes de bus ETUSA de 1 à 99'), of ~122 ETUSA passenger lines. Line-level attributes only — per-stop and per-line GEOMETRY (OSM route=bus) is deferred to v1.1; ETUSA-tagged OSM route coverage is currently thin. More operators/cities to be added.",
  generated_at: new Date().toISOString().slice(0, 10),
};

const COLS = ["id", "operator", "network", "line", "terminus1", "terminus2", "stops", "communes_served", "stations_served", "wilaya_code", "source"];
mkdirSync(join(DATA, "csv"), { recursive: true });
writeFileSync(join(DATA, "lines.json"), JSON.stringify(lines, null, 2) + "\n");
writeFileSync(join(DATA, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
writeFileSync(join(DATA, "csv/lines.csv"), toCSV(lines, COLS));

console.log(`buses: ${lines.length} lines · operators ${metadata.operators.join(", ")} · with stop-count ${metadata.with_stop_count}`);
console.log("sample:", JSON.stringify(lines[0]));
