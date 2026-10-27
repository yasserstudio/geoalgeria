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
 * OFFLINE ONLY. takwin.dz answers an ordinary request from inside Algeria, and
 * a WAF block page from anywhere else, so this build always replays the
 * committed capture rather than pulling: a refresh is a capture run from an
 * Algerian connection, and the build itself needs no network. The dates it
 * stamps are the capture's own retrieval date from the source manifest, not
 * today's, so every replay of a given capture reproduces the same metadata and
 * the package never claims a retrieval it did not make.
 *
 * Geocoding. The portal stores a coordinate pair per establishment, but for 557
 * of 1,932 records one or both axes are the sentinel 0.000000000000000000000000:
 * 304 have neither axis, 192 lost the latitude only, 60 the longitude only, and
 * 3 sit outside Algeria. Those are gaps in the ministry's own database, not in
 * our capture, so no re-pull can close them. Rather than ship them unplaceable,
 * each is placed on the centroid of the commune its own `CommunnNom` names,
 * joined against the flagship geoalgeria commune set by normalized Arabic name
 * within the source wilaya and its post-2026 daughters (geo_precision
 * "approximate", geo_method "commune"). The same match assigns the current
 * 69-wilaya code to every establishment, including records whose source
 * coordinate is complete. Where the commune field names the wilaya rather than a commune
 * (31 Algiers records reading "الجزائر"), the wilaya centroid is used instead
 * (geo_method "wilaya"). Records whose commune cannot be resolved confidently
 * keep their null coordinates: an unresolved name is left unplaced, never
 * guessed. A coordinate the portal did supply is passed through as geo_precision
 * "exact" / geo_method "takwin" unless one of three named exceptions applies: two
 * rows arrive with the axes transposed (SWAPPED_IDS), two carry a pair that locates
 * nothing and are treated as unplaced (NONSENSE_IDS), and a block of Oran's rows arrive
 * with the longitude's minus sign dropped, which recoverLongitudeSign restores on the
 * evidence of the directorate and commune the row names. Nothing else is altered, and
 * no coordinate is invented.
 *
 * Usage: node scripts/fetch.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import {
  MIGRATIONS,
  writePackageV2,
  carryOverIds,
  readCommitted,
  readRetiredIds,
  readRetiredMigrations,
} from "../../../scripts/lib/v2-transforms.mjs";
import { containingWilayaCode } from "../../../scripts/lib/build-utils.mjs";
import { captureMeta, readCapture } from "../../../scripts/lib/source-store.mjs";

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
// Two records ship their coordinates transposed, and two carry a nonsense pair.
// 1997 is a pair that locates nothing. 1624 is the Oran row the unsigned-longitude
// recovery below cannot explain (private tracker #301): its own IDDFEP is 31, its
// IDCommunn 3105, its commune string "السانية_وهران" and its address "BIR EL DJIR
// ORAN", but its pair is 35.7167 / 0.6333, whole arcminutes on both axes, so it is a
// rounded placeholder rather than a reading, and mirroring the axis puts it in the bay
// of Oran, inside no wilaya at all. There is nothing here to sign-correct, so the row
// takes the same path as every other establishment the portal left unplaced and lands
// on its own commune's centroid.
const SWAPPED_IDS = new Set([1323, 1330]);
const NONSENSE_IDS = new Set([1997, 1624]);
const LAT_MIN = 18, LAT_MAX = 38, LNG_MIN = -9, LNG_MAX = 12;

const round6 = (n) => Math.round(n * 1e6) / 1e6;

