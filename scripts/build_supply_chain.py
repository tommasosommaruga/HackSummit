"""
Build the unified REE supply-chain dataset.

Inputs  (in data/raw/):
  - Global_REE_combined.xlsx              — USGS occurrences (deposits).
  - Company that processes REE.xlsx       — "REE projects" sheet (commercial
                                            projects, 147 rows, no lat/lon)
                                            + "Factory" sheet (67 plants with
                                            Upstream/Downstream text refs).

Outputs (in data/processed/ and mirrored to webapp/public/):
  - nodes.json            — unified nodes: deposits + projects + refineries.
  - edges.json            — deposit→project (from fuzzy join) and
                            project→refinery / refinery→refinery / refinery→OEM
                            (from Factory sheet Upstream/Downstream).
  - supply_chain.json     — {nodes, edges, meta} bundle, single-fetch friendly.
  - geocode_cache.json    — persistent Nominatim cache (shared across runs).

Schema (also documented in README.md):

  NODE:
    id: str           (globally unique: dep_<ID_No>, proj_<n>, fac_<n>, …)
    type: str         ('deposit' | 'project' | 'refinery' | 'oem' | 'reseller')
    name: str
    lat, lng: float
    country: str
    state: str?
    region: str?
    geocoded: bool    (true = placed from explicit coords OR confident lookup)
    precision: str    ('exact' | 'state' | 'country' | 'joined')
    company: str?
    status: str?      (canonical textual status — source-dependent)
    status_code: str? (numeric/alpha code from File 2 / Factory sheet)
    deposit_type: str?
    commodities: str?
    ree_grade: str?
    resource_kt_reo: float?
    grade_pct: float?
    capacity: str?    (refineries — free-text from Factory sheet)
    yield: str?
    ref_urls: list[str]
    joined_to: str?   (node id this row joined to — deposit↔project linkage)

  EDGE:
    id: str
    from_id: str
    to_id: str
    material: str?    ('ore' | 'concentrate' | 'mixed_reo' | 'separated_reo' | …)
    volume_tons_per_year: float?
    year: int?
    source: str       ('fuzzy_join' | 'factory_upstream' | 'factory_downstream')
    evidence: str?    (original upstream/downstream text for debugging)
"""
from __future__ import annotations
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OCC_XLSX = ROOT / 'data' / 'raw' / 'Global_REE_combined.xlsx'
CO_XLSX  = ROOT / 'data' / 'raw' / 'Company that processes REE.xlsx'
PROC     = ROOT / 'data' / 'processed'
WEB      = ROOT / 'webapp' / 'public'
GEOCACHE = PROC / 'geocode_cache.json'


# ── Nominatim geocoder (cached, rate-limited) ─────────────────────────────────
_LAST_REQ = [0.0]
_UA = 'HackSummit-REE-Geocoder/1.0 (https://github.com/mmsellam)'


def _load_cache():
    if GEOCACHE.exists():
        return json.loads(GEOCACHE.read_text())
    return {}


def _save_cache(cache):
    GEOCACHE.parent.mkdir(parents=True, exist_ok=True)
    GEOCACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False, sort_keys=True))


_QUERIES = [0]
_HITS = [0]


def nominatim_lookup(query, cache):
    if not query:
        return None
    if query in cache:
        return cache[query]
    wait = 1.05 - (time.monotonic() - _LAST_REQ[0])
    if wait > 0:
        time.sleep(wait)
    url = ('https://nominatim.openstreetmap.org/search?'
           + urllib.parse.urlencode({'q': query, 'format': 'json', 'limit': 1}))
    req = urllib.request.Request(url, headers={'User-Agent': _UA})
    _QUERIES[0] += 1
    print(f'  [geo #{_QUERIES[0]:>4}] {query[:70]}', flush=True)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            results = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'         error: {e}', flush=True)
        cache[query] = None
        _LAST_REQ[0] = time.monotonic()
        # Flush cache periodically so progress survives crashes.
        if _QUERIES[0] % 20 == 0:
            _save_cache(cache)
        return None
    _LAST_REQ[0] = time.monotonic()
    if not results:
        cache[query] = None
        if _QUERIES[0] % 20 == 0:
            _save_cache(cache)
        return None
    try:
        coord = [float(results[0]['lat']), float(results[0]['lon'])]
    except (KeyError, ValueError):
        cache[query] = None
        return None
    cache[query] = coord
    _HITS[0] += 1
    if _QUERIES[0] % 20 == 0:
        _save_cache(cache)
    return coord


