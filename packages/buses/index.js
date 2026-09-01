// @geoalgeria/buses — loaders for Algeria's reviewed urban/suburban bus networks.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const lines = () => load("lines.json"); // urban bus lines (v1: ETUSA/Alger)
export const lineById = (id) => lines().find((l) => l.id === id) ?? null;
export const linesByWilaya = (code) => lines().filter((line) => line.wilaya_code === String(code).padStart(2, "0"));
export const linesByOperator = (operator) => {
  const op = String(operator).toUpperCase();
  return lines().filter((l) => l.operator.toUpperCase() === op);
};
export const operators = () => [...new Set(lines().map((l) => l.operator))];
export const operatorRecords = () => load("operators.json");
export const operatorById = (id) => operatorRecords().find((operator) => operator.id === id) ?? null;
export const shapes = () => load("shapes.json");
export const shapeById = (id) => shapes().find((shape) => shape.id === id) ?? null;
export const shapeForLine = (id) => shapes().find((shape) => shape.line_id === id) ?? null;
export const directions = () => load("directions.json");
export const directionsByLine = (id) => directions().filter((direction) => direction.line_id === id);
export const stations = () => load("stations.json");
export const stationById = (id) => stations().find((station) => station.id === id) ?? null;
export const stationsByLine = (id) => stations().filter((station) => station.line_ids.includes(id));
export const stationsByWilaya = (code) => stations().filter((station) => station.wilaya_code === String(code).padStart(2, "0"));
export const stationMemberships = () => load("station-memberships.json");
export const membershipsByDirection = (id) => stationMemberships().filter((membership) => membership.direction_id === id);
export const metadata = () => load("metadata.json");

export default {
  lines, lineById, linesByWilaya, linesByOperator,
  operators, operatorRecords, operatorById,
  shapes, shapeById, shapeForLine,
  directions, directionsByLine,
  stations, stationById, stationsByLine, stationsByWilaya,
  stationMemberships, membershipsByDirection,
  metadata,
};
