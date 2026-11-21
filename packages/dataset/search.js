// `search()`: ranked Wilayas, Dairas and Communes for what a person typed.
//
// Names are folded by `@geoalgeria/normalize`, so every GeoAlgeria index agrees
// on the Conservative key and the Loose key. This file decides the Match class
// from those keys and turns it into a ranking, which stays private to the
// package: it is not in the exports map, and consumers reach it only through
// `search` in index.js. `require("./search.js")` sits inside that function, so
// loading `geoalgeria` still costs nothing and needs no ES module support until
// the first search.

const { conservativeKey, looseKey } = require("@geoalgeria/normalize");

const CLASS_RANK = { exact: 0, prefix: 1, loose: 2 };
const TYPE_RANK = { wilaya: 0, daira: 1, commune: 2 };
const TYPES = Object.keys(TYPE_RANK);

// The Match class from two pairs of keys, the query's and the name's. A key is
// its tokens joined by single spaces, so a string prefix is a prefix at a word
// boundary for every word but the last, which may be part typed. The Golden
// corpus's `matchCases` holds both statements of that rule to each other.
function classify(q, ql, n, nl) {
  if (q === n) return "exact";
  if (n.startsWith(q)) return "prefix";
  if (ql === nl || nl.startsWith(ql)) return "loose";
  return "none";
}

/**
 * What a query and a name amount to: `exact`, `prefix`, `loose` or `none`.
 * Exported for the test that proves it against the Golden corpus's `matchCases`.
 */
function matchClass(query, name) {
  const q = conservativeKey(query);
  const n = conservativeKey(name);
  if (q === "") return n === "" ? "exact" : "none";
  return classify(q, looseKey(query), n, looseKey(name));
}

const keysOf = (names) =>
  names.filter((name) => typeof name === "string" && name !== "").map((name) => ({
    c: conservativeKey(name),
    l: looseKey(name),
  }));

// The best Match class any of a record's names gives, or null.
function best(q, ql, keys) {
  let found = null;
  for (const { c, l } of keys) {
    const cls = classify(q, ql, c, l);
    if (cls !== "none" && (found === null || CLASS_RANK[cls] < CLASS_RANK[found])) found = cls;
  }
  return found;
}

/**
 * Build `search` over a `geoalgeria` module. The index of keys is built on the
 * first call and reused.
 *
 * @param {{ wilayas: any[], dairas: any[], communes: any[], nameHistory: any }} geo
 */
function createSearch(geo) {
  let index;

  function buildIndex() {
    const formerWilayas = new Map(geo.nameHistory.wilayas.map((e) => [e.code, e]));
    const formerCommunes = new Map(geo.nameHistory.communes.map((e) => [e.code_commune, e]));
    const entry = (type, code, record, former) => ({
      type,
      code,
      name_fr: record.name_fr,
      name_ar: record.name_ar ?? null,
      wilaya_code: record.wilaya_code ?? code,
      order: conservativeKey(record.name_fr),
      current: keysOf([record.name_fr, record.name_ar]),
      former: former ? keysOf([...former.former_names_fr, ...former.former_names_ar]) : [],
    });
    return [
      ...geo.wilayas.map((w) => entry("wilaya", w.code, w, formerWilayas.get(w.code))),
      ...geo.dairas.map((d) => entry("daira", d.id, d, null)),
      ...geo.communes.map((c) => entry("commune", c.code_commune, c, formerCommunes.get(c.code_commune))),
    ];
  }

  return function search(query, { limit = 10, types } = {}) {
    if (types !== undefined) {
      if (!Array.isArray(types)) throw new TypeError("search: types must be an array");
      for (const type of types) {
        if (!TYPES.includes(type)) {
          throw new TypeError(`search: unknown type ${JSON.stringify(type)}, expected one of ${TYPES.join(", ")}`);
        }
      }
    }
    const text = query == null ? "" : String(query);
    const q = conservativeKey(text);
    if (q === "") return [];
    const ql = looseKey(text);
    if (!index) index = buildIndex();

    const hits = [];
    for (const e of index) {
      if (types && !types.includes(e.type)) continue;
      const current = best(q, ql, e.current);
      const former = best(q, ql, e.former);
      // A Former name counts only when it does better than every current name.
      const useFormer = former !== null && (current === null || CLASS_RANK[former] < CLASS_RANK[current]);
      const match = useFormer ? former : current;
      if (match !== null) hits.push({ e, match, useFormer });
    }

    hits.sort(
      (a, b) =>
        CLASS_RANK[a.match] - CLASS_RANK[b.match] ||
        TYPE_RANK[a.e.type] - TYPE_RANK[b.e.type] ||
        (a.e.order < b.e.order ? -1 : a.e.order > b.e.order ? 1 : 0) ||
        a.e.code - b.e.code
    );

    return hits.slice(0, Math.max(0, limit)).map(({ e, match, useFormer }) => {
      const result = {
        type: e.type,
        code: e.code,
        name_fr: e.name_fr,
        name_ar: e.name_ar,
        wilaya_code: e.wilaya_code,
        match,
      };
      if (useFormer) result.matched = "former";
      return result;
    });
  };
}

module.exports = { createSearch, matchClass };
