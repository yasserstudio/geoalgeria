#!/usr/bin/env node
/**
 * Build @geoalgeria/formation-professionnelle: Algeria's vocational-training
 * network (CFPA, INSFP, DFEP, private establishments) from the MFEP takwin.dz
 * portal, and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source: https://takwin.dz/tachbik/api/getlistofalletab_byiddfep_puball/
 *   The portal's API is keyed by IDDFEP (the training directorate, one per
 *   pre-2026 wilaya: codes 1-58 plus 99, the second Algiers directorate). The
 *   committed capture in sources/formation-professionnelle/ is the concatenation
 *   of all 59 calls.
 *
 * OFFLINE ONLY. takwin.dz sits behind a WAF that answers a non-browser client
 * with a block page (the same is true of the ibtikar.takwin.dz mirror), so this
 * build always replays the committed capture rather than pulling. That is also
 * why dates are resolved with offline semantics: the committed `updated` /
 * `retrieved` are preserved rather than restamped with today, because no
 * retrieval happened. Re-establishing a live pull needs a real browser session;
 * until then the capture is the source of truth and git history is its archive.
 *
 * Geocoding. The portal stores a coordinate pair per establishment, but for 557
 * of 1,932 records one or both axes are the sentinel 0.000000000000000000000000:
 * 304 have neither axis, 192 lost the latitude only, 60 the longitude only, and
 * 3 sit outside Algeria. Those are gaps in the ministry's own database, not in
 * our capture, so no re-pull can close them. Rather than ship them unplaceable,
 * each is placed on the centroid of the commune its own `CommunnNom` names,
 * joined against the flagship geoalgeria commune set by normalized Arabic name
 * within the record's own wilaya (geo_precision "approximate", geo_method
 * "commune"). Where the commune field names the wilaya rather than a commune
 * (31 Algiers records reading "الجزائر"), the wilaya centroid is used instead
 * (geo_method "wilaya"). Records whose commune cannot be resolved confidently
 * keep their null coordinates: an unresolved name is left unplaced, never
 * guessed. Every coordinate the portal did supply is passed through untouched
 * as geo_precision "exact" / geo_method "takwin".
 *
 * Usage: node scripts/fetch.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MIGRATIONS,
  writePackageV2,
  resolveDates,
  carryOverIds,
  readCommitted,
} from "../../../scripts/lib/v2-transforms.mjs";
import { readCapture } from "../../../scripts/lib/source-store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const REF = join(__dirname, "..", "..", "dataset", "data");

// --- upstream quirks (carried over from the pre-v2 builder) -----------------
const TYPE_MAP = {
  4: "ifep", 5: "dfep", 6: "insfp", 7: "iep", 8: "cfpa",
  9: "annexe_cfpa", 10: "annexe_cnfepd", 11: "annexe_insfp", 12: "prive", 13: "infep",
};
const TYPE_LABELS = {
  4: "معهد التكوين والتعليم المهنيين",
  5: "مديرية التكوين والتعليم المهنيين",
  6: "معهد وطني متخصص في التكوين المهني",
  7: "معهد التعليم المهني",
  8: "مركز التكوين المهني والتمهين",
  9: "ملحقة مركز التكوين المهني والتمهين",
  10: "ملحقة المركز الوطني للتكوين والتعليم المهنيين عن بعد",
  11: "ملحقة معهد وطني متخصص في التكوين المهني",
  12: "مؤسسة خاصة معتمدة",
  13: "معهد وطني للتكوين والتعليم المهنيين",
};
// Two records ship their coordinates transposed, and one carries a nonsense pair.
const SWAPPED_IDS = new Set([1323, 1330]);
const NONSENSE_IDS = new Set([1997]);
const LAT_MIN = 18, LAT_MAX = 38, LNG_MIN = -9, LNG_MAX = 12;

const round6 = (n) => Math.round(n * 1e6) / 1e6;

// A 0 on either axis is the portal's "no reading" sentinel, never a real value.
// This holds even in Adrar and Ouargla, where a genuine longitude near zero is
// plausible: the real ones arrive signed (-0.42451), the missing ones as
// 0.000000000000000000000000000000.
function cleanCoords(raw) {
  let lat = parseFloat(raw.Latitude);
  let lng = parseFloat(raw.Longitude);
  if (SWAPPED_IDS.has(raw.IDetablissement)) [lat, lng] = [lng, lat];
  if (NONSENSE_IDS.has(raw.IDetablissement)) return { lat: null, lng: null };
  if (lat === 0 || lng === 0) return { lat: null, lng: null };
  if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) return { lat: null, lng: null };
  return { lat: round6(lat), lng: round6(lng) };
}

// `CommunnNom` is "<commune>_<wilaya>"; a few rows join the two with a space
// instead, handled by the wilaya-suffix variant in the resolver below.
const parseCommune = (v) => {
  if (!v) return null;
  const i = v.indexOf("_");
  return i > 0 ? v.slice(0, i).trim() : v.trim();
};

function parseVocations(raw) {
  if (!raw) return null;
  let parts = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1 && raw.includes(" - ")) parts = raw.split(" - ").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1 && raw.includes(". ")) parts = raw.split(". ").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : null;
}

const trimOrNull = (v) => { if (v == null) return null; const s = String(v).trim(); return s.length ? s : null; };
const numOrNull = (v) => (v && v !== 0 ? v : null);
// IDDFEP 99 is the second Algiers training directorate, not a 99th wilaya.
const wilayaCode = (iddfep) => (iddfep === 99 ? "16" : String(iddfep).padStart(2, "0"));

// --- Arabic commune resolution ---------------------------------------------
// Fold the spelling variation that separates the portal's Arabic from the
// flagship's: harakat and tatweel, the alef forms, alef maqsura, teh marbuta,
// and all spacing/punctuation (the portal frequently drops the spaces).
const normAr = (s) =>
  String(s || "")
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]/gu, "");

function loadGeoReference() {
  const communeFC = JSON.parse(readFileSync(join(REF, "geojson", "communes.geojson"), "utf-8"));
  const wilayas = JSON.parse(readFileSync(join(REF, "wilayas.json"), "utf-8")).wilayas;
  const wilayaFC = JSON.parse(readFileSync(join(REF, "geojson", "wilayas.geojson"), "utf-8"));

  // The portal is still on the pre-2026 58-wilaya scheme while the flagship is on
  // the 69-wilaya one, so a commune the reform moved into a new wilaya (Aflou to
  // 59, Bou Saâda to 68, Aïn Oussera to 65 …) no longer sits under the wilaya the
  // record names. Widen each record's candidate set to its wilaya plus the
  // wilayas carved OUT of it: same territory under both schemes, so the join
  // still cannot cross a real boundary.
  const daughters = new Map(); // mother code -> [daughter codes]
  for (const w of wilayas) {
    const m = Number(w.mother_wilaya_code);
    if (!m) continue;
    if (!daughters.has(m)) daughters.set(m, []);
    daughters.get(m).push(Number(w.code));
  }

  const byWilaya = new Map(); // wilaya code -> Map(normalized name -> {lat,lng})
  for (const f of communeFC.features) {
    const code = Number(f.properties?.wilaya_code);
    const key = normAr(f.properties?.name_ar);
    const [lng, lat] = f.geometry?.coordinates || [];
    if (!code || !key || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!byWilaya.has(code)) byWilaya.set(code, new Map());
    // Duplicate names inside one wilaya would make the join ambiguous; keep the
    // first and let the ambiguity counter below surface it.
    if (!byWilaya.get(code).has(key)) byWilaya.get(code).set(key, { lat, lng, name: f.properties.name_ar });
  }

  const wilayaCentroid = new Map();
  for (const f of wilayaFC.features) {
    const [lng, lat] = f.geometry?.coordinates || [];
    if (Number.isFinite(lat) && Number.isFinite(lng)) wilayaCentroid.set(Number(f.properties?.code), { lat, lng });
  }
  const wilayaNameKey = new Map(wilayas.map((w) => [Number(w.code), normAr(w.name_ar)]));
  return { byWilaya, daughters, wilayaCentroid, wilayaNameKey };
}

/**
 * Resolve a record's commune to a flagship centroid, searching only its own
 * wilaya and that wilaya's post-2026 daughters.
 *
 * Beyond the exact name, three spelling variants are tried, each of which only
 * counts when it lands on a real commune of the same wilaya, so a variant can
 * never invent a match, only recover one the portal's orthography hid:
 *   - the definite article ال present in one spelling and absent in the other
 *     (سنجاس / السنجاس, مشرية / المشرية);
 *   - the wilaya name appended to the commune with no separator, the space-joined
 *     form of the usual "<commune>_<wilaya>" (الطيبات توقرت, عين البيضاء أم البواقي);
 *   - the two combined.
 */
