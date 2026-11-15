// Physical sites of one establishment (Owner decision 2026-11-15).
//
// The Ministry of Health registry lists an establishment once, but some run on
// several premises: CHU Bejaia is the Khelil Amrane and Frantz Fanon hospitals
// plus the Targa Ouzemmour maternity unit. One point cannot place all three, so
// the reviewed seed (seeds/sites.json) names each site's open OpenStreetMap
// object. The first site places the establishment's own record; each further
// site ships as a record of its own whose `site_of` names the establishment.
// Separate records rather than a `sites` array on the parent: every record stays
// one GeoJSON Point, and the per-record guards (one external id, one record; the
// cliniques exclusion of sante's hospital elements) read `refs.osm` unchanged.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { metresBetween } from "../../../scripts/lib/seat-evidence.mjs";

export const SITES_SEED = join(dirname(fileURLToPath(import.meta.url)), "seeds", "sites.json");

// docs/adr/0001 rule 6: an Owner reading off a proprietary map confirms the open
// object within this distance, and is never the published value.
const OWNER_CONFIRMATION_M = 500;
const OWNER_KEYS = ["confirms", "point", "metres_from_published_value", "read_at", "read_by", "source"];

const round6 = (x) => Number(x.toFixed(6));

/** The reviewed seed, without its `_comment`. */
export function readSitesSeed(path = SITES_SEED) {
  const seed = JSON.parse(readFileSync(path, "utf8"));
  return Object.fromEntries(Object.entries(seed).filter(([k]) => !k.startsWith("_")));
}

/** Refuse a site whose Owner reading does not confirm its OSM object as the seed states. */
function checkSite(where, s) {
  if (!/^(node|way|relation)\/\d+$/.test(s.osm ?? "")) throw new Error(`${where}: osm must be type/id (got ${JSON.stringify(s.osm)})`);
  if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) throw new Error(`${where}: lat/lng must be numbers`);
  if (!s.osm_name) throw new Error(`${where}: osm_name is required`);
  const v = s.owner_confirmation;
  if (!v) throw new Error(`${where}: owner_confirmation is required`);
  for (const k of OWNER_KEYS) if (v[k] == null) throw new Error(`${where}: owner_confirmation needs ${k}`);
  if (v.confirms !== s.osm) throw new Error(`${where}: owner_confirmation confirms ${v.confirms}, the point is ${s.osm}`);
  const [cLng, cLat] = v.point;
  const apart = metresBetween(cLng, cLat, s.lng, s.lat);
  if (!(apart < OWNER_CONFIRMATION_M))
    throw new Error(`${where}: owner_confirmation is ${Math.round(apart)} m from the point, past the ${OWNER_CONFIRMATION_M} m ceiling`);
  if (Math.round(apart) !== v.metres_from_published_value)
    throw new Error(`${where}: owner_confirmation says ${v.metres_from_published_value} m, it is ${Math.round(apart)} m`);
}

/**
 * Apply the site seed to v2 sante records, in place. Idempotent: records a
 * previous emit added (they carry `site_of`) are dropped and rebuilt, so the
 * generator and a re-emit of the committed records give the same output.
 * @param {object[]} rows  v2 records
 * @param {Record<string, {sites: object[]}>} seed  from readSitesSeed()
 * @returns {object[]} the same array
 */
export function applySites(rows, seed) {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].site_of != null) rows.splice(i, 1);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const seeded = new Set(Object.values(seed).flatMap((e) => e.sites.map((s) => s.osm)));
  for (const r of rows)
    if (seeded.has(r.refs?.osm) && !seed[r.id])
      throw new Error(`sites: ${r.refs.osm} is seeded as a site but ${r.id} already cites it`);

  for (const [parentId, entry] of Object.entries(seed)) {
    const parent = byId.get(parentId);
    if (!parent) throw new Error(`sites: ${parentId} is not a record`);
    if (!Array.isArray(entry.sites) || entry.sites.length < 2)
      throw new Error(`sites: ${parentId} needs at least two sites`);
    entry.sites.forEach((s, i) => {
      const id = i === 0 ? parentId : `${parentId}-s${i + 1}`;
      checkSite(`sites ${id}`, s);
      const geo = { lat: round6(s.lat), lng: round6(s.lng), geo_precision: "exact", geo_method: "osm_point" };
      if (i === 0) {
        const { osm, ...rest } = parent.refs ?? {};
        Object.assign(parent, geo, { refs: { osm: s.osm, ...rest } });
        return;
      }
      if (byId.has(id)) throw new Error(`sites: ${id} is already a record`);
      const site = {
        id,
        name: s.osm_name,
        name_fr: s.osm_name,
        name_ar: s.osm_name_ar ?? null,
        wilaya_code: parent.wilaya_code,
        commune_code: parent.commune_code,
        commune: parent.commune,
        ...geo,
        source: "osm",
        refs: { osm: s.osm },
        type: parent.type,
        type_label_fr: parent.type_label_fr,
        type_label_ar: parent.type_label_ar,
        sector: parent.sector,
        site_of: parentId,
      };
      rows.push(site);
      byId.set(id, site);
    });
  }
  return rows;
}
