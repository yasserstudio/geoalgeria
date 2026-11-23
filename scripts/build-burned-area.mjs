#!/usr/bin/env node
// Build packages/dataset/data/fires/burned-area.json: hectares burned per wilaya and month,
// from the burned cells of NASA's MODIS MCD64A1 grids.
//
// HOW. scripts/fetch-burned-area.py reads the NASA grids once and captures only the
// burned cells, so this step needs no NASA login and no HDF4 library. A cell belongs
// to the wilaya whose detailed outline contains its centre; a wilaya's hectares are
// its cells times the cell area, which is constant on the sinusoidal grid.
//
// UNBURNABLE LAND. MCD64A1 maps drying salt lakes (Garaet et Tarf, Zahrez, Hodna) as
// burned, the same cells year after year. A cell NASA's MCD12Q1 land cover of that year
// calls barren, snow or water is left out; the capture keeps it.
//
// The classes were checked against GWIS: without them 2002 is 14.1% off and 2016 10.2%.
// So the gate tests the download and the counting, not the choice of classes.
//
// GATE. Each national yearly total is compared with the GWIS country total. A year
// more than 10% off fails the build, and nothing is written.
//
// USAGE
//   node scripts/build-burned-area.mjs --write | --check

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadBoundaries, pointInGeometry } from "../packages/schema/src/geo.js";
import { captureMeta, readCapture } from "./lib/source-store.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const GWIS_CLASSES = ["forest", "savannas", "shrublands_grasslands", "croplands", "other"];
const GATE_LIMIT = 0.1;
// MCD12Q1 LC_Type1 (IGBP): 15 snow and ice, 16 barren, 17 water.
const UNBURNABLE = [15, 16, 17];

// MODIS sinusoidal grid: 10-degree tiles of 2400 x 2400 cells.
const RADIUS = 6371007.181;
const TILE = (Math.PI * RADIUS) / 18;
const CELL = TILE / 2400;
const CELL_HA = (CELL * CELL) / 10_000;

const { values: opt } = parseArgs({
  options: {
    cells: { type: "string" },
    boundaries: { type: "string" },
    reference: { type: "string" },
    out: { type: "string" },
    retrieved: { type: "string" },
    "gate-years": { type: "string", default: "2002-2024" },
    write: { type: "boolean" },
    check: { type: "boolean" },
  },
});

const read = (p) => JSON.parse(readFileSync(p, "utf-8"));
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

function cellCentre(tile, row, col) {
  const h = Number(tile.slice(1, 3));
  const v = Number(tile.slice(4, 6));
  const lat = (9 - v) * TILE - (row + 0.5) * CELL;
  const x = (h - 18) * TILE + (col + 0.5) * CELL;
  const phi = lat / RADIUS;
  return [((x / (RADIUS * Math.cos(phi))) * 180) / Math.PI, (phi * 180) / Math.PI];
}

function locator(fc) {
  const wilayas = [...loadBoundaries(fc, "code")].map(([code, geometry]) => {
    const points = geometry.coordinates.flat(geometry.type === "Polygon" ? 1 : 2);
    const lngs = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    const span = (list) => list.reduce(([lo, hi], n) => [Math.min(lo, n), Math.max(hi, n)], [Infinity, -Infinity]);
    return { code: Number(code), geometry, lng: span(lngs), lat: span(lats) };
  });
  const inside = (n, [lo, hi]) => n >= lo && n <= hi;
  const find = (lng, lat) =>
    wilayas.find((w) => inside(lng, w.lng) && inside(lat, w.lat) && pointInGeometry(lng, lat, w.geometry))?.code;
  return { codes: wilayas.map((w) => w.code).sort((a, b) => a - b), find };
}

function nextMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

const cells = opt.cells ? read(opt.cells) : readCapture("geoalgeria", "burned-area-cells");
const reference = opt.reference ? read(opt.reference) : readCapture("geoalgeria", "gwis-burned-area");
const boundaries = read(opt.boundaries ?? join(DATA, "geojson", "wilaya-boundaries-detailed.geojson"));
const retrieved = opt.retrieved ?? captureMeta("geoalgeria", "burned-area-cells").retrieved;
const out = opt.out ?? join(DATA, "fires", "burned-area.json");

const complete = (month) => cells.tiles.every((t) => cells.months[month]?.[t]);
const months = Object.keys(cells.months).sort().filter(complete);
if (months.length === 0) fail("burned area: no month has every tile");
const [first, latest] = [months[0], months.at(-1)];
const incomplete = [];
for (let m = first; m !== latest; m = nextMonth(m)) if (!complete(m)) incomplete.push(m);

const { codes, find } = locator(boundaries);
let excluded = 0;
const counts = new Map(codes.map((code) => [code, new Map()]));
for (const month of Object.keys(cells.months).sort()) {
  if (month < first || month > latest) continue;
  for (const [tile, list] of Object.entries(cells.months[month])) {
    for (const [row, col, land] of list) {
      const code = find(...cellCentre(tile, row, col));
      if (code === undefined) continue;
      if (!Number.isInteger(land)) fail(`burned area: ${month} ${tile} ${row},${col} has no land class`);
      if (UNBURNABLE.includes(land)) {
        excluded++;
        continue;
      }
      const byMonth = counts.get(code);
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }
  }
}