/**
 * How near the commune a row names its mirrored point has to land before the mirror
 * reads as a dropped minus sign.
 *
 * WHY THE WILAYA IS NOT THE TEST. Reflecting a longitude moves a point by 2 * lng, and
 * the wilaya alone puts no limit on where that lands. A grid scan of the 0.1 to 9 E
 * half-plane finds 13 directorates for which some mirror lands back inside their own
 * wilaya, the worst travelling 1,698 km (27.3 N, 8.6 E is in wilaya 33 and mirrors into
 * wilaya 37): a Bechar row at 29.6 N, +5.3 E would have mirrored 1,024 km into Beni
 * Abbes country and shipped as `exact`. The commune a row names is a second attribution
 * the coordinate had no part in, and testing against it bounds the DESTINATION to within
 * MIRROR_COMMUNE_KM of that commune.
 *
 * IT DOES NOT BOUND THE TRAVEL, and is not meant to: Algeria's southern wilayas are
 * wide enough that a long reflection can still land next to the commune the row names.
 * A Tindouf row at 27.6 N, +8.3 E naming Tindouf travels 1,635 km and lands 18.7 km from
 * Tindouf's centre, and a Bechar row at 29.4 N, +3.5 E naming Tabelbala travels 678 km
 * and lands 24.0 km from Tabelbala's centre; both are recovered, because in both the
 * reflected point is where the row's own two attributions say the establishment is. The
 * distance the point moves is not evidence either way. Where it arrives is.
 *
 * MEASURED over the rows the rule fires on in the committed capture: 23 of their mirrors
 * land inside the outline of the very commune the row names, and 9 in a NEIGHBOURING
 * commune of the same wilaya, which is what an address on a commune edge looks like, and
 * what a portal that files a campus under its city looks like. The furthest from its own
 * commune's centre is PN7HO at 9.35 km, filed under Sidi Chami, sitting in Es Senia,
 * address "CITE BAHI AMER ... ES SENIA ORAN"; then PWGFU at 7.15 km (filed under Oran,
 * in Bir El Djir, address "HAI KHEMISTI 14 N 232 BIR EL DJIR ORAN") and PPSNN at 6.81 km
 * (filed under Bethioua, in Arzew, address "RUE DES JARDINS ARZEW ORAN"). So containment
 * in the named commune would refuse nine honest rows, while 25 km accepts all of them
 * with the furthest at a third of the bound. It is also the figure MOVE_CAP_KM already
 * names as the distance past which a moved point stops being about the same place
 * (scripts/review/thresholds.mjs), rather than a number chosen to make this set fit.
 */
