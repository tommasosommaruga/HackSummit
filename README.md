# REE Supply-Chain Map

Interactive map of the rare-earth supply chain: mines, operator projects,
refineries, and downstream processing — rendered with deck.gl + MapLibre.

```
data/
├── raw/                                  # source spreadsheets (checked in)
│   ├── Global_REE_combined.xlsx          # USGS occurrence DB (File 1)
│   └── Company that processes REE.xlsx   # Projects + Factory sheets (File 2)
└── processed/                            # outputs of scripts/build_supply_chain.py
    ├── nodes.json
    ├── edges.json
    ├── supply_chain.json                 # {meta, nodes, edges} — webapp-ready
    ├── abbreviations.json
    ├── references.json
    └── geocode_cache.json                # persistent Nominatim cache

scripts/
├── build_supply_chain.py                 # run this after editing raw/
└── convert_ree_xlsx.py                   # legacy — occurrences-only pipeline

webapp/
├── public/supply_chain.json              # mirror of data/processed/
└── src/
    ├── lib/
    │   ├── nodeTypeConfig.js             # icons/colors/labels per node type
    │   └── loadSupplyChain.js            # fetcher + in-browser graph index
    ├── components/SupplyChainMap.jsx     # deck.gl + MapLibre renderer
    └── pages/MapPage.jsx                 # sidebar, filters, legend, search
```

Regenerate data:

```bash
pip install openpyxl           # first time only
python3 scripts/build_supply_chain.py
```

The script fuzzy-joins File 2 projects to File 1 deposits (`SequenceMatcher`
on canonicalized names, company-weighted, threshold 0.85), geocodes anything
still missing coordinates via Nominatim (cached in `geocode_cache.json`),
and materializes edges from the Factory sheet's `Upstream`/`Downstream`
columns. Subsequent runs hit the cache — only new place names query the web.

## Unified node + edge schema

`supply_chain.json` is:

```json
{
  "meta":  { "generated_at": "...", "counts": {...}, "schema_version": 1 },
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

### Node

| field               | type           | notes |
|---------------------|----------------|-------|
| `id`                | string         | globally unique: `dep_NNN`, `proj_NNN`, `fac_NNN`, … |
| `type`              | string         | `deposit` \| `project` \| `refinery` \| `oem` \| `reseller` |
| `name`              | string         | |
| `lat`, `lng`        | number \| null | `null` iff `geocoded: false` |
| `country`           | string         | |
| `state`, `region`   | string?        | |
| `geocoded`          | bool           | `true` if renderable |
| `precision`         | string         | `exact` \| `state` \| `country` \| `joined` \| `browser_geocoded` \| `unknown` |
| `company`           | string?        | |
| `status`            | string?        | canonical text — deposits only |
| `status_code`       | string?        | numeric/alpha — projects + refineries |
| `deposit_type`      | string?        | |
| `commodities`       | string?        | comma-separated element codes |
| `ree_grade`         | string?        | |
| `resource_kt_reo`   | number?        | projects: resource size in 10⁴ t REO |
| `grade_pct`         | number?        | projects: avg. REO grade |
| `capacity`          | string?        | refineries: free-text capacity |
| `yield`             | string?        | refineries: free-text yield |
| `location_text`     | string?        | source location string (for debugging) |
| `ref_urls`          | string[]       | citation URLs |
| `joined_to`         | string?        | id of deposit a project joined to |

### Edge

| field                    | type    | notes |
|--------------------------|---------|-------|
| `id`                     | string  | |
| `from_id`, `to_id`       | string  | refer to `node.id` |
| `material`               | string? | `ore` \| `concentrate` \| `mixed_reo` \| `separated_reo` \| `metal` \| `magnet` \| `recycled` \| `unknown` |
| `volume_tons_per_year`   | number? | edge thickness ∝ log(volume) |
| `year`                   | number? | |
| `source`                 | string  | `fuzzy_join` \| `factory_upstream` \| `factory_downstream` \| `manual` |
| `evidence`               | string? | free-text trace for debugging the join |

## Extending the map

### Adding a new node type (e.g. `cathode`)

1. **Register it** in `webapp/src/lib/nodeTypeConfig.js`:

   ```js
   cathode: {
     label: 'Cathode plant',
     icon: '🧪',
     color: '#f97316',
     shape: 'icon',
     size: 22,
     statusKey: 'status_code',
     statuses: { '1': { label: 'Operational', color: '#22c55e' } },
   },
   ```

2. **Emit nodes of that type** with the same fields listed above, either by
   extending `scripts/build_supply_chain.py` to read a new sheet / CSV and
   append `{ type: 'cathode', … }` records, or by hand-editing
   `data/processed/supply_chain.json`.

3. The legend, filter toggles, and rendering all pick it up automatically.

### Adding edges manually

Append to `supply_chain.json`:

```json
{ "id": "edge_manual_1",
  "from_id": "proj_4",
  "to_id":   "fac_12",
  "material": "concentrate",
  "volume_tons_per_year": 20000,
  "year": 2024,
  "source": "manual" }
```

Both endpoints must already exist in `nodes`. The map rerenders on reload.

### Adding volume data

Set `volume_tons_per_year` on any edge. ArcLayer width scales as
`max(1, min(6, log10(volume + 1) * 0.8))`; null volumes render at default
width.

## Tech stack

React · Vite · deck.gl (`ScatterplotLayer`, `IconLayer`, `ArcLayer`,
`TextLayer`) · MapLibre GL JS (raster base layer) · Supercluster (deposit
clustering at low zoom) · Fuse.js (fuzzy search).

Node rendering is WebGL end-to-end — no DOM markers — so the current 3,100+
points run at 60 fps and the design scales to the stated ~10k nodes / ~5k
edges target.
