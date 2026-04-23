/**
 * Dossier text and references for REE recycling operators (project research bundle).
 * Merged at runtime with coordinates from public/data/derisk_eu_bundle.json (EU sites).
 */
export const REE_DOSSIER_BY_OPERATOR = {
  Carester: {
    details:
      'Caremag in France produces rare-earth oxides from mineral concentrates and recycled magnets, especially from end-of-life equipment. The dossier covers dismantling through purification of magnetic rare-earth oxides.',
    sourceUrl: 'https://www.carester.fr/en/',
  },
  'Heraeus Remloy': {
    details:
      "Europe's largest recycling plant for rare-earth magnets according to the dossier. Cited capacity up to 600 t/year, with a medium-term increase to 1,200 t/year.",
    sourceUrl:
      'https://www.heraeus.com/en/news-and-stories/2024-remloy-largest-recycling-plant/',
  },
  MagREEsource: {
    details:
      'Produces NdFeB magnets from recycled feedstock. Dossier: 15–20 t/year today, with a planned 500 t/year unit in 2027 and 1,000 t/year by 2031.',
    sourceUrl:
      'https://infos.ademe.fr/magazine-janvier-2026/recyclage-des-aimants-permanents-une-filiere-strategique/',
  },
  'Mkango Resources': {
    details:
      'Included as a European rare-earth actor from the research bundle. The excerpt indicates a target linked to NdPr and magnets; full public process description is not fully captured in the excerpt.',
    sourceUrl: null,
  },
  Solvay: {
    details:
      'Loop project for phosphorescent lamp powders and glass. Dossier: process can recover rare earths such as Y, Eu, Tb, Gd, La and Ce, with about 188 t/year of RE oxides at full capacity.',
    sourceUrl: 'https://www.solvay.com/sites/g/files/srpend616/files/2018-07/solvay-loop-project-fr-en.pdf',
  },
  'Hypromag (DE)': {
    details: 'User target list / current dossier (DE).',
    sourceUrl: null,
  },
  'Hypromag (UK)': {
    details: 'User target list / current dossier (UK).',
    sourceUrl: null,
  },
  REEcover: {
    details: 'User target list / current dossier.',
    sourceUrl: null,
  },
  Rocklink: {
    details: 'User target list / current dossier.',
    sourceUrl: null,
  },
  UCore: {
    details: 'REE recycling; North American site (Halifax) — not used in the EU-only proximity list.',
    sourceUrl: null,
  },
}

export function reeDossierForOperator (operator) {
  if (!operator) return { details: '', sourceUrl: null }
  if (REE_DOSSIER_BY_OPERATOR[operator]) return REE_DOSSIER_BY_OPERATOR[operator]
  const keys = Object.keys(REE_DOSSIER_BY_OPERATOR)
  const o = String(operator).trim()
  const hit = keys.find(k => k.toLowerCase() === o.toLowerCase())
  if (hit) return REE_DOSSIER_BY_OPERATOR[hit]
  return { details: '', sourceUrl: null }
}
