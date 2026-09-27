#!/usr/bin/env node
// Rights-safe factual projection of the ETUS Skikda Lines from the Operator's
// own website page, supplied by the project owner (etus-skikda.dz served an
// expired TLS certificate, so no automated fetch was possible).
//
// The Line stop lists are parsed out of the committed verbatim excerpt rather
// than retyped here, so the capture cannot drift from the evidence. No
// geometry, no coordinates and no timetable are inferred: the page publishes
// ordered stop names and one network-wide service window, nothing more.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXCERPT = join(HERE, "etus-skikda-site-2026-09-27.md");
const excerpt = readFileSync(EXCERPT, "utf-8");

// Each Line is a "### الخط رقم NN" heading followed by one hyphen-separated
// stop sequence. The page's own separators are a mix of hyphen and en dash and
// it carries stray leading, doubled and trailing ones, so empty tokens are
// dropped. No published stop name contains either separator.
const lines = [...excerpt.matchAll(/### الخط رقم (\d{2})\n([\s\S]*?)(?=\n\s*\n|\n### |(?![\s\S]))/gu)].map(
  ([, ref, block]) => {
    const stopNames = block
      .replace(/\s+/gu, " ")
      .split(/\s*[-–]\s*/u)
      .map((name) => name.trim())
      .filter(Boolean);
    return {
      ref,
      terminus1_ar: stopNames[0],
      terminus2_ar: stopNames.at(-1),
      stop_count: stopNames.length,
      stop_names_ar: stopNames,
    };
  },
);

if (lines.length !== 6) throw new Error(`Expected 6 ETUS Skikda Lines, parsed ${lines.length}`);
for (const line of lines) {
  if (line.terminus1_ar !== "ساحة الشهداء") {
    throw new Error(`Line ${line.ref} does not start at ساحة الشهداء: ${line.terminus1_ar}`);
  }
  if (line.stop_count < 2) throw new Error(`Line ${line.ref} has no usable stop sequence`);
}

writeCapture("buses", "etus-skikda-lines", {
  lines,
  evidence: {
    operator_name_ar: "المؤسسة العمومية للنقل الحضري وشبه الحضري لولاية سكيكدة (ETUS-Skikda)",
    mode: "operator_website_page_supplied_by_project_owner",
    supplied_at: "2026-09-27",
    excerpt_file: "research/buses/etus-skikda-site-2026-09-27.md",
    line_source_url: "https://etus-skikda.dz/",
    fetch_note: "The Operator site served an expired TLS certificate on 2026-09-27, so the page was read in a browser by the project owner and transcribed. Nothing was retrieved by an automated client.",
    legal_status: "Public industrial and commercial establishment under the Minister of Transport, created by executive decree 06-504 of 24 December 2006; operations began 12 March 2008.",
    head_office: "Zone Industrielle de la Commune Hammadi Krouma, Skikda",
    contact: {
      phone: "038.93.18.08",
      fax: "038.93.18.53",
      email: "russicada-bus@etus-skikda.dz",
      facebook_url: "https://www.facebook.com/RussicadaBus",
      website_url: "https://etus-skikda.dz/",
    },
    service: {
      days: "all_year",
      window_first: "06:00",
      window_last: "19:00",
      line_count: 6,
      fleet_buses: 30,
      daily_passengers_claimed: 3000,
    },
    service_hours_note: "06:00 to 19:00 is one network-wide service window, not a per-Line first and last departure, so no Line ships service_hours. Publishing it per Line would claim departure times the page never states.",
    service_areas_ar: ["الزفزاف", "الزرامنة", "الحدائق", "حمادي كرومة", "فلفلة", "بوزعرورة"],
    service_areas_note: "The service paragraph names these six areas alongside the count of six Lines, but it never binds an area to a Line number, so they are not published as Line names. Three of them appear inside the Line stop lists (مقبرة الزفزاف on Line 01, مدخل الحدائق on Line 03, تكوين حمادي كرومة on Line 04); الزرامنة, فلفلة and بوزعرورة appear in no stop list.",
    stop_list_note: "Stop names are transcribed verbatim, including the page's own inconsistent spacing (مركز العربي بن مهيدي07 against مركز العربي بن مهيدي 08) and its mixed-script entries (كارافاني ladécente, Gaz de France, ADL 1, LPP, SLMB, OAIC, PLF). Lines 04 and 05 end on a stray separator in the page, so their lists are the full published sequence but cannot be proven exhaustive. The sequences carry no coordinates and are not published as Stations.",
    terminus_fr_note: "The page publishes no French. ساحة الشهداء, the shared city-centre origin of all six Lines, is named Place des Martyrs in OpenStreetMap; no French name was found for any other terminus, so those stay Arabic only rather than transliterated.",
    osm_name_receipts: [
      { role: "shared_terminus", name_ar: "ساحة الشهداء", osm: "way/168946052", name_fr: "Place des Martyrs", timestamp_osm_base: "2026-09-27T11:32:21Z" },
      { role: "served_area", name_ar: "الحدائق", osm: "node/3042693423", name_fr: "El Hadaïek", timestamp_osm_base: "2026-09-27T11:31:21Z" },
      { role: "served_area", name_ar: "حمادي كرومة", osm: "node/2852022479", name_fr: "Hammadi Krouma", timestamp_osm_base: "2026-09-27T11:31:21Z" },
      { role: "served_area", name_ar: "فلفلة", osm: "relation/5174375", name_fr: "Filfila", timestamp_osm_base: "2026-09-27T11:31:21Z" },
      { role: "served_area", name_ar: "بوزعرورة", osm: "node/2861255057", name_fr: "Bouzaâroura", timestamp_osm_base: "2026-09-27T11:32:21Z" },
      { role: "served_area_unnamed_in_fr", name_ar: "الزفزاف", osm: "node/7730537685", name_fr: null, timestamp_osm_base: "2026-09-27T11:32:21Z" },
      { role: "served_area_unnamed_in_fr", name_ar: "الزرامنة", osm: null, name_fr: null, timestamp_osm_base: "2026-09-27T11:32:21Z" },
    ],
    tracking_app: {
      name: "Rusicada-Bus",
      play_url: "https://play.google.com/store/apps/details?id=com.deeper.etus.skikda",
      claims: ["bus_tracking", "electronic_ticket_payment"],
      reuse_status: "no_open_feed_found",
    },
  },
}, {
  url: "https://etus-skikda.dz/",
  retrieved: "2026-09-27",
  records: lines.length,
  note: "Six ETUS Skikda Line identities, Arabic termini and complete ordered Arabic stop sequences transcribed from the Operator's own website page, read in a browser by the project owner because the site's TLS certificate had expired. The page publishes no geometry, no per-Line timetable and no French names; the network-wide 06:00 to 19:00 window, the 30-bus fleet and the six served areas stay evidence here rather than becoming Line fields.",
});

console.log(`etus-skikda: ${lines.length} lines, stops ${lines.map((line) => line.stop_count).join("/")}`);