export const MIRROR_COMMUNE_KM = 25;

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle kilometres between two points. */
function kmBetween(aLng, aLat, bLng, bLat) {
  const rad = (x) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * A longitude that lost its minus sign, restored.
 *
 * The capture ships a block of Oran's rows with a POSITIVE longitude. The portal names
 * the publishing directorate on every row (IDDFEP 31), the commune string is "<an Oran
 * commune>_وهران" and the address names Oran, but +0.63 lands in Relizane (48) and
 * +0.31 in Mostaganem (27), and those are the codes `containingWilayaCode` then stamps,
 * so the defect hides behind a join that agrees with itself: record 01392's wilaya_code
 * 48 against commune Es Senia is this same block read from the published side (private
 * tracker #301).
 *
 * Mirroring the axis is the only move made, and it is made only when BOTH of the row's
 * own attributions agree about the mirrored point while neither agrees about the
 * published one: the mirror must land in the wilaya that published the row AND within
 * MIRROR_COMMUNE_KM of the centre of the commune the row names. A row whose commune
 * resolves to nothing is never mirrored, because no commune to test against is not
 * evidence of a dropped sign. Anything this cannot explain is left exactly as the portal
 * shipped it: over the committed capture every row it fires on is IDDFEP 31's, and the
 * 16 Oran rows whose point sits in Mascara are a different defect the mirror leaves
 * alone. test/formation-longitude-sign.test.mjs pins how many rows that is, so the count
 * lives in one place and cannot drift out of a comment.
 *
 * @param {number|null} lat
 * @param {number|null} lng
 * @param {Set<number>} scope  the source wilaya and its post-2026 daughters
 * @param {{lat: number, lng: number}|null} communeCentre  the centre of the commune the
 *   row's own `CommunnNom` resolves to, or null when it resolves to none
 */
export function recoverLongitudeSign(lat, lng, scope, communeCentre) {
  if (lat == null || lng == null || lng <= 0) return lng;
  const asIs = containingWilayaCode(lat, lng);
  if (asIs && scope.has(Number(asIs))) return lng;
  const mirrored = containingWilayaCode(lat, -lng);
  if (!mirrored || !scope.has(Number(mirrored))) return lng;
  if (!communeCentre) return lng;
  return kmBetween(-lng, lat, communeCentre.lng, communeCentre.lat) <= MIRROR_COMMUNE_KM
    ? round6(-lng)
    : lng;
}

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

// Confirmed Takwin spellings that normalize differently from the flagship
// commune registry. Keep these explicit and scoped to the source name: fuzzy
// matching could silently move an establishment across a real boundary.
const COMMUNE_NAME_ALIASES = new Map([
  [normAr("مجدل"), normAr("امجدل")],
  [normAr("جبلمسعد"), normAr("جبل مساعد")],
  [normAr("أمسيف"), normAr("مسيف")],
]);

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

  const alias = COMMUNE_NAME_ALIASES.get(key);
  if (alias) {
    const hit = lookup(alias);
    if (hit) return { ...hit, how: "variant" };
  }

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

// --- id carry-over ----------------------------------------------------------
// The ids are a flat 5-digit space assigned from sort position, so nothing in a
// record's own id says which id it shipped under: the carry key is the only
// thing holding a public join key to its establishment.
//
// It is the MFEP's own accreditation code plus the establishment type. The name
// used to be in it, and that is what blocked the 2026-10-25 rebuild (#306): the
// portal rewrote 1,788 Arabic names, and it revises their spacing, their
// separators, their typos and their branding freely, so a key that reads one
// takes every revision for a different place. Nine establishments were relisted
// under a brand or a corrected spelling at the same coordinate and phone, which
// no name-based key could have followed. Type is in the key because `code` alone
// repeats on 5 records; neither depends on wilaya_code, so an id survives a
// commune moving to its post-2026 daughter wilaya.
/** The establishment a record stands for, as a carry key. */
export const accreditationKeyOf = (r) =>
  [r.code, r.type].map((f) => JSON.stringify(f ?? null)).join("|");

// Two pairs share one code and type (0303|cfpa, 10611|prive), and a carry key
// that cannot pin an id uniquely fails the build, so they are told apart by
// position within their own group. Same mechanism as sportsCarryKey, but not the
// same licence: sports' twins are field-identical, so which keeps which id
// carries no meaning, while these are different establishments tens of
// kilometres apart. A source that reordered a group would hand each the other's
// id, so the pairing is checked below rather than trusted.
const TIE_BREAK_MAX_KM = 5;

/**
 * Reviewed carry-key exceptions: a published id the review cut loose from its
 * accreditation code, because the code changed hands rather than the
 * establishment changing its name. Carrying such an id would point a public join
 * key at a different business, so the id retires and the new holder is minted a
 * fresh one. The MFEP publishes no successor field, so this cannot be derived;
 * each entry is a reviewed decision with the evidence beside it, the same way
 * packages/ecoles/scripts/fetch.mjs tracks its OSM primitive migrations.
 *
 * Keyed on the id it severs, not on the carry key, so the rule stops matching
 * once the successor is published under its own id: a rebuild from the new
 * committed data carries that id like any other instead of churning it.
 */
export const SEVERED_IDS = new Map([
  [
    "00591",
    {
      code: "15634",
      type: "prive",
      reviewer: "geoalgeria-maintainers",
      reviewed_at: "2026-10-25",
      // What the two captures say under this one accreditation code. Every
      // descriptive field changed, in both languages, and nothing the portal
      // publishes ties the two together.
      was: {
        capture: "2026-06-22",
        name_fr: "LHIRFA USIREM",
        name: "\u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062E\u0627\u0635\u0629\u0644\u0644\u062A\u0643\u0648\u064A\u0646 \u0627\u0644\u0645\u0647\u0646\u064A\u0644\u062D\u0631\u0641\u0627 \u0627\u0648\u0633\u064A\u0631\u0627\u0645",
        telephone: "0540824419",
        email: "centredeformationasirem@gmail.com",
        facebook: "https://www.facebook.com/p/Asirem-School100086582826402/",
        adresse_fr: "Rue frere ouamrane lot thala n 03 Tiziouzou",
        capacite: 144,
        surface_m2: 200,
        vocations: 4,
        point: "exact, 36.697271 / 4.049615",
      },
      now: {
        capture: "2026-10-25",
        name_fr: "HIGH FLY SCHOOL",
        name: "\u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062E\u0627\u0635\u0629 \u0644\u0644\u062A\u0643\u0648\u064A\u0646 \u0627\u0644\u0645\u0647\u0646\u064A \u0647\u0627\u064A \u0641\u0644\u0627\u064A \u0633\u0643\u0648\u0644",
        telephone: null,
        email: "highflyschoolto@gmail.com",
        facebook: null,
        adresse_fr: null,
        capacite: null,
        surface_m2: null,
        vocations: 0,
        point: "none; placed on the Tizi Ouzou commune centroid",
      },
      note:
        "Accreditation 15634 passed from Asirem School to High Fly School. The name " +
        "changed in both languages, and so did the phone, the email, the Facebook page, " +
        "the address, the capacity, the surface and the whole curriculum: June listed " +
        "sewing, women's and men's hairdressing and childcare assistance, October lists " +
        "none. The 4 km between the two published points is not evidence of a move, " +
        "because October carries no portal point at all and sits on its commune's " +
        "centroid. Nothing but the code and the wilaya connects the two records, so the " +
        "id stays with neither: 00591 is reserved and High Fly School is a new record.",
    },
  ],
]);

/**
 * A keyOf for carryOverIds over both sides of a rebuild. A severed id is keyed so
 * that nothing can match it, which retires it; it is also left out of its group's
 * numbering, so the records that remain still pair with each other.
 *
 * @param {object[]} committed  the committed v2 records
 * @param {object[]} rows       the records being emitted
 * @returns {(r: object) => string}
 */
export function formationCarryKey(committed, rows) {
  const keyed = new Map();
  for (const set of [committed, rows]) {
    const seen = new Map();
    for (const r of set) {
      const place = accreditationKeyOf(r);
      if (set === committed && SEVERED_IDS.has(String(r.id))) {
        keyed.set(r, `${place}!severed:${r.id}`);
        continue;
      }
      const nth = (seen.get(place) ?? 0) + 1;
      seen.set(place, nth);
      keyed.set(r, `${place}#${nth}`);
    }
  }
  return (r) => keyed.get(r) ?? accreditationKeyOf(r);
}

const KM_PER_DEGREE = 111;
const kmApart = (a, b) =>
  KM_PER_DEGREE *
  Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180));

