#!/usr/bin/env python3
"""Build @geoalgeria/industrie-pharmaceutique from the MIP fabrication lists.

Pipeline (reproducible):
  MIP PDF --pdftotext--> mip-fabrication.txt (2026 current, membership + nature)
                         mip-fabrication-2023.txt (2023, wilaya/commune column)
  --> parse --> geocode (2023 join > commune token > wilaya token > manual)
  --> packages/industrie-pharmaceutique/data/{industrie-pharmaceutique.json,
      metadata.json, csv/*, geojson/*}
Run:  python3 build.py            # writes the package
      python3 build.py --report   # geo-coverage report only
"""
import json, re, os, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(HERE + '/../..')
DATA = ROOT + '/packages/dataset/data'
OUT = ROOT + '/packages/industrie-pharmaceutique/data'

NAT = {'PP DM': 'mixte', 'PP': 'pp', 'DM': 'dm'}
SECTIONS = {
    'Produit Pharmaceutiques (PP)': 'pp',
    'Production MIXTE (PP DM)': 'mixte',
    'Dispositifs médicaux (DM)': 'dm',
}
NATURE_LABEL = {
    'pp': ('Fabricant de produits pharmaceutiques', 'مصنّع منتجات صيدلانية'),
    'dm': ('Fabricant de dispositifs médicaux', 'مصنّع أجهزة طبية'),
    'mixte': ('Fabricant mixte (produits pharmaceutiques et dispositifs médicaux)',
              'مصنّع مختلط (منتجات صيدلانية وأجهزة طبية)'),
}
# Manual wilaya (and commune) for well-known makers with no place token and not in the
# 2023 list. Sourced from company/MIP/press records; commune -> centroid, else wilaya.
# Verified wilaya (+ commune) for makers absent from the 2023 list or listed there as
# "Sous-traitance". Sourced by the geo-research pass (see geo-research.json); NOT guessed.
# Ordered list of (word-boundary needle in the operator name, wilaya, commune|None);
# first match wins. 11 makers stayed unlocatable and are intentionally omitted.
OVERRIDES = [
    # site-specific needles FIRST so they win over broader company-wide needles below:
    ('ALGERIEN ORAN', 'Oran', 'Messerghine'),  # GPA Oran plant — beats the generic GPA row
    ('OASIS DES ZIBANS', 'Biskra', None),       # recovered by the inverted-wrap parser fix
    ('BABA ALI', 'Alger', 'Baba Ali'), ('INJECTABLES', 'Alger', 'Staoueli'),
    ('GENIS', 'Sétif', 'Sétif'), ('MAGHREB DENTAL', 'Oran', 'Es Senia'),
    ('RIADH PHARM', 'Chlef', 'Chlef'), ('SPIMACO', 'Alger', 'Aïn Benian'),
    ('ALFACARE', 'Alger', 'Oued Smar'), ('BENJECT', 'Tlemcen', 'Tlemcen'),
    ('DEMOCEDES', 'Oum El Bouaghi', "Aïn M'lila"), ('KENDI', 'Alger', 'Sidi Abdallah'),
    ('ESCENCIA', 'Tébessa', 'Tébessa'), ('GENERICLAB', 'Alger', 'Rouiba'),
    ('GEOMEDICA', 'Oran', 'Oued Tlélat'), ('IMC', 'Alger', 'Rouiba'),
    ('KPMA', 'Constantine', None), ('GROUPEMENT PHARMACEUTIQUE', 'Mostaganem', 'Stidia'),
    ('LABORATOIRE MM', 'Annaba', 'Rehal'), ('BIOTECHNOLOGIE', 'Batna', None),
    ('LDM', 'Constantine', 'El Khroub'), ('LAD PHARMA', 'Alger', None),
    ('MEDIPHARMA', 'Alger', 'Zéralda'), ('ODONTOMEDICA', 'Constantine', 'Constantine'),
    ('ONYX', 'El Tarf', 'Zerizer'), ('ROSASPHARMA', 'Bouira', 'Oued El Berdi'),
    ('ASTRAZENECA', 'Alger', 'Rouiba'), ('BIOGENAL', 'Alger', 'Birtouta'),
    ('D-B-F', 'Chlef', 'Oued Sly'), ('JAMJOOM', 'Alger', 'Oued Smar'),
    ('MAYOLY', 'Alger', 'Cheraga'), ('INVEST', 'Sétif', 'El Eulma'),
    ('PHARMACEUTICAL LABORATORY', 'Alger', 'Cheraga'), ('BENKHELIFA', 'Sétif', 'Sétif'),
    ('BORDJ EL MOKRANI', 'Bordj Bou Arréridj', 'Medjana'), ('ASCENSIA', 'Alger', 'Ben Aknoun'),
    ('CHARK', 'Batna', 'Aïn Yagout'), ('CRETES', 'Alger', 'Oued Smar'),
    ('COPERDIS', 'Blida', 'Beni Tamou'), ('DAHMANE', 'Tizi Ouzou', 'Tizi Rached'),
    ('GIAP', 'Alger', None), ('ABOU SAMRA', 'Alger', 'Dar El Beida'),
    # in the 2023 MIP register but missed by the fuzzy join (name variance):
    ('TABET', 'Sidi Bel Abbès', 'Sidi Bel Abbès'), ('BIOTHERA', 'El Tarf', 'El Tarf'),
    ('IMGSA', 'Oum El Bouaghi', "Aïn M'lila"), ('CHERIFI', 'Tizi Ouzou', 'Tizi Ouzou'),
    ('TOP GLOVES', 'Aïn Témouchent', 'Aïn Témouchent'), ('VICRALYS', 'Tizi Ouzou', 'Tizi Ouzou'),
    ('DIAGNOSTICS CARE', 'Alger', 'Oued Smar'),
    # Saidal multi-site disambiguation for names whose place isn't in the gazetteer
    # (source typos / spelling): Gué de Constantine = Djasr Kasentina (Alger); Cherchel(l) = Tipaza.
    ('GUE DE', 'Alger', 'Djasr Kasentina'), ('CHERCHEL', 'Tipaza', 'Cherchell'),
    ('UPJOHN', 'Alger', None),
]

