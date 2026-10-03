#!/usr/bin/env node
// Rights-safe projection of the official ETUS Sidi Bel Abbès network and
// timetable HTML supplied by the project owner on 2026-09-02. The live PHP
// URLs returned 404 when independently rechecked, so the tracked projection
// records that evidence limitation instead of pretending this was a live pull.
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const timetableUrl = "https://etus22.dz/Horaires.php";
const networkUrl = "https://etus22.dz/Reseau.php";
const times = (value) => value.split(" ");
const schedule = (directionFrom, directionTo, value, departureNotes = {}) => ({
  direction_from: directionFrom,
  direction_to: directionTo,
  days: null,
  days_note: "Service days are not stated on the supplied timetable page",
  departures: times(value).map((time, index) => ({
    time,
    note: departureNotes[index + 1] ?? null,
  })),
});

const lines = [
  {
    ref: "3B",
    source_ref: "03B",
    terminus1: "المحطة رقم 17",
    terminus2: "حي 800 مسكن (طريق تسالة)",
    route_diagram_url: "https://etus22.dz/assets/image/3.jpg",
    departure_schedules: [
      schedule("المحطة رقم 17", "حي 800 مسكن (طريق تسالة)", "07:25 07:55 08:20 08:50 09:20 09:45 10:15 10:45 11:15 11:45 12:15 12:45 13:15 13:45 14:15 14:45 15:15 15:45 16:15 16:45 17:15 17:45 18:15 18:45 19:20"),
      schedule("حي 800 مسكن (طريق تسالة)", "المحطة رقم 17", "07:25 07:50 08:25 08:50 09:20 09:50 10:15 10:45 11:15 11:45 12:15 12:45 13:15 13:45 14:15 14:45 15:15 15:45 16:15 16:45 17:15 17:45 18:15 18:45 19:15"),
    ],
  },
  {
    ref: "09",
    terminus1: "المحطة رقم 17",
    terminus2: "حي الإخوة عدنان (الصخرة)",
    route_diagram_url: "https://etus22.dz/assets/image/9.jpg",
    departure_schedules: [
      schedule("المحطة رقم 17", "حي الإخوة عدنان (الصخرة)", "07:55 08:20 08:45 09:05 09:30 09:55 10:20 10:45 11:10 11:35 12:00 12:25 12:50 13:15 13:40 14:05 14:30 14:55 15:25 16:05 16:35 17:00 17:25 17:45 18:15 18:40 19:00 19:20"),
      schedule("حي الإخوة عدنان (الصخرة)", "المحطة رقم 17", "07:25 07:45 08:15 08:30 08:55 09:15 09:40 10:05 10:30 10:55 11:20 11:45 12:10 12:35 13:00 13:25 13:50 14:15 14:40 15:05 15:30 15:55 16:45 17:10 17:35 18:00 18:20 18:45 19:15 19:30"),
    ],
  },
  {
    ref: "16",
    terminus1: "المحطة رقم 17",
    terminus2: "حي بن حمودة",
    route_diagram_url: "https://etus22.dz/assets/image/16i.jpg",
    departure_schedules: [
      schedule("المحطة رقم 17", "حي بن حمودة", "08:00 08:20 08:45 09:00 09:20 09:40 10:00 10:20 10:40 11:00 11:20 11:40 11:55 12:15 12:35 12:55 13:10 13:30 13:50 14:10 14:25 14:45 15:05 15:25 16:00 16:40 16:55 17:15 17:35 17:55 18:10 18:30 18:50 19:05 19:20"),
      schedule("حي بن حمودة", "المحطة رقم 17", "07:25 07:45 08:25 08:40 09:00 09:20 09:40 10:00 10:20 10:40 11:00 11:15 11:35 11:55 12:15 12:30 12:50 13:10 13:30 13:45 14:05 14:25 14:45 15:00 15:20 16:00 16:35 16:55 17:15 17:30 17:50 18:10 18:30 18:45 19:05 19:20"),
    ],
  },
  {
    ref: "11",
    terminus1: "محطة الأمير عبد القادر",
    terminus2: "سيدي لحسن",
    route_diagram_url: "https://etus22.dz/assets/image/11i.jpg",
    departure_schedules: [
      schedule("محطة الأمير عبد القادر", "سيدي لحسن", "07:25 08:05 08:25 08:45 09:05 09:30 09:50 10:10 10:35 11:00 11:20 11:40 12:05 12:30 12:50 13:10 13:35 14:00 14:20 14:40 15:00 15:45 16:05 16:25 16:50 17:10 17:30 17:50 18:15 18:35 18:55 19:20"),
      schedule("سيدي لحسن", "محطة الأمير عبد القادر", "07:25 07:40 08:05 08:25 08:45 09:05 09:25 09:45 10:10 10:30 10:50 11:15 11:40 12:00 12:20 12:45 13:10 13:30 13:50 14:15 14:40 15:00 15:20 15:40 16:25 16:45 17:05 17:30 17:50 18:10 18:30 18:55 19:10 19:30"),
    ],
  },
  {
    ref: "25",
    terminus1: "محطة الأمير عبد القادر",
    terminus2: "تلموني الجديدة",
    route_diagram_url: "https://etus22.dz/assets/image/25i.jpg",
    departure_schedules: [
      schedule("محطة الأمير عبد القادر", "تلموني الجديدة", "07:25 08:00 08:15 08:30 08:45 09:00 09:15 09:30 09:45 10:00 10:15 10:35 10:50 11:05 11:20 11:35 11:55 12:10 12:25 12:40 12:55 13:15 13:30 13:45 14:00 14:15 14:35 14:50 15:10 15:35 16:10 16:25 16:40 16:55 17:15 17:30 17:45 18:00 18:15 18:35 18:50 19:05 19:20"),
      schedule("تلموني الجديدة", "محطة الأمير عبد القادر", "07:20 07:20 07:35 07:50 08:05 08:20 08:35 08:50 09:05 09:20 09:35 09:50 10:05 10:20 10:35 10:50 11:10 11:25 11:40 11:55 12:10 12:30 12:45 13:00 13:15 13:30 13:50 14:05 14:20 14:35 14:50 15:25 15:45 16:10 16:30 16:45 17:00 17:15 17:30 17:50 18:05 18:20 18:35 18:50 19:10 19:25", { 2: "تلموني القديمة" }),
    ],
  },
  {
    ref: "26",
    terminus1: "محطة الأمير عبد القادر",
    terminus2: "قايد بلعربي",
    route_diagram_url: "https://etus22.dz/assets/image/26i.jpg",
    departure_schedules: [
      schedule("محطة الأمير عبد القادر", "قايد بلعربي", "07:20 08:20 08:55 09:35 10:15 10:50 11:30 12:10 12:45 13:25 14:05 14:40 15:20 16:00 16:35 17:15 17:55 18:30 19:00"),
      schedule("قايد بلعربي", "محطة الأمير عبد القادر", "07:25 08:05 08:40 09:15 09:50 10:30 11:10 11:45 12:25 13:05 13:40 14:20 15:00 15:35 16:15 16:55 17:30 18:05 18:50 19:15"),
    ],
  },
  {
    ref: "27",
    terminus1: "محطة الأمير عبد القادر",
    terminus2: "البواعيش",
    route_diagram_url: "https://etus22.dz/assets/image/27i.jpg",
    departure_schedules: [
      schedule("محطة الأمير عبد القادر", "البواعيش", "07:20 08:00 08:25 08:55 09:20 09:45 10:15 10:45 11:10 11:40 12:10 12:35 13:05 13:35 14:00 14:30 15:00 15:55 16:25 16:50 17:20 17:50 18:15 18:45 19:20"),
      schedule("البواعيش", "محطة الأمير عبد القادر", "07:20 07:45 08:15 08:40 09:05 09:35 10:00 10:25 10:55 11:20 11:50 12:20 12:50 13:15 13:45 14:15 14:40 15:10 15:40 16:35 17:05 17:30 18:00 18:30 18:55 19:20"),
    ],
  },
  {
    ref: "28",
    terminus1: "محطة الأمير عبد القادر",
    terminus2: "سيدي حمادوش",
    route_diagram_url: "https://etus22.dz/assets/image/28i.jpg",
    departure_schedules: [
      schedule("محطة الأمير عبد القادر", "سيدي حمادوش", "07:20 08:10 08:30 08:50 09:10 09:35 09:55 10:15 10:40 11:05 11:25 11:45 12:10 12:35 12:55 13:15 13:40 14:05 14:25 14:45 15:10 15:55 16:15 16:40 17:05 17:25 17:45 18:10 18:35 18:55 19:20", { 1: "محطة الغالمي", 31: "سيدي براهيم" }),
      schedule("سيدي حمادوش", "محطة الأمير عبد القادر", "07:20 07:40 08:00 08:20 08:50 09:10 09:30 09:55 10:15 10:35 10:55 11:20 11:45 12:05 12:25 12:50 13:15 13:35 13:55 14:20 14:45 15:05 15:25 15:50 16:35 17:20 17:45 18:05 18:25 18:50 19:10 19:25"),
    ],
  },
];

writeCapture("buses", "etus-sidi-bel-abbes-lines", {
  lines,
  evidence: {
    network_url: networkUrl,
    timetable_url: timetableUrl,
    supplied_at: "2026-09-02",
    mode: "operator_html_supplied_by_project_owner",
    live_recheck: "HTTP 404 on 2026-09-02",
    tracker_url: "https://gps.etus22.dz:8082/",
    tracker_recheck: "Connection timed out on 2026-09-02",
  },
}, {
  url: timetableUrl,
  retrieved: "2026-09-02",
  records: lines.length,
  note: "Rights-safe structured projection transcribed from the official Operator network and timetable HTML supplied by the project owner. The source pages returned HTTP 404 and the public tracker endpoint timed out during independent recheck, so no live-response or tracker receipt is claimed. The tracker share token is intentionally not stored. Route diagrams are references only and their geometry is not redistributed.",
});

console.log(`promoted ${lines.length} ETUS Sidi Bel Abbès Lines`);
