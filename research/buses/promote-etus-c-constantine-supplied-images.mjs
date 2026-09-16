#!/usr/bin/env node
// Rights-safe factual projection from two ETUS-C Constantine route graphics
// supplied by the project owner. The artwork is evidence only and is not
// redistributed; no route geometry is inferred from the schematic.
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const lines = [
  ["L02", "بوالصوف", "قدور بومدوس", "blue"],
  ["L04", "محطة زعمومش", "سيدي مبروك", "blue"],
  ["L05", "حي عرفة", "قدور بومدوس", "blue"],
  ["L08", "وسط المدينة", "زواغي المطار", "blue"],
  ["L14", "جبل الوحش", "بوالصوف", "blue"],
  ["L15", "محطة زعمومش", "المدينة الجديدة", "green"],
  ["L16", "محطة ماسينيسا الضريح", "زعمومش", "green"],
  ["L19", "محطة قادري ابراهيم", "شعر الديب", "green"],
  ["L21", "محطة قادري ابراهيم", "الوحدة الجوارية 21", "orange"],
  ["L22", "محطة نقل المسافرين", "الدرك الوطني", "orange"],
  ["L23", "محطة زعمومش", "عين النحاس", "purple"],
  ["L24", "محطة زعمومش", "الرتبة", "purple"],
  ["L25", "محطة زعمومش", "كاف صالح", "purple"],
  ["L26", "محطة زعمومش", "عين عبيد", "purple"],
  ["L27", "محطة زعمومش", "تييديس", "purple"],
  ["L28", "محطة زعمومش", "عين السمارة", "purple"],
  ["L29", "محطة عين السمارة", "المدينة الجديدة", "purple"],
  ["L31", "محطة زعمومش", "المريج", "blue"],
  ["L32", "محطة زعمومش", "ديدوش مراد", "blue"],
  ["L33", "محطة زعمومش", "بني حميدان", "blue"],
  ["L34", "محطة زعمومش", "الحامة بوزيان", "blue"],
  ["L35", "محطة زعمومش", "ابن باديس", "blue"],
  ["L36", "عين النحاس", "المدينة الجديدة", "blue"],
  ["L37", "محطة نقل المسافرين", "ابن زياد", "blue"],
  ["L38", "محطة نقل المسافرين", "مسعود بوجريو", "blue"],
].map(([ref, terminus1_ar, terminus2_ar, route_color]) => ({ ref, terminus1_ar, terminus2_ar, route_color }));

writeCapture("buses", "etus-c-constantine-lines", {
  lines,
  evidence: {
    operator_name_ar: "المؤسسة العمومية للنقل الحضري والشبه حضري قسنطينة (ETUS-C)",
    mode: "operator_artwork_supplied_by_project_owner",
    supplied_at: "2026-09-16",
    supplied_images: [
      { role: "route_list", sha256: "df4ef0ce03a49c546e86452ddfd2761af4c2d482abd281a8b23551a63c4187fc", width: 1008, height: 1043 },
      { role: "schematic_network_map", sha256: "3ca2a55e5b39ab7bfe9ffc5a243e9ad4d42a012406493c63ea95b181bce83c80", width: 1063, height: 992 },
    ],
    route_color_note: "Colors are transcribed from the route-list legend; they are presentation evidence, not a claim about a stable published color standard.",
  },
}, {
  provenance: "owner_supplied_artifact",
  retrieved: "2026-09-16",
  records: lines.length,
  note: "Twenty-five ETUS-C Constantine route identities and Arabic endpoints transcribed from two owner-supplied Operator graphics. Artwork is validation-only and is not redistributed. The schematic is not used as reusable geometry; intermediate stops, schedules and exact shapes remain unknown.",
});
