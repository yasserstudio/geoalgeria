// @geoalgeria/banques: loaders for Algeria's licensed banks & financial institutions.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const banks = () => load("banks.json"); // 21 agréé banks
export const institutions = () => load("institutions.json"); // 8 financial institutions
export const all = () => [...banks(), ...institutions()]; // 29, banks first
export const branches = () => load("branches.json"); // bank branch locations (rolling out per bank)
export const metadata = () => load("metadata.json");

// Look up a single institution by id or acronym (case-insensitive), e.g. "bna".
export const byId = (key) => {
  const k = String(key).toLowerCase();
  return all().find((b) => b.id === k || b.acronym.toLowerCase() === k) ?? null;
};

// Branches for one bank, by its id/acronym (e.g. "cpa").
export const branchesByBank = (key) => {
  const k = String(key).toLowerCase();
  return branches().filter((b) => b.bank_id === k);
};

export default { banks, institutions, all, branches, byId, branchesByBank, metadata };
