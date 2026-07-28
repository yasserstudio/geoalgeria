#!/usr/bin/env python3
"""Collect the nonstop route network from Wikipedia's airport articles.

Why this source. Each airport article carries an "Airlines and destinations"
table listing every carrier and every nonstop destination, and, crucially, most
entries carry an **inline citation with a URL**. That gives a candidate route AND
a source to check it against, per leg, which is what `collection-rules.md`
demands and what neither Soar nor a booking widget could provide.

What this is NOT. Wikipedia is `crowdsourced` evidence, never `official`. This
script is a **hypothesis generator**, exactly like Soar: it proposes routes and
hands over the citation each one rests on. A route ships once that citation is
read and holds up, or once an airport/airline page confirms it. The `source_url`
that ends up in the dataset is the CITATION, not the Wikipedia page.

Read against the sweep it replaces: 36 fetches here versus ~620 Soar queries,
and it yields the operator, the destination and a source in one pass. It also
covers the whole carrier list, so switching v1 to all-carriers later costs
nothing extra at collection time.

Caveats the parser records rather than hides:
  - articles tagged {{incomplete list}} are flagged, because that is Wikipedia
    telling us the table is known to be partial;
  - "seasonal", "charter" and "begins/ends <date>" annotations are captured, not
    discarded, since they decide `status` and whether a route ships at all;
  - a destination with no citation is kept but marked, so it can never be
    mistaken for a sourced one.

Usage: python3 collect_wikipedia_routes.py [--out routes-wikipedia.json]
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

API = "https://en.wikipedia.org/w/api.php"
UA = "geoalgeria-research/1.0 (https://geoalgeria.com; hello@yasser.studio)"
HERE = os.path.dirname(os.path.abspath(__file__))
PAUSE = 0.5  # be a good citizen; the API asks for serial requests, not a flood


def api(_tries=3, **params):
    """One API call, retried on transport errors.

    Without this a single timeout silently drops a whole airport: one run lost
    Algiers, the busiest airport in the country, and the only sign was a line in
    the failure list. A sweep that quietly under-reports is worse than one that
    takes ten seconds longer.
    """
    params.setdefault("format", "json")
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    last = None
    for attempt in range(_tries):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.load(r)
        except Exception as e:
            last = e
            time.sleep(1.5 * (attempt + 1))
    raise last


IATA_INFOBOX_RE = re.compile(r"\|\s*IATA\s*=\s*([A-Z]{3})\b", re.I)


def article_for(iata, name):
    """Find the Wikipedia article for an airport, CONFIRMED by its infobox IATA.

    Taking the first search hit is not good enough: it silently resolved MZW to a
    disambiguation page, TIN to the town of Tindouf, and found nothing at all for
    Oran, Bechar and In Salah, which are real airports with real articles. Same
    lesson as the OurAirports join: a name match is a candidate, not a
    confirmation, so verify against something the page itself asserts.

    Tries several query shapes, then reads each candidate's infobox and accepts
    only a page whose declared IATA equals the one we asked for.
    """
    seen = []
    queries = [
        f"{name} airport Algeria {iata}",
        f"{iata} airport Algeria",
        f"{name} Airport",
    ]
    for q in queries:
        try:
            res = api(action="query", list="search", srsearch=q, srlimit=6)
        except Exception:
            continue
        for hit in res.get("query", {}).get("search", []):
            title = hit["title"]
            if title in seen:
                continue
            seen.append(title)
            if "disambiguation" in title.lower():
                continue
            try:
                w = api(action="parse", page=title, prop="wikitext", section=0)
                text = w["parse"]["wikitext"]["*"]
            except Exception:
                continue
            m = IATA_INFOBOX_RE.search(text)
            if m and m.group(1).upper() == iata.upper():
                return title
            time.sleep(PAUSE)
    return None


def destinations_section(title):
    """Return (wikitext, incomplete_flag) for the Airlines and destinations section."""
    secs = api(action="parse", page=title, prop="sections")
    idx = next(
        (s["index"] for s in secs.get("parse", {}).get("sections", [])
         if re.search(r"airlines and destinations", s["line"], re.I)),
        None,
    )
    if idx is None:
        return None, False
    w = api(action="parse", page=title, prop="wikitext", section=idx)
    text = w["parse"]["wikitext"]["*"]
    return text, bool(re.search(r"\{\{\s*incomplete list", text, re.I))


REF_RE = re.compile(r"<ref[^>]*>(.*?)</ref>|<ref[^>]*/>", re.S)
URL_RE = re.compile(r"url\s*=\s*([^\s|}]+)")
LINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]*))?\]\]")


def parse_table(wikitext):
    """Yield (carrier, destination, display, source_urls, notes) tuples.

    The template is `{{Airport destination list | [[Carrier]] | dest, dest, ... }}`
    with one such pair per carrier, so split on the pipe that precedes a carrier
    link and treat everything up to the next one as that carrier's cell.
    """
    body = wikitext
    # Isolate each `| [[Carrier]] | <destinations>` pair.
    pairs = re.findall(
        r"\|\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*\|(.*?)(?=\n\s*\|\s*\[\[|\n\}\})",
        body, re.S,
    )
    # Every carrier in this table, so a carrier link can never be mistaken for a
    # destination. It happened: "ASL Airlines France" showed up as a destination
    # from four different Algerian airports, because a row whose cell ran on past
    # the newline swallowed the next carrier's link.
    carrier_names = {c.strip() for c, _ in pairs}
    for carrier, cell in pairs:
        carrier = carrier.strip()
        # Split destinations on commas that sit OUTSIDE a ref/template, by
        # blanking refs first and keeping their URLs against their position.
        refs = []

        def stash(m):
            refs.append((m.start(), URL_RE.findall(m.group(0))))
            return "\x00" * len(m.group(0))

        blanked = REF_RE.sub(stash, cell)
        # Walk DESTINATION LINKS, not comma-separated chunks. The separator sits
        # before the citation, as `dest]],<ref>...</ref> nextdest`, so splitting
        # on commas puts each reference in the chunk AFTER the destination it
        # belongs to. Two earlier versions got this wrong in opposite directions:
        # a fixed lookahead attached the next entry's reference (Alicante cited
        # an article about Budapest), and a strict chunk window then attached
        # almost none. A destination owns the references between its own link and
        # the next link, which is exactly what the wikitext means.
        links = list(LINK_RE.finditer(blanked))
        for n, link in enumerate(links):
            target = link.group(1).strip()
            display = (link.group(2) or link.group(1)).strip()
            if target.startswith(("File:", "Category:", "Image:")):
                continue
            if target in carrier_names or display in carrier_names:
                continue
            lo = link.end()
            hi = links[n + 1].start() if n + 1 < len(links) else len(blanked)
            urls = [u for pos, us in refs if lo <= pos < hi for u in us]
            # Annotations sit in the same window, outside the blanked refs.
            raw = blanked[lo:hi].replace("\x00", " ")
            notes = []
            for pat, tag in (
                (r"seasonal", "seasonal"), (r"charter", "charter"),
                (r"\bbegins\b", "begins"), (r"\bends\b", "ends"),
                (r"resumes", "resumes"), (r"suspended", "suspended"),
            ):
                if re.search(pat, raw, re.I):
                    notes.append(tag)
            yield carrier, target, display, sorted(set(urls)), notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, "routes-wikipedia.json"))
    ap.add_argument("--limit", type=int, default=0, help="only the first N airports")
    args = ap.parse_args()

    airports = json.load(open(os.path.join(HERE, "..", "..", "packages", "aviation", "data", "airports.json"), encoding="utf-8"))
    airports = [a for a in airports if a.get("iata")]
    if args.limit:
        airports = airports[: args.limit]

    out, failures = [], []
    for i, a in enumerate(airports, 1):
        iata, name = a["iata"], a["name"]
        try:
            title = article_for(iata, re.sub(r"^A[ée]roport (de |d[’']|)", "", name))
            if not title:
                failures.append((iata, "no article found")); continue
            text, incomplete = destinations_section(title)
            if not text:
                failures.append((iata, f"no destinations section in {title}")); continue
            rows = list(parse_table(text))
            for carrier, target, display, urls, notes in rows:
                out.append({
                    "from_iata": iata, "from_name": name, "from_article": title,
                    "carrier": carrier, "to_article": target, "to_display": display,
                    "source_urls": urls, "notes": notes,
                    "table_incomplete": incomplete,
                })
            print(f"  [{i}/{len(airports)}] {iata:4} {title[:44]:46} {len(rows):3} rows"
                  f"{'  (table flagged incomplete)' if incomplete else ''}", flush=True)
        except Exception as e:  # keep going; one bad article must not kill the sweep
            failures.append((iata, str(e)[:80]))
            print(f"  [{i}/{len(airports)}] {iata:4} FAILED: {e}", file=sys.stderr, flush=True)
        time.sleep(PAUSE)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    carriers = {}
    for r in out:
        carriers[r["carrier"]] = carriers.get(r["carrier"], 0) + 1
    print(f"\nwrote {len(out)} carrier/destination rows -> {args.out}")
    print(f"unsourced rows: {sum(1 for r in out if not r['source_urls'])}")
    print("top carriers:", ", ".join(f"{c} {n}" for c, n in sorted(carriers.items(), key=lambda x: -x[1])[:6]))
    if failures:
        print(f"\n{len(failures)} airport(s) yielded nothing:")
        for iata, why in failures:
            print(f"  {iata}: {why}")


if __name__ == "__main__":
    main()


def resolve_destination_iatas(rows, cache_path):
    """Resolve each distinct destination article to its IATA code, from the
    article's own infobox.

    Needed twice over. An arc cannot be drawn without knowing which airport the
    destination IS, and the domestic/international split cannot be done on
    article titles: a destination links as [[Ahmed Ben Bella Airport|Oran]] while
    the same airport resolves to a different title as an origin, so title
    matching silently called thirteen Algerian cities international.

    Cached on disk because it is the expensive part and the answer never changes.
    """
    cache = {}
    if os.path.exists(cache_path):
        cache = json.load(open(cache_path, encoding="utf-8"))
    titles = sorted({r["to_article"] for r in rows})
    todo = [t for t in titles if t not in cache]
    for i, t in enumerate(todo, 1):
        try:
            w = api(action="parse", page=t, prop="wikitext", section=0)
            text = w["parse"]["wikitext"]["*"]
            # Follow a redirect. "Tunis Airport" is a redirect with no infobox of
            # its own, so reading it directly returned no IATA and every Tunis
            # row was dropped without a word.
            redir = re.match(r"\s*#REDIRECT\s*\[\[([^\]|]+)", text, re.I)
            if redir:
                w = api(action="parse", page=redir.group(1).strip(), prop="wikitext", section=0)
                text = w["parse"]["wikitext"]["*"]
            m = IATA_INFOBOX_RE.search(text)
            cache[t] = m.group(1).upper() if m else None
        except Exception:
            cache[t] = None
        if i % 20 == 0:
            print(f"    resolved {i}/{len(todo)}", flush=True)
            json.dump(cache, open(cache_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        time.sleep(PAUSE)
    json.dump(cache, open(cache_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return cache