/**
 * How many records share a code and type, counted over BOTH sides. Sizing the
 * group from the committed side alone left a singleton that gains a second member
 * unguarded, which is the case that actually swaps an id: a new record sorting
 * first takes the published id and the real holder is minted a new one.
 *
 * @param {object[]} committed
 * @param {object[]} rows
 * @returns {Map<string, number>}
 */
function groupSizes(committed, rows) {
  const sizes = new Map();
  for (const set of [committed, rows]) {
    const counts = new Map();
    for (const r of set) {
      const place = accreditationKeyOf(r);
      counts.set(place, (counts.get(place) ?? 0) + 1);
    }
    for (const [place, n] of counts) sizes.set(place, Math.max(sizes.get(place) ?? 0, n));
  }
  return sizes;
}

/**
 * Refuse a positional tie-break that paired two records standing apart. A group
 * the portal reordered, or that gained a member, would otherwise swap two
 * published ids silently.
 *
 * The coordinate decides where both sides carry one, even a commune centroid:
 * it still says which locality the record is in, which is all this asks. Where
 * either side has none, the commune label is the only locality left, folded with
 * normAr because the portal respaces those too. With neither, the check fails
 * closed: nothing locates the record, so the pairing cannot be checked, and a
 * silent id swap is worse than a build that stops.
 *
 * @param {object[]} committed
 * @param {object[]} rows
 * @param {(r: object) => string} keyOf
 * @param {Map<string, number>} sizes
 */