# ── Country / state centroids (offline fallback) ──────────────────────────────
# Only used when Nominatim fails. Kept short; Nominatim handles the rest.
COUNTRY_CENTROIDS = {
    'Algeria': (28.03, 1.66), 'Argentina': (-38.42, -63.62), 'Armenia': (40.07, 45.04),
    'Australia': (-25.27, 133.78), 'Bangladesh': (23.68, 90.36), 'Belarus': (53.71, 27.95),
    'Benin': (9.31, 2.32), 'Bolivia': (-16.29, -63.59), 'Brazil': (-14.24, -51.93),
    'Burundi': (-3.37, 29.92), 'Canada': (56.13, -106.35),
    'Central African Republic': (6.61, 20.94), 'Chile': (-35.68, -71.54),
    'China': (35.86, 104.20), 'Colombia': (4.57, -74.30),
    'Czech Republic': (49.82, 15.47),
    'Democratic Republic of Congo': (-4.04, 21.76),
    'Democratic Republic of the Congo': (-4.04, 21.76),
    'Zaire': (-4.04, 21.76), 'Egypt': (26.82, 30.80), 'Ethiopia': (9.14, 40.49),
    'Finland': (61.92, 25.75), 'France': (46.23, 2.21), 'Gabon': (-0.80, 11.61),
    'Germany': (51.17, 10.45), 'Greece': (39.07, 21.82), 'Greenland': (71.71, -42.60),
    'Guyana': (4.86, -58.93), 'India': (20.59, 78.96), 'Indonesia': (-0.79, 113.92),
    'Iran': (32.43, 53.69), 'Italy': (41.87, 12.57), 'Jamaica': (18.11, -77.30),
    'Japan': (36.20, 138.25), 'Kazakhstan': (48.02, 66.92), 'Kenya': (-0.02, 37.91),
    'Kyrgyzstan': (41.20, 74.77), 'Latvia': (56.88, 24.60), 'Madagascar': (-18.77, 46.87),
    'Malawi': (-13.25, 34.30), 'Malaysia': (4.21, 101.98), 'Mexico': (23.63, -102.55),
    'Mongolia': (46.86, 103.85), 'Montenegro': (42.71, 19.37), 'Mozambique': (-18.67, 35.53),
    'Myanmar': (21.91, 95.96), 'Namibia': (-22.96, 18.49), 'Nepal': (28.39, 84.12),
    'New Zealand': (-40.90, 174.89), 'Nigeria': (9.08, 8.68), 'Norway': (60.47, 8.47),
    'Paraguay': (-23.44, -58.44), 'Peru': (-9.19, -75.02), 'Romania': (45.94, 24.97),
    'Russian Federation': (61.52, 105.32), 'Russia': (61.52, 105.32),
    'Rwanda': (-1.94, 29.87), 'Saudi Arabia': (23.89, 45.08), 'Sierra Leone': (8.46, -11.78),
    'South Africa': (-30.56, 22.94), 'South Korea': (35.91, 127.77), 'Spain': (40.46, -3.75),
    'Sri Lanka': (7.87, 80.77), 'Sudan': (12.86, 30.22), 'Swaziland': (-26.52, 31.47),
    'Sweden': (60.13, 18.64), 'Taiwan': (23.70, 120.96), 'Tajikistan': (38.86, 71.28),
    'Tanzania': (-6.37, 34.89), 'Thailand': (15.87, 100.99), 'Tibet': (31.69, 88.09),
    'Tunisia': (33.89, 9.54), 'Turkey': (38.96, 35.24), 'Uganda': (1.37, 32.29),
    'Ukraine': (48.38, 31.17), 'United Arab Emirates': (23.42, 53.85),
    'United Kingdom': (55.38, -3.44), 'UK': (55.38, -3.44),
    'United States': (37.09, -95.71), 'USA': (37.09, -95.71),
    'Uzbekistan': (41.38, 64.59), 'Venezuela': (6.42, -66.59), 'Vietnam': (14.06, 108.28),
    'Zambia': (-13.13, 27.85), 'Zimbabwe': (-19.02, 29.15),
    'Estonia': (58.60, 25.01), 'Belgium': (50.50, 4.47), 'Poland': (51.92, 19.13),
    'Denmark': (56.26, 9.50), 'Netherlands': (52.13, 5.29), 'Ireland': (53.14, -7.69),
    'Hungary': (47.16, 19.50), 'Austria': (47.52, 14.55),
}


