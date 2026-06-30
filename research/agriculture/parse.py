#!/usr/bin/env python3
"""Extract the 7 MADR annuaire wpDataTables from the Arabic (canonical) page into CSVs.

The Arabic page is the up-to-date side (DSA covers all 58 wilayas); the French
page is kept only for the bilingual category labels. Tables are static HTML
(wpDataTables), so no JS execution is needed.
"""
import re, csv, html
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).parent
AR = (ROOT / "raw/annuaire-ar.html").read_text(encoding="utf-8", errors="replace")

# table element id -> (output filename, network slug). The `id` is table_1..table_7
# (the 22..28 seen in row ids is the separate data-wpdatatable_id).
TABLES = {
    "table_1": ("01-dsa.csv", "directions-services-agricoles"),
    "table_2": ("02-conservations-forets.csv", "conservations-forets"),
    "table_3": ("03-instituts-recherche.csv", "instituts-techniques-recherche"),
    "table_4": ("04-instituts-formation.csv", "instituts-centres-formation"),
    "table_5": ("05-chambres-agriculture.csv", "chambres-agriculture"),
    "table_6": ("06-operateurs-publics.csv", "operateurs-economiques-publics"),
    "table_7": ("07-complexes.csv", "complexes"),
}


class TableParser(HTMLParser):
    """Pull <thead> headers + <tbody> rows for a single <table id=...>.

    Assumes flat (non-nested) tables — the source has 7 flat wpDataTables; the
    first </table> seen while capturing ends the capture.
    """

    def __init__(self, table_id):
        super().__init__()
        self.table_id = table_id
        self.in_table = self.in_thead = self.in_tbody = False
        self.in_cell = False
        self.headers, self.rows, self.row, self.cell = [], [], None, []

    def handle_starttag(self, tag, attrs):
        if tag == "table" and dict(attrs).get("id") == self.table_id:
            self.in_table = True
        if not self.in_table:
            return
        if tag == "thead":
            self.in_thead = True
        elif tag == "tbody":
            self.in_tbody = True
        elif tag == "tr" and self.in_tbody:
            self.row = []
        elif tag in ("td", "th"):
            self.in_cell = True
            self.cell = []
        elif tag == "br" and self.in_cell:
            self.cell.append(" ")  # keep multi-line cells from fusing

    def handle_endtag(self, tag):
        if tag == "table" and self.in_table:
            self.in_table = False
        if not self.in_table:
            return
        if tag == "thead":
            self.in_thead = False
        elif tag == "tbody":
            self.in_tbody = False
        elif tag == "tr" and self.in_tbody and self.row is not None:
            if any(c.strip() for c in self.row):
                self.rows.append(self.row)
            self.row = None
        elif tag in ("td", "th") and self.in_cell:
            text = re.sub(r"\s+", " ", html.unescape("".join(self.cell))).strip()
            if self.in_thead:
                self.headers.append(text)
            elif self.row is not None:
                self.row.append(text)
            self.in_cell = False

    def handle_data(self, data):
        if self.in_cell:
            self.cell.append(data)


def main():
    out_dir = ROOT / "csv"
    out_dir.mkdir(exist_ok=True)
    total = 0
    for tid, (fname, slug) in TABLES.items():
        p = TableParser(tid)
        p.feed(AR)
        rows = p.rows
        total += len(rows)
        with open(out_dir / fname, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(p.headers)
            w.writerows(rows)
        print(f"{fname:34s} {len(rows):3d} rows  cols={p.headers}")
    print(f"{'TOTAL':34s} {total:3d} rows")


if __name__ == "__main__":
    main()
