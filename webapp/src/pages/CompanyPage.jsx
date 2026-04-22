import { useState } from 'react'
import { COMPANY_LIST, COMPANIES } from '../data/companies.js'
import { RECYCLING_CLAIMS, companyGreenwashScore, GLOBAL_RECYCLED_SUPPLY_KT } from '../data/recycling.js'
import { COUNTRY_CHILD_LABOR, childLaborRisk } from '../data/child_labor.js'
import { MINES } from '../data/mines.js'
import './CompanyPage.css'

const TYPE_ORDER = ['miner', 'miner_trader', 'trader_refiner', 'refiner', 'refiner_recycler', 'cell_manufacturer', 'oem']
const TYPE_LABELS = {
  miner: 'Miner', miner_trader: 'Miner/Trader', trader_refiner: 'Trader/Refiner',
  refiner: 'Refiner', refiner_recycler: 'Refiner/Recycler',
  cell_manufacturer: 'Cell Manufacturer', oem: 'OEM',
}

function riskBar(val, max = 1) {
  const pct = Math.round((val / max) * 100)
  const color = pct >= 60 ? '#ef4444' : pct >= 30 ? '#eab308' : '#22c55e'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: '0.8rem', fontFamily: 'var(--mono)', color, width: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function computeCompanyChildLaborExposure(company) {
  const ownedMineIds = company.owns_mines || []
  const mines = ownedMineIds.map(id => MINES.find(m => m.id === id)).filter(Boolean)
  if (!mines.length) {
    // OEM/refiner — estimate from buyers
    const buyerIds = company.buys_from || []
    const buyerScores = buyerIds.map(id => {
      const co = COMPANIES[id]
      if (!co) return 0.2
      return computeCompanyChildLaborExposure(co)
    })
    return buyerScores.length ? buyerScores.reduce((s, v) => s + v, 0) / buyerScores.length : 0.1
  }
  const scores = mines.map(m => {
    const countryMap = { DRC: 'COD', Zambia: 'ZMB', Zimbabwe: 'ZWE', Australia: 'AUS', Chile: 'CHL', Argentina: 'ARG', Bolivia: 'BOL', Indonesia: 'IDN', Philippines: 'PHL', Russia: 'RUS', China: 'CHN', 'South Africa': 'ZAF', Mozambique: 'MOZ', Portugal: 'PRT' }
    const code = countryMap[m.country] || 'COD'
    return childLaborRisk(code, m.elements[0]?.toLowerCase())
  })
  return scores.reduce((s, v) => s + v, 0) / scores.length
}

export default function CompanyPage({ onBack }) {
  const [selectedType, setSelectedType] = useState('all')
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [sortBy, setSortBy] = useState('laundering_risk')

  const filtered = COMPANY_LIST
    .filter(c => selectedType === 'all' || c.type === selectedType)
    .sort((a, b) => {
      if (sortBy === 'laundering_risk') return (b.laundering_risk || 0) - (a.laundering_risk || 0)
      if (sortBy === 'greenwash') return (companyGreenwashScore(b.id) || 0) - (companyGreenwashScore(a.id) || 0)
      if (sortBy === 'child_labor') return computeCompanyChildLaborExposure(b) - computeCompanyChildLaborExposure(a)
      return a.name.localeCompare(b.name)
    })

  const selected = selectedCompany ? COMPANIES[selectedCompany] : null
  const selectedClaims = selected ? RECYCLING_CLAIMS.filter(c => c.company_id === selected.id) : []
  const selectedChildLabor = selected ? computeCompanyChildLaborExposure(selected) : 0

  return (
    <div className="co-page">
      {/* Header */}
      <div className="co-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBack && (
            <button onClick={onBack} className="back-btn">← Back</button>
          )}
          <div>
            <div className="co-title">🏢 Company Scorecard</div>
            <div className="co-sub">Ownership chains · Child labor exposure · Recycling fraud detection</div>
          </div>
        </div>
      </div>

      <div className="co-body">
        {/* Left: table */}
        <div className="co-table-col">
          {/* Filters */}
          <div className="co-filters">
            <div className="filter-row">
              <span className="filter-label">Type:</span>
              {['all', ...TYPE_ORDER].map(t => (
                <button
                  key={t}
                  className={`filter-chip ${selectedType === t ? 'active' : ''}`}
                  onClick={() => setSelectedType(t)}
                >
                  {t === 'all' ? 'All' : TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="filter-row" style={{ marginTop: '0.5rem' }}>
              <span className="filter-label">Sort by:</span>
              {[
                { k: 'laundering_risk', l: 'Laundering Risk' },
                { k: 'child_labor', l: 'Child Labor Exposure' },
                { k: 'greenwash', l: 'Greenwash Score' },
                { k: 'name', l: 'Name' },
              ].map(({ k, l }) => (
                <button
                  key={k}
                  className={`filter-chip ${sortBy === k ? 'active' : ''}`}
                  onClick={() => setSortBy(k)}
                >{l}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="co-table-wrap">
            <table className="co-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Child Labor Risk</th>
                  <th>Laundering Risk</th>
                  <th>Greenwash</th>
                  <th>Incidents</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(co => {
                  const clScore = computeCompanyChildLaborExposure(co)
                  const gsScore = companyGreenwashScore(co.id) || 0
                  const incidents = [...(co.child_labor_incidents || []), ...(co.forced_labor_incidents || [])]
                  return (
                    <tr
                      key={co.id}
                      className={selectedCompany === co.id ? 'selected' : ''}
                      onClick={() => setSelectedCompany(co.id === selectedCompany ? null : co.id)}
                    >
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{co.flag} {co.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{co.hq} · {co.listed}</div>
                      </td>
                      <td>
                        <span className="type-tag">{TYPE_LABELS[co.type]}</span>
                      </td>
                      <td style={{ width: 120 }}>{riskBar(clScore)}</td>
                      <td style={{ width: 120 }}>{riskBar(co.laundering_risk || 0)}</td>
                      <td style={{ width: 120 }}>{riskBar(gsScore)}</td>
                      <td>
                        {incidents.length > 0
                          ? <span className="incident-badge">{incidents.length}</span>
                          : <span style={{ color: '#374151', fontSize: '0.8rem' }}>—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: detail */}
        <div className="co-detail-col">
          {!selected ? (
            <div className="co-empty">
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏢</div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Select a company</div>
              <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Click a row to see full scorecard</div>
            </div>
          ) : (
            <div className="co-detail">
              {/* Company header */}
              <div className="co-detail-header">
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selected.flag} {selected.name}</div>
                <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  {selected.hq} · {selected.listed}
                </div>
                <div className="co-el-tags" style={{ marginTop: '0.5rem' }}>
                  {selected.elements.map(el => (
                    <span key={el} className="el-tag" style={{ '--tc': { Li:'#3b82f6', Co:'#ef4444', Ni:'#8b5cf6', Mn:'#f97316', C:'#6b7280', Cu:'#eab308' }[el] || '#9ca3af' }}>{el}</span>
                  ))}
                  <span className="type-tag" style={{ marginLeft: '0.25rem' }}>{TYPE_LABELS[selected.type]}</span>
                </div>
              </div>

              {/* Risk scores */}
              <div className="detail-section">
                <div className="ds-title">Risk Scores</div>
                <div className="score-grid">
                  <div className="score-cell">
                    <div className="sc-label">Child Labor Exposure</div>
                    {riskBar(selectedChildLabor)}
                  </div>
                  <div className="score-cell">
                    <div className="sc-label">Laundering Risk</div>
                    {riskBar(selected.laundering_risk || 0)}
                  </div>
                  <div className="score-cell">
                    <div className="sc-label">Greenwash Score</div>
                    {riskBar(companyGreenwashScore(selected.id) || 0)}
                  </div>
                </div>
                {selected.laundering_note && (
                  <div className="detail-note">{selected.laundering_note}</div>
                )}
              </div>

              {/* Ownership chain */}
              <div className="detail-section">
                <div className="ds-title">Supply Chain Position</div>
                <div className="chain-row">
                  {selected.owns_mines?.length > 0 && (
                    <div className="chain-block">
                      <div className="chain-label">Owns Mines</div>
                      {selected.owns_mines.map(id => {
                        const m = MINES.find(m => m.id === id)
                        return m ? <div key={id} className="chain-item">⛏️ {m.flag} {m.name}</div> : null
                      })}
                    </div>
                  )}
                  {selected.buys_from?.length > 0 && (
                    <div className="chain-block">
                      <div className="chain-label">Buys From</div>
                      {selected.buys_from.map(id => {
                        const co = COMPANIES[id]
                        return co ? <div key={id} className="chain-item">📦 {co.flag} {co.name}</div> : null
                      })}
                    </div>
                  )}
                  {selected.sells_to?.length > 0 && (
                    <div className="chain-block">
                      <div className="chain-label">Sells To</div>
                      {selected.sells_to.map(id => {
                        const co = COMPANIES[id]
                        return co ? <div key={id} className="chain-item">🏭 {co.flag} {co.name}</div> : null
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Incidents */}
              {(selected.child_labor_incidents?.length > 0 || selected.forced_labor_incidents?.length > 0) && (
                <div className="detail-section">
                  <div className="ds-title">Documented Incidents</div>
                  {[...(selected.child_labor_incidents || []), ...(selected.forced_labor_incidents || [])].map((inc, i) => (
                    <div key={i} className="incident-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{inc.year}</span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{inc.source}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#d1d5db', lineHeight: 1.4 }}>{inc.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recycling claims */}
              {selectedClaims.length > 0 && (
                <div className="detail-section">
                  <div className="ds-title">Recycling Claims Analysis</div>
                  {selectedClaims.map((claim, i) => (
                    <div key={i} className={`claim-card ${claim.plausible ? (claim.greenwash_score > 0.5 ? 'warn' : 'ok') : 'bad'}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontWeight: 700 }}>{claim.element}</span>
                          <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{claim.year} · {claim.claimed_recycled_pct}% claimed recycled</span>
                        </div>
                        <span className={`verdict-tag ${claim.plausible ? (claim.greenwash_score > 0.5 ? 'warn' : 'ok') : 'bad'}`}>
                          {claim.verdict.split(' ')[0]}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0.4rem 0' }}>{claim.scope}</div>
                      {claim.verdict_detail && (
                        <div style={{ fontSize: '0.78rem', color: '#d1d5db', lineHeight: 1.4 }}>{claim.verdict_detail}</div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.4rem' }}>
                        Source: <a href={claim.source_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>{claim.source}</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Audit status */}
              <div className="detail-section">
                <div className="ds-title">Audit Status</div>
                <div style={{ fontSize: '0.82rem', color: '#d1d5db', lineHeight: 1.5 }}>{selected.audit_status}</div>
                {selected.esg_report && (
                  <a href={selected.esg_report} target="_blank" rel="noreferrer" className="esg-link">
                    📄 ESG Report →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
