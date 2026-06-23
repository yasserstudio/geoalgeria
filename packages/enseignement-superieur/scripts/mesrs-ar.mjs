// Arabic MESRS listing (https://www.mesrs.dz/reseau-universitaire-ar/).
//
// Two jobs the English listing can't do:
//   1. Backfill the Arabic name for the public network (the English page gives
//      French names only). Joined on website hostname — each institution links to
//      its own site on both pages, so the host is a stable cross-page key.
//   2. Supply the institutions the English page omits entirely: the licensed
//      PRIVATE institutions and the higher-education establishments under OTHER
//      ministries (Défense, Santé, Culture, …) that MESRS supervises
//      pedagogically. These appear only here, in Arabic, inside accordion blocks
//      with their location embedded in the entry text — no coordinates. We resolve
//      each to a wilaya (centroid precision) from that embedded location.
//
// The page is WordPress/Elementor: the network sits in anchor links (regional
// accordions 0–11), the extras in numbered <p> entries inside accordions 12–21.

export const PAGE_AR = "https://www.mesrs.dz/reseau-universitaire-ar/";
export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function getHtmlAr() {
  const res = await fetch(PAGE_AR, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!res.ok) throw new Error(`${PAGE_AR} -> HTTP ${res.status}`);
  return res.text();
}

