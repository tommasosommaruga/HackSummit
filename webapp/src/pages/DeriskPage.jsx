import { useEffect, useMemo, useState } from 'react'
import { computeEntityScore } from '../data/scoring.js'
import { DERISK_COMPANIES, findDeriskCompanyMatches } from '../data/deriskCompanies.js'
import { reeDossierForOperator } from '../data/reeRecyclingDossier.js'
import { computeDeriskFromDistance, nearestKm, sortFacilitiesByDistance } from '../lib/deriskScore.js'
import './MapPage.css'
import './DeriskPage.css'

const BUNDLE_URL = '/data/derisk_eu_bundle.json'

function riskTone (score) {
  if (score >= 70) return '#f87171'
  if (score >= 50) return '#fb923c'
  if (score >= 35) return '#fbbf24'
  return '#4ade80'
}

export default function DeriskPage () {
  const [phase, setPhase] = useState('loading')
  const [err, setErr] = useState(null)
  const [bundle, setBundle] = useState(null)
  const [q, setQ] = useState('')
  const [company, setCompany] = useState(null)
  const [showReeOptions, setShowReeOptions] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(BUNDLE_URL)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = await r.json()
        if (cancelled) return
        setBundle(d)
        setPhase('ready')
      } catch (e) {
        if (!cancelled) {
          setErr(e.message || String(e))
          setPhase('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const ree = bundle?.reeEuFacilities ?? []

  const companyMatches = useMemo(
    () => (q.trim() ? findDeriskCompanyMatches(q).slice(0, 20) : []),
    [q],
  )

  const riskScore = useMemo(() => {
    if (!company) return null
    return computeEntityScore(company.signalPreset)
  }, [company])

  const deriskSection = useMemo(() => {
    if (!company || !showReeOptions || !ree.length || riskScore === null) return null
    const d = nearestKm(ree, company.lon, company.lat)
    if (d == null) return null
    const { deriskIndex, accessScore } = computeDeriskFromDistance(riskScore, d)
    const ranked = sortFacilitiesByDistance(ree, company.lon, company.lat).map(f => {
      const dossier = reeDossierForOperator(f.operator)
      return { ...f, dossier }
    })
    return { nearestKm: d, deriskIndex, accessScore, ranked }
  }, [company, showReeOptions, ree, riskScore])

  const onPickCompany = (c) => {
    setCompany(c)
    setQ(c.name)
    setShowReeOptions(false)
  }

  const onQueryChange = (e) => {
    setQ(e.target.value)
    setCompany(null)
    setShowReeOptions(false)
  }

  if (phase === 'loading') {
    return (
      <div className="page-v2 derisk-page">
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title">Supply-chain derisk</div>
              <div className="topbar-sub">Preparing the European REE map…</div>
            </div>
          </div>
        </header>
        <div className="page-loading" style={{ flex: 1 }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="page-v2 derisk-page">
        <div className="derisk-center">
          <p className="derisk-err">Could not load the REE facility list: {err}</p>
          <p className="derisk-foot">The REE list may need to be refreshed from the project data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-v2 derisk-page">
      <header className="topbar">
        <div className="topbar-left">
          <div>
            <div className="topbar-title">Supply-chain derisk</div>
            <div className="topbar-sub">
              Pick a major EU industrial company, see how its
              {' '}
              <strong>supply-chain risk</strong>
              {' '}
              scores, then open
              {' '}
              <strong>REE recycling options</strong>
              {' '}
              to see which European rare-earth recyclers are closest to its headquarters — the same
              risk engine as Risk Scoring, plus distance to real REE capacity.
            </div>
          </div>
        </div>
      </header>

      <div className="derisk-body">
        <section className="derisk-card derisk-search-card">
          <h2 className="derisk-h2">Search a company</h2>
          <p className="derisk-lead">
            Try
            {' '}
            <span className="mono">BMW</span>
            ,
            {' '}
            <span className="mono">ASML</span>
            , or
            {' '}
            <span className="mono">Renault</span>
            . Each profile uses the full OECD-style signal set (child & forced labour, trade & docs, ESG) — the score updates from that model, not a hand-picked number.
          </p>
          <div className="derisk-search-wrap">
            <input
              type="search"
              className="derisk-input"
              placeholder="Company name (e.g. BMW, ASML, Renault…)"
              value={q}
              onChange={onQueryChange}
              aria-label="Search company"
            />
            {q.trim() && companyMatches.length > 0 && (
              <ul className="derisk-suggest" role="listbox">
                {companyMatches.map(c => (
                  <li key={c.id} role="option">
                    <button
                      type="button"
                      className="derisk-suggest-btn"
                      onClick={() => onPickCompany(c)}
                    >
                      {c.name}
                      {' '}
                      <span className="derisk-suggest-meta">
                        ·
                        {c.city}
                        ,
                        {' '}
                        {c.country}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {q.trim() && companyMatches.length === 0 && (
            <p className="derisk-nohit">No match — try another name from the list (e.g. automotive, electronics OEMs).</p>
          )}
        </section>

        {company && riskScore !== null && (
          <section className="derisk-card">
            <h2 className="derisk-h2">Company profile</h2>
            <p className="derisk-sel-pick">
              <strong>{company.name}</strong>
              <br />
              <span className="derisk-dim">
                {company.city}
                {' '}
                ·
                {company.country}
                {' '}
                ·
                {company.industry}
              </span>
            </p>
            <p className="derisk-details">{company.details}</p>

            <div className="derisk-risk-block">
              <div className="derisk-metric-k">Composite supply-chain risk</div>
              <div
                className="derisk-risk-big mono"
                style={{ color: riskTone(riskScore) }}
              >
                {riskScore}
                <span className="derisk-risk-denom">/100</span>
              </div>
              <p className="derisk-metric-s">
                Same live model as the Risk and Audit pages: every point comes from the signal engine, not a static badge.
              </p>
            </div>

            <button
              type="button"
              className="derisk-btn-primary"
              onClick={() => setShowReeOptions(v => !v)}
            >
              {showReeOptions ? 'Hide REE recycling options' : 'REE recycling & derisk (near this HQ)'}
            </button>
          </section>
        )}

        {company && showReeOptions && deriskSection && (
          <section className="derisk-card">
            <h2 className="derisk-h2">European REE recycling near {company.name}</h2>
            <p className="derisk-lead">
              {bundle?._meta?.reeRecyclingFacilitiesEurope ?? ree.length}
              {' '}
              European plants in our register that process or recycle rare earths. Straight-line distance from
              {' '}
              {company.name}
              ’s HQ — useful when you want secondary feedstock, magnet recycling, or take-back within a few hours’ drive.
            </p>

            <div className="derisk-metrics">
              <div className="derisk-metric">
                <div className="derisk-metric-k">Nearest REE recycler (EU list)</div>
                <div className="derisk-metric-v mono">
                  {Math.round(deriskSection.nearestKm)}
                  {' '}
                  km
                </div>
              </div>
              <div className="derisk-metric derisk-metric--accent">
                <div className="derisk-metric-k">Recycling derisk index</div>
                <div className="derisk-metric-v mono">
                  {deriskSection.deriskIndex}
                  /100
                </div>
                <div className="derisk-metric-s">
                  Blends your
                  {' '}
                  {riskScore}
                  /100 supply risk with how close the nearest EU recycler is. North American capacity (e.g. UCore) is outside this map on purpose.
                </div>
              </div>
            </div>

            <h3 className="derisk-h3">Full register — closest first, with notes</h3>
            <ul className="derisk-ree-rich">
              {deriskSection.ranked.map(f => (
                <li key={f.id}>
                  <div className="derisk-ree-h">
                    <span className="derisk-ree-n">{f.operator}</span>
                    <span className="mono derisk-ree-km">
                      {f._km != null ? `${Math.round(f._km)} km` : '—'}
                    </span>
                  </div>
                  <div className="derisk-dim">
                    {f.city}
                    ,
                    {f.country}
                    {' '}
                    ·
                    {f.type}
                  </div>
                  {f.dossier?.details && (
                    <p className="derisk-ree-dossier">{f.dossier.details}</p>
                  )}
                  {f.dossier?.sourceUrl && (
                    <a
                      className="derisk-ree-link"
                      href={f.dossier.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Source / reference
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {company && showReeOptions && !deriskSection && ree.length < 1 && (
          <section className="derisk-card">
            <p className="derisk-err" style={{ margin: 0 }}>No European REE plants are in the data yet.</p>
          </section>
        )}

        <footer className="derisk-foot">
          {bundle?._meta?.generated && (
            <p>
              REE list last built:
              {' '}
              {new Date(bundle._meta.generated).toLocaleString()}
            </p>
          )}
        </footer>
      </div>
    </div>
  )
}
