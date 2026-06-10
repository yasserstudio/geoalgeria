#!/usr/bin/env node
/**
 * Fetch Algeria public employment agencies (AWEM + ALEM) from ANEM's
 * cartographic portal and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source (ANEM — Agence Nationale de l'Emploi):
 *   https://www.anem.dz/#/portail-carto
 *
 * There is no public agencies API. The two datasets are baked into the
 * Angular bundle (main-es2015.<hash>.js) as inline
 *   JSON.parse('{"a":[ …GeoJSON Features… ]}')
 * blocks. We read the current bundle hash from the page, download the bundle,
 * extract both blocks, and normalize. The bundle hash changes on redeploys, so
 * this script always rediscovers it — never hard-code it.
 *
 * ⚠️ Two source quirks handled here:
 *   1. ANEM serves an incomplete TLS chain → Node rejects it. We relax cert
 *      verification for this run only (the data is static & public).
 *   2. In the source, `X` is LATITUDE and `Y` is LONGITUDE (inverted from the
 *      usual convention). We map X→lat, Y→lng.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const ORIGIN = "https://www.anem.dz";
const HEADERS = { "User-Agent": "Mozilla/5.0 (geoalgeria-emploi dataset builder)" };

// (1) ANEM serves an incomplete TLS chain → Node rejects it. Relax verification
// for this host only (the data is static & public). Scoped to this agent — we
// never touch the global TLS settings. Safer alternative if you have the chain:
// `NODE_EXTRA_CA_CERTS=anem-chain.pem node scripts/fetch.mjs`. Re-check ANEM's
// certificate periodically — if they fix it, drop this agent.
const insecure = new https.Agent({ rejectUnauthorized: false });

// --- helpers ---------------------------------------------------------------
const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
// Keep only plausible Algeria coordinates; drop 0/0 and out-of-range as null.
const toLat = (v) => { const n = num(v); return n !== null && n > 18 && n < 38 ? n : null; };
const toLng = (v) => { const n = num(v); return n !== null && n > -9 && n < 13 ? n : null; };
// ANEM wilaya ids are "DZ-01"; the ecosystem uses "01".
const wcode = (v) => (typeof v === "string" ? v.replace(/^DZ-?/i, "").padStart(2, "0") : null);
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

const MAX_BYTES = 30 * 1024 * 1024; // cap remote reads — the bundle is ~1.6 MB

function getText(url) {
  return new Promise((resolve, reject) => {
    const req = https
      .get(url, { headers: HEADERS, agent: insecure }, (res) => {
        const { statusCode } = res;
        if (statusCode !== 200) {
          res.resume();
          reject(new Error(`${url} -> HTTP ${statusCode}`));
          return;
        }
        res.setEncoding("utf8");
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
          if (body.length > MAX_BYTES) {
            res.destroy();
            reject(new Error(`${url} -> response exceeds ${MAX_BYTES} bytes`));
          }
        });
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
    req.setTimeout(30_000, () => req.destroy(new Error(`${url} -> timed out`)));
  });
}

/**
 * Read the raw JS single-quoted string literal starting at the opening quote at
 * `open`, respecting backslash escapes (so `\'` does not terminate it). The
 * backslash sequences are preserved verbatim for `decodeJsString` to resolve.
 * Returns `{ body, end }` where `end` is the index of the closing quote (or
 * `src.length` if the literal is unterminated) so the caller can resume the
 * scan *past* the literal rather than re-scanning its body.
 */
function readLiteral(src, open) {
  let out = "";
  let i = open + 1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") {
      if (i + 1 >= src.length) { i++; break; } // unterminated escape at EOF
      out += c + src[i + 1];
      i++;
      continue;
    }
    if (c === "'") break;
    out += c;
  }
  return { body: out, end: i };
}

