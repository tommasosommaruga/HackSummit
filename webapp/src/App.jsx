import { useState, useCallback } from 'react'
import ScoreRing from './components/ScoreRing.jsx'
import MineBreakdown from './components/MineBreakdown.jsx'
import FlagList from './components/FlagList.jsx'
import Timeline from './components/Timeline.jsx'
import CIChart from './components/CIChart.jsx'
import MapPage from './pages/MapPage.jsx'
import { computeTrustScore, getVerdict, getFlags } from './lib/provenance.js'
import { PRODUCTS } from './data/mines.js'

function simulate(query) {
  const yearMatch = query.match(/20(1[89]|2[0-5])/)
  const year = yearMatch ? parseInt(yearMatch[0]) : 2024
  return computeTrustScore(year)
}

export default function App() {
  const [page, setPage] = useState('home')  // 'home' | 'map'
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

  if (page === 'map') return <MapPage onBack={() => setPage('home')} />

  return (
    <div className="app">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">Lithium<span>Truth</span></div>
        <button
          className="btn"
          style={{ marginLeft: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}
          onClick={() => setPage('map')}
        >
          🌍 Supply Chain Map
        </button>
        <span className="nav-tag">HACKATHON DEMO · Ghost in the Machine</span>
      </nav>

      {/* Search */}
      <section className="search-section">
        <h1>Trace the <em>real</em> source of your battery</h1>
        <p>Enter a product name, EV model, or device. We estimate the likelihood its lithium is ethically sourced.</p>
        <div className="search-bar">
          <input
            type="text"
            placeholder="e.g. Tesla Model 3 2024, iPhone 16, MacBook Pro…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn" onClick={() => handleSearch()} disabled={loading}>
            {loading ? 'Tracing…' : 'Trace'}
          </button>
        </div>
        <div className="quick-picks">
          {PRODUCTS.map(p => (
            <button
              key={p.label}
              className="chip"
              onClick={() => { setQuery(p.label); handleSearch(p.label) }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <div className="loading">
          <div className="spinner" />
          Tracing supply chain for "{productName}"…
        </div>
      )}

      {!loading && !result && (
        <div className="empty">
          <div className="icon">🔋</div>
          <h2>Search a product to begin</h2>
          <p>Or explore the full supply chain on the <button className="chip" style={{display:'inline'}} onClick={() => setPage('map')}>🌍 Map</button></p>
        </div>
      )}

      {!loading && result && (
        <div className="results">
          <div className="score-card">
            <ScoreRing score={result.trustScore} />
            <div className="score-info">
              <h2>{productName}</h2>
              <div className={`verdict ${verdict.cls}`}>{verdict.icon} {verdict.label}</div>
              <div className="meta-row">
                <div className="meta-item">
                  <label>Manufacture Year</label>
                  <span>{result.manufactureYear}</span>
                </div>
                <div className="meta-item">
                  <label>Ore Source Year</label>
                  <span>~{result.sourceYear}</span>
                </div>
                <div className="meta-item">
                  <label>P(High-Risk)</label>
                  <span>{Math.round(result.pHighRisk * 100)}%</span>
                </div>
                <div className="meta-item">
                  <label>95% CI</label>
                  <span>{Math.round(result.ci.p5 * 100)}%–{Math.round(result.ci.p95 * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          <Timeline manufactureYear={result.manufactureYear} sourceYear={result.sourceYear} />

          <div className="grid2">
            <MineBreakdown mines={result.mines} />
            <FlagList flags={flags} />
          </div>

          <div className="grid2">
            <CIChart ci={result.ci} pHighRisk={result.pHighRisk} />
            <div className="panel">
              <h3>Data Sources Used</h3>
              <div className="flag-list">
                {[
                  ['📊', 'UN Comtrade', 'Trade flow volumes 2018–2024'],
                  ['🛰️', 'Sentinel-2 (ESA)', 'Mine activity satellite imagery'],
                  ['📄', 'USGS Minerals Yearbook', 'Annual production by country'],
                  ['🔎', 'Global Witness', 'ASM conflict mineral reports'],
                  ['🌐', 'OECD Due Diligence', 'Refinery compliance registry'],
                ].map(([icon, src, desc]) => (
                  <div key={src} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <span>{icon}</span>
                    <div>
                      <b style={{ fontSize: '0.85rem', display: 'block' }}>{src}</b>
                      <span style={{ fontSize: '0.78rem', color: 'var(--sub)' }}>{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="panel"
            style={{ cursor: 'pointer', textAlign: 'center', borderColor: 'var(--accent)' }}
            onClick={() => setPage('map')}
          >
            🌍 <strong>Explore the full supply chain on the interactive map →</strong>
          </div>

          <div className="panel" style={{ fontSize: '0.8rem', color: 'var(--sub)', textAlign: 'center' }}>
            ⚠ Demo model using simulated mine output data. Trust Score = <code style={{ fontFamily: 'var(--mono)' }}>(1 − median_high_risk_share) × 100</code>
          </div>
        </div>
      )}
    </div>
  )
}