const wilayas = codes.map((code) => ({
  code,
  months: Object.fromEntries([...counts.get(code)].map(([m, n]) => [m, Number((n * CELL_HA).toFixed(2))])),
}));

const [from, to] = opt["gate-years"].split("-").map(Number);
const failures = [];
let worst = 0;
for (let year = from; year <= to; year++) {
  const ours = wilayas
    .flatMap((w) => Object.entries(w.months))
    .filter(([m]) => m.startsWith(`${year}-`))
    .reduce((sum, [, ha]) => sum + ha, 0);
  const theirs = reference.rows
    .filter((row) => Number(row.year) === year)
    .reduce((sum, row) => sum + GWIS_CLASSES.reduce((all, key) => all + Number(row[key] || 0), 0), 0);
  if (!(theirs > 0)) {
    failures.push(`${year}: no GWIS total`);
    continue;
  }
  const off = ours / theirs - 1;
  worst = Math.max(worst, Math.abs(off));
  console.log(`${year}  ours ${ours.toFixed(0)} ha  GWIS ${theirs.toFixed(0)} ha  ${(off * 100).toFixed(1)}%`);
  if (Math.abs(off) > GATE_LIMIT)
    failures.push(`${year}: ours ${ours.toFixed(0)} ha, GWIS ${theirs.toFixed(0)} ha (${(off * 100).toFixed(1)}%)`);
}
if (failures.length) fail(`burned area: years more than 10% off GWIS, nothing written\n  ${failures.join("\n  ")}`);

const outlines = read(join(DATA, "geojson", "wilaya-boundaries-detailed.metadata.json"));
const borrowed = Object.entries(cells.land_cover).filter(([year, used]) => Number(year) !== used);
const landCoverNote = borrowed.length
  ? `${borrowed.map(([year, used]) => `${year} uses the ${used} map`).join(", ")}, the latest published.`
  : "Each year uses its own map.";

const dataset = {
  title_en: "Algeria: burned area per wilaya and month",
  title_fr: "Algérie : superficie brûlée par wilaya et par mois",
  title_ar: "الجزائر: المساحة المحروقة حسب الولاية والشهر",
  unit: "ha",
  first_month: first,
  latest_month: latest,
  incomplete_months: incomplete,
  license: "ODbL-1.0",
  sources: [
    {
      key: "nasa-mcd64a1",
      name: "NASA MODIS MCD64A1 v061, DOI 10.5067/MODIS/MCD64A1.061",
      url: "https://doi.org/10.5067/MODIS/MCD64A1.061",
      doi: "10.5067/MODIS/MCD64A1.061",
      retrieved,
      evidence_type: "official",
    },
    {
      key: "nasa-mcd12q1",
      name: "NASA MODIS MCD12Q1 v061, DOI 10.5067/MODIS/MCD12Q1.061",
      url: "https://doi.org/10.5067/MODIS/MCD12Q1.061",
      doi: "10.5067/MODIS/MCD12Q1.061",
      retrieved,
      evidence_type: "official",
      note: `Land cover, used only to leave out unburnable cells. ${landCoverNote}`,
    },
    {
      key: "osm",
      name: "OpenStreetMap: detailed wilaya outlines (c) OpenStreetMap contributors",
      url: "https://www.openstreetmap.org",
      retrieved: outlines.sources[0].retrieved,
      evidence_type: "crowdsourced",
      note: "data/geojson/wilaya-boundaries-detailed.geojson",
    },
  ],
  excluded: {
    land_classes: UNBURNABLE,
    cells: excluded,
    hectares: Number((excluded * CELL_HA).toFixed(2)),
  },
  check: {
    credit: "EU JRC GWIS, CC BY 4.0, used as a check",
    years: [from, to],
    limit_percent: GATE_LIMIT * 100,
    worst_percent: Number((worst * 100).toFixed(1)),
  },
  notes: [
    `The series ends at ${latest}, the last month NASA had published in full for Algeria when retrieved on ${retrieved}. If NASA stops producing it, it ends there.`,
    "Cells NASA's land cover calls barren, snow or water are left out, as bare ground does not burn. Many lie on salt lakes that dry out each year.",
    "A month absent from a wilaya is zero, unless it is listed in incomplete_months.",
    "Forest, scrub and farmland alike, in cells of 21.47 ha: small fires are missed.",
    "Wilayas are the 69 of 2026 for every year, so a series can be compared over time.",
  ],
  wilayas,
};

const body = `${JSON.stringify(dataset, null, 2)}\n`;
if (opt.check) {
  if (!existsSync(out) || readFileSync(out, "utf-8") !== body) fail("burned-area.json is stale; run with --write");
} else if (opt.write || opt.out) {
  writeFileSync(out, body);
}