def deaccent(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))

def cnorm(s):
    # deaccent + punctuation-to-space + collapse — the ONE normalization used on BOTH
    # sides of place matching, so gazetteer hyphens (TIZI-OUZOU) meet spaced names.
    return re.sub(r'\s+', ' ', re.sub(r'[^A-Za-z0-9]', ' ', deaccent(s))).upper().strip()

STOP = {'EPE', 'SPA', 'SARL', 'EURL', 'SNC', 'SASU', 'GROUPE', 'INDUSTRIEL',
        'LABORATOIRES', 'LABORATOIRE', 'LABO', 'PHARMACEUTIQUE', 'PHARMACEUTIQUES',
        'INDUSTRIE', 'INDUSTRIES', 'PRODUCTION', 'UNITE', 'DE', 'PRODUITS', 'SITE',
        'ALGERIE', 'ALGERIA', 'ALGERIEN', 'ALGERIENNE', 'DZ', 'LIL', 'ET', 'D', 'DES',
        'INTERNATIONAL', 'PRODUCTIONS', 'MEDICAMENTS', 'HEALTHCARE', 'PHARMA'}

def norm(s):
    s = deaccent(s).upper()
    s = re.sub(r'[^A-Z0-9 ]', ' ', s)
    toks = [t for t in s.split() if t not in STOP]
    return ' '.join(toks).strip()

def key_tokens(s):
    return {t for t in norm(s).split() if len(t) >= 3}

def key_despaced(s):
    return ''.join(norm(s).split())  # significant letters, original order, no spaces

def slugify(s):
    s = deaccent(s).lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def parse_2026(path):
    # Two wrap orders exist for long names: (a) "N° … nature" then the name on the next
    # line(s) [cur handles it]; (b) a name fragment appears BEFORE its "N° … nature" line
    # [pending buffers it and prepends to the next empty-operator record]. Handling both
    # keeps line-wrapped establishments (SOPHAL Oran, VITAL site 2, OASIS des Zibans)
    # whole instead of splitting them into fragments.
    section, records, cur, pending = None, [], None, ''
    for ln in open(path, encoding='utf-8').read().splitlines():
        t = ln.strip()
        if not t or t.startswith('Page ') or t.startswith('N°') or 'Opérateur' in t:
            continue
        if t in SECTIONS:
            section, cur, pending = SECTIONS[t], None, ''; continue
        if section is None:
            continue
        m = re.match(r'^(\d+)\s+(.*?)\s+(PP DM|PP|DM)$', t)
        if m:
            op, nat = m.group(2).strip(), NAT[m.group(3)]
            operator = op if op else pending  # empty-op line inherits the buffered fragment
            rec = {'section': section, 'n': int(m.group(1)), 'operator': operator, 'nature': nat}
            records.append(rec)
            cur = None if op else rec  # inline record is complete; else it awaits continuations
            pending = ''
        elif cur is not None:  # continuation of the current record
            cur['operator'] = (cur['operator'] + ' ' + t).strip()
        else:  # a name fragment ahead of its number line — buffer it
            pending = (pending + ' ' + t).strip()
    return records

