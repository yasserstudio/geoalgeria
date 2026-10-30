#!/usr/bin/env node
/**
 * Fetch Algeria's sports infrastructure from the MJS GeoServer (kharitaDZ)
 * and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source: https://sig.mjs.gov.dz/dashboard/viewer
 *   The MJS (Ministry of Youth and Sports) runs a GeoServer behind a
 *   Nuxt dashboard. The "infrastructures_sportives" WMS layer is publicly
 *   queryable. We request all features as GeoJSON via the WMS GetMap endpoint
 *   (format=application/json;type=geojson), which bypasses the auth-gated WFS.
 *
 * Each raw record carries ~35 fields; we keep the ones useful to consumers:
 * name, type, address, commune/daira/wilaya, capacity, built/land area, year
 * of reception, operational status, PMR accessibility, and GPS coordinates.
 *
 * Wilaya names from the source are French (all-caps, no diacritics). We resolve
 * them to numeric wilaya_code using a normalisation map built from the flagship
 * dataset's 69 wilayas.
 *
 * The GeoServer answers only from an Algerian vantage point, so every pull is
 * captured under sources/sports/ and the package rebuilds from that capture
 * offline. The capture's exact shape: scripts/lib/mjs-sig.mjs.
 *
 * Usage: node scripts/fetch.mjs
 *        node scripts/fetch.mjs --cache    # rebuild from sources/sports/sig-infrastructures.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import {
  MIGRATIONS,
  writePackageV2,
  carryOverIds,
  forwardRetiredId,
  readCommitted,
  readRetiredIds,
  readRetiredMigrations,
  loadReviewLedger,
} from "../../../scripts/lib/v2-transforms.mjs";
import { foldNameDashes } from "../../../scripts/lib/no-em-dash.mjs";
import { haversine } from "../../../scripts/lib/commune-resolver.mjs";
import { captureMeta } from "../../../scripts/lib/source-store.mjs";
import { withoutEmDash } from "../../../scripts/lib/no-em-dash.mjs";
import { fetchMjsLayer, readMjsCapture, MJS_SOURCE } from "../../../scripts/lib/mjs-sig.mjs";
import { looseKey } from "../../normalize/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const DATASET = join(__dirname, "..", "..", "dataset", "data");

const LAYER = "infrastructures_sportives";
const CAPTURE = "sig-infrastructures";
const TRANSITION_REPORT = join(__dirname, "..", "..", "..", "research", "sports", "id-transition.json");
const SOURCE = MJS_SOURCE;

const MIN_EXPECTED = 4000;

// Infrastructure type codes: short, stable keys for the 27 types the source publishes.
const TYPE_MAP = {
  "Terrains Sportif de Proximité": { code: "TSP", fr: "Terrain sportif de proximité" },
  "Aire de Jeux Football": { code: "AJF", fr: "Aire de jeux football" },
  "Salle OMS": { code: "SOMS", fr: "Salle OMS" },
  "Salle Spécialisée": { code: "SS", fr: "Salle spécialisée" },
  "Bassin de Natation": { code: "BN", fr: "Bassin de natation" },
  "Piscine 25m": { code: "P25", fr: "Piscine 25 m" },
  "Piscine de Proximité": { code: "PP", fr: "Piscine de proximité" },
  "Terrain de football": { code: "TF", fr: "Terrain de football" },
  "Stade de Football": { code: "SF", fr: "Stade de football" },
  "Stade OMS": { code: "STOMS", fr: "Stade OMS" },
  "Stade  OMS": { code: "STOMS", fr: "Stade OMS" },
  "Piste d'athlétisme": { code: "PA", fr: "Piste d'athlétisme" },
  "Parcour d'Athletisme": { code: "PCA", fr: "Parcours d'athlétisme" },
  "Boulodrome": { code: "BL", fr: "Boulodrome" },
  "Court de tennis": { code: "CT", fr: "Court de tennis" },
  "Unité  d'hébergement, de soin et de réccupuration": { code: "UHR", fr: "Unité d'hébergement et de récupération" },
  "Unité d'hébergement, de soin et de réccupuration": { code: "UHR", fr: "Unité d'hébergement et de récupération" },
  "Piscine 50m": { code: "P50", fr: "Piscine 50 m" },
  "Stade d'Athletisme": { code: "SA", fr: "Stade d'athlétisme" },
  "Centre Equestre": { code: "CE", fr: "Centre équestre" },
  "Base Nautique": { code: "BNA", fr: "Base nautique" },
  "Complexes sportif": { code: "CXS", fr: "Complexe sportif" },
  "aire de jeux de loisirs": { code: "AJL", fr: "Aire de jeux de loisirs" },
  "Champ de tir": { code: "CDT", fr: "Champ de tir" },
  "Centre de regroupement et de préparation": { code: "CRP", fr: "Centre de regroupement et de préparation" },
  "Ecole de jeunes talents": { code: "EJT", fr: "École de jeunes talents" },
  "terrain de replique": { code: "TR", fr: "Terrain de réplique" },
  "REALISATION, EQUIPEMENT  D'UN  ETABLISSEMENT D'EDUCATION PHYSIQUE ET SPORTIVE": { code: "EPS", fr: "Établissement d'éducation physique et sportive" },
  "REALISATION, EQUIPEMENT D'UN ETABLISSEMENT D'EDUCATION PHYSIQUE ET SPORTIVE": { code: "EPS", fr: "Établissement d'éducation physique et sportive" },
  "Grand Stade": { code: "GS", fr: "Grand stade" },
  "centre de formation regional": { code: "CFR", fr: "Centre de formation régional" },
};

// Wilaya name normalisation: MJS uses uppercase ASCII French; the flagship
// uses accented Title Case. We strip diacritics and case to match.
function buildWilayaMap() {
  const wilayas = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf-8")).wilayas;
  const map = {};
  for (const w of wilayas) {
    const code = String(w.code).padStart(2, "0");
    map[normalise(w.name_fr)] = code;
  }
  return map;
}

function normalise(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// MJS uses variant names for some new wilayas; map them to the flagship form.
const WILAYA_ALIASES = {
  "AIN SALAH": "IN SALAH",
  "AIN GUEZZAM": "IN GUEZZAM",
  "EL MEGHAIER": "EL M GHAIR",
  "EL MENIA": "EL MENIAA",
};

// Algeria bounding box.
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat !== 0 && lng !== 0 &&
  lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

const clean = (s) => {
  if (s == null) return null;
  const v = String(s).replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
};

// Strip the "uuid:" prefix the GIS puts on referential values. Only a real
// 8-4-4-4-12 UUID counts: the 2026-10-27 capture writes 506 reception years as
// "2013:undefined", and a looser "hex digits before a colon" test read the year
// itself as the prefix, which blanked 168 published years.
const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i;
export const stripUUID = (s) => {
  if (s == null) return null;
  const v = String(s);
  const m = v.match(UUID_PREFIX);
  return clean(m ? v.slice(m[0].length) : v);
};

function parseYear(v) {
  const s = stripUUID(v);
  if (!s) return null;
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function parseCapacity(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSurface(v) {
  if (v == null) return null;
  const s = String(v).replace(/,/g, ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// --- stable ids ------------------------------------------------------------
//
// Ids follow places: a facility keeps the id it shipped under, a genuinely new
// facility takes a fresh number, and a removed facility's number is never handed
// out again. The ids used to be positions in the sort order, so the October 2026
// pull would have moved 5,030 of the 5,141 published ids onto a different place
// (#306).
//
// Three tiers, in this order, each over what the tiers before it left unclaimed:
//
//  0. The SIG's own per-record UUID (`properties.id`), published as `refs.mjs`
//     since the 2026-10-27 refresh. It is the Upstream link a ministry edit
//     cannot move: a renamed, re-placed or reclassified facility keeps its id.
//     Every record shipped from that refresh on carries it, so on every later
//     run this tier decides everything and the two below see nothing.
//  1. The place key, for a committed record that carries no `refs.mjs` (the
//     records published before the UUID was). It reads only the fields that say
//     WHICH place a record is, never the attributes the ministry revises.
//  2. The one-time transition matcher (matchTransition below), for what the
//     place key could not pin: the SIG's 2026 editing campaign changed a key field
//     on records that still exist (an `Inclus dans le` prefix on the address, a
//     coordinate re-saved at 4 decimals, an honorific added to the name), which a
//     place key reads as a different facility.
//
// A committed record that carries a UUID is claimed by that UUID or by nothing:
// when the UUID is gone from the source, the facility is gone, whatever place
// key a new row happens to share with it.
//
// Only fields the GENERATOR owns belong in the place key. The key is read before
// writePackageV2, and the writer then patches fields from
// quality/overrides/sports.json and folds every name-keyed string through
// foldNameDashes, so a key that read either of those would compare a generator
// value against a published one and retire an id on a rebuild that changed
// nothing (empirically: `wilaya_code` cost 27 ids, 13 of them the reviewed
// corrections themselves, which then aborted the build at "review overrides:
// unknown record 02725"). Three things keep the two sides comparable:
// `wilaya_code` is out of the key, being GeoAlgeria-derived rather than ministry
// data (reconcileCurrentWilayaByCommune re-decides it from the commune index and
// the boundaries on every run); the name is folded exactly as the writer folds
// it; and the committed side is read through asGenerated below, which undoes the
// review ledger, so a reviewed coordinate or name correction cannot churn the id
// it corrected either.
const PLACE_FIELDS = ["commune", "type", "name", "address", "lat", "lng"];

/** The place a v2 sports record stands for, as a carry key. */
export const placeKeyOf = (r) => {
  const place = foldNameDashes(
    Object.fromEntries(PLACE_FIELDS.map((f) => [f, r[f] ?? null])),
  );
  return PLACE_FIELDS.map((f) => JSON.stringify(place[f])).join("|");
};

