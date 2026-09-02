export function canonicalBusRef(relation) {
  const setifNameRef = relation.name?.match(/\bETUS\s+SETIF\s+(\d+)(?:\s*([AB]))?\b/i);
  if (setifNameRef) return `${setifNameRef[1]}${setifNameRef[2]?.toUpperCase() ?? ""}`;
  const raw = relation.ref ?? relation.name?.match(/^\s*(\d+[A-Za-z]?)\b/)?.[1] ?? null;
  if (!raw) return null;
  return String(raw).trim().replace(/\s+(?:r|reverse|aller|retour)$/i, "").trim() || null;
}
