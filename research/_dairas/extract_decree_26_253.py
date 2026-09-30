#!/usr/bin/env python3
"""Turn the annex of executive decree 26-253 into decree-26-253.json.

Source: Journal officiel de la Republique algerienne n 52 of 21 July 2026
(French edition), pages 9 to 16: decret executif n 26-253 du 15 juillet 2026
modifiant et completant le decret executif n 91-306 du 24 aout 1991 fixant la
liste des communes animees par chaque chef de daira.

The annex prints, per wilaya, a two-column table ("Sieges" | "Communes a animer
par chaque chef de daira concerne") and, between tables, parenthesised notes
naming the wilaya ranges the decree leaves under their 91-306 list. A plain text
extraction interleaves the two columns, so the tables are read through their
ruled cells (PyMuPDF find_tables) and the notes and wilaya headings through the
text positions, both in print reading order: left column top to bottom, then
right column. A table with no heading above it continues the wilaya of the
previous table, which is how Batna, Tebessa, Tlemcen, Medea and Bou Saada run
across a column break.

    pip install pymupdf pypdf     # tested with PyMuPDF 1.28.2, pypdf 6.19
    python3 extract_decree_26_253.py <JORA-2026-052-fr.pdf> [decree-26-253.json]

The PDF itself is not committed (see research/_dairas/README.md); the JSON this
writes is the reviewed artifact.
"""

import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf
import pypdf

FIRST_PAGE, LAST_PAGE = 10, 16  # 1-based, the pages the annex occupies
PAGE_HEIGHT = 842.0
NOISE = re.compile(
    r"JOURNAL OFFICIEL|juillet 2026|^Annexe$|Communes . animer"
    r"|chef de da.ra concern.|^Si.ges$|Safar 1448|^\(suite\)$"
)
HEADING = re.compile(r"^(\d{2})\s*[–-]\s*WILAYA\s+D")

# Every "sans changement" note, read off the annex, resolved to the wilaya codes
# it covers. The nine notes plus the 21 annexed wilayas cover 1 to 69 exactly.
UNCHANGED = [
    ("Adrar", "Chlef", [1, 2]),
    ("Oum El Bouaghi", None, [4]),
    ("Bejaia", None, [6]),
    ("Bechar", "Tamenghasset", [8, 9, 10, 11]),
    ("Tizi-Ouzou", "Alger", [15, 16]),
    ("Jijel", "Constantine", [18, 19, 20, 21, 22, 23, 24, 25]),
    ("Mostaganem", None, [27]),
    ("Mascara", "Oran", [29, 30, 31]),
    ("Illizi", "El Meniaa", list(range(33, 59))),
]


def clean(text):
    return re.sub(r"\s+", " ", (text or "").replace("’", "'")).strip()


def fold(text):
    text = (text or "").replace("’", "'")
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def read_headings_and_notes(path):
    """Wilaya headings and parenthesised notes, with their page, column and top."""
    events = []
    reader = pypdf.PdfReader(path)
    for number in range(FIRST_PAGE, LAST_PAGE + 1):
        items = []
        reader.pages[number - 1].extract_text(
            visitor_text=lambda text, cm, tm, fd, fs: items.append((tm[5], tm[4], text))
        )
        items.sort(key=lambda item: -item[0])
        for column in (0, 1):
            pending = None
            for y, x, text in items:
                if (0 if x < 250 else 1) != column:
                    continue
                text = clean(text)
                if not text or NOISE.search(text):
                    continue
                top = PAGE_HEIGHT - y
                heading = HEADING.match(text)
                if heading:
                    pending = None
                    events.append((number, column, top, "heading", text, int(heading.group(1))))
                elif "sans changement" in text:
                    pending = [number, column, top, "note", text, None]
                    events.append(pending)
                elif pending and pending[2] + 16 > top and text.endswith(")"):
                    pending[4] += " " + text  # the note wraps onto a second line
                    pending = None
                else:
                    pending = None
    return events