/** The SIG UUID a record carries as its Upstream link, or null. */
export const mjsRefOf = (r) => r?.refs?.mjs ?? null;

/**
 * A place-key carry key over both sides of a rebuild. The MJS ships groups of
 * records whose every place field is identical (4 groups, 10 records as of the
 * June capture), and a carry key that cannot pin an id uniquely fails the build,
 * so twins are told apart by their position within their own group. They are
 * field-identical, so which of them keeps which id carries no meaning.
 *
 * @param {object[]} committed  the committed v2 records
 * @param {object[]} rows       the records being emitted
 * @returns {(r: object) => string}
 */
export function sportsCarryKey(committed, rows) {
  const keyed = new Map();
  for (const set of [committed, rows]) {
    const seen = new Map();
    for (const r of set) {
      const place = placeKeyOf(r);
      const nth = (seen.get(place) ?? 0) + 1;
      seen.set(place, nth);
      keyed.set(r, `${place}#${nth}`);
    }
  }
  return (r) => keyed.get(r) ?? placeKeyOf(r);
}

/**
 * The committed records as the generator produced them, with the review ledger's
 * corrections undone, which is the side of the comparison the carry key can
 * actually read.
 *
 * writePackageV2 applies quality/overrides/sports.json AFTER the fetcher has
 * keyed the rows, so a published record carries reviewed values the generator
 * never produces: 5 of the repo's 11 ledgers patch coordinates, and keying on a
 * reviewed coordinate retires the very id the review corrected (reproduced on
 * 01663: carried 0, minted 1, retired 1). The ledger cannot be applied to the
 * live rows instead, because it is keyed on the published id, which is what
 * carry-over is still deciding. Every patched field is required to appear in
 * `expect` with its pre-patch value, precisely so a build can be replayed, so
 * restoring `expect` (and dropping what `expect_absent` says the generator does
 * not emit) is the exact inverse of the patch the writer will apply, and leaves
 * both sides keyed on what the generator owns. Ids are never patchable, so the
 * returned records still carry the published ids carry-over pins back.
 *
 * @param {object[]} committed  the committed v2 records
 * @param {object|null} ledger  the review ledger, or null for a package with none
 * @param {string} file         the data file the decisions apply to
 */
