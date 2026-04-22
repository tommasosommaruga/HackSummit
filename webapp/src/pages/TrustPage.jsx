import { useState, useCallback } from 'react'
import ScoreRing from '../components/ScoreRing.jsx'
import MineBreakdown from '../components/MineBreakdown.jsx'
import FlagList from '../components/FlagList.jsx'
import Timeline from '../components/Timeline.jsx'
import CIChart from '../components/CIChart.jsx'
import { computeTrustScore, getVerdict, getFlags } from '../lib/provenance.js'
import { PRODUCTS } from '../data/mines.js'
import './TrustPage.css'

function simulate(query) {
  const yearMatch = query.match(/20(1[89]|2[0-5])/)
  const year = yearMatch ? parseInt(yearMatch[0]) : 2024
  return computeTrustScore(year)
}

export default function TrustPage({ onGoMap }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [productName, setProductName] = useState('')

  const handleSearch = useCallback((q) => {
    const term = q || query
    if (!term.trim()) return
    setProductName(term)
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      setResult(simulate(term))
      setLoading(false)
    }, 900)
  }, [query])

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch() }
  const verdict = result ? getVerdict(result.trustScore) : null
  const flags = result ? getFlags(result) : []

  return (
    <div className="trust-page">
      <div className="trust-inner">
        <section className="trust-hero">
          <div className="trust-hero-label">PROVENANCE INTELLIGENCE ENGINE</div>
          <h1 className="trust-hero-title">Trace the <em>real</em> source<br />of your battery</h1>
          <p className="trust-hero-sub">Enter a product, EV model, or device. We estimate the probability its rare-earth and lithium content is ethically sourced — using Bayesian inference across 13 risk signals.</p>

          <div className="trust-search">
            <input
              type="text"
              placeholder="Tesla Model 3 2024 · iPhone 16 · MacBook Pro · BYD Seal…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="trust-input"
            />
            <button className="trust-btn" onClick={() => handleSearch()} disabled={loading}>
              {loading ? 'Tracing…' : 'Trace →'}
            </button>
          </div>

          <div className="trust-quick">
            {PRODUCTS.map(p => (
              <button key={p.label} className="trust-chip" onClick={() => { setQuery(p.label); handleSearch(p.label) }}>
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {loading && (
          <div className="trust-loading">
            <div className="trust-spinner" />
            Tracing supply chain for <strong>"{productName}"</strong>…
          </div>
        )}

        {!loading && !result && (
          <div className="trust-empty">
            <div className="trust-empty-icon">◎</div>
            <div className="trust-empty-title">Search a product to begin</div>
            <div className="trust-empty-sub">Or explore the full supply chain on the <button className="trust-chip" onClick={onGoMap}>⛏ Map</button></div>
          </div>
        )}

        {!loading && result && (
          <div className="trust-results">
            <div className="trust-score-card">
              <ScoreRing score={result.trustScore} />
              <div className="trust-score-info">
                <h2 className="trust-product-name">{productName}</h2>
                <div className={`trust-verdict ${verdict.cls}`}>{verdict.icon} {verdict.label}</div>
                <div className="trust-meta-row">
                  {[
                    ['Manufacture Year', result.manufactureYear],
                    ['Ore Source Year', `~${result.sourceYear}`],
                    ['P(High-Risk)', `${Math.round(result.pHighRisk * 100)}%`],
                    ['95% CI', `${Math.round(result.ci.p5 * 100)}%–${Math.round(result.ci.p95 * 100)}%`],
                  ].map(([label, val]) => (
                    <div key={label} className="trust-meta-item">
                      <div className="trust-meta-label">{label}</div>
                      <div className="trust-meta-val">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Timeline manufactureYear={result.manufactureYear} sourceYear={result.sourceYear} />

            <div className="trust-grid2">
              <MineBreakdown mines={result.mines} />
              <FlagList flags={flags} />
            </div>

            <div className="trust-grid2">
              <CIChart ci={result.ci} pHighRisk={result.pHighRisk} />
              <div className="trust-panel">
                <h3>Data Sources</h3>
                {[
                  ['📊', 'UN Comtrade', 'Trade flow volumes 2018–2024'],
                  ['🛰', 'Sentinel-2 (ESA)', 'Mine activity satellite imagery'],
                  ['📄', 'USGS Minerals Yearbook', 'Annual production by country'],
                  ['🔎', 'Global Witness', 'ASM conflict mineral reports'],
                  ['🌐', 'OECD Due Diligence', 'Refinery compliance registry'],
                ].map(([icon, src, desc]) => (
                  <div key={src} className="trust-source-row">
                    <span>{icon}</span>
                    <div><b>{src}</b><span>{desc}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <button className="trust-map-cta" onClick={onGoMap}>
              ⛏ Explore the full supply chain on the interactive map →
            </button>

            <div className="trust-disclaimer">
              ⚠ Demo model using simulated mine output data. Trust Score = (1 − median_high_risk_share) × 100
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
