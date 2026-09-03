#!/usr/bin/env node
// Preserve a rights-safe factual projection from the official ETUS Annaba
// (ETUSA-Annaba, "ايتوزا عنابة") Eid al-Adha 2026 service program, days 1 and 2,
// supplied by the project owner from the Operator's Facebook page. The artwork is
// validation evidence only and is not redistributed. Only routes the Operator
// prints with a number become Lines; the routes it prints with "/" are kept as
// unnumbered services in the evidence, never given an invented ref.
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const sourceUrl = "https://www.facebook.com/p/%D8%A7%D9%84%D8%B4%D8%B1%D9%83%D8%A9-%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%D8%A9-%D9%84%D9%84%D9%86%D9%82%D9%84-%D8%A7%D9%84%D8%AD%D8%B6%D8%B1%D9%8A-%D9%88-%D8%A7%D9%84%D8%B4%D8%A8%D9%87-%D8%A7%D9%84%D8%AD%D8%B6%D8%B1%D9%8A-%D8%B9%D9%86%D8%A7%D8%A8%D8%A9-ETUS-Annaba-100063517660926/";
const lines = [
  { ref: "05", terminus1_ar: "سيدي عاشور", terminus1_fr: "Sidi Achour", terminus2_ar: "مركز الأعمال المتوسطي", terminus2_fr: "Centre d'affaires méditerranéen" },
  { ref: "25", terminus1_ar: "سيدي عمار", terminus1_fr: "Sidi Amar", terminus2_ar: "محطة السكة الحديدية", terminus2_fr: "Gare ferroviaire" },
  { ref: "26", terminus1_ar: "الحجار", terminus1_fr: "El Hadjar", terminus2_ar: "محطة السكة الحديدية", terminus2_fr: "Gare ferroviaire" },
  { ref: "30", terminus1_ar: "بوخضرة", terminus1_fr: "Boukhadra", terminus2_ar: "نوميديا", terminus2_fr: "Numidia" },
  { ref: "33", terminus1_ar: "القنطرة", terminus1_fr: "El Kantara", terminus2_ar: "نوميديا", terminus2_fr: "Numidia" },
  { ref: "41", terminus1_ar: "البوني", terminus1_fr: "El Bouni", terminus2_ar: "محطة السكة الحديدية", terminus2_fr: "Gare ferroviaire" },
];
// Routes printed without a number, transcribed as the Operator wrote them (day 2 is the superset).
const unnumberedServices = [
  "المطار - محطة السكة الحديدية", "المحطة البرية - محطة احسن النوي", "ذراع الريش - محطة كوش نور الدين",
  "بوخضرة 3 - محطة كوش نور الدين", "عين الباردة - محطة السكة الحديدية", "ذراع الريش - حضري 1-2",
  "ريزي عمر - موقف بن بومنجل", "واد القبة - موقف بن بومنجل", "القنطرة - الحجار", "القنطرة - سيدي عمار",
  "سيدي سالم - عنابة", "الصرول واد النيل - نوميديا", "حي الريم - سويداني بوجمعة",
  "بوقنطاس السفلي - مركز الأعمال المتوسطي", "الكاليتوسة - كوش نور الدين", "العلمة - كوش نور الدين",
  "الحجار - سيدي عمار", "واد الفرشة - مركز الأعمال المتوسط", "واد العنب - ذراع الريش - برحال",
];

writeCapture("buses", "etus-annaba-lines", {
  lines,
  evidence: {
    announcement_url: sourceUrl,
    announcement_note: "Eid al-Adha 2026 service program, day 1 (19 services, 31 buses) and day 2 (26 services, 67 buses), published by the Operator; read by the project owner on the Operator page and supplied as images. Day 3 returns to the normal program.",
    supplied_at: "2026-09-03",
    mode: "operator_artwork_supplied_by_project_owner",
    supplied_images: [
      { role: "eid_2026_day1", sha256: "a93dee75a25bcf0cda0da30e1482823578875b736d65be6d8a3990edb18f6a84", width: 1280, height: 1792 },
      { role: "eid_2026_day2", sha256: "e9a56467ac59dab497eef55dbce8ee9fcc3647b96da15a708f69def27e8e5ef5", width: 1280, height: 1889 },
    ],
    numbered_lines_buses: { "05": [2, 3], "25": [2, 3], "26": [2, 3], "30": [1, 1], "33": [2, 3], "41": [2, 4] },
    unnumbered_services: unnumberedServices,
    transcription_note: "The day-2 table states 26 services and 67 buses; 25 rows were legible in the supplied image. 'محطة احسن الغوي' on day 1 reads 'احسن النوي' on day 2; day 2 spelling kept.",
    geometry_validations: [],
    unmatched_osm: [
      { note: "Wilaya 23 OSM relations 18468277/8, 18468572/3, 18559186/7 (three reciprocal pairs from Kouche Noureddine station) and 18472594 (Annaba-Azzaba) carry no ref, name or operator; the numbered Lines above do not terminate at Kouche Noureddine, so nothing can be attached." },
    ],
  },
}, {
  url: sourceUrl,
  retrieved: "2026-09-03",
  records: lines.length,
  note: "Rights-safe bilingual Line identities transcribed from ETUS Annaba's Eid al-Adha 2026 service program supplied by the project owner from the Operator's page. French endpoint labels are transliterations of the Arabic. Only routes the Operator numbers are Lines; unnumbered services are kept as evidence. Artwork is validation-only and is not redistributed. No geometry.",
});
