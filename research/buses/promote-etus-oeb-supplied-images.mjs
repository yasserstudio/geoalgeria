#!/usr/bin/env node
// Preserve a rights-safe factual projection from ETUS Oum El Bouaghi route
// diagrams supplied by the project owner. The artwork is validation evidence
// only and is not redistributed. Five diagrams print a Line ref, endpoints,
// major Stations and directional distance; an unnumbered night loop remains
// evidence-only.
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const appUrl = "https://play.google.com/store/apps/details?id=com.deeper.etus.oeb";
const urbanStationAr = "المحطة الحضرية";
const lines = [
  {
    ref: "01",
    terminus1_ar: "الحي الجديد للسكنات الاجتماعية",
    terminus2_ar: "حي الكمين",
  },
  {
    ref: "02",
    terminus1_ar: urbanStationAr,
    terminus2_ar: "حي سكنات عدل",
  },
  {
    ref: "03",
    terminus1_ar: urbanStationAr,
    terminus2_ar: "محطة نقل المسافرين",
  },
  {
    ref: "04",
    terminus1_ar: urbanStationAr,
    terminus2_ar: "دار الشباب",
  },
  {
    ref: "05",
    terminus1_ar: urbanStationAr,
    terminus2_ar: "حي محمد لخضر (بير الترش)",
  },
];

const lineDetails = {
  "01": {
    station_lists: [{ direction: null, stations_ar: [
      "الحي الجديد للسكنات الاجتماعية", "الإقامات الجامعية", "دار الشباب",
      "تقاطع حي حي المكي", "البريد والمواصلات", "الخنساء", "المحطة الحضرية",
      "جامعة العربي بن مهيدي",
    ] }],
    distance_km: { outbound: 8.7, return: 8.7 },
    note: "The source literally repeats حي in تقاطع حي حي المكي. The endpoint حي الكمين is absent from the printed major-Station list; neither discrepancy was normalized.",
  },
  "02": {
    station_lists: [
      { direction: "outbound", stations_ar: ["المحطة الحضرية (وسط المدينة)", "أمام بنك الفلاحة والتنمية الريفية", "الأمن الحضري الرابع", "حي 250 سكن", "حي 190 مسكن", "حي سكنات عدل"] },
      { direction: "return", stations_ar: ["حي سكنات عدل", "دار الشباب", "مقابل ملعب زرداني حسونة", "EPLF", "حي الألوان", "الأمن الحضري الرابع", "أمام بنك الفلاحة والتنمية الريفية", "المحطة الحضرية (وسط المدينة)"] },
    ],
    distance_km: { outbound: 5.6, return: 4.2 },
  },
  "03": {
    station_lists: [{ direction: null, stations_ar: ["المحطة الحضرية (وسط المدينة)", "الخزينة", "المحكمة", "مديرية التعمير والبناء", "حي العافري بمحاذاة مخبزة ناصري", "حي العافري 2", "ثانوية بوخالفة السبتي", "محطة نقل المسافرين"] }],
    distance_km: { outbound: 3.5, return: 3.5 },
  },
  "04": {
    station_lists: [
      { direction: "outbound", stations_ar: ["دار الشباب", "حي 750 مسكن", "حي النصر", "مقابل مركز الضمان الاجتماعي", "مقابل الملعب البلدي زرداني حسونة", "المدرسة الابتدائية بنور السعيد", "دار الثقافة", "المحطة الحضرية (وسط المدينة)"] },
      { direction: "return", stations_ar: ["المحطة الحضرية (وسط المدينة)", "مسجد عقبة بن نافع", "EPLF", "مقابل مركز الضمان الاجتماعي", "حي النصر", "حي 750 مسكن", "دار الشباب"] },
    ],
    distance_km: { outbound: 4.2, return: 3.5 },
    note: "The diagram's outbound column runs from دار الشباب to المحطة الحضرية, opposite the title's written endpoint order; the explicit direction column is preserved.",
  },
  "05": {
    station_lists: [{ direction: null, stations_ar: ["المحطة الحضرية (وسط المدينة)", "المحكمة", "مديرية البناء والتعمير", "حي مهدي ملول", "المركب الرياضي الجواري خلافية الربيعي", "الوكالة المحلية للتشغيل", "المعهد الوطني المتخصص حجام عبود", "حي محمد لخضر (بير الترش)"] }],
    distance_km: { outbound: 2.8, return: 2.8 },
  },
};

writeCapture("buses", "etus-oeb-lines", {
  lines,
  evidence: {
    app_url: appUrl,
    line_source_url: null,
    mode: "operator_artwork_supplied_by_project_owner",
    supplied_at: "2026-09-04",
    operator_name_ar: "المؤسسة العمومية للنقل الحضري و الشبه الحضري أم البواقي",
    supplied_images: [
      { role: "waslaya_app_poster", sha256: "a1eb2f15f83b7955dd51ae93d4f5d2bc24726146ec24bc6fb4e320bddde7d2eb", width: 1297, height: 2041 },
      { role: "night_loop_evidence_only", sha256: "369ab75fc823f20e299375b65a832b9bba0088f59b72ece73ec21c65df5265ec", width: 1317, height: 735 },
      { role: "line_05", sha256: "e44d18f0b2218a64eee9722bd5d19a0ed233d253ffeda54e2a832e7a3b5ee34a", width: 960, height: 715 },
      { role: "line_04", sha256: "fec9ea31dec57d0b3689c8dc6b17c019054a1162c8e47f69927de5eeeef9cdb4", width: 960, height: 717 },
      { role: "line_03", sha256: "12ca6c3c8eb57661f80a778320e54be46a9e8ccfb612a87001b0622b9a3b1b45", width: 960, height: 723 },
      { role: "line_02", sha256: "63c93f6de44e974535741ec0afc762962896acf38f2a77ea495180907446fbe3", width: 960, height: 722 },
      { role: "line_01", sha256: "93b85e53cabdc82412646a8c0720c0185e6d1c2a85626164a895676c52ddd87a", width: 960, height: 718 },
      { role: "operator_logo", sha256: "3721ebb8ecc887cbabc952e1cf2d7105e2060f9b42ba8c728c74792ec49a1b6c", width: 960, height: 868 },
    ],
    line_details: lineDetails,
    excluded_services: [{
      kind: "night_loop",
      title_ar: "مخطط سير حافلات الفترة الليلية",
      distance_km: 9.3,
      reason: "Evidence-only: no Line ref, direction definition, operating dates or evidence that the night service is permanent.",
    }],
    geometry_validations: [],
  },
}, {
  url: appUrl,
  retrieved: "2026-09-04",
  records: lines.length,
  note: "Rights-safe Arabic Line identities transcribed from five numbered ETUS Oum El Bouaghi diagrams supplied by the project owner. The Play URL identifies the Operator's WASLAYA app but does not host the Line artwork. French translations are applied in the package transform, not recorded as source facts. Artwork is validation-only and is not redistributed. No geometry.",
});