export function asGenerated(committed, ledger, file) {
  const decisions = new Map(
    (ledger?.decisions ?? [])
      .filter((d) => d.file === file && d.publish_action === "patch")
      .map((d) => [String(d.record_id), d]),
  );
  if (!decisions.size) return committed;
  return committed.map((record) => {
    const decision = decisions.get(String(record.id));
    // Only a patch the committed record actually carries is undone (the writer
    // stamps review_status when it applies one): a decision added in the same run
    // that first applies it has nothing to undo yet.
    if (!decision || record.review_status !== "corrected") return record;
    if (!Object.entries(decision.patch ?? {}).every(([field, value]) => record[field] === value)) return record;
    const generated = { ...record, ...decision.expect };
    for (const field of decision.expect_absent ?? []) delete generated[field];
    return generated;
  });
}

// --- the one-time transition --------------------------------------------------
//
// Measured against the 2026-10-27 capture (research/sports/transition-2026-10-28.md):
// the place key alone retired 447 of the 5,141 published ids and minted 540, and
// nearly all of the 447 were the same facility the ministry had edited. The
// matcher below recovers those, and only those it has evidence for.
//
// A pairing of a published record P and a live row L is a candidate only when
// both carry the same `type`, and one of three tiers holds:
//
//   strict   the same Loose key of name AND of commune, with spatial evidence:
//              S0 the same point;
//              S1 L's point is P's point rounded to 4 decimals (the SIG's editor
//                 re-saves an edited record at 4 decimals, so the "move" is up to
//                 about 7 m of rounding, not a correction);
//              S2 within 300 m, the same address Loose key (a leading "Inclus dans
//                 le" dropped), and that (commune, type, name, address) tuple
//                 occurs once among all published records and once among all live
//                 rows, so a generic "commune X" address on five identical
//                 proximity fields cannot pick one of them by distance;
//   relabel  S0 or S1, the same name, a different commune label, and at least 4 of
//            the 7 attributes below agreeing (the commune field was respelled or
//            corrected at an unmoved point);
//   rename   S0 or S1, the same commune, a different name, and at least 5 of the 7
//            attributes agreeing (an honorific added, "Terrain sportif de
//            proximité" renamed "Terrain combiné").
//
// Candidates are ranked strict before relabel before rename, then S0, S1, S2, then
// the same raw address, then distance, then attribute agreement, and accepted best
// first, one per record on each side. A candidate with a rival of exactly the same
// rank on either side is refused with that rival, and all of them fall through to
// retire and mint: a tie is not evidence for either reading.
//
// A published record left unpaired is a Repeat post (CONTEXT.md) when the source
// held one facility twice and now holds it once: no live row stands at its point,
// and a carried record of the same type and commune stands within 40 m with the
// same real name (a placeholder such as "I.N.D" or a bare type label is no name),
// or, both unnamed, the same non-generic address, or every place field identical.
// Its id retires with a forward to the record that stays.
//
// The matcher runs only while committed records lack `refs.mjs`, which after the
// 2026-10-27 refresh is never; its decisions are written to
// research/sports/id-transition.json by the run that made them.
const TRANSITION_RADIUS_M = 300;
const REPEAT_POST_RADIUS_M = 40;
const AGREEMENT_FIELDS = ["capacity", "year", "surface_built_m2", "surface_land_m2", "operational", "pmr", "daira"];
const RELABEL_MIN_AGREEMENT = 4;
const RENAME_MIN_AGREEMENT = 5;
const TIERS = ["strict", "relabel", "rename"];
const EVIDENCE = ["same-point", "rounded-4dp", "moved-same-address"];

