import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const lodging = () => load("lodging.json");
export const attractions = () => load("attractions.json");
export const historic = () => load("historic.json");
export const thermalSprings = () => load("thermal-springs.json");
export const parks = () => load("parks.json");

export const all = () => [
  ...lodging().map((r) => ({ ...r, layer: "lodging" })),
  ...attractions().map((r) => ({ ...r, layer: "attraction" })),
  ...historic().map((r) => ({ ...r, layer: "historic" })),
  ...thermalSprings().map((r) => ({ ...r, layer: "thermal_spring" })),
  ...parks().map((r) => ({ ...r, layer: "park" })),
];

const pad = (code) => String(code).padStart(2, "0");

export const byWilaya = (code) => {
  const w = pad(code);
  return all().filter((r) => r.wilaya_code === w);
};

const LAYERS = Object.assign(Object.create(null), {
  lodging,
  attraction: attractions,
  historic,
  thermal_spring: thermalSprings,
  park: parks,
});

export const byLayer = (layer) => LAYERS[layer]?.() ?? [];

export const metadata = () => load("metadata.json");

export default {
  lodging,
  attractions,
  historic,
  thermalSprings,
  parks,
  all,
  byWilaya,
  byLayer,
  metadata,
};
