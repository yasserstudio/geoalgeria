#!/usr/bin/env node
// Preserve a rights-safe factual projection from the official ETUS Aïn Defla
// (ETUSAD) Line artwork and Eid al-Adha 2025 service program, supplied by the
// project owner from the Operator's Facebook page. The artwork is validation
// evidence only and is not redistributed. Codes follow the Operator's own
// program table (AD-n Aïn Defla, KM-n Khemis Miliana, AT-n El Attaf); the
// per-city artwork numbers them 01..08 within each city.
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const sourceUrl = "https://www.facebook.com/ETUS44/";
const AD = "Aïn Defla", KM = "Khemis Miliana", AT = "El Attaf";
const lines = [
  // Aïn Defla city: five Lines drawn in the artwork, four more listed by code only in the program.
  { ref: "AD-1", network: AD, terminus1_fr: "Haï Mazouni (Fonal)", terminus1_ar: "حي مازوني (فونال)", terminus2_fr: "Gare routière (Agence foncière)", terminus2_ar: "المحطة البرية (الوكالة العقارية)" },
  { ref: "AD-2", network: AD, terminus1_fr: "Haï Mazouni (Cité 150 Logements)", terminus1_ar: "حي مازوني (حي 150 مسكن)", terminus2_fr: "Gare routière", terminus2_ar: "المحطة البرية" },
  { ref: "AD-3", network: AD },
  { ref: "AD-4", network: AD },
  { ref: "AD-5", network: AD },
  { ref: "AD-6", network: AD, terminus1_fr: "Haï Echellal (entrée est)", terminus1_ar: "حي الشلال (المدخل الشرقي)", terminus2_fr: "Zone industrielle", terminus2_ar: "المنطقة الصناعية" },
  { ref: "AD-7", network: AD, terminus1_fr: "Haï Echellal (centre-ville)", terminus1_ar: "حي الشلال (وسط المدينة)", terminus2_fr: "Zone industrielle", terminus2_ar: "المنطقة الصناعية" },
  { ref: "AD-8", network: AD, terminus1_fr: "Haï Echellal via Haï Aïn El Beïda", terminus1_ar: "حي الشلال على حي عين البيضاء", terminus2_fr: "Gare routière (Agence foncière)", terminus2_ar: "المحطة البرية (الوكالة العقارية)" },
  { ref: "AD-9", network: AD },
  // Khemis Miliana: five Lines drawn in the artwork; the Eid program lists KM-1 to KM-4.
  { ref: "KM-1", network: KM, terminus1_fr: "Cité 250 - Cité 400 Logements", terminus1_ar: "حي 250 مسكن - حي 400 مسكن", terminus2_fr: "Gare routière", terminus2_ar: "المحطة البرية" },
  { ref: "KM-2", network: KM, terminus1_fr: "Haï Adja", terminus1_ar: "حي عاجة", terminus2_fr: "Gare ferroviaire", terminus2_ar: "محطة القطار" },
  { ref: "KM-3", network: KM, terminus1_fr: "Cité 950 Logements", terminus1_ar: "حي 950 مسكن", terminus2_fr: "Cimetière des Martyrs", terminus2_ar: "مقبرة الشهداء" },
  { ref: "KM-4", network: KM, terminus1_fr: "Cité AADL (nouvelle)", terminus1_ar: "حي عدل الجديد", terminus2_fr: "Haï Es-Salam", terminus2_ar: "حي السلام" },
  { ref: "KM-5", network: KM, terminus1_fr: "Haï El Ouanam", terminus1_ar: "حي الونام", terminus2_fr: "Gare ferroviaire", terminus2_ar: "محطة القطار" },
  // El Attaf: program codes only.
  { ref: "AT-1", network: AT },
  { ref: "AT-3", network: AT },
];

writeCapture("buses", "etus-ain-defla-lines", {
  lines,
  evidence: {
    announcement_url: sourceUrl,
    announcement_note: "Line route artwork (two collages, Google Earth base, © 2025 Airbus imagery) and the Eid al-Adha 2025 service program (6-8 June 2025) published by the Operator; read by the project owner on the Operator page and supplied as images.",
    supplied_at: "2026-09-03",
    mode: "operator_artwork_supplied_by_project_owner",
    supplied_images: [
      { role: "khemis_miliana_lines_01_05", sha256: "03ef65baa819b73b4b3da00c3ed84ba9873c18cecbe13c7f507088ca16910dd4", width: 1205, height: 2835 },
      { role: "ain_defla_lines_01_02_06_07_08", sha256: "2f0da167f2da1d0937c17e624b63c1cf022e1cfbb2ec6e5020d778f721b1fd02", width: 1205, height: 2835 },
      { role: "eid_al_adha_2025_service_program", sha256: "f7782523abf21ac93a10336dac15e0019508ec6b5157b5bf27bd2a63c308060d", width: 1241, height: 1755 },
    ],
    eid_al_adha_2025_program: {
      note: "Holiday service, not regular hours; kept as evidence of Line identity and scale only.",
      periods: { "2025-06-06": ["07:00-12:40", "13:40-20:15"], "2025-06-07": ["06:50-13:30", "13:30-20:15"], "2025-06-08": ["06:50-13:30", "13:30-20:15"] },
      buses_per_period: { "AD-1": [2, 3, 4, 4, 4, 4], "AD-2": [2, 3, 4, 4, 4, 4], "AD-3": [1, 1, 1, 1, 1, 1], "AD-4": [1, 1, 1, 1, 1, 1], "AD-5": [1, 1, 1, 1, 1, 1], "AD-9": [1, 1, 1, 1, 1, 1], "KM-1": [2, 3, 2, 2, 2, 2], "KM-2": [1, 1, 1, 1, 1, 1], "KM-3": [0, 0, 1, 1, 1, 1], "KM-4": [0, 0, 1, 1, 1, 1], "AT-1": [1, 1, 1, 1, 1, 1], "AT-3": [1, 1, 1, 1, 1, 1] },
      night_service_note: "Two buses on night duty in Aïn Defla city until 23:00 during the holiday.",
    },
    geometry_validations: [
      {
        line: "AD-2",
        osm_relation_ids: [16022861],
        osm_url: "https://www.openstreetmap.org/relation/16022861",
        note: "OSM 'Ligne 2' (operator=ETUAD) runs 19.6 km round trip between 36.240N 1.921E, which Nominatim resolves as the Mazouni suburb of Aïn Defla, and the gare routière side of town at 36.276N 2.001E, passing the Zone industrielle. Same ref, same city, same orientation and both endpoints as the Operator's AD-02 artwork.",
      },
    ],
    unmatched_osm: [
      { osm_relation_id: 7107372, ref: "X", name: "الخط س", note: "operator=ETUAD, 13 km, Aïn Defla city; no numbered counterpart in the 2025 artwork or program. Left unpromoted." },
    ],
  },
}, {
  url: sourceUrl,
  retrieved: "2026-09-03",
  records: lines.length,
  note: "Rights-safe bilingual Line identities transcribed from ETUS Aïn Defla artwork and its Eid al-Adha 2025 service program, supplied by the project owner from the Operator's page. French endpoint labels are transliterations of the Arabic artwork. Artwork is validation-only and is not redistributed. AD-2 geometry is separately sourced from OSM under ODbL.",
});