const looseOf = (s) => (s == null ? "" : looseKey(String(s)) ?? "");
const INCLUS = /^\s*inclus\s+dans?\s+(le|la|les|l'|l’)?\s*/i;
const addressKey = (a) => looseOf(a == null ? null : String(a).replace(INCLUS, ""));
const round4 = (x) => Math.round(x * 1e4) / 1e4;
const samePoint = (p, l) => p.lat === l.lat && p.lng === l.lng;
const roundedPoint = (p, l) => round4(p.lat) === l.lat && round4(p.lng) === l.lng;
const agreement = (a, b) => AGREEMENT_FIELDS.filter((f) => (a[f] ?? null) === (b[f] ?? null)).length;
const metres = (a, b) => haversine(a.lat, a.lng, b.lat, b.lng);
const tupleKey = (r) => [looseOf(r.commune), r.type, looseOf(r.name), addressKey(r.address)].join("|");
const PLACEHOLDER_NAMES = new Set(["I.N.D", "IND", "Non concerné", "Pas encore établie"].map(looseOf));
const realName = (r) => {
  const key = looseOf(r.name);
  return PLACEHOLDER_NAMES.has(key) || !/\p{L}/u.test(key) ? "" : key;
};
const countBy = (records, keyOf) => {
  const counts = new Map();
  for (const r of records) counts.set(keyOf(r), (counts.get(keyOf(r)) ?? 0) + 1);
  return counts;
};

/**
 * Pair the published records the place key left unclaimed with the live rows it
 * left unclaimed. Pure and deterministic: the same inputs in any order give the
 * same pairs.
 *
 * @param {object[]} published  unclaimed published records (ledger undone)
 * @param {object[]} rows       unclaimed live rows
 * @param {object} context
 * @param {object[]} context.allPublished  every published record, for tuple uniqueness
 * @param {object[]} context.allRows       every live row, for tuple uniqueness
 * @returns {{pairs: object[], ties: object[], refused: object[]}}
 */
export function matchTransition(published, rows, { allPublished, allRows }) {
  const publishedTuples = countBy(allPublished, tupleKey);
  const liveTuples = countBy(allRows, tupleKey);
  const spatial = (p, l) => {
    if (samePoint(p, l)) return 0;
    if (roundedPoint(p, l)) return 1;
    if (
      metres(p, l) <= TRANSITION_RADIUS_M &&
      addressKey(p.address) !== "" &&
      addressKey(p.address) === addressKey(l.address) &&
      publishedTuples.get(tupleKey(p)) === 1 &&
      liveTuples.get(tupleKey(l)) === 1
    ) return 2;
    return null;
  };
  const edges = [];
  const refusals = [];
  for (const p of published) {
    for (const l of rows) {
      if (p.type !== l.type) continue;
      const sameName = looseOf(p.name) === looseOf(l.name);
      const sameCommune = looseOf(p.commune) === looseOf(l.commune);
      const s = spatial(p, l);
      if (s == null) {
        // Recorded, so the report shows the pairings the distinctiveness rule
        // turned down rather than only the ones it accepted.
        if (
          sameName && sameCommune && metres(p, l) <= TRANSITION_RADIUS_M &&
          addressKey(p.address) !== "" && addressKey(p.address) === addressKey(l.address)
        ) refusals.push({ p, l, reason: "address-not-distinctive" });
        continue;
      }
      const a = agreement(p, l);
      let tier = null;
      if (sameName && sameCommune) tier = 0;
      else if (s <= 1 && sameName && a >= RELABEL_MIN_AGREEMENT) tier = 1;
      else if (s <= 1 && sameCommune && a >= RENAME_MIN_AGREEMENT) tier = 2;
      if (tier == null) continue;
      edges.push({ p, l, tier, s, d: metres(p, l), a, sameAddress: (p.address ?? null) === (l.address ?? null) });
    }
  }
  const rank = (x, y) =>
    x.tier - y.tier || x.s - y.s || Number(y.sameAddress) - Number(x.sameAddress) || x.d - y.d || y.a - x.a;
  const uuidOf = (l) => mjsRefOf(l) ?? "";
  edges.sort((x, y) => rank(x, y) || x.p.id.localeCompare(y.p.id) || uuidOf(x.l).localeCompare(uuidOf(y.l)));

  const usedP = new Set();
  const usedL = new Set();
  const pairs = [];
  const ties = [];
  const open = (e) => !usedP.has(e.p) && !usedL.has(e.l);
  for (const e of edges) {
    if (!open(e)) continue;
    const rivals = edges.filter((o) => o !== e && open(o) && (o.p === e.p || o.l === e.l) && rank(o, e) === 0);
    if (rivals.length) {
      ties.push({ edge: e, rivals });
      for (const o of [e, ...rivals]) { usedP.add(o.p); usedL.add(o.l); }
      continue;
    }
    usedP.add(e.p);
    usedL.add(e.l);
    pairs.push(e);
  }
  // A pairing some other candidate also reached was decided by the ranking, not
  // forced: the report names those candidates, so every such call can be read.
  for (const e of pairs) e.alternatives = edges.filter((o) => o !== e && (o.p === e.p || o.l === e.l));
  const paired = new Set(pairs.map((e) => e.p));
  const refused = refusals.filter((r) => !paired.has(r.p));
  return { pairs, ties, refused };
}

/**
 * The Repeat posts among the published records left unpaired: the ones the source
 * now holds once, as a record this run carries.
 *
 * @param {object[]} unpaired  published records no tier claimed (ledger undone)
 * @param {object[]} free      live rows no tier claimed
 * @param {object[]} carried   live rows a tier claimed, already carrying the
 *                             published id they keep
 * @returns {Array<{p: object, to: object, d: number, reason: string}>}
 */
export function findRepeatPosts(unpaired, free, carried) {
  const posts = [];
  for (const p of unpaired) {
    // A live row at the very point is a stronger reading than a neighbour.
    if (free.some((l) => samePoint(p, l) || roundedPoint(p, l))) continue;
    const twins = carried.filter((r) => placeKeyOf(r) === placeKeyOf(p));
    const near = carried.filter((r) =>
      r.type === p.type &&
      looseOf(r.commune) === looseOf(p.commune) &&
      metres(p, r) <= REPEAT_POST_RADIUS_M &&
      ((realName(p) !== "" && realName(r) === realName(p)) ||
        (realName(p) === "" && p.address != null &&
          looseOf(r.address) === looseOf(p.address) && looseOf(p.address) !== looseOf(p.commune))),
    );
    const byNearest = (x, y) => metres(p, x) - metres(p, y) || x.id.localeCompare(y.id);
    const to = [...twins].sort((x, y) => x.id.localeCompare(y.id))[0] ?? near.sort(byNearest)[0];
    if (!to) continue;
    posts.push({
      p,
      to,
      d: metres(p, to),
      reason: twins.length ? "place-identical" : realName(p) ? "same-name" : "same-address-unnamed",
    });
  }
  return posts;
}

/**
 * Give every record its public id: the one it already shipped under, or, for a
 * facility the source has never shipped, the next number above every id the
 * package has ever used (published or retired). Parking the new facilities above
 * that high-water mark first is what keeps them out of a published slot: the ids
 * here are a flat 5-digit space with no prefix to re-home them within.
 *
 * @param {object[]} rows          the v2 records being emitted (mutated in place)
 * @param {object[]} committed     the committed v2 records
 * @param {Set<string>} retiredIds the retired-id ledger, mutated with this run's
 * @param {object} [options]
 * @param {object|null} [options.ledger]  the review ledger to undo on the
 *                                 committed side; defaults to the package's own
 * @param {string} [options.file]  the data file the decisions apply to
 * @param {Record<string, object>|null} [options.migrations]  the ledger's forwards,
 *                                 mutated with a forward per Repeat post
 * @param {string} [options.retrieved]  the capture date a forward's note cites
 * @param {object|null} [options.log]  filled with what each tier decided
 * @returns {{carried: number, minted: number, retired: number}}
 */
export function assignStableIds(
  rows,
  committed,
  retiredIds,
  {
    ledger = loadReviewLedger("sports"),
    file = "facilities.json",
    migrations = null,
    retrieved = null,
    log = null,
  } = {},
) {
  const published = asGenerated(committed, ledger, file);
  let highest = 0;
  for (const id of [...published.map((r) => r.id), ...retiredIds]) {
    const n = Number(id);
    if (Number.isFinite(n) && n > highest) highest = n;
  }

  // 0. The SIG UUID, on both sides. A repeated UUID would pin two records to one
  //    id, so it fails the build on either side.
  const byUuid = new Map();
  for (const p of published) {
    const uuid = mjsRefOf(p);
    if (uuid == null) continue;
    if (byUuid.has(uuid)) throw new Error(`sports: committed refs.mjs ${uuid} is carried by two records`);
    byUuid.set(uuid, p);
  }
  const liveUuids = new Set();
  for (const r of rows) {
    const uuid = mjsRefOf(r);
    if (uuid == null) continue;
    if (liveUuids.has(uuid)) throw new Error(`sports: the source repeats properties.id ${uuid}`);
    liveUuids.add(uuid);
  }
  const claim = new Map(); // live row -> the published record whose id it keeps
  for (const r of rows) {
    const p = byUuid.get(mjsRefOf(r));
    if (p) claim.set(r, p);
  }
  const byTier = { uuid: claim.size, place: 0, strict: 0, relabel: 0, rename: 0 };

  // 1 and 2 only see the committed records published before the UUID was.
  const legacy = published.filter((p) => mjsRefOf(p) == null);
  let transition = null;
  if (legacy.length) {
    const open = rows.filter((r) => !claim.has(r));
    const keyOf = sportsCarryKey(legacy, open);
    const byKey = new Map();
    for (const p of legacy) {
      const key = keyOf(p);
      if (byKey.has(key)) throw new Error(`sports: committed data has duplicate carry key ${JSON.stringify(key)}`);
      byKey.set(key, p);
    }
    for (const r of open) {
      const p = byKey.get(keyOf(r));
      if (p) { claim.set(r, p); byTier.place++; }
    }
    const claimed = new Set(claim.values());
    const legacyLeft = legacy.filter((p) => !claimed.has(p));
    const openLeft = rows.filter((r) => !claim.has(r));
    const matched = matchTransition(legacyLeft, openLeft, { allPublished: published, allRows: rows });
    for (const e of matched.pairs) { claim.set(e.l, e.p); byTier[TIERS[e.tier]]++; }
    const nowClaimed = new Set(claim.values());
    const unpaired = legacyLeft.filter((p) => !nowClaimed.has(p));
    const free = rows.filter((r) => !claim.has(r));
    const carriedRows = [...claim].map(([r, p]) => ({ ...r, id: p.id }));
    const repeatPosts = findRepeatPosts(unpaired, free, carriedRows);
    transition = { ...matched, repeatPosts, unpaired };
  }

  let minted = 0;
  for (const r of rows) {
    const p = claim.get(r);
    if (p) r.id = p.id;
    else { r.id = String(++highest).padStart(5, "0"); minted++; }
  }

  // carryOverIds owns retirement, reservation and the final uniqueness check, so
  // the ids are handed to it as already settled: each side keyed by its own id.
  const retiredBefore = retiredIds.size;
  carryOverIds(rows, published, (r) => `id:${r.id}`, "sports", retiredIds);

  for (const post of transition?.repeatPosts ?? []) {
    forwardRetiredId(
      migrations,
      post.p.id,
      post.to.id,
      `Repeat post: the Ministry of Youth and Sports SIG entered this facility twice; ` +
        `the ${retrieved ?? "latest"} capture holds it once, and its data is on ${post.to.id}.`,
    );
  }
  if (log) Object.assign(log, { byTier, minted, transition, liveCount: rows.length });
  return {
    carried: rows.length - minted,
    minted,
    retired: retiredIds.size - retiredBefore,
  };
}

/**
 * What the transition decided, as the committed report: deterministic, so a
 * replay of the same capture over the same committed data writes the same bytes.
 */
export function transitionReport(log, { capture, retrieved, sha256, published, retired }) {
  const t = log.transition;
  const pairOf = (e) => ({
    id: e.p.id,
    mjs: mjsRefOf(e.l),
    tier: TIERS[e.tier],
    evidence: EVIDENCE[e.s],
    distance_m: Math.round(e.d * 10) / 10,
    same_address: e.sameAddress,
    attributes_agreeing: e.a,
  });
  const byId = (x, y) => x.id.localeCompare(y.id);
  return {
    note:
      "The one-time transition of @geoalgeria/sports from place-keyed ids to the SIG's own UUID (refs.mjs), " +
      "written by packages/sports/scripts/fetch.mjs the run it decided. Rule: the comment above matchTransition. " +
      "Measurement: research/sports/transition-2026-10-28.md.",
    capture: { file: `sources/sports/${capture}.json`, retrieved, sha256 },
    counts: {
      published,
      live: log.liveCount,
      carried: { ...log.byTier },
      minted: log.minted,
      retired: retired.length,
      forwarded: t.repeatPosts.length,
    },
    rule: {
      radius_m: TRANSITION_RADIUS_M,
      repeat_post_radius_m: REPEAT_POST_RADIUS_M,
      relabel_min_agreement: RELABEL_MIN_AGREEMENT,
      rename_min_agreement: RENAME_MIN_AGREEMENT,
      agreement_fields: AGREEMENT_FIELDS,
    },
    paired: t.pairs
      .map((e) => ({
        ...pairOf(e),
        ...(e.alternatives.length
          ? { decided_over: e.alternatives.map(pairOf).sort((x, y) => byId(x, y) || x.mjs.localeCompare(y.mjs)) }
          : {}),
      }))
      .sort(byId),
    ties: t.ties
      .map(({ edge, rivals }) => ({ ...pairOf(edge), rivals: rivals.map(pairOf).sort(byId) }))
      .sort(byId),
    refused: [...new Map(t.refused.map((r) => [`${r.p.id}|${mjsRefOf(r.l)}`, r])).values()]
      .map((r) => ({ id: r.p.id, mjs: mjsRefOf(r.l), reason: r.reason, distance_m: Math.round(metres(r.p, r.l) * 10) / 10 }))
      .sort((x, y) => byId(x, y) || x.mjs.localeCompare(y.mjs)),
    repeat_posts: t.repeatPosts
      .map((post) => ({ id: post.p.id, merged_into: post.to.id, reason: post.reason, distance_m: Math.round(post.d * 10) / 10 }))
      .sort(byId),
    retired: [...retired].sort(),
  };
}

// --- main ------------------------------------------------------------------
async function main() {
  const OFFLINE = process.argv.includes("--cache");
  const features = OFFLINE
    ? readMjsCapture({ pkg: "sports", capture: CAPTURE, minExpected: MIN_EXPECTED })
    : await fetchMjsLayer({
        pkg: "sports",
        capture: CAPTURE,
        layer: LAYER,
        minExpected: MIN_EXPECTED,
      });

  const wilayaMap = buildWilayaMap();
  const facilities = [];
  const dropped = [];
  const unknownTypes = new Set();
  const unmappedWilayas = new Set();

  for (const feat of features) {
    const p = feat.properties;
    if (p.deleted === true || p.deleted === "true") continue;

    // Coordinates
    const coords = feat.geometry?.coordinates;
    if (!coords) { dropped.push({ id: p.id, reason: "no geometry" }); continue; }
    let [lng, lat] = coords;
    if (!inAlgeria(lat, lng)) {
      if (inAlgeria(lng, lat)) { [lat, lng] = [lng, lat]; }
      else { dropped.push({ id: p.id, reason: "out of bounds" }); continue; }
    }

    // Type: try exact match first, then whitespace-normalised
    const typeRaw = stripUUID(p.type_de_linfrastructure);
    let typeEntry = typeRaw ? TYPE_MAP[typeRaw] : null;
    if (!typeEntry && typeRaw) {
      const norm = typeRaw.replace(/\s+/g, " ").replace(/[‘’“”]/g, "'").trim();
      typeEntry = TYPE_MAP[norm] || Object.entries(TYPE_MAP).find(
        ([k]) => k.replace(/\s+/g, " ").replace(/[‘’“”]/g, "'").trim() === norm,
      )?.[1] || null;
    }
    if (typeRaw && !typeEntry) unknownTypes.add(typeRaw);

    // Wilaya → code
    const wilayaName = stripUUID(p.wilaya);
    const normWilaya = wilayaName ? normalise(wilayaName) : null;
    const wilayaCode = normWilaya
      ? wilayaMap[normWilaya] || wilayaMap[WILAYA_ALIASES[normWilaya]] || null
      : null;
    if (wilayaName && !wilayaCode) unmappedWilayas.add(wilayaName);

    // Operational status
    const funcRaw = stripUUID(p.fonctionnelle);
    const operational = funcRaw
      ? funcRaw.toLowerCase().startsWith("fonctionnel") ? true
      : funcRaw.toLowerCase().includes("non") ? false
      : null
      : null;

    // PMR accessibility
    const pmrRaw = p["accessibilite_aux_personnes_a_mobilite_reduite(pmr)"];
    const pmr = pmrRaw === "true" || pmrRaw === true ? true
      : pmrRaw === "false" || pmrRaw === false ? false
      : null;

    facilities.push({
      id: p.id,
      uuid: p.id,
      name: clean(p.nomination_de_linfrastructure),
      type_code: typeEntry?.code ?? null,
      type_fr: typeEntry?.fr ?? typeRaw ?? null,
      // An upstream address can carry an em dash as a separator (05187: "Tiourtit
      // \u2014 Iflissen"); it is folded like a name, never published as received.
      address: withoutEmDash(clean(p.adresse_de_linfrastructure)),
      commune: stripUUID(p.commune),
      daira: stripUUID(p.daira),
      wilaya_code: wilayaCode,
      wilaya_name: wilayaName,
      capacity: parseCapacity(p.capacite_daccueil),
      year: parseYear(p.annee_de_reception),
      operational,
      pmr,
      surface_built_m2: parseSurface(p.surface_batie_m),
      surface_land_m2: parseSurface(p.surface_dassiette__m),
      lat,
      lng,
      source: SOURCE,
    });
  }

  if (unknownTypes.size) {
    throw new Error(`unknown type(s): ${[...unknownTypes].join(", ")}; extend TYPE_MAP`);
  }
  if (unmappedWilayas.size) {
    throw new Error(`unmapped wilaya(s): ${[...unmappedWilayas].join(", ")}; extend WILAYA_ALIASES`);
  }

  // Sort by wilaya then type then name, then the SIG UUID, in plain codepoint
  // order: the order is what numbers a new facility, and localeCompare() without
  // a locale reads the ambient ICU, which can differ between Node versions.
  const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  facilities.sort((a, b) =>
    cmp(a.wilaya_code || "99", b.wilaya_code || "99") ||
    cmp(a.type_code || "", b.type_code || "") ||
    cmp(a.name || "", b.name || "") ||
    cmp(a.uuid, b.uuid),
  );

  const overflow = facilities.filter(r => {
    const c = Number(r.wilaya_code);
    return !Number.isFinite(c) || c < 1 || c > 69;
  });
  if (overflow.length) {
    throw new Error(`wilaya_code out of [1,69]: ${overflow.length} record(s)`);
  }

  // Number the records in emission order; assignStableIds settles the public ids
  // below, once the committed data says which of them have shipped before.
  facilities.forEach((f, i) => { f.id = i + 1; });

  // --- emit v2 via the shared writer ---
  const cfg = MIGRATIONS.sports;
  // The capture is the retrieval, so its own date is what the package states,
  // live or --cache alike: a replay of the same capture reproduces the metadata.
  const capture = captureMeta("sports", CAPTURE);
  const updated = capture.retrieved;
  const retrieved = capture.retrieved;
  const v2 = facilities.map(cfg.map);
  const committed = readCommitted(DATA, "facilities.json");
  const retiredIds = readRetiredIds(DATA);
  // The ledger's forwards are append-only: read what is there and carry it back
  // out through the writer, adding one per Repeat post this run retires.
  const retiredMigrations = readRetiredMigrations(DATA);
  const before = new Set(retiredIds);
  const log = {};
  const ids = assignStableIds(v2, committed, retiredIds, { migrations: retiredMigrations, retrieved, log });
  if (committed.length) {
    const t = log.byTier;
    console.log(
      `  id carry-over: ${ids.carried}/${v2.length} facilities kept their published id ` +
        `(${t.uuid} by refs.mjs, ${t.place} by place, ${t.strict + t.relabel + t.rename} by the transition: ` +
        `${t.strict} strict, ${t.relabel} relabel, ${t.rename} rename), ${ids.minted} new, ${ids.retired} retired` +
        (log.transition ? `, ${log.transition.repeatPosts.length} of them Repeat posts forwarded` : ""),
    );
  }
  const { records: out, metadata } = writePackageV2({
    pkg: "sports",
    dir: DATA,
    files: [{ file: "facilities.json", rows: v2 }],
    meta: cfg.meta,
    updated,
    retrieved,
    retiredIds,
    retiredMigrations,
  });
  // The transition's decisions, written by the run that made them. Once every
  // committed record carries refs.mjs the matcher has nothing to decide and the
  // report is left as the run that did decide wrote it.
  if (log.transition) {
    const report = transitionReport(log, {
      capture: CAPTURE,
      retrieved,
      sha256: capture.sha256,
      published: committed.length,
      retired: [...retiredIds].filter((id) => !before.has(id)),
    });
    mkdirSync(dirname(TRANSITION_REPORT), { recursive: true });
    writeFileSync(TRANSITION_REPORT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`  transition decisions written to ${TRANSITION_REPORT}`);
  }

  console.log(`\nType breakdown:`);
  for (const [k, v] of Object.entries(metadata.by_type).sort((a, b) => b[1] - a[1])) {
    const entry = Object.values(TYPE_MAP).find((e) => e.code === k);
    console.log(`  ${String(v).padStart(5)}  ${k.padEnd(6)} ${entry?.fr || k}`);
  }
  if (dropped.length) {
    console.log(`\nDropped ${dropped.length} record(s).`);
  }
  console.log(`\nWrote ${out.length} facilities across ${metadata.wilayas_covered} wilayas to ${DATA} (v2).`);
}

// Importable for the id-stability tests; only the direct invocation builds.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
