#!/usr/bin/env node
// Preserve a rights-safe factual projection from the official ETUS Setif
// Eid 2026 Line announcement supplied by the project owner. The artwork is
// validation evidence only and is not redistributed.
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const sourceUrl = "https://www.govserv.org/DZ/S%C3%A9tif/111330534776381/ETUS-S%C3%89TIF";
const lines = [
  { ref: "101", terminus1_fr: "Gare routière", terminus1_ar: "المحطة البرية", terminus2_fr: "Cité Les Tours", terminus2_ar: "حي الأبراج" },
  { ref: "104", terminus1_fr: "Gare routière", terminus1_ar: "المحطة البرية", terminus2_fr: "Cité El Hidhab", terminus2_ar: "حي الهضاب" },
  { ref: "105", terminus1_fr: "Gare routière", terminus1_ar: "المحطة البرية", terminus2_fr: "Cité El Hidhab", terminus2_ar: "حي الهضاب" },
  { ref: "106A", terminus1_fr: "Centre-ville", terminus1_ar: "وسط المدينة", terminus2_fr: "Cité 5 Juillet 1962", terminus2_ar: "حي 5 جويلية 1962" },
  { ref: "106B", terminus1_fr: "Centre-ville", terminus1_ar: "وسط المدينة", terminus2_fr: "Cité Aïn Romane", terminus2_ar: "حي عين الرمان" },
];

writeCapture("buses", "etus-setif-lines", {
  lines,
  evidence: {
    announcement_date: "2026-05-26",
    announcement_url: sourceUrl,
    supplied_at: "2026-09-02",
    supplied_image_sha256: "504eefe7f850a0600363b7110050e4f1d030701eb9d29194d10089e811e7561e",
    supplied_image_dimensions: { width: 2048, height: 1446 },
    mode: "operator_artwork_supplied_by_project_owner",
    geometry_validation: {
      line: "101",
      osm_relation_id: 14608521,
      osm_url: "https://www.openstreetmap.org/relation/14608521",
      station_directory_url: "https://rues-algerie.openalfa.com/lignes-de-bus/etus-setif-101-14608521",
      historical_announcement_url: "https://sawtsetif.dz/v/3801/",
      note: "The complete OSM relation runs GR ETUS to Les Tours (حي الأبراج) through the extension stops named by the Operator diagram. Its stale OSM to=University of Setif tag is not used as a passenger terminus.",
    },
  },
}, {
  url: sourceUrl,
  retrieved: "2026-09-02",
  records: lines.length,
  note: "Rights-safe bilingual Line identities transcribed from ETUS Setif artwork supplied by the project owner and independently matched to a public 2026 announcement mirror. The mirror is corroboration, not a first-party Source. Artwork is validation-only and is not redistributed. Line 101 geometry is separately sourced from OSM under ODbL.",
});

console.log(`promoted ${lines.length} ETUS Setif Lines`);
