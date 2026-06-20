// Shared MESRS scrape + parse helpers, used by both fetch.mjs (build the dataset)
// and geocode.mjs (refresh the coordinate seed). Kept in one module so the two
// entry points parse the ministry listing identically and join on the same key.
//
// Source (public): https://www.mesrs.dz/en/university-network/
//   The "university network" page is a WordPress listing. Each institution is a
//   single anchor — its official French name as the link text, its own website as
//   the href (e.g. <a href="http://www.usthb.dz/">Université … Houari Boumediène</a>).
//   There is no public REST collection for it, so we parse the listing HTML. The
//   ministry publishes the names in French only.

export const PAGE = "https://www.mesrs.dz/en/university-network/";
export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// The ministry lists ~108 institutions; fail loudly if a reshape of the page
// leaves us with far fewer (a broken parse), without pinning an exact count.
export const MIN_EXPECTED = 95;

// Decode the HTML entities WordPress emits in the link text (&#8211; en-dash,
// &#8217; curly apostrophe, &amp;, &#039;, numeric escapes) and collapse spaces.
const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#038;": "&", "&#8211;": "–", "&#8212;": "—", "&#8217;": "’",
  "&#8216;": "‘", "&#8220;": "“", "&#8221;": "”", "&#039;": "'", "&nbsp;": " ",
};
export function decode(s) {
  return String(s == null ? "" : s)
    .replace(/&#?\w+;/g, (m) => {
      if (m in ENTITIES) return ENTITIES[m];
      // Guard the codepoint: a malformed numeric entity above U+10FFFF would make
      // String.fromCodePoint throw a RangeError and take the whole build down.
      const dec = m.match(/^&#(\d+);$/);
      if (dec) { const cp = Number(dec[1]); return cp <= 0x10ffff ? String.fromCodePoint(cp) : " "; }
      const hex = m.match(/^&#x([0-9a-f]+);$/i);
      if (hex) { const cp = parseInt(hex[1], 16); return cp <= 0x10ffff ? String.fromCodePoint(cp) : " "; }
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

// Repair the two typography defects the ministry's listing ships: a missing space
// after "Université" ("Universitéd'Oran1") and a digit glued to a place
// ("Oran1" → "Oran 1"). Targeted so legitimate names/acronyms are untouched.
export function cleanName(name) {
  return name
    .replace(/\b(Universit[ée])(d['’])/i, "$1 $2")
    .replace(/([a-zà-ÿ])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getHtml() {
  const res = await fetch(PAGE, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!res.ok) throw new Error(`${PAGE} -> HTTP ${res.status}`);
  return res.text();
}

// Classify an institution from its (French) name into a stable code + label.
// Order matters: ENS and centres universitaires are matched before the generic
// "école"/"université" so they land in their own category.
export function classifyType(name) {
  const n = name.toLowerCase();
  if (/(^|\b)(é|e)cole\s+normale\s+sup(é|e)rieure/.test(n))
    return { type: "ens", type_fr: "École normale supérieure" };
  if (/centre\s+universitaire/.test(n))
    return { type: "centre_universitaire", type_fr: "Centre universitaire" };
  if (/(^|\b)universit(é|e)/.test(n))
    return { type: "universite", type_fr: "Université" };
  if (/(^|\b)(é|e)cole|institut/.test(n))
    return { type: "grande_ecole", type_fr: "Grande école" };
  return { type: "grande_ecole", type_fr: "Grande école" };
}

// Stable join key between the dataset and the coordinate seed. The website is the
// natural unique key (each institution has its own); fall back to a normalized
// name for the one record without a site.
export const norm = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function instKey(inst) {
  if (inst.website) {
    try {
      const u = new URL(inst.website);
      return u.hostname.replace(/^www\./, "").toLowerCase();
    } catch { /* fall through */ }
  }
  return "name:" + norm(inst.name);
}

// Parse the listing into [{ name, website, type, type_fr }], de-duplicated by name.
// An anchor counts as an institution when its link text carries a higher-ed keyword
// (université / école / institut / centre universitaire) and its href points OFF
// the ministry's own domain (institutions link to their own sites). The two filters
// together drop nav/menu/share links that would otherwise match on a keyword.
export function parseInstitutions(html) {
  const KEY = /universit|[ée]cole|institut|centre\s+universitaire/i;
  const out = [];
  const seen = new Set();
  const re = /<a\b[^>]*href="([^"]+)"[^>]*>([^<]{4,120})<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1].trim();
    const name = cleanName(decode(m[2]));
    if (!KEY.test(name)) continue;
    let host = "";
    try { host = new URL(href).hostname.replace(/^www\./, "").toLowerCase(); } catch { continue; }
    if (!host || host.endsWith("mesrs.dz")) continue; // internal link, not an institution site
    if (!/^https?:$/i.test(new URL(href).protocol)) continue;
    const dedup = norm(name);
    if (!dedup || seen.has(dedup)) continue;
    seen.add(dedup);
    const { type, type_fr } = classifyType(name);
    out.push({ name, website: href.replace(/\/+$/, "/"), type, type_fr });
  }
  return out;
}