function resolveCommune(commune, wilaya, ref) {
  const scope = [wilaya, ...(ref.daughters.get(wilaya) || [])];
  const key = normAr(commune);
  if (!key) return null;

  const lookup = (k) => {
    for (const code of scope) {
      const hit = ref.byWilaya.get(code)?.get(k);
      if (hit) return { ...hit, wilaya: code };
    }
    return null;
  };

  const exact = lookup(key);
  if (exact) return { ...exact, how: "exact" };

  const variants = [];
  if (key.startsWith("ال")) variants.push(key.slice(2));
  else variants.push("ال" + key);
  const wn = ref.wilayaNameKey.get(wilaya);
  if (wn && key.endsWith(wn) && key.length > wn.length) {
    const stem = key.slice(0, -wn.length);
    variants.push(stem);
    variants.push(stem.startsWith("ال") ? stem.slice(2) : "ال" + stem);
  }
  for (const v of variants) {
    const hit = lookup(v);
    if (hit) return { ...hit, how: "variant" };
  }
  return null;
}

// --- main -------------------------------------------------------------------
function main() {
  const raw = readCapture("formation-professionnelle", "takwin-etab").data;
  console.log(`Capture: ${raw.length} raw records`);

  // IDNature_etsF 1 is the ministry itself, not a training establishment.
  const filtered = raw.filter((r) => r.IDNature_etsF !== 1);
  console.log(`  ${filtered.length} after excluding the ministry HQ`);

  const ref = loadGeoReference();
  const stats = { takwin: 0, commune: 0, wilaya: 0, unplaced: 0, viaVariant: 0 };
  const unresolved = new Map();

  const records = filtered.map((r) => {
    const { lat, lng } = cleanCoords(r);
    const commune = parseCommune(r.CommunnNom);
    const wilaya_code = wilayaCode(r.IDDFEP);

    let geo = { lat, lng, geo_precision: null, geo_method: null };
    if (lat != null) {
      geo = { lat, lng, geo_precision: "exact", geo_method: "takwin" };
      stats.takwin++;
    } else {
      const w = Number(wilaya_code);
      const hit = resolveCommune(commune, w, ref);
      if (hit) {
        geo = { lat: round6(hit.lat), lng: round6(hit.lng), geo_precision: "approximate", geo_method: "commune" };
        stats.commune++;
        if (hit.how === "variant") stats.viaVariant++;
      } else if (commune && normAr(commune) === ref.wilayaNameKey.get(w)) {
        // The commune field repeats the wilaya name and no commune of that name
        // exists (Algiers: "الجزائر" is the wilaya, its communes are named
        // otherwise). Nothing finer than the wilaya is being claimed here.
        // Most wilaya names DO also name their seat commune, which the lookup
        // above resolves first, so this branch is the genuine remainder.
        const c = ref.wilayaCentroid.get(w);
        if (c) { geo = { lat: round6(c.lat), lng: round6(c.lng), geo_precision: "approximate", geo_method: "wilaya" }; stats.wilaya++; }
      }
      if (geo.lat == null) {
        stats.unplaced++;
        const k = `${wilaya_code}|${commune}`;
        unresolved.set(k, (unresolved.get(k) || 0) + 1);
      }
    }

    return {
      id: 0,
      name: trimOrNull(r.Nom) || trimOrNull(r.Code) || `ID-${r.IDetablissement}`,
      name_fr: trimOrNull(r.NomFr),
      type: TYPE_MAP[r.IDNature_etsF],
      type_label: TYPE_LABELS[r.IDNature_etsF],
      abreviation: trimOrNull(r.AbrFr) || trimOrNull(r.Abr),
      code: r.Code,
      secteur: r.IDNature_etsF === 12 ? "prive" : "public",
      commune,
      wilaya_code,
      ...geo,
      adresse: trimOrNull(r.Adres),
      adresse_fr: trimOrNull(r.adresFr),
      telephone: trimOrNull(r.Tel),
      fax: trimOrNull(r.Fax),
      email: trimOrNull(r.Email),
      site_web: trimOrNull(r.Site),
      facebook: trimOrNull(r.Fb),
      capacite: numOrNull(r.CapaciteT),
      capacite_reelle: numOrNull(r.CapaciteR),
      surface_m2: numOrNull(r.surface),
      internat: r.internat === 1,
      capacite_internat: numOrNull(r.CapaciteInternaT),
      vocations: parseVocations(r.Vocation),
    };
  });

  // Ids: the pre-v2 order (wilaya, then establishment type), numbered 1..N. The
  // committed ids are pinned back below, so this only has to be deterministic.
  const TYPE_ORDER = Object.values(TYPE_MAP);
  records.sort((a, b) => {
    if (a.wilaya_code !== b.wilaya_code) return a.wilaya_code < b.wilaya_code ? -1 : a.wilaya_code > b.wilaya_code ? 1 : 0;
    return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
  });
  records.forEach((r, i) => { r.id = i + 1; });

  // --- accuracy check the source itself pays for -----------------------------
  // 252 records lost exactly one axis, so the portal still holds a real reading
  // for the other. Where such a record was placed on a centroid, that surviving
  // axis is an independent check on the join: a bad commune match would show up
  // as a large disagreement.
  const residuals = [];
  for (const r of records) {
    if (r.geo_method !== "commune") continue;
    const src = filtered.find((x) => String(x.Code) === String(r.code) && trimOrNull(x.Nom) === r.name);
    if (!src) continue;
    const la = parseFloat(src.Latitude), lo = parseFloat(src.Longitude);
    if (la > LAT_MIN && la < LAT_MAX) residuals.push(Math.abs(la - r.lat) * 111);
    else if (lo > LNG_MIN && lo < LNG_MAX && lo !== 0) residuals.push(Math.abs(lo - r.lng) * 111 * Math.cos((r.lat * Math.PI) / 180));
  }
  residuals.sort((a, b) => a - b);
  const pct = (p) => (residuals.length ? residuals[Math.floor((residuals.length - 1) * p)].toFixed(1) : "n/a");

  console.log(
    `Placement: ${stats.takwin} takwin (exact), ${stats.commune} commune centroid` +
      ` (${stats.viaVariant} via a spelling variant), ${stats.wilaya} wilaya centroid, ${stats.unplaced} unplaced`,
  );
  if (residuals.length)
    console.log(`  single-axis cross-check on ${residuals.length} placed records: median ${pct(0.5)} km, p90 ${pct(0.9)} km, max ${residuals[residuals.length - 1].toFixed(1)} km`);
  if (unresolved.size) {
    console.log(`  ${unresolved.size} commune name(s) left unresolved (kept ungeocoded):`);
    for (const [k, n] of [...unresolved].sort((a, b) => b[1] - a[1]))
      console.log(`    w${k.split("|")[0]} ×${n} "${k.split("|")[1]}"`);
  }

  // --- emit v2 ---------------------------------------------------------------
  // Offline: no retrieval happened, so the committed dates are reproduced rather
  // than restamped.
  const cfg = MIGRATIONS["formation-professionnelle"];
  const { updated, retrieved } = resolveDates(OUT_DIR, true);
  const v2 = records.map(cfg.map);
  // `code` alone repeats on 5 records, so the carry key adds the fields that make
  // it unique across all 1,932.
  const carryKey = (r) => [r.code, r.wilaya_code, r.type, r.name].join("|");
  carryOverIds(v2, readCommitted(OUT_DIR, "establishments.json"), carryKey, "formation-professionnelle");

  let oldMeta = {};
  try { oldMeta = JSON.parse(readFileSync(join(OUT_DIR, "metadata.json"), "utf-8")); } catch {}
  const { records: out, metadata } = writePackageV2({
    pkg: "formation-professionnelle",
    dir: OUT_DIR,
    files: [{ file: "establishments.json", rows: v2 }],
    meta: cfg.meta,
    updated,
    retrieved,
    oldMeta,
  });
  console.log(`Wrote ${out.length} establishments → v2 (${metadata.geocoded_count} geocoded, ${metadata.wilayas_covered} wilayas).`);
}

main();