def _jitter(base, level, seed):
    """Deterministic jitter keyed by seed so points don't stack."""
    jitter = 0.25 if level == 'state' else (0.6 if level == 'joined' else 1.2)
    n = 0
    for ch in str(seed):
        n = (n * 131 + ord(ch)) & 0xffffff
    angle = (n * 137.508) * math.pi / 180.0
    r = jitter * math.sqrt(((n >> 8) & 0xff) / 255.0)
    return (base[0] + r * math.sin(angle), base[1] + r * math.cos(angle))


def resolve_coord(query_strings, country, state, seed, cache):
    """Try Nominatim for each query in order; fall back to country centroid."""
    for q in query_strings:
        if not q:
            continue
        hit = nominatim_lookup(q, cache)
        if hit:
            return (hit[0], hit[1], 'exact' if ',' in q else 'state')
    if state and country:
        hit = nominatim_lookup(f'{state}, {country}', cache)
        if hit:
            lat, lng = _jitter((hit[0], hit[1]), 'state', seed)
            return (lat, lng, 'state')
    if country and country in COUNTRY_CENTROIDS:
        lat, lng = _jitter(COUNTRY_CENTROIDS[country], 'country', seed)
        return (lat, lng, 'country')
    return None


# ── Cleaners ─────────────────────────────────────────────────────────────────
def clean(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s and s not in ('nan', 'NaN', 'None', '-') else None


def clean_status_code(v):
    """Normalize codes like '4.0' → '4' (xlsx imports numerics as floats)."""
    s = clean(v)
    if s is None:
        return None
    # Strip trailing ".0" from plain integer-as-float strings.
    if re.fullmatch(r'-?\d+\.0+', s):
        return s.split('.')[0]
    return s


def num(v):
    if v is None:
        return None
    try:
        f = float(v)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def canonical_name(s):
    if not s:
        return ''
    # Lowercase, strip punctuation, collapse whitespace, drop common qualifiers.
    s = s.lower()
    s = re.sub(r'\b(plant|mine|project|deposit|mining|field)\b', ' ', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return ' '.join(s.split()).strip()


def similar(a, b):
    a, b = canonical_name(a), canonical_name(b)
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


# ── Sheet loaders ────────────────────────────────────────────────────────────
def load_occurrences(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb['All Occurrences']
    rows = ws.iter_rows(values_only=True)
    headers = next(rows)
    idx = {h: i for i, h in enumerate(headers)}
    out = []
    for r in rows:
        out.append({
            'id_no':    clean(r[idx['ID_No']]),
            'name':     clean(r[idx['Name']]),
            'country':  clean(r[idx['Country']]),
            'state':    clean(r[idx['State_Prov']]),
            'lat':      num(r[idx['Latitude']]),
            'lng':      num(r[idx['Longitude']]),
            'dep_type': clean(r[idx['Dep_Type']]),
            'status':   clean(r[idx['Status']]),
            'p_status': clean(r[idx['P_Status']]),
            'company':  clean(r[idx['Company']]),
            'commods':  clean(r[idx['Commods']]),
            'ree':      clean(r[idx['REE']]),
            'region':   clean(r[idx['Region']]),
        })
    return out


def load_projects(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb['REE projects']
    rows = list(ws.iter_rows(values_only=True))
    # rows[0] is the supplementary-table title; rows[1] are the real headers.
    headers = rows[1]
    idx = {h: i for i, h in enumerate(headers)}
    status_col = next(h for h in headers if h and 'Status (2022)' in str(h))
    resource_col = next(h for h in headers if h and 'Resource' in str(h))
    grade_col = next(h for h in headers if h and h.strip() == 'Grade (wt. %)')
    out = []
    for r in rows[2:]:
        pno = clean(r[idx['Project No.']])
        if not pno:
            continue
        out.append({
            'pno':          pno,
            'company':      clean(r[idx['Company Name']]),
            'name':         clean(r[idx['Project Name']]),
            'location':     clean(r[idx['Location']]),
            'continent':    clean(r[idx['Continent']]),
            'status_code':  clean_status_code(r[idx[status_col]]),
            'dep_type':     clean(r[idx['Deposit type']]),
            'resource':     num(r[idx[resource_col]]),
            'grade':        num(r[idx[grade_col]]),
            'ref_project':  clean(r[idx['Project and status Ref.']])
                            if 'Project and status Ref.' in idx else None,
        })
    return out


def load_factories(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb['Factory']
    rows = list(ws.iter_rows(values_only=True))
    headers = rows[0]
    idx = {h: i for i, h in enumerate(headers)}
    status_col = next(h for h in headers if h and 'Status (2022)' in str(h))
    out = []
    last_company = None
    for r in rows[1:]:
        no = clean(r[idx['No.']])
        if not no:
            continue
        co = clean(r[idx['Company']])
        if co:
            last_company = co
        else:
            co = last_company
        out.append({
            'no':          no,
            'company':     co,
            'name':        clean(r[idx['Project']]),
            'location':    clean(r[idx['Location']]),
            'status_code': clean_status_code(r[idx[status_col]]),
            'capacity':    clean(r[idx['Capacity']]),
            'yield':       clean(r[idx['Yield']]),
            'upstream':    clean(r[idx['Upstream']]),
            'downstream':  clean(r[idx['Downstream']]),
            'ref_status':  clean(r[idx['Status Ref.']]),
            'ref_capacity':clean(r[idx['Capacity Ref.']]),
        })
    return out


# ── Build unified nodes ──────────────────────────────────────────────────────
def deposit_country(country):
    """Normalize odd country strings (USGS has 'Russian Federation(?)' etc.)."""
    if not country:
        return None
    return country.rstrip(' (?)').strip()


def country_from_location(loc):
    """Best-effort country extraction from free-text location."""
    if not loc:
        return None
    tail = loc.split(',')[-1].strip()
    return tail or None


def build_deposit_nodes(occurrences, cache):
    nodes = []
    for o in occurrences:
        seed = o['id_no'] or o['name'] or ''
        if o['lat'] is not None and o['lng'] is not None:
            lat, lng, precision = o['lat'], o['lng'], 'exact'
        else:
            # Deposit names are usually mine / site names — not place names — so
            # Nominatim won't resolve them. Skip the name query and go straight
            # to state → country fallback. That's the 820-row path; cuts ~2000
            # Nominatim requests off the end of each run.
            resolved = resolve_coord(
                [], deposit_country(o['country']), o['state'], seed, cache,
            )
            if not resolved:
                continue
            lat, lng, precision = resolved
        nodes.append({
            'id':           f'dep_{o["id_no"]}',
            'type':         'deposit',
            'name':         o['name'] or f'Occurrence #{o["id_no"]}',
            'lat':          round(lat, 5),
            'lng':          round(lng, 5),
            'country':      deposit_country(o['country']),
            'state':        o['state'],
            'region':       o['region'],
            'precision':    precision,
            'geocoded':     True,
            'company':      o['company'],
            'status':       o['status'],
            'deposit_type': o['dep_type'],
            'commodities':  o['commods'],
            'ree_grade':    o['ree'],
            'ref_urls':     [],
        })
    return nodes


def build_project_nodes(projects, deposit_nodes, cache):
    """Projects get coords from (a) fuzzy join to a deposit, or (b) Nominatim."""
    nodes = []
    edges = []
    # Index deposits for fast name+company matching.
    deposits_by_country = {}
    for d in deposit_nodes:
        deposits_by_country.setdefault(d['country'], []).append(d)

    for p in projects:
        country = country_from_location(p['location']) or p['continent']
        # Normalize common aliases.
        if country and country.lower() in ('usa', 'u.s.a.', 'united states of america'):
            country = 'United States'
        if country and country.lower() in ('uk', 'great britain'):
            country = 'United Kingdom'

        # (1) Fuzzy-join to a deposit.
        candidates = deposits_by_country.get(country, []) or deposit_nodes
        best, best_score = None, 0.0
        for d in candidates:
            s_name = similar(p['name'], d['name'])
            s_co   = similar(p['company'] or '', d['company'] or '') if d.get('company') else 0
            # Heavily weight name; company is often missing on deposits.
            score = 0.9 * s_name + 0.1 * s_co
            if score > best_score:
                best_score, best = score, d

        joined_id = None
        lat = lng = precision = None
        if best and best_score >= 0.85:
            joined_id = best['id']
            # Offset projects slightly from their parent deposit so edges draw.
            lat, lng = _jitter((best['lat'], best['lng']), 'joined', p['pno'])
            precision = 'joined'

        # (2) Nominatim fallback on the free-text location.
        if lat is None:
            resolved = resolve_coord(
                [p['location'], f'{p["name"]}, {country}' if p['name'] and country else None],
                country, None, p['pno'], cache,
            )
            if resolved:
                lat, lng, precision = resolved

        if lat is None:
            # keep the record but flag it; will not be rendered
            nodes.append({
                'id':           f'proj_{p["pno"]}',
                'type':         'project',
                'name':         p['name'],
                'lat':          None,
                'lng':          None,
                'country':      country,
                'geocoded':     False,
                'precision':    'unknown',
                'company':      p['company'],
                'status_code':  p['status_code'],
                'deposit_type': p['dep_type'],
                'resource_kt_reo': p['resource'],
                'grade_pct':    p['grade'],
                'location_text': p['location'],
                'ref_urls':     [p['ref_project']] if p.get('ref_project') else [],
                'joined_to':    None,
            })
            continue

        proj = {
            'id':           f'proj_{p["pno"]}',
            'type':         'project',
            'name':         p['name'],
            'lat':          round(lat, 5),
            'lng':          round(lng, 5),
            'country':      country,
            'region':       p['continent'],
            'geocoded':     True,
            'precision':    precision,
            'company':      p['company'],
            'status_code':  p['status_code'],
            'deposit_type': p['dep_type'],
            'resource_kt_reo': p['resource'],
            'grade_pct':    p['grade'],
            'location_text': p['location'],
            'ref_urls':     [p['ref_project']] if p.get('ref_project') else [],
            'joined_to':    joined_id,
        }
        nodes.append(proj)

        if joined_id:
            edges.append({
                'id':       f'edge_join_{p["pno"]}',
                'from_id':  joined_id,
                'to_id':    proj['id'],
                'material': 'ore',
                'volume_tons_per_year': None,
                'year':     2022,
                'source':   'fuzzy_join',
                'evidence': f'{p["company"]} / {p["name"]} ≈ {best["name"]} (score {best_score:.2f})',
            })
    return nodes, edges


def build_factory_nodes(factories, existing_nodes, cache):
    """Factory rows → refinery nodes.

    Coord resolution order:
      1. Upstream text fuzzy-matches an existing node (deposit/project) → adopt
         that node's coords with small jitter. (Mount Weld Plant → Mount Weld
         mine, which Nominatim otherwise resolves to a Tasmania mountain.)
      2. Nominatim on the free-text location string.
      3. Nominatim on "<plant name>, <country>".
    """
    # Build a fast name→node lookup for upstream-text matching.
    name_idx = []
    for n in existing_nodes:
        if n.get('name'):
            name_idx.append(n)

    nodes = []
    for f in factories:
        location = f['location']
        seed = f['no']
        lat = lng = precision = None

        # (1) Try to co-locate with upstream if its text matches a known node.
        up = f.get('upstream')
        if up:
            best, best_score = None, 0.0
            # Only consider the first comma-separated piece (most specific).
            primary = re.split(r',| and ', up)[0].strip()
            if primary:
                for n in name_idx:
                    s = similar(primary, n['name'])
                    if s > best_score:
                        best_score, best = s, n
            if best and best_score >= 0.85 and best.get('lat') is not None:
                lat, lng = _jitter((best['lat'], best['lng']), 'joined', seed)
                precision = 'joined'

        # (2) Fall back to Nominatim on location / name.
        if lat is None:
            resolved = resolve_coord(
                [location, f'{f["name"]}, {country_from_location(location)}' if f['name'] else None],
                country_from_location(location), None, seed, cache,
            )
            if resolved:
                lat, lng, precision = resolved

        if lat is None:
            nodes.append({
                'id':       f'fac_{f["no"]}',
                'type':     'refinery',
                'name':     f['name'],
                'lat': None, 'lng': None,
                'country':  country_from_location(location),
                'geocoded': False,
                'precision':'unknown',
                'company':  f['company'],
                'status_code': f['status_code'],
                'capacity': f['capacity'],
                'yield':    f['yield'],
                'location_text': location,
                '_upstream_text':   f['upstream'],
                '_downstream_text': f['downstream'],
                'ref_urls': [u for u in (f['ref_status'], f['ref_capacity']) if u],
            })
            continue
        nodes.append({
            'id':       f'fac_{f["no"]}',
            'type':     'refinery',
            'name':     f['name'],
            'lat':      round(lat, 5),
            'lng':      round(lng, 5),
            'country':  country_from_location(location),
            'geocoded': True,
            'precision':precision,
            'company':  f['company'],
            'status_code': f['status_code'],
            'capacity': f['capacity'],
            'yield':    f['yield'],
            'location_text': location,
            '_upstream_text':   f['upstream'],
            '_downstream_text': f['downstream'],
            'ref_urls': [u for u in (f['ref_status'], f['ref_capacity']) if u],
        })
    return nodes


# ── Edges from Factory sheet Upstream/Downstream text ────────────────────────
def resolve_node_ref(text, all_nodes):
    """Fuzzy-match a free-text upstream/downstream value to any node name."""
    if not text or text.lower() in ('none', 'nan', '-', ''):
        return None
    # Downstream often lists multiple destinations as a comma-separated string —
    # split on commas but only if the whole string doesn't resemble a place name
    # with a trailing region. We handle each piece.
    best, best_score = None, 0.0
    for n in all_nodes:
        s = similar(text, n['name'])
        if s > best_score:
            best_score, best = s, n
    return best['id'] if best and best_score >= 0.78 else None


def extract_factory_edges(factory_nodes, all_nodes):
    edges = []
    eid = 0
    for f in factory_nodes:
        up = f.get('_upstream_text')
        dn = f.get('_downstream_text')
        if up:
            for piece in re.split(r',| and ', up):
                piece = piece.strip()
                ref = resolve_node_ref(piece, all_nodes)
                if ref and ref != f['id']:
                    eid += 1
                    edges.append({
                        'id':       f'edge_up_{eid}',
                        'from_id':  ref,
                        'to_id':    f['id'],
                        'material': 'ore' if ref.startswith('dep_') else 'concentrate',
                        'volume_tons_per_year': None, 'year': 2022,
                        'source':   'factory_upstream', 'evidence': piece,
                    })
        if dn:
            for piece in re.split(r',| and ', dn):
                piece = piece.strip()
                ref = resolve_node_ref(piece, all_nodes)
                if ref and ref != f['id']:
                    eid += 1
                    edges.append({
                        'id':       f'edge_dn_{eid}',
                        'from_id':  f['id'],
                        'to_id':    ref,
                        'material': 'separated_reo',
                        'volume_tons_per_year': None, 'year': 2022,
                        'source':   'factory_downstream', 'evidence': piece,
                    })
    return edges


def run():
    PROC.mkdir(parents=True, exist_ok=True)
    WEB.mkdir(parents=True, exist_ok=True)
    cache = _load_cache()
    cache_start = len(cache)

    print(f'Loading occurrences …')
    occs = load_occurrences(OCC_XLSX)
    print(f'Loading projects …')
    projects = load_projects(CO_XLSX)
    print(f'Loading factories …')
    factories = load_factories(CO_XLSX)
    print(f'  occurrences: {len(occs)}')
    print(f'  projects   : {len(projects)}')
    print(f'  factories  : {len(factories)}')

    deposit_nodes = build_deposit_nodes(occs, cache)
    project_nodes, join_edges = build_project_nodes(projects, deposit_nodes, cache)
    factory_nodes = build_factory_nodes(factories, deposit_nodes + project_nodes, cache)

    all_nodes = deposit_nodes + project_nodes + factory_nodes
    rendered_nodes = [n for n in all_nodes if n.get('geocoded')]

    factory_edges = extract_factory_edges(factory_nodes, all_nodes)
    edges = join_edges + factory_edges

    # Strip internal underscore-prefixed fields before serializing.
    for n in all_nodes:
        for k in list(n):
            if k.startswith('_'):
                n.pop(k)

    meta = {
        'generated_at':   time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'counts': {
            'deposits':   len(deposit_nodes),
            'projects':   len(project_nodes),
            'refineries': len(factory_nodes),
            'renderable': len(rendered_nodes),
            'edges':      len(edges),
            'join_edges': len(join_edges),
            'factory_edges': len(factory_edges),
        },
        'schema_version': 1,
    }

    (PROC / 'nodes.json').write_text(json.dumps(all_nodes, separators=(',', ':'), ensure_ascii=False))
    (PROC / 'edges.json').write_text(json.dumps(edges,     separators=(',', ':'), ensure_ascii=False))
    bundle = {'meta': meta, 'nodes': all_nodes, 'edges': edges}
    (PROC / 'supply_chain.json').write_text(json.dumps(bundle, separators=(',', ':'), ensure_ascii=False))
    (WEB  / 'supply_chain.json').write_text(json.dumps(bundle, separators=(',', ':'), ensure_ascii=False))

    _save_cache(cache)
    print('\n── Counts ──')
    for k, v in meta['counts'].items():
        print(f'  {k:14s}: {v:>5}')
    print(f'  geocode cache : {len(cache)} entries (+{len(cache) - cache_start})')
    print('\n── Files ──')
    print(f'  {PROC / "nodes.json"}            ({(PROC / "nodes.json").stat().st_size:,} B)')
    print(f'  {PROC / "edges.json"}            ({(PROC / "edges.json").stat().st_size:,} B)')
    print(f'  {PROC / "supply_chain.json"}     ({(PROC / "supply_chain.json").stat().st_size:,} B)')
    print(f'  {WEB  / "supply_chain.json"}     (mirror for the webapp)')


if __name__ == '__main__':
    run()