const ENTITIES = { "&amp;": "&", "&#038;": "&", "&#8211;": "–", "&#8212;": "—", "&#8217;": "’", "&#8216;": "‘", "&#039;": "'", "&nbsp;": " " };
function decode(s) {
  return String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#?\w+;/g, (m) => {
      if (m in ENTITIES) return ENTITIES[m];
      const d = m.match(/^&#(\d+);$/);
      if (d) { const cp = Number(d[1]); return cp <= 0x10ffff ? String.fromCodePoint(cp) : " "; }
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

// Arabic normalisation: strip tashkeel, unify alef/ya/ta-marbuta, drop tatweel.
export function arNorm(s) {
  return String(s ?? "")
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/[^؀-ۿ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
// Key form for gazetteer matching: drop the definite article and "ولاية".
export function arKey(s) {
  return arNorm(s).replace(/\bولايه\b/g, "").replace(/(^|\s)ال/g, "$1").replace(/\s+/g, " ").trim();
}

// Which ministry supervises each "other-ministry" accordion section.
const MINISTRY = [
  { re: /الدفاع/, fr: "Ministère de la Défense nationale" },
  { re: /الثقافة/, fr: "Ministère de la Culture et des Arts" },
  { re: /البريد|الاتصــالات|الاتصالات|اللاسلكية|اللّاسلكية/, fr: "Ministère de la Poste et des Télécommunications" },
  { re: /النقل/, fr: "Ministère des Transports" },
  { re: /الشباب/, fr: "Ministère de la Jeunesse et des Sports" },
  { re: /السياحة/, fr: "Ministère du Tourisme et de l'Artisanat" },
  { re: /العمل|الضمان/, fr: "Ministère du Travail, de l'Emploi et de la Sécurité sociale" },
  { re: /الفضائية|الوزارة الأولى/, fr: "Premier ministère (Agence spatiale algérienne)" },
  { re: /الصحة/, fr: "Ministère de la Santé" },
];
function ministryOf(title) {
  const m = MINISTRY.find((x) => x.re.test(title));
  return m ? m.fr : null;
}

// When the embedded location is a commune (not a wilaya), map it to its wilaya
// code. Keyed by arKey(commune). Most private/other-ministry schools sit in a
// named Algiers/Tipaza/Oran/Sétif commune the wilaya gazetteer can't match.
const COMMUNE_ALIASES = {
  "دالي ابراهيم": 16, "دالي براهيم": 16, "عين النعجه": 16, "برج الكيفان": 16,
  "اولاد فايت": 16, "شراقه": 16, "عين البنيان": 16, "بن عكنون": 16, "حيدره": 16,
  "بئر مراد رايس": 16, "بوزريعه": 16, "قبه": 16, "زرالده": 16, "رويبه": 16,
  "دار البيضاء": 16, "حراش": 16, "رغايه": 16, "تامنتفوست": 16, "برج البحري": 16,
  "سيدي فرج": 16, "ابيار": 16, "سيدي عبد الله": 16, "واد الرمان": 16, "عاشور": 16,
  "بلوزداد": 16, "سعيد حمدين": 16, "كاليتوس": 16, "مدينه الجديده": 15,
  "شرشال": 42, "قليعه": 42, "عين ارنات": 19, "تافراوي": 31, "ارزيو": 31,
  // The flagship spells Aïn Defla عين الدفلى (ـى); the listing uses الدفلة (ـة),
  // which normalises to a different final letter — pin it explicitly.
  "عين الدفله": 44,
};

// A few entries name no resolvable place; assert their wilaya by a name fragment.
const NAME_OVERRIDE = [
  { re: /ابن رشد/, wilaya: 16 },
  { re: /فنون العرض والسمعي/, wilaya: 16 },
  { re: /التسيير دالي/, wilaya: 16 },
];

// Build a resolver from the flagship wilayas (need name_ar). Returns a function
// text -> { code:"NN", name_fr } | null.
export function buildResolver(wilayasJson) {
  const gaz = wilayasJson
    .map((w) => ({ code: String(w.code).padStart(2, "0"), name_fr: w.name_fr, key: arKey(w.name_ar) }))
    .filter((g) => g.key.length >= 3)
    .sort((a, b) => b.key.length - a.key.length);
  const byCode = new Map(gaz.map((g) => [Number(g.code), g]));

  // Normalise alias keys the same way as the text we test them against (article +
  // tashkeel stripped), so "عين النعجه" matches the article-stripped "عين نعجه".
  const aliasIndex = Object.entries(COMMUNE_ALIASES).map(([k, code]) => [arKey(k), code]);
  const fromAlias = (text) => {
    const k = arKey(text);
    for (const [alias, code] of aliasIndex) {
      if (alias && k.includes(alias)) return byCode.get(code) || null;
    }
    return null;
  };
  const fromGaz = (text) => {
    const k = arKey(text);
    // The location sits at the end, so prefer the match that ENDS latest (idx +
    // key length). Scoring by end-position — not just start-position — makes the
    // longer key win whenever one wilaya name is a substring of another's
    // ("يزي" Illizi ⊂ "تيزي وزو" Tizi Ouzou): both could appear, but Tizi Ouzou
    // ends later, so it wins.
    let best = null, bestEnd = -1;
    for (const g of gaz) {
      const idx = k.lastIndexOf(g.key);
      if (idx < 0) continue;
      const end = idx + g.key.length;
      if (end > bestEnd) { bestEnd = end; best = g; }
    }
    return best;
  };

  return function resolve(text) {
    // Prefer the parenthetical (it holds the location) when present.
    const paren = text.match(/\(([^)]*)\)/);
    const scopes = paren ? [paren[1], text] : [text];
    for (const scope of scopes) {
      const a = fromAlias(scope);
      if (a) return a;
      const g = fromGaz(scope);
      if (g) return g;
    }
    for (const ov of NAME_OVERRIDE) if (ov.re.test(text)) return byCode.get(ov.wilaya) || null;
    return null;
  };
}

// Map the Arabic-named institution into the package's type taxonomy.
export function classifyTypeAr(nameAr) {
  if (/جامعة/.test(nameAr)) return { type: "universite", type_fr: "Université" };
  if (/مركز جامعي/.test(nameAr)) return { type: "centre_universitaire", type_fr: "Centre universitaire" };
  return { type: "grande_ecole", type_fr: "Grande école" };
}

// Section titles are accordion tab headers, in document order. The content blocks
// are <div id="elementor-tab-content-N"> in the same order, so we split on those.
function sections(html) {
  const titles = [];
  const tRe = /eael-accordion-tab-title">([^<]+)<\/span>/g;
  let tm;
  while ((tm = tRe.exec(html))) titles.push(decode(tm[1]));
  const blocks = html.split(/<div id="elementor-tab-content-\d+"/).slice(1);
  return titles.map((title, i) => ({ title, block: blocks[i] || "" }));
}

// host -> Arabic name, from the anchored network institutions (sections 0–11).
export function anchoredNamesAr(html) {
  const map = new Map();
  const re = /<a\b[^>]*href="([^"]+)"[^>]*>([^<]{4,200})<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let host;
    try { host = new URL(m[1]).hostname.replace(/^www\./, "").toLowerCase(); } catch { continue; }
    if (!host || host.endsWith("mesrs.dz")) continue;
    const name = decode(m[2]);
    if (!/[؀-ۿ]/.test(name)) continue; // Arabic only
    if (!map.has(host)) map.set(host, name);
  }
  return map;
}