/**
 * Decode a JS string-literal body to its runtime value. The value *is* the JSON
 * document, so this must resolve every JS escape the source uses — notably
 * `\xHH` hex and `\uHHHH` (invalid / fine in JSON respectively) and the
 * double-escaped `\\"` the source uses for quotes inside values.
 */
function decodeJsString(s) {
  const hex = (at, len) => {
    const code = parseInt(s.substr(at, len), 16);
    if (Number.isNaN(code)) throw new Error("malformed hex escape"); // fail loud, not a silent NUL
    return String.fromCharCode(code);
  };
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== "\\") { out += c; continue; }
    const n = s[i + 1];
    switch (n) {
      case "x": out += hex(i + 2, 2); i += 3; break;
      case "u": out += hex(i + 2, 4); i += 5; break;
      case "n": out += "\n"; i += 1; break;
      case "r": out += "\r"; i += 1; break;
      case "t": out += "\t"; i += 1; break;
      case "b": out += "\b"; i += 1; break;
      case "f": out += "\f"; i += 1; break;
      case "v": out += "\v"; i += 1; break;
      case "0": out += "\0"; i += 1; break;
      default: out += n; i += 1; break; // \\ -> \, \' -> ', \" -> ", \/ -> /
    }
  }
  return out;
}

/**
 * Find every `JSON.parse('…')` whose payload is a `{"a":[ …Features ]}` block
 * and return the parsed feature arrays.
 */
function extractFeatureArrays(bundle) {
  const arrays = [];
  const needle = "JSON.parse('";
  let from = 0;
  for (;;) {
    const at = bundle.indexOf(needle, from);
    if (at === -1) break;
    const open = at + needle.length - 1; // index of the opening quote
    const { body: literal, end } = readLiteral(bundle, open);
    from = end + 1; // resume past the closing quote, never inside the literal
    if (!literal.includes('"type":"Feature"')) continue;
    try {
      const obj = JSON.parse(decodeJsString(literal));
      if (Array.isArray(obj?.a)) arrays.push(obj.a);
    } catch {
      /* not the block we want */
    }
  }
  return arrays;
}

// --- normalizers -----------------------------------------------------------
// The source has no clean unique key: `alem_id` is "0" for almost every record
// and `code` has nulls + a dup. So `id` is synthesized downstream as
// `{wilaya_code}-{seq}` (ALEM) / `{wilaya_code}` (AWEM); `code` is kept as the
// source's own (nullable) reference code.
function normAlem(f) {
  const p = f.properties || {};
  return {
    id: null, // assigned in main() — see above
    code: str(p.code),
    type: "ALEM",
    name: str(p.anthenne_name), // source spells it "anthenne"
    address: str(p.Adresse),
    phone: str(p.Telephone),
    fax: str(p.Fax),
    email: str(p.Email),
    manager: str(p.Responsable),
    communes: str(p.CommunesRa), // comma-separated communes served
    wilaya_code: wcode(p.wilaya_id),
    lat: toLat(p.X),
    lng: toLng(p.Y),
  };
}

function normAwem(f) {
  const p = f.properties || {};
  return {
    id: wcode(p.wilaya_id), // one AWEM per wilaya → wilaya code is unique
    code: str(p.code),
    type: "AWEM",
    name: str(p.wilaya_name),
    address: str(p.Adresse),
    phone: str(p.Telephone),
    fax: str(p.Fax),
    email: str(p.Email),
    manager: str(p.Responsable),
    wilaya_code: wcode(p.wilaya_id),
    lat: toLat(p.X),
    lng: toLng(p.Y),
  };
}

/**
 * Assign a stable, unique `id` per ALEM: `{wilaya_code}-{seq within wilaya}`.
 * NOTE: `seq` follows the source array order, so an agency's id is positional —
 * if ANEM reorders records within a wilaya, ids downstream of the change shift.
 * `"00"` is the bucket for an (unexpected) agency with no wilaya code.
 */
