// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

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
