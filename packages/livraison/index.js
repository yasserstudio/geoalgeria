// @geoalgeria/livraison — loaders for Algeria's COD / e-commerce delivery layer.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const carriers = () => load("carriers.json"); // delivery-company registry
export const stopdesks = () => load("stopdesks.json"); // geocoded stop-desk / relay points
export const coverage = () => load("coverage.json"); // per-carrier stop-desk presence
export const metadata = () => load("metadata.json");

// One carrier by id or name (case-insensitive), e.g. "yalidine".
export const carrierById = (key) => {
  const k = String(key).toLowerCase();
  return carriers().find((c) => c.id === k || c.name.toLowerCase() === k) ?? null;
};

// Stop-desks in a wilaya — accepts 16, "16", or 1 / "01".
export const stopdesksByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return stopdesks().filter((s) => s.wilaya_code === w);
};

// Stop-desks operated by a carrier, by its id (e.g. "guepex").
export const stopdesksByCarrier = (key) => {
  const k = String(key).toLowerCase();
  return stopdesks().filter((s) => s.operator === k);
};

// Coverage row for one carrier, by its id (e.g. "yalidine").
export const coverageByCarrier = (key) => {
  const k = String(key).toLowerCase();
  return coverage().find((c) => c.operator === k) ?? null;
};

export default {
  carriers,
  stopdesks,
  coverage,
  carrierById,
  stopdesksByWilaya,
  stopdesksByCarrier,
  coverageByCarrier,
  metadata,
};
