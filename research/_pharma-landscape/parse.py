#!/usr/bin/env python3
"""Parse the MIP fabrication lists and measure geo-join coverage.
Feasibility gate for @geoalgeria/industrie-pharmaceutique."""
import json, re, sys, unicodedata

HERE = __file__.rsplit('/', 1)[0]
DATA = HERE + '/../../packages/dataset/data'

NAT = {'PP DM': 'mixte', 'PP': 'pp', 'DM': 'dm'}
SECTIONS = {
    'Produit Pharmaceutiques (PP)': 'pp',
    'Production MIXTE (PP DM)': 'mixte',
    'Dispositifs médicaux (DM)': 'dm',
}

def deaccent(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))

def norm_name(s):
    s = deaccent(s).upper()
    # strip legal-form + generic tokens
    for t in ['EPE', 'SPA', 'SARL', 'EURL', 'SNC', 'SASU', 'GROUPE INDUSTRIEL',
              'LABORATOIRES', 'LABORATOIRE', 'LABO', 'PHARMACEUTIQUE', 'PHARMACEUTIQUES',
              'INDUSTRIE', 'INDUSTRIES', 'PRODUCTION', 'UNITE DE', 'SITE', 'PRODUITS']:
        s = re.sub(r'\b' + re.escape(t) + r'\b', ' ', s)
    s = re.sub(r'[^A-Z0-9 ]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def parse_2026(path):
    lines = open(path, encoding='utf-8').read().splitlines()
    section = None
    records = []
    cur = None  # record awaiting a wrapped operator name
    for ln in lines:
        t = ln.strip()
        if not t or t.startswith('Page ') or t.startswith('N°') or 'Opérateur' in t:
            continue
        if t in SECTIONS:
            section = SECTIONS[t]; cur = None; continue
        if section is None:
            continue
        # record line: N° operator... nature   |   N° nature (operator wraps next line)
        m = re.match(r'^(\d+)\s+(.*?)\s+(PP DM|PP|DM)$', t)
        if m:
            n, op, nat = m.group(1), m.group(2).strip(), NAT[m.group(3)]
            if op:
                records.append({'section': section, 'n': int(n), 'operator': op, 'nature': nat})
                cur = None
            else:  # operator on following line(s)
                cur = {'section': section, 'n': int(n), 'operator': '', 'nature': nat}
                records.append(cur)
            continue
        # continuation line (operator text for the pending record)
        if cur is not None:
            cur['operator'] = (cur['operator'] + ' ' + t).strip()
    return records

def parse_2023_geo(path):
    """name_norm -> 'Wilaya - Commune' (or 'Wilaya')."""
    geo = {}
    for ln in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'^\s*\d+\s{2,}(.+?)\s{2,}(.+?)\s{2,}Fabricant', ln)
        if not m:
            continue
        name, place = m.group(1).strip(), m.group(2).strip()
        geo[norm_name(name)] = place
    return geo

def load_gazetteer():
    wj = json.load(open(f'{DATA}/wilayas.json'))
    wil = wj if isinstance(wj, list) else list(wj.values())[-1]
    name2code = {}
    for w in wil:
        for k in ('name_fr', 'name_ar', 'name_en'):
            if w.get(k):
                name2code[deaccent(w[k]).upper()] = w['code']
    communes = []
    for f in ('communes_w1_w23.json', 'communes_w24_w48.json', 'communes_w49_w69.json'):
        cj = json.load(open(f'{DATA}/{f}'))
        communes += cj if isinstance(cj, list) else list(cj.values())[-1]
    return name2code, communes, wil

def main():
    recs = parse_2026(f'{HERE}/mip-fabrication.txt')
    geo23 = parse_2023_geo(f'{HERE}/mip-fabrication-2023.txt')
    name2code, communes, wil = load_gazetteer()
    wilaya_names = sorted(name2code.keys(), key=len, reverse=True)

    by_sec = {}
    for r in recs:
        by_sec[r['section']] = by_sec.get(r['section'], 0) + 1
    print('parsed 2026:', len(recs), 'records ->', by_sec)
    print('parsed 2023 geo entries:', len(geo23))

    def wilaya_from_place(place):
        p = deaccent(place).upper()
        for wn in wilaya_names:
            if wn in p:
                return name2code[wn]
        return None

    resolved_join = resolved_token = unresolved = 0
    samples_unres = []
    for r in recs:
        nn = norm_name(r['operator'])
        place = geo23.get(nn)
        if place is None:  # try prefix / token-subset match
            for gk, gv in geo23.items():
                if gk and (gk in nn or nn in gk):
                    place = gv; break
        wcode = wilaya_from_place(place) if place else None
        if wcode:
            resolved_join += 1; continue
        # token in the operator name itself (SAIDAL ANNABA, LINDE GAS SIDI BEL ABBES)
        wcode = wilaya_from_place(r['operator'])
        if wcode:
            resolved_token += 1
        else:
            unresolved += 1
            if len(samples_unres) < 20:
                samples_unres.append(r['operator'][:52])

    print(f'\nGEO RESOLUTION of {len(recs)} manufacturers:')
    print(f'  via 2023 wilaya-column join : {resolved_join}')
    print(f'  via place-token in name     : {resolved_token}')
    print(f'  UNRESOLVED (need manual)    : {unresolved}')
    print(f'  => resolvable now: {resolved_join+resolved_token}/{len(recs)} '
          f'({100*(resolved_join+resolved_token)//len(recs)}%)')
    print('\nunresolved samples:')
    for s in samples_unres:
        print('   -', s)

if __name__ == '__main__':
    main()
