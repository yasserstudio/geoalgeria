const MATERIAL_FIELDS = [
  "name",
  "wilaya_code",
  "commune_code",
  "commune",
  "lat",
  "lng",
  "statut",
  "address",
  "tel",
  "fax",
];

export const protectionCivileCarryKey = (unit) =>
  unit.refs?.dgpc ? `dgpc:${unit.refs.dgpc}` : null;

const materiallyChanged = (previous, next) =>
  MATERIAL_FIELDS.some(
    (field) => JSON.stringify(previous[field] ?? null) !== JSON.stringify(next[field] ?? null),
  );

/**
 * Refuse a zero-touch DGPC refresh when its shape resembles corruption or a
 * publisher-wide schema migration. Those changes require a reviewed manual run.
 */
export function assertSafeProtectionCivileRefresh(previous, next) {
  const previousByKey = new Map();
  for (const unit of previous) {
    const key = protectionCivileCarryKey(unit);
    if (!key) throw new Error("automated refresh found a committed unit without a DGPC object id");
    if (previousByKey.has(key)) throw new Error(`automated refresh found duplicate committed key ${key}`);
    previousByKey.set(key, unit);
  }

  const nextKeys = new Set();
  let carryHits = 0;
  let materialChanges = 0;
  for (const unit of next) {
    const key = protectionCivileCarryKey(unit);
    if (!key) throw new Error("automated refresh found a new unit without a DGPC object id");
    if (nextKeys.has(key)) throw new Error(`automated refresh found duplicate new key ${key}`);
    nextKeys.add(key);
    const old = previousByKey.get(key);
    if (!old) continue;
    carryHits++;
    if (materiallyChanged(old, unit)) materialChanges++;
  }

  const allowedCountDelta = Math.max(5, Math.ceil(previous.length * 0.05));
  if (Math.abs(next.length - previous.length) > allowedCountDelta) {
    throw new Error(
      `automated refresh changed the unit count by more than ${allowedCountDelta} ` +
        `(${previous.length} -> ${next.length}); refusing to publish`,
    );
  }

  const minimumCarryHits = Math.floor(previous.length * 0.95);
  if (carryHits < minimumCarryHits) {
    throw new Error(
      `automated refresh retained only ${carryHits}/${previous.length} DGPC object ids ` +
        `(minimum ${minimumCarryHits}); refusing to publish`,
    );
  }

  const allowedMaterialChanges = Math.max(10, Math.ceil(previous.length * 0.1));
  if (materialChanges > allowedMaterialChanges) {
    throw new Error(
      `automated refresh materially changed ${materialChanges}/${previous.length} units ` +
        `(maximum ${allowedMaterialChanges}); refusing to publish`,
    );
  }

  return { carryHits, materialChanges };
}
