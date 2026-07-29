#!/usr/bin/env python3
"""Screen the un-recorded return legs against Soar live flight status.

The dataset holds 96 city-pairs of which 70 are one-directional: the outbound
leg is recorded (mostly from Wikipedia's airport tables, which are written
outbound-only) and the return is silent. This asks Soar, for each silent
direction, whether an AH flight actually operates it in the next week, and what
its scheduled times are.

STANDING RULE (research/_flight-routes/collection-rules.md): Soar is a
HYPOTHESIS GENERATOR, never a source_url. Nothing this script writes may enter
route-dataset.json directly. Each hit is a lead to confirm against a citable
source (the airport's own schedule page, aeroroutes, the airline), and each
miss is NOT a negative: live status only shows flights on days they operate,
so a low-frequency route can miss all seven probes and still exist.

Usage: python3 screen_returns_soar.py [days=7]
Writes soar-return-screen-<today>.json next to this file.
"""

import datetime
import json
import os
import sys
import time

from soar import call, session

HERE = os.path.dirname(os.path.abspath(__file__))


def one_directional_pairs():
    d = json.load(open(os.path.join(HERE, "route-dataset.json"), encoding="utf-8"))
    dz = {e["iata"] for e in d["endpoints"] if e["country"] == "DZ"}
    dirs = {}
    for r in d["routes"]:
        key = tuple(sorted((r["from"], r["to"])))
        dirs.setdefault(key, {"legs": []})["legs"].append(r)
    out = []
    for key, v in sorted(dirs.items()):
        have = {(r["from"], r["to"]) for r in v["legs"]}
        for a, b in [key, key[::-1]]:
            if (a, b) not in have and (b, a) in have:
                recorded = next(r for r in v["legs"] if (r["from"], r["to"]) == (b, a))
                out.append({"dep": a, "arr": b, "recorded_leg": recorded["id"],
                            "recorded_evidence": recorded["evidence"]})
    return out, dz


def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    pairs, _ = one_directional_pairs()
    print(f"{len(pairs)} silent directions to screen, up to {days} days each")
    sid = session()
    today = datetime.date.today()
    results = []
    for i, p in enumerate(pairs):
        hit = None
        tried = 0
        for offset in range(days):
            date = (today + datetime.timedelta(days=offset)).isoformat()
            tried += 1
            try:
                d = call("soar_get_live_flight_status",
                         {"airline_iata": "AH", "dep_iata": p["dep"], "arr_iata": p["arr"],
                          "date": date}, sid)
                text = d["result"]["content"][0]["text"] if isinstance(d, dict) else str(d)
                payload = json.loads(text)
            except Exception as e:  # transient or shape surprise: record, move on
                results.append({**p, "error": str(e)[:120], "date": date})
                hit = "error"
                break
            fl = payload.get("flight")
            if fl and fl.get("route", {}).get("dep_iata") == p["dep"]:
                hit = {
                    "flight_iata": fl.get("flight_iata"),
                    "status": fl.get("status"),
                    "date": date,
                    "scheduled_dep": (fl.get("departure") or {}).get("scheduled"),
                    "scheduled_arr": (fl.get("arrival") or {}).get("scheduled"),
                }
                break
            time.sleep(0.4)
        if hit == "error":
            pass
        elif hit:
            results.append({**p, "found": hit, "days_probed": tried})
            print(f"  [{i+1}/{len(pairs)}] {p['dep']}->{p['arr']}: {hit['flight_iata']} "
                  f"{hit['scheduled_dep']} -> {hit['scheduled_arr']} ({hit['date']})")
        else:
            results.append({**p, "found": None, "days_probed": tried})
            print(f"  [{i+1}/{len(pairs)}] {p['dep']}->{p['arr']}: no operation seen in {tried} day(s)")
    out = {
        "screened_at": today.isoformat(),
        "days_window": days,
        "note": ("HYPOTHESES ONLY. Soar/airlabs is never a source_url. A found flight is a "
                 "lead to confirm against a citable source; a miss is not a negative "
                 "(low-frequency routes can escape a 7-day live window)."),
        "results": results,
    }
    path = os.path.join(HERE, f"soar-return-screen-{today.isoformat()}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    found = sum(1 for r in results if r.get("found"))
    print(f"\n{found}/{len(pairs)} silent directions have a live AH operation -> {path}")


if __name__ == "__main__":
    main()