# wilaya adjective / derived forms → wilaya name (safe, specific ones only)
ADJ = {'CONSTANTINOISE': 'Constantine', 'CONSTANTINOIS': 'Constantine',
       'ORANAISE': 'Oran', 'ORANAIS': 'Oran', 'SETIFIENNE': 'Sétif',
       'BLIDEENNE': 'Blida', 'ANNABI': 'Annaba', 'TLEMCENIENNE': 'Tlemcen'}

def parse_2023_geo(path):
    geo = []
    for ln in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^\s*\d+\s{2,}(.+?)\s{2,}(.+?)\s{2,}Fabricant', ln)
        if m:
            name = m.group(1)
            geo.append({'ds': key_despaced(name), 'tokens': key_tokens(name),
                        'place': m.group(2).strip()})
    return geo

def match_2023(operator, geo):
    """Return the 2023 place string for the best name match, or None."""
    ds, tk = key_despaced(operator), key_tokens(operator)
    if len(ds) < 5:
        return None
    for g in geo:  # 1) despaced substring (spacing/tokenization independent)
        if len(g['ds']) >= 5 and (g['ds'] in ds or ds in g['ds']):
            return g['place']
    best, best_j = None, 0.0
    for g in geo:  # 2) token-set Jaccard (a shared distinctive token is enough)
        if not g['tokens']:
            continue
        shared = tk & g['tokens']
        if not shared:
            continue
        # single shared token only counts if it is long/distinctive (>=6 chars)
        if len(shared) < 2 and max(len(t) for t in shared) < 6:
            continue
        j = len(shared) / len(tk | g['tokens'])
        if j > best_j:
            best, best_j = g['place'], j
    return best if best_j >= 0.4 else None

def load_gaz():
    wj = json.load(open(f'{DATA}/wilayas.json'))
    wil = wj if isinstance(wj, list) else list(wj.values())[-1]
    w_by_code = {w['code']: w for w in wil}
    name2code = {}
    for w in wil:
        for k in ('name_fr', 'name_ar', 'name_en'):
            if w.get(k):
                name2code[cnorm(w[k])] = w['code']
    communes = []
    for f in ('communes_w1_w23.json', 'communes_w24_w48.json', 'communes_w49_w69.json'):
        cj = json.load(open(f'{DATA}/{f}'))
        communes += cj if isinstance(cj, list) else list(cj.values())[-1]
    # commune lookup by normalized FR name -> list of commune dicts
    c_by_name = {}
    for c in communes:
        c_by_name.setdefault(cnorm(c['name_fr']), []).append(c)
    # wilaya centroid: the commune matching the wilaya name (chief town) when present,
    # else the mean of the wilaya's commune coordinates — always defined.
    w_centroid = {}
    by_wcode = {}
    for c in communes:
        by_wcode.setdefault(c['wilaya_code'], []).append(c)
    for code, w in w_by_code.items():
        seat = next((c for c in c_by_name.get(cnorm(w['name_fr']), [])
                     if c['wilaya_code'] == code), None)
        if seat:
            w_centroid[code] = (seat['latitude'], seat['longitude'])
        elif by_wcode.get(code):
            pts = by_wcode[code]
            w_centroid[code] = (sum(c['latitude'] for c in pts) / len(pts),
                                sum(c['longitude'] for c in pts) / len(pts))
    return name2code, w_by_code, c_by_name, w_centroid, communes