function checkTieBreaks(committed, rows, keyOf, sizes) {
  const live = new Map(rows.map((r) => [keyOf(r), r]));
  for (const was of committed) {
    const place = accreditationKeyOf(was);
    if ((sizes.get(place) ?? 0) < 2) continue;
    const now = live.get(keyOf(was));
    if (!now) continue;
    const refuse = (why) => {
      throw new Error(
        `formation-professionnelle: the tie-break paired id ${was.id} with ${why} ` +
          `(${JSON.stringify(was.name)} -> ${JSON.stringify(now.name)}); code|type ${place} ` +
          `has been reordered or gained a member, so position no longer identifies ` +
          `its establishments`,
      );
    };
    if (was.lat != null && now.lat != null) {
      const km = kmApart(was, now);
      if (km > TIE_BREAK_MAX_KM) refuse(`a record ${km.toFixed(1)} km away`);
      continue;
    }
    if (was.commune == null || now.commune == null) {
      refuse("a record nothing locates: neither carries a coordinate or a commune");
    }
    if (normAr(was.commune) !== normAr(now.commune)) {
      refuse(`a record in another commune (${was.commune} / ${now.commune}), with no coordinate to appeal to`);
    }
  }
}

export function assignStableIds(rows, committed, retiredIds) {
  const keyOf = formationCarryKey(committed, rows);
  checkTieBreaks(committed, rows, keyOf, groupSizes(committed, rows));
  const shipped = new Set(committed.map(keyOf));
  let highest = 0;
  for (const id of [...committed.map((r) => r.id), ...retiredIds]) {
    const n = Number(id);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  let minted = 0;
  for (const r of rows) {
    if (shipped.has(keyOf(r))) continue;
    r.id = String(++highest).padStart(5, "0");
    minted++;
  }
  const retiredBefore = retiredIds.size;
  carryOverIds(rows, committed, keyOf, "formation-professionnelle", retiredIds);
  return {
    carried: rows.length - minted,
    minted,
    retired: retiredIds.size - retiredBefore,
  };
}

// --- main -------------------------------------------------------------------
function main() {
  const raw = readCapture("formation-professionnelle", "takwin-etab").data;
  console.log(`Capture: ${raw.length} raw records`);

  // IDNature_etsF 1 is the ministry itself, not a training establishment.
  const filtered = raw.filter((r) => r.IDNature_etsF !== 1);
  console.log(`  ${filtered.length} after excluding the ministry HQ`);

  const ref = loadGeoReference();
  const stats = {
    takwin: 0,
    commune: 0,
    wilaya: 0,
    unplaced: 0,
    viaVariant: 0,
    reassignedWilaya: 0,
    reassignedDaughter: 0,
    reassignedElsewhere: 0,
    coordinateCommuneConflicts: 0,
    signRecovered: 0,
  };
  const unresolved = new Map();

  const records = filtered.map((r) => {
    const { lat, lng: rawLng } = cleanCoords(r);
    const commune = parseCommune(r.CommunnNom);
    const sourceWilayaCode = wilayaCode(r.IDDFEP);
    const sourceWilaya = Number(sourceWilayaCode);
    const scope = new Set([sourceWilaya, ...(ref.daughters.get(sourceWilaya) || [])]);
    // The commune join reads the row's text only, so it is settled before the
    // coordinate is: the sign recovery needs it as its second attribution, and the
    // conflict counter and the fallback placement below both read the same hit.
    const communeHit = resolveCommune(commune, sourceWilaya, ref);
    const lng = recoverLongitudeSign(lat, rawLng, scope, communeHit);
    if (lng !== rawLng) stats.signRecovered++;
    // A source coordinate is stronger evidence than a contradictory commune
    // string. Use containment for exact points, and commune resolution for the
    // records whose source coordinate is missing.
    const coordinateWilaya = lat != null ? containingWilayaCode(lat, lng) : null;
    if (coordinateWilaya && communeHit && Number(coordinateWilaya) !== communeHit.wilaya) {
      stats.coordinateCommuneConflicts++;
    }
    const wilaya_code = coordinateWilaya
      || (communeHit ? String(communeHit.wilaya).padStart(2, "0") : sourceWilayaCode);
    // Two different things used to be counted as one, and the READMEs then described
    // the total as if it were all reform: a move INTO one of the source wilaya's
    // post-2026 daughters is the same territory re-coded, while a move anywhere else
    // is the row's coordinate disagreeing with the directorate that filed it, which is
    // a defect in one of the two and not a re-coding.
    if (wilaya_code !== sourceWilayaCode) {
      stats.reassignedWilaya++;
      if (scope.has(Number(wilaya_code))) stats.reassignedDaughter++;
      else stats.reassignedElsewhere++;
    }

    let geo = { lat, lng, geo_precision: null, geo_method: null };
    if (lat != null) {
      geo = { lat, lng, geo_precision: "exact", geo_method: "takwin" };
      stats.takwin++;
    } else {
      if (communeHit) {
        geo = { lat: round6(communeHit.lat), lng: round6(communeHit.lng), geo_precision: "approximate", geo_method: "commune" };
        stats.commune++;
        if (communeHit.how === "variant") stats.viaVariant++;
      } else if (commune && normAr(commune) === ref.wilayaNameKey.get(sourceWilaya)) {
        // The commune field repeats the wilaya name and no commune of that name
        // exists (Algiers: "الجزائر" is the wilaya, its communes are named
        // otherwise). Nothing finer than the wilaya is being claimed here.
        // Most wilaya names DO also name their seat commune, which the lookup
        // above resolves first, so this branch is the genuine remainder.
        const c = ref.wilayaCentroid.get(sourceWilaya);
        if (c) { geo = { lat: round6(c.lat), lng: round6(c.lng), geo_precision: "approximate", geo_method: "wilaya" }; stats.wilaya++; }
      }
      if (geo.lat == null) {
        stats.unplaced++;
        const k = `${sourceWilayaCode}|${commune}`;
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
  console.log(
    `  ${stats.reassignedDaughter} establishment(s) re-coded into a post-2026 daughter of the wilaya that filed them, ` +
      `${stats.reassignedElsewhere} placed in a wilaya their directorate does not cover`,
  );
  if (stats.coordinateCommuneConflicts) {
    console.log(`  ${stats.coordinateCommuneConflicts} exact coordinate(s) overrode a contradictory commune-derived wilaya`);
  }
  if (stats.signRecovered) {
    console.log(`  ${stats.signRecovered} longitude(s) had their minus sign restored from the publishing directorate`);
  }
  if (residuals.length)
    console.log(`  single-axis cross-check on ${residuals.length} placed records: median ${pct(0.5)} km, p90 ${pct(0.9)} km, max ${residuals[residuals.length - 1].toFixed(1)} km`);
  if (unresolved.size) {
    console.log(`  ${unresolved.size} commune name(s) left unresolved (kept ungeocoded):`);
    for (const [k, n] of [...unresolved].sort((a, b) => b[1] - a[1]))
      console.log(`    w${k.split("|")[0]} ×${n} "${k.split("|")[1]}"`);
  }

  // --- emit v2 ---------------------------------------------------------------
  // The capture is the retrieval, so its own date is what the package states,
  // rather than today's (the build pulled nothing) or the previous metadata's
  // (which would misdate a fresh capture as the last one). A replay of the same
  // capture therefore reproduces the same metadata.
  const cfg = MIGRATIONS["formation-professionnelle"];
  const captured = captureMeta("formation-professionnelle", "takwin-etab").retrieved;
  const { updated, retrieved } = { updated: captured, retrieved: captured };
  const v2 = records.map(cfg.map);
  const committed = readCommitted(OUT_DIR, "establishments.json");
  const retiredIds = readRetiredIds(OUT_DIR);
  // The ledger's forwards are append-only: read what is there, carry it back out
  // through the writer, and add a forward for any retirement whose data went to
  // another record. A retirement here is the portal dropping an accreditation
  // code outright, which is a disappearance and not a merge, so it reserves the
  // id without forwarding it; the key is unique, so no two records ever fold
  // into one, and the ids carry no prefix for carryOverIds to re-issue against.
  const retiredMigrations = readRetiredMigrations(OUT_DIR);
  const ids = assignStableIds(v2, committed, retiredIds);
  console.log(
    `Ids: ${ids.carried} carried, ${ids.minted} minted above the high-water mark, ${ids.retired} retired`,
  );

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
    retiredIds,
    retiredMigrations,
  });
  console.log(`Wrote ${out.length} establishments → v2 (${metadata.geocoded_count} geocoded, ${metadata.wilayas_covered} wilayas).`);
}

// Guarded so the test suite can import the carry key and the id assignment
// without running the build, the shape packages/ecoles/scripts/fetch.mjs uses.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
