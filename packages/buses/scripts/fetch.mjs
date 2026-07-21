// @geoalgeria/buses — build Algeria's urban bus networks (line-level).
// Multi-operator umbrella; first operator: ETUSA (Alger). v1 ships line attributes
// (termini, stop counts, communes/stations served) from fr.wikipedia. Per-stop and
// per-line GEOMETRY is deferred to v1.1 — OSM `route=bus` coverage tagged ETUSA is
// currently thin (~10 relations vs ~122 lines), so we don't fabricate geometry.
// Raws staged in research/buses/ (no network), so this always replays offline and
// preserves the committed retrieved/updated dates. Run: node scripts/fetch.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MIGRATIONS, writePackageV2, committedDates } from "../../../scripts/lib/v2-transforms.mjs";

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

// Shape to the canonical v2 GeoRecord and emit via the shared writer (JSON + CSV +
// canonical metadata; geojson:false — line-level only, an empty FeatureCollection
// reads as a failed download). buses has no live fetch, so the dates are always the
// committed ones.
const cfg = MIGRATIONS.buses;
const { updated, retrieved } = committedDates(DATA);
const { records } = writePackageV2({
  pkg: "buses",
  dir: DATA,
  files: [{ file: "lines.json", geojson: false, rows: lines.map(cfg.map) }],
  meta: cfg.meta,
  updated,
  retrieved,
});

console.log(`buses: ${records.length} lines → v2`);