def read_tables(path):
    """Each ruled annex table, as (page, column, top, rows)."""
    events = []
    document = pymupdf.open(path)
    for number in range(FIRST_PAGE, LAST_PAGE + 1):
        for table in document[number - 1].find_tables(strategy="lines").tables:
            x0, top = table.bbox[0], table.bbox[1]
            events.append((number, 0 if x0 < 300 else 1, top, "table", table.extract(), None))
    return events


def build(path):
    path = Path(path)
    events = sorted(
        read_headings_and_notes(path) + read_tables(path),
        key=lambda event: (event[0], event[1], event[2]),
    )
    wilayas, order, notes, current = {}, [], [], None
    for _, _, _, kind, payload, code in events:
        if kind == "heading":
            current = code
            if code not in wilayas:
                name = re.sub(r"^\d{2}\s*[–-]\s*WILAYA\s+D[E']\s*", "", clean(payload))
                wilayas[code] = {"wilaya_code": code, "name_printed": name, "dairas": []}
                order.append(code)
        elif kind == "note":
            notes.append(clean(payload))
        else:
            header = clean(payload[0][0])
            if fold(header) != "sieges":
                raise SystemExit(f"page {_}: table header is {header!r}, not Sieges")
            for seat_cell, communes_cell in payload[1:]:
                seat = clean(seat_cell)
                communes = [
                    clean(re.sub(r"^-\s*", "", line))
                    for line in (communes_cell or "").split("\n")
                    if line.strip()
                ]
                if not seat or not communes:
                    raise SystemExit(f"wilaya {current}: empty cell {seat!r} {communes!r}")
                # Every seat in the annex is the first commune of its own daira;
                # the two readings crosscheck the cell pairing.
                if fold(seat) != fold(communes[0]):
                    raise SystemExit(f"wilaya {current}: seat {seat!r} heads {communes[0]!r}")
                wilayas[current]["dairas"].append({"seat": seat, "communes": communes})

    if len(notes) != len(UNCHANGED):
        raise SystemExit(f"expected {len(UNCHANGED)} unchanged notes, read {len(notes)}")
    unchanged = []
    for note, (first, last, codes) in zip(notes, UNCHANGED):
        for name in (first, last):
            if name and fold(name) not in fold(note):
                raise SystemExit(f"note {note!r} does not name {name!r}")
        unchanged.append({"note": note, "wilaya_codes": codes})

    covered = sorted(order + [code for entry in unchanged for code in entry["wilaya_codes"]])
    if covered != list(range(1, 70)):
        raise SystemExit("the annex and its notes do not cover wilayas 1 to 69 exactly")

    return {
        "source": {
            "decree": "Decret executif n 26-253 du 30 Moharram 1448 correspondant au 15 juillet 2026 modifiant et completant le decret executif n 91-306 du 24 aout 1991 fixant la liste des communes animees par chaque chef de daira",
            "journal": "Journal officiel de la Republique algerienne democratique et populaire n 52",
            "date": "2026-07-21",
            "edition": "French",
            "pages": "9-16 (annex: 10-16)",
            "publisher": "Secretariat general du Gouvernement (joradp.dz)",
            "provenance": "owner_supplied_artifact",
            "url": None,
            "note": "joradp.dz declines automated fetches, so the PDF was downloaded by the project owner rather than by a fetcher; it is not committed (see research/_dairas/README.md).",
            "pdf_bytes": Path(sys.argv[1]).stat().st_size,
            "pdf_sha256": hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest(),
            "retrieved": "2026-09-29",
            "extracted_by": "research/_dairas/extract_decree_26_253.py",
        },
        "unchanged": unchanged,
        "wilayas": [wilayas[code] for code in order],
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    out = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).with_name("decree-26-253.json"))
    out.write_text(json.dumps(build(sys.argv[1]), ensure_ascii=False, indent=2) + "\n", "utf-8")
    document = json.loads(out.read_text("utf-8"))
    total = sum(len(w["dairas"]) for w in document["wilayas"])
    print(f"{out}: {len(document['wilayas'])} wilayas, {total} dairas")
