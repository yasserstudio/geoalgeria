#!/usr/bin/env node
// Preserve a rights-safe factual projection from six route drawings published
// by ETO (Entreprise de transport d'Oran) on its official page and supplied by
// the project owner. The drawings are Google My Maps screenshots: validation
// evidence only, never redistributed and never used as geometry. Only the one
// route ETO prints with a number becomes a Line; the five it names by
// destination are kept as named services with their labelled via points.
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const sourceUrl = "https://www.facebook.com/p/ETO-100093054514209/";
const lines = [
  { ref: "83", terminus1_ar: "محطة الحمري", terminus1_fr: "Station El Hamri", terminus2_ar: "المحطة النهائية HPC 41", terminus2_fr: "Terminus HPC 41 (Aïn El Beïda)" },
];
const namedServices = [
  { label_ar: "خط عين الترك", from_ar: "عين الترك", to_ar: "ساحة اول نوفمبر", via_ar: ["محور دوران الدلافين", "المرسى الكبير", "البحرية العسكرية", "المسبكة"] },
  { label_ar: "خط 1800 سكن سيد البشير", from_ar: "1800 مسكن", to_ar: "USTO", via_ar: ["1600 مسكن", "الدرك الوطني", "السوق", "الطريق الجديدة", "المتوسطة", "بئر الجير 2", "بئر الجير 1", "محور دوران المشتلة", "محور دوران المرشد", "حي ابن رشد"] },
  { label_ar: "حي 1430 مسكن - محطة الحمري", from_ar: "حي 1430 مسكن", to_ar: "محطة الحمري", via_ar: ["محور دوران مغرب العربي", "دوار بلقايد", "المنزه", "حي العقيد لطفي"] },
  { label_ar: "محمد بوضياف - محطة الحمري", from_ar: "محمد بوضياف", to_ar: "محطة الحمري", via_ar: ["حاسي بونيف", "مستشفى اول نوفمبر"] },
  { label_ar: "المحطة البرية الباهية - طفراوي", from_ar: "المحطة البرية الباهية", to_ar: "طفراوي", via_ar: ["مطار احمد بن بلة"] },
];

writeCapture("buses", "eto-oran-lines", {
  lines,
  evidence: {
    announcement_url: sourceUrl,
    announcement_note: "Six route drawings (Google My Maps screenshots, Arabic labels) published on ETO's official page; read by the project owner and supplied as images on 2026-09-04. Only 'خط 83' carries a line number.",
    supplied_at: "2026-09-04",
    mode: "operator_artwork_supplied_by_project_owner",
    supplied_images: [{"role":"route_1","sha256":"d51b65914a20aafc603abde9c55abbc004ad9184e9217c5b1e4b040892afb847","width":453,"height":460},{"role":"route_2","sha256":"14f6b9d74563df42333e7a86aa321bda17bb1430f98fa28772257301c5a68fd9","width":931,"height":464},{"role":"route_3","sha256":"0638ec8552f68fdcb8121b6f06a08d7cd06967c70a38ed9a3095334d4ef8ee5c","width":1008,"height":472},{"role":"route_4","sha256":"f40d1e291753cbe0a7a0730b04d4fb18b90f1d052009332b9e29f21bdb146fb1","width":728,"height":575},{"role":"route_5","sha256":"31ed11e71980bb2f3e2c4253a42ee550bc871d07aa4c01f21fb5cc3674b50dbf","width":644,"height":601},{"role":"route_6","sha256":"016f7601022b0feba6f2d20b3679f5cc0d9cb4fff6ba30dc2c98de2c70602f75","width":710,"height":269}],
    named_services: namedServices,
    corroboration: [
      "None of the six corridors appears in the GuideOran or Wikipedia line tables (agents/oran/lines.json), and ref 83 is absent from both; these are new Operator-published facts.",
    ],
    geometry_note: "The drawings are Operator-controlled geometry on a Google basemap: validation-only under the promotion gate, not redistributed.",
    geometry_validations: [],
    unmatched_osm: [
      { note: "OSM 19393432 (Line 39, Palais des Sports-Hai Nedjma) and 19393433 (Hai Nedjma-Hai Sabah) are not among the six published routes; nothing to attach." },
    ],
  },
}, {
  url: sourceUrl,
  retrieved: "2026-09-04",
  records: lines.length,
  note: "Rights-safe Line identity transcribed from route drawings ETO published on its official page, supplied by the project owner. French endpoint labels are transliterations of the Arabic. Five destination-named services are recorded as evidence, not as Lines. Drawings are validation-only and are not redistributed. No geometry.",
});