// Parse the private (12) + other-ministry (13–21) accordion entries into
// [{ name_ar, website, sector, supervisory_ministry, wilaya_code, wilaya_name }].
// Drops entries with no resolvable wilaya (reported by the caller).
export function parseExtras(html, resolve) {
  const out = [];
  const unresolved = [];
  const seen = new Set(); // de-dup identical (name_ar, wilaya) the source itself repeats
  const secs = sections(html);
  for (let i = 12; i < secs.length; i++) {
    const { title, block } = secs[i];
    const isPrivate = i === 12;
    const ministry = isPrivate ? null : ministryOf(title);
    // Entries are one institution per <p>. A couple of source entries wrap across
    // two <p> tags (the location spills into a second, near-empty <p>); the orphan
    // fragment is dropped by the length guard below, and the wilaya is recovered
    // from the location text that stayed in the first <p>. If the source ever
    // splits BEFORE the location token, that entry would need a name override.
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let pm;
    while ((pm = pRe.exec(block))) {
      const hrefM = pm[1].match(/href="([^"]+)"/);
      const text = decode(pm[1]);
      if (!/[؀-ۿ]/.test(text)) continue;
      if (text.replace(/[\d.\s]/g, "").length < 6) continue;
      if (/ستجد هنا|ستجدون|webmaster|mesrs\.dz|^\d[\d\s:.,]*$/.test(text)) continue; // footnotes / contact lines
      if (/مؤسسة التكوين العالي التابعة|الخاضعة للوصاية/.test(text)) continue; // section footnote
      if (/^مؤسسة التكوين العالي\s*$/.test(text.replace(/^\s*\d+\s*[.\-–]\s*/, ""))) continue; // stray generic fragment
      if (/(سا\s*\d|الاثنين|الخميس)/.test(text)) continue; // opening-hours line
      // Strip the leading "N." / "N ." numbering and any trailing acronym after a dash.
      const name_ar = text.replace(/^\s*\d+\s*[.\-–]\s*/, "").replace(/\s*[–-]\s*[A-Z][A-Za-z.]*\s*$/, "").trim();
      let website = null;
      if (hrefM) { try { website = new URL(hrefM[1]).href.replace(/\/+$/, "/"); } catch { /* skip bad href */ } }
      const w = resolve(text);
      if (!w) { unresolved.push(name_ar.slice(0, 60)); continue; }
      const dedup = `${arKey(name_ar)}|${w.code}`;
      if (seen.has(dedup)) continue; // source lists this institution twice
      seen.add(dedup);
      out.push({
        name_ar,
        website,
        sector: isPrivate ? "private" : "public",
        supervisory_ministry: ministry,
        wilaya_code: w.code,
        wilaya_name: w.name_fr,
      });
    }
  }
  return { extras: out, unresolved };
}
