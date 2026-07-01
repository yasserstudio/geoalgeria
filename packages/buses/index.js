// @geoalgeria/buses — loaders for Algeria's urban bus networks (line-level).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const lines = () => load("lines.json"); // urban bus lines (v1: ETUSA/Alger)
export const lineById = (id) => lines().find((l) => l.id === id) ?? null;
export const linesByOperator = (operator) => {
  const op = String(operator).toUpperCase();
  return lines().filter((l) => l.operator.toUpperCase() === op);
};
export const operators = () => [...new Set(lines().map((l) => l.operator))];
export const metadata = () => load("metadata.json");

export default { lines, lineById, linesByOperator, operators, metadata };
