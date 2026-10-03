#!/usr/bin/env node
// Preserve a rights-safe factual projection from ETUL Laghouat operating
// programs supplied by the project owner. The artwork is validation evidence
// only and is not redistributed. Duty refs, vehicle assignments and times are
// date-specific; only four repeated public Line refs are promoted.
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const lines = [
  { ref: "02", route_name_ar: "حي المصالحة" },
  { ref: "04", route_name_ar: "الواحات الشمالية", variants_ar: ["الواحات الشمالية ترمينيس"] },
  { ref: "05", route_name_ar: "الوئام", variants_ar: ["المحافير الوئام"] },
  { ref: "07", route_name_ar: "بوخنفوس" },
];

writeCapture("buses", "etul-laghouat-lines", {
  lines,
  evidence: {
    line_source_url: null,
    source_url_note: "The project owner supplied the official artwork without its original post URL. No page URL is claimed.",
    mode: "operator_artwork_supplied_by_project_owner",
    supplied_at: "2026-09-04",
    operator_name_ar: "المؤسسة العمومية للنقل الحضري و الشبه الحضري بالأغواط",
    observed_abbreviations: ["ETUL", "E.T.U.S.L."],
    supplied_images: [
      { role: "weekly_program_2026-07-11_to_2026-07-16", sha256: "c2a80361f460001552e130cac99f734a9458e1d9a558d77eeb9c4723bcd2d7df", width: 991, height: 727 },
      { role: "independence_day_program_2026-07-05", sha256: "8d60355907f15b07ae28064838c0dd73c09014986d7eda9edaf38f459e900497", width: 1448, height: 1086 },
      { role: "operator_logo", sha256: "07843a2d311f362c7d96b38d7a73b31c5c890ddbba9b8d032d9d37a52fee23ce", width: 960, height: 960 },
    ],
    programs: [
      {
        document_date: "2026-07-04",
        service_dates: ["2026-07-05"],
        title_ar: "برنامج توقيت العمل ليوم الاستقلال 05 جويلية 2026",
        period_bands: { morning: "06:30-13:30", evening: "13:30-20:30" },
        note: "Vehicle numbers, duty refs, departures and shift times are date-specific evidence and are not published as regular schedules.",
      },
      {
        document_date: "2026-07-09",
        service_date_from: "2026-07-11",
        service_date_to: "2026-07-16",
        title_ar: "برنامج توقيت العمل الأسبوعي ابتداء من 2026/07/11 إلى غاية 2026/07/16",
        period_bands: { morning: "06:30-13:30", evening: "13:30-20:30" },
        note: "Vehicle numbers, duty refs, departures and shift times are date-specific evidence and are not published as regular schedules.",
      },
    ],
    excluded_services: [
      { name_ar: "عدل", reason: "The printed route code conflicts between the two renderings and cannot be normalized safely." },
      { kind: "duty_refs_01_to_06", reason: "Operational duty assignments, not Line identities; the assigned route changes by shift and date." },
    ],
    source_typos: ["The weekly program prints a 70:00 start and two 14/15 starts; these remain evidence-only and were not normalized into service data."],
    geometry_validations: [],
  },
}, {
  provenance: "owner_supplied_artifact",
  retrieved: "2026-09-04",
  records: lines.length,
  note: "Rights-safe Arabic Line identities transcribed from two dated ETUL Laghouat operating programs supplied by the project owner. The original post URL was not supplied, so the receipt uses explicit owner-supplied-artifact provenance and no URL. Duty allocations, times and ambiguous ADL code remain evidence-only. Artwork is not redistributed. No geometry.",
});