def build():
    recs = parse_2026(f'{HERE}/mip-fabrication.txt')
    geo23 = parse_2023_geo(f'{HERE}/mip-fabrication-2023.txt')
    name2code, w_by_code, c_by_name, w_centroid, _ = load_gaz()
    wnames = sorted(name2code.keys(), key=len, reverse=True)
    # commune names length >=5, multi-token-first, to avoid generic false hits
    cnames = sorted([n for n in c_by_name if len(n) >= 5],
                    key=lambda n: (n.count(' '), len(n)), reverse=True)

    def _pad(text):  # normalized + padded — same cnorm used to key the gazetteer
        return ' ' + cnorm(text) + ' '

    def find_commune(text, wilaya_hint=None):
        p = _pad(text)
        for cn in cnames:
            if ' ' + cn + ' ' in p:
                cands = c_by_name[cn]
                c = next((x for x in cands if x['wilaya_code'] == wilaya_hint), cands[0])
                return c
        return None

    def find_wilaya(text):
        p = _pad(text)
        for wn in wnames:
            if ' ' + wn + ' ' in p:
                return name2code[wn]
        for adj, wn in ADJ.items():  # Constantinoise -> Constantine, etc.
            if adj in p:
                return name2code.get(cnorm(wn))
        return None

    def commune_by(cn, wc):  # named commune within a wilaya -> its dict, or None
        cc = c_by_name.get(cnorm(cn), []) if cn else []
        return next((x for x in cc if x['wilaya_code'] == wc), cc[0] if cc else None)

    out, stats = [], {'commune_centroid': 0, 'wilaya_centroid': 0, 'none': 0}
    src_stats = {'join2023': 0, 'commune_token': 0, 'wilaya_token': 0, 'manual': 0, 'unresolved': 0}
    unresolved = []
    seq = {}
    for r in recs:
        if len(re.sub(r'[^A-Za-z]', '', r['operator'])) < 4:  # guard against stray fragments
            continue
        wcode = ccode = clat = clng = None
        commune = None
        prov = 'mip'
        c = None
        raw = deaccent(r['operator']).upper()  # punctuation kept for \b needle matching
        # 0) verified research overrides (word-boundary needle) — win over the stale 2023 list
        for needle, wn, cn in OVERRIDES:
            if re.search(r'\b' + re.escape(needle) + r'\b', raw):
                wcode = name2code.get(cnorm(wn))
                if wcode:
                    c = commune_by(cn, wcode); prov = 'mip+research'; src_stats['manual'] += 1
                break
        # A place token IN the operator name is ground truth for THIS site — it must beat
        # the fuzzy 2023 name-join, which otherwise cross-matches multi-site firms (every
        # "SAIDAL <city>" collapsing onto the first Saidal row). So: name tokens first.
        # 1) commune token in the operator name
        if wcode is None:
            c = find_commune(r['operator'])
            if c:
                wcode = c['wilaya_code']; src_stats['commune_token'] += 1; prov = 'mip'
        # 2) wilaya token in the operator name
        if wcode is None:
            wcode = find_wilaya(r['operator'])
            if wcode:
                c = None; src_stats['wilaya_token'] += 1; prov = 'mip'
        # 3) 2023 wilaya-column join (fuzzy — last resort, name has no place signal)
        if wcode is None:
            place = match_2023(r['operator'], geo23)
            if place:
                wcode = find_wilaya(place)
                if wcode:
                    c = find_commune(place, wcode)
                    src_stats['join2023'] += 1; prov = 'mip+2023'
        if wcode is None:
            src_stats['unresolved'] += 1
            unresolved.append(r['operator'][:56])
            continue  # cannot ship without a wilaya (validator requires it)

        # resolve commune + centroid
        if c and isinstance(c, dict):
            commune, ccode = c['name_fr'], c['code_commune']
            clat, clng = c['latitude'], c['longitude']
            gp = 'commune_centroid'
        else:
            clat, clng = w_centroid.get(wcode, (None, None))
            gp = 'wilaya_centroid'
        if clat is None:  # no usable centroid -> can't ship a mappable record (validator requires coords)
            src_stats['unresolved'] += 1
            unresolved.append(r['operator'][:56])
            continue
        stats[gp] += 1
        w = w_by_code[wcode]
        lf, la = NATURE_LABEL[r['nature']]
        seq[wcode] = seq.get(wcode, 0) + 1
        rid = f"{wcode:02d}-{r['nature']}-{seq[wcode]:02d}"
        out.append({
            'id': rid,
            'name': r['operator'],
            'operateur': r['operator'],
            'role': 'fabricant',
            'nature': r['nature'],
            'nature_label_fr': lf, 'nature_label_ar': la,
            'wilaya': w['name_fr'], 'wilaya_ar': w['name_ar'], 'wilaya_code': wcode,
            'commune': commune,
            'commune_code': ccode,
            'lat': clat, 'lng': clng,
            'source': prov, 'geo_precision': gp,
            'slug': slugify(r['operator']),
        })

    print('parsed:', len(recs), '| shipped:', len(out))
    print('by source:', src_stats)
    print('by geo_precision:', stats)
    if unresolved:
        print('UNRESOLVED (dropped):', len(unresolved))
        for u in unresolved:
            print('   -', u)
    if '--report' in sys.argv:
        return
    # ---- write package ----
    os.makedirs(OUT + '/csv', exist_ok=True)
    os.makedirs(OUT + '/geojson', exist_ok=True)
    out.sort(key=lambda r: (r['wilaya_code'], r['nature'], r['name']))
    # renumber ids after sort for stability
    seq = {}
    for r in out:
        seq[(r['wilaya_code'], r['nature'])] = seq.get((r['wilaya_code'], r['nature']), 0) + 1
        r['id'] = f"{r['wilaya_code']:02d}-{r['nature']}-{seq[(r['wilaya_code'], r['nature'])]:02d}"
    json.dump(out, open(f'{OUT}/industrie-pharmaceutique.json', 'w'), ensure_ascii=False, indent=2)

    by_nature, by_wilaya = {}, set()
    for r in out:
        by_nature[r['nature']] = by_nature.get(r['nature'], 0) + 1
        by_wilaya.add(r['wilaya_code'])
    meta = {
        'source': "Ministère de l'Industrie Pharmaceutique (MIP) — official list of "
                  "approved pharmaceutical manufacturing establishments (établissements "
                  "pharmaceutiques de fabrication), geocoded against the geoalgeria commune set",
        'origin': 'https://miph.gov.dz/fr/etablissements-pharmaceutiques/',
        'license': 'MIP register: factual public-sector listing. See README for attribution.',
        'industrie-pharmaceutique': len(out),
        'by_nature': by_nature,
        'by_role': {'fabricant': len(out)},
        'by_geo_precision': stats,
        'wilayas_covered': len(by_wilaya),
        'geocoded': sum(1 for r in out if r['lat'] is not None),
        'linkage_note': "Operator names + PP/DM nature are from the current MIP fabrication "
                        "register (updated 2026-06-28), which carries no coordinates. Wilaya/commune "
                        "are resolved from the 2023 MIP list's wilaya column, a place token in the "
                        "operator name, or a per-company research pass (company sites, the CACI/El "
                        "Mouchir directory, press) for makers absent from the 2023 list — never "
                        "guessed. Coordinates are the commune centroid, or the wilaya centroid where "
                        "only the wilaya is known (see geo_precision).",
        'coverage_note': f"Approved pharmaceutical MANUFACTURERS only (fabrication agrément). "
                         f"{len(out)} of the ~186 establishments on the register are geocoded here; the "
                         f"rest are contract manufacturers listed as 'sous-traitance' (no own site) or "
                         f"a few very small device makers with no locatable address. Importers, "
                         f"wholesalers, exploitation and promotion are separate MIP registers, not "
                         f"included in this manufacturers layer.",
        'generated_at': '2026-07-05',
    }
    json.dump(meta, open(f'{OUT}/metadata.json', 'w'), ensure_ascii=False, indent=2)

    cols = ['id', 'name', 'operateur', 'role', 'nature', 'nature_label_fr', 'nature_label_ar',
            'wilaya', 'wilaya_ar', 'wilaya_code', 'commune', 'commune_code', 'lat', 'lng',
            'source', 'geo_precision', 'slug']
    def cell(v):
        if v is None:
            return ''
        s = str(v)
        return '"' + s.replace('"', '""') + '"' if any(ch in s for ch in ',"\n') else s
    with open(f'{OUT}/csv/industrie-pharmaceutique.csv', 'w', encoding='utf-8') as f:
        f.write(','.join(cols) + '\n')
        for r in out:
            f.write(','.join(cell(r[c]) for c in cols) + '\n')

    feats = [{
        'type': 'Feature',
        'geometry': {'type': 'Point', 'coordinates': [r['lng'], r['lat']]},
        'properties': {k: r[k] for k in ('id', 'name', 'role', 'nature', 'wilaya', 'wilaya_code', 'commune', 'geo_precision')},
    } for r in out if r['lat'] is not None]
    json.dump({'type': 'FeatureCollection', 'features': feats},
              open(f'{OUT}/geojson/industrie-pharmaceutique.geojson', 'w'), ensure_ascii=False, indent=2)
    print(f'wrote {len(out)} records, {len(feats)} geojson features, {len(by_wilaya)} wilayas')

if __name__ == '__main__':
    build()
