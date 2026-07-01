// Parse ETUSA bus-line templates (fr.wikipedia "Lignes de bus ETUSA de 1 à 99")
// into a clean local dataset. Line-level attributes only (routes, not geocoded).
import { readFileSync, writeFileSync } from "node:fs";

const SC = "/private/tmp/claude-501/-Volumes-Work-Algeria/ca4a27d0-e861-4dfc-ac42-ba34ffa11136/scratchpad";
const wt = JSON.parse(readFileSync(`${SC}/etusa/lines-wikitext.json`, "utf8")).parse.wikitext["*"];

// strip wiki markup → plain text
const clean = (s) => {
  if (s == null) return null;
  let x = String(s);
  x = x.replace(/\{\{[Rr]éseau ETUSA\/ligne\|([^}]*)\}\}/g, "$1"); // line-name template
  x = x.replace(/\{\{[^{}]*\}\}/g, "");                              // drop other templates
  x = x.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1");                 // [[a|b]] -> b
  x = x.replace(/\[\[([^\]]*)\]\]/g, "$1");                          // [[a]] -> a
  x = x.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "").replace(/<ref[^>]*\/>/g, "");
  x = x.replace(/<[^>]+>/g, " ").replace(/'''?/g, "");
  x = x.replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return x || null;
};
const field = (block, key) => {
  // capture value up to the next " | key =" or end of block
  const re = new RegExp(`\\|\\s*${key}\\s*=\\s*([\\s\\S]*?)(?=\\n\\s*\\||\\n\\}\\})`, "i");
  const m = block.match(re);
  return m ? clean(m[1]) : null;
};
const intOf = (s) => { if (!s) return null; const m = s.replace(/\s/g,"").match(/\d[\d.,]*/); return m ? parseInt(m[0].replace(/[.,]/g,""),10) : null; };

// split a "• A • B • C" segment into a clean list
const bullets = (s) => (s ? s.split(/[•·]/).map((x) => x.replace(/^[\s*.:-]+|[\s*.:-]+$/g, "").trim()).filter((x) => x && x.length > 1) : []);
// pull a labelled sub-segment out of the desserte blob
const seg = (d, label, until) => {
  if (!d) return null;
  const re = new RegExp(`${label}\\s*:?\\s*([\\s\\S]*?)(?=${until}|$)`, "i");
  const m = d.match(re);
  return m ? m[1] : null;
};

const blocks = wt.match(/\{\{Ligne de transport en commun\b[\s\S]*?\n\}\}/g) || [];
const lines = blocks.map((b) => {
  let desserte = field(b, "desserte");
  if (desserte) desserte = desserte.replace(/^\s*desserte\s*=\s*/i, "");
  const villes = seg(desserte, "Villes et lieux desservis", "Stations et gares|Téléphériques?");
  const stations = seg(desserte, "Stations et gares desservies", "Téléphériques?");
  const teleph = seg(desserte, "Téléphériques? desserv0?s?|Téléphériques?", "$a"); // catch trailing téléphérique mentions
  return {
    line: field(b, "ligne_nom"),
    terminus1: field(b, "terminus1"),
    terminus2: field(b, "terminus2"),
    duration_min: intOf(field(b, "duree")),
    stops: intOf(field(b, "nb_arrets")),
    rolling_stock: field(b, "materiel_roulant"),
    depot: field(b, "depot_nom"),
    passengers_year: intOf(field(b, "voyageurs_an")),
    communes_served: bullets(villes),
    stations_served: bullets((stations || "").split("♦")[0]),
    opened: field(b, "date_ouverture"),
    closed: field(b, "date_fermeture"),
  };
}).filter((l) => l.line);

const out = {
  note: "ETUSA (Entreprise de transport urbain et suburbain d'Alger) bus lines, parsed from fr.wikipedia 'Lignes de bus ETUSA de 1 à 99'. Line-level attributes only — routes, not geocoded. For geometry, pull OSM route relations (route=bus, operator=ETUSA) or terminus points. Community source (Wikipedia CC BY-SA), not an official ETUSA feed.",
  source: "https://fr.wikipedia.org/wiki/Lignes_de_bus_ETUSA_de_1_à_99",
  fetched: "2026-07-01",
  lines_count: lines.length,
  lines,
};
writeFileSync(`/Volumes/Work/algeria/geoalgeria-data/research/buses/etusa-lines-clean.json`, JSON.stringify(out, null, 2) + "\n");

console.log(`parsed ${lines.length} ETUSA bus lines`);
const withStops = lines.filter((l) => l.stops != null).length;
const withCommunes = lines.filter((l) => l.communes_served.length).length;
console.log(`with stop-count: ${withStops} | with communes: ${withCommunes}`);
console.log("samples:");
lines.slice(0, 5).forEach((l) => console.log(`  L${l.line}: ${l.terminus1} ↔ ${l.terminus2} | ${l.stops ?? "?"} stops | communes: ${l.communes_served.join(", ") || "-"}`));
