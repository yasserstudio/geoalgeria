// Emit + numeric helpers — the canonical home for these (scripts/lib/build-utils.mjs
// re-exports from here in v2 so the CSV/GeoJSON logic lives in exactly one place).

const DEG = Math.PI / 180;

/** Round to 6 decimals (≈0.1 m), or null. Empty/whitespace strings → null (not 0),
 *  so a blank coordinate never rounds to the (0,0) Gulf-of-Guinea point. */
export const round6 = (n) => {
  if (n == null || (typeof n === "string" && n.trim() === "")) return null;
  return Number.isFinite(+n) ? Math.round(+n * 1e6) / 1e6 : null;
};

/** Wilaya code → zero-padded 2-digit string ("16", 16, "1" → "16"/"01"), or null. */
export const wcode = (c) => (c == null ? null : String(c).padStart(2, "0"));

/** RFC-4180 CSV with a spreadsheet formula-injection guard. `cols` = ordered keys. */
export function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") v = JSON.stringify(v);
    let s = String(v);
    // Formula-injection guard: allow optional leading whitespace before the
    // dangerous lead char, since spreadsheets trim it on import (" =1" → "=1").
    if (typeof v !== "number" && /^[\s]*[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n") + "\n";
}

/** Point FeatureCollection from rows with finite lat/lng (properties = full row). */
export function toGeoJSON(rows) {
  return {
    type: "FeatureCollection",
    features: rows
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
      .map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lng, r.lat] },
        properties: { ...r },
      })),
  };
}

/** Great-circle distance in metres. */
export function haversine(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * DEG,
    dLng = (bLng - aLng) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}

/** Bounding box [minLng, minLat, maxLng, maxLat] over rows with finite coords, or null. */
export function bbox(rows) {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity,
    n = 0;
  for (const r of rows) {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    n++;
    if (r.lng < minLng) minLng = r.lng;
    if (r.lng > maxLng) maxLng = r.lng;
    if (r.lat < minLat) minLat = r.lat;
    if (r.lat > maxLat) maxLat = r.lat;
  }
  return n ? [round6(minLng), round6(minLat), round6(maxLng), round6(maxLat)] : null;
}