function assignAlemIds(rows) {
  const seq = {};
  for (const r of rows) {
    const w = r.wilaya_code || "00";
    seq[w] = (seq[w] || 0) + 1;
    r.id = `${w}-${String(seq[w]).padStart(2, "0")}`;
  }
  return rows;
}

// --- writers ---------------------------------------------------------------
function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Neutralize spreadsheet formula injection on TEXT fields from the source.
    // Numbers (e.g. negative longitudes) pass through untouched.
    if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n") + "\n";
}

function toGeoJSON(rows) {
  return {
    type: "FeatureCollection",
    features: rows
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => {
        const { lat, lng, ...props } = r;
        return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: props };
      }),
  };
}

const writeJSON = (p, obj) => writeFileSync(join(OUT_DIR, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (p, txt) => writeFileSync(join(OUT_DIR, p), txt);

// --- main ------------------------------------------------------------------
async function main() {
  console.log("Reading bundle hash from ANEM…");
  const index = await getText(`${ORIGIN}/`);
  // Anchor to a real <script src=…> so we never pick the pattern out of a
  // comment, header, or injected blob elsewhere in the page.
  const m = index.match(/src=["'](main-es2015\.[0-9a-f]+\.js)["']/);
  if (!m) throw new Error("Could not find main-es2015.<hash>.js script in index.html");
  console.log(`  bundle: ${m[1]}`);

  const bundle = await getText(`${ORIGIN}/${m[1]}`);
  const arrays = extractFeatureArrays(bundle);
  console.log(`  found ${arrays.length} inline FeatureCollection(s)`);

  // Classify: ALEM has alem_id/anthenne_name; AWEM has wilaya_name (no alem_id).
  if (arrays.length !== 2) throw new Error(`Expected exactly 2 inline FeatureCollections, got ${arrays.length}`);
  const isAlem = (a) => a.some((f) => f?.properties && ("alem_id" in f.properties || "anthenne_name" in f.properties));
  const alemRaw = arrays.find(isAlem);
  const awemRaw = arrays.find((a) => a !== alemRaw);
  if (!alemRaw || alemRaw === awemRaw) throw new Error("Could not distinguish the ALEM from the AWEM block");

  const alem = assignAlemIds(alemRaw.map(normAlem));
  const awem = awemRaw.map(normAwem);
  console.log(`  ${awem.length} AWEM (wilaya) + ${alem.length} ALEM (local) agencies`);

  const alemCols = ["id", "code", "type", "name", "address", "phone", "fax", "email", "manager", "communes", "wilaya_code", "lat", "lng"];
  const awemCols = ["id", "code", "type", "name", "address", "phone", "fax", "email", "manager", "wilaya_code", "lat", "lng"];

  const alemGeo = toGeoJSON(alem);
  const awemGeo = toGeoJSON(awem);
  console.log(`  GeoJSON: ${awemGeo.features.length}/${awem.length} AWEM and ${alemGeo.features.length}/${alem.length} ALEM have coordinates`);

  const metadata = {
    source: "ANEM — Agence Nationale de l'Emploi (anem.dz/#/portail-carto)",
    origin: ORIGIN,
    license: "Data © ANEM; redistributed for reference. See README.",
    awem: awem.length,
    alem: alem.length,
    total: awem.length + alem.length,
    wilayas_covered: new Set([...awem, ...alem].map((a) => a.wilaya_code).filter(Boolean)).size,
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(OUT_DIR, "csv"), { recursive: true });
  mkdirSync(join(OUT_DIR, "geojson"), { recursive: true });
  writeJSON("awem.json", awem);
  writeJSON("alem.json", alem);
  writeText("csv/awem.csv", toCSV(awem, awemCols));
  writeText("csv/alem.csv", toCSV(alem, alemCols));
  writeJSON("geojson/awem.geojson", awemGeo);
  writeJSON("geojson/alem.geojson", alemGeo);
  writeJSON("metadata.json", metadata);
  console.log("Wrote JSON, CSV, and GeoJSON to data/.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
