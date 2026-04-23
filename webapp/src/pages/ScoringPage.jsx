import { useMemo, useState } from 'react'
import { SIGNALS, PRESETS, CATEGORIES, COUNTRIES, COUNTRY_INTEL, MASS_BALANCE, GLOBAL_STATS } from '../data/scoring.js'
import './MapPage.css'
import './ScoringPage.css'

const DAMPEN = 0.6
function sigEffect(sig, triggerP) { return DAMPEN * triggerP * sig.severity * sig.confidence * (1 - sig.deniability) }
function dimScore(ids, preset) {
  const effects = SIGNALS.filter(s => ids.includes(s.id)).map(s => sigEffect(s, preset[s.id] ?? 0.5))
  return 1 - effects.reduce((acc, e) => acc * (1 - e), 1)
}
function riskColor(v) {
  if (v > 0.75) return '#f87171'
  if (v > 0.55) return '#fb923c'
  if (v > 0.30) return '#fbbf24'
  return '#4ade80'
}
function riskLabel(v) {
  if (v > 0.75) return ['CRITICAL', 'Suspend sourcing · Refer to OECD / ILO']
  if (v > 0.55) return ['HIGH', 'Field investigation recommended']
  if (v > 0.30) return ['MODERATE', 'Enhanced due diligence required']
  return ['LOW', 'Standard monitoring cadence']
}
function gapColor(f) { return f === 'critical' ? '#f87171' : f === 'high' ? '#fb923c' : f === 'clean' ? '#4ade80' : '#fbbf24' }
function alertColor(l) { return l === 'critical' ? '#f87171' : l === 'high' ? '#fb923c' : l === 'medium' ? '#fbbf24' : '#22d3ee' }

function ScoreDial({ label, value, color, sub }) {
  const pct = Math.round(value * 100)
  return (
    <div className="sc-dial">
      <div className="sc-dial-label">{label}</div>
      <div className="sc-dial-pct" style={{ color }}>{pct}<span className="sc-dial-unit">%</span></div>
      <div className="sc-dial-track"><div className="sc-dial-bar" style={{ width: `${pct}%`, background: color }} /></div>
      <div className="sc-dial-sub">{sub}</div>
    </div>
  )
}

function CompositeDial({ value }) {
  const pct = Math.round(value * 100)
  const color = riskColor(value)
  const [verdict, explain] = riskLabel(value)
  return (
    <div className="sc-composite">
      <div className="sc-composite-label">Composite Risk Score</div>
      <div className="sc-composite-pct" style={{ color }}>{pct}<span className="sc-composite-unit">%</span></div>
      <div className="sc-dial-track" style={{ height: 5, marginBottom: '0.75rem' }}>
        <div className="sc-dial-bar" style={{ width: `${pct}%`, background: color, height: 5 }} />
      </div>
      <div className="sc-verdict" style={{ background: `${color}18`, borderColor: `${color}40`, color }}>{verdict}</div>
      <div className="sc-composite-explain">{explain}</div>
    </div>
  )
}

function SignalRow({ sig, catColor, weight, expanded, onToggle }) {
  const pct = Math.round(weight * 100)
  return (
    <>
      <div className={`sc-sig-row ${expanded ? 'open' : ''}`} onClick={onToggle} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onToggle()}>
        <div className="sc-sig-name">
          <span className="sc-sig-title">{sig.name}</span>
          <span className="sc-sig-brief">{sig.brief}</span>
        </div>
        <div className="sc-sig-weight">
          <span className="sc-sig-pct" style={{ color: catColor }}>{pct}%</span>
          <div className="sc-sig-mini-track"><div className="sc-sig-mini-bar" style={{ width: `${pct}%`, background: catColor }} /></div>
        </div>
        <div className="sc-sig-meta">
          <span className="sc-meta-pill">Sev {Math.round(sig.severity * 100)}%</span>
          <span className="sc-meta-pill">Conf {Math.round(sig.confidence * 100)}%</span>
          <span className="sc-meta-pill" style={{ color: sig.deniability < 0.15 ? '#4ade80' : sig.deniability < 0.35 ? '#fbbf24' : '#f87171' }}>
            Deny {Math.round(sig.deniability * 100)}%
          </span>
        </div>
        <div className="sc-sig-chevron">{expanded ? '▲' : '▼'}</div>
      </div>
      {expanded && (
        <div className="sc-sig-detail">
          <div>
            <div className="sc-detail-block">
              <div className="sc-detail-head">Why this signal matters</div>
              <p className="sc-detail-text">{sig.why}</p>
            </div>
            <div className="sc-detail-block" style={{ marginTop: '1rem' }}>
              <div className="sc-detail-head">Detection formula</div>
              <pre className="sc-formula">{sig.formula}</pre>
            </div>
            <div className="sc-detail-block" style={{ marginTop: '1rem' }}>
              <div className="sc-detail-head">Weight breakdown</div>
              <div className="sc-weight-eq">
                <span className="sc-weq-item"><span className="sc-weq-lbl">Severity</span><span className="sc-weq-val">{Math.round(sig.severity * 100)}%</span></span>
                <span className="sc-weq-op">×</span>
                <span className="sc-weq-item"><span className="sc-weq-lbl">Confidence</span><span className="sc-weq-val">{Math.round(sig.confidence * 100)}%</span></span>
                <span className="sc-weq-op">×</span>
                <span className="sc-weq-item"><span className="sc-weq-lbl">(1 − Deny)</span><span className="sc-weq-val">{Math.round((1 - sig.deniability) * 100)}%</span></span>
                <span className="sc-weq-op">=</span>
                <span className="sc-weq-item"><span className="sc-weq-lbl">MaxImpact</span><span className="sc-weq-val" style={{ color: catColor }}>{Math.round(sig.severity * sig.confidence * (1 - sig.deniability) * 100)}%</span></span>
              </div>
            </div>
          </div>
          <div>
            <div className="sc-detail-block">
              <div className="sc-detail-head">Documented case</div>
              <p className="sc-detail-text sc-case-text">{sig.case}</p>
            </div>
            <div className="sc-detail-block" style={{ marginTop: '1rem' }}>
              <div className="sc-detail-head">Data sources</div>
              <div className="sc-sources">
                {sig.sources.map(src => (
                  <a key={src.url} href={src.url} target="_blank" rel="noreferrer" className="sc-source-link">
                    <span className="sc-source-name">{src.name}</span>
                    <span className="sc-source-arrow">↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function ScoringPage() {
  const [country, setCountry]   = useState('drc')
  const [expanded, setExpanded] = useState(null)
  const [showMethod, setShowMethod] = useState(false)

  const preset = PRESETS[country] ?? PRESETS.custom
  const intel  = COUNTRY_INTEL[country] ?? COUNTRY_INTEL.custom

  const scores = useMemo(() => {
    const dimScores = Object.fromEntries(
      CATEGORIES.map(cat => [cat.id, dimScore(cat.ids, preset)])
    )
    const vals = CATEGORIES.map(cat => dimScores[cat.id])
    dimScores.composite = Math.max(...vals) * 0.6 + (vals.reduce((a, b) => a + b, 0) / vals.length) * 0.4
    return dimScores
  }, [preset])

  const sigWeights = useMemo(() => {
    const out = {}
    SIGNALS.forEach(s => { out[s.id] = sigEffect(s, preset[s.id] ?? 0.5) })
    return out
  }, [preset])

  return (
    <div className="sc-page">
      <header className="topbar">
        <div className="topbar-left">
          <div>
            <div className="topbar-title">Signal Scoring Engine</div>
            <div className="topbar-sub">Bayesian risk assessment · {SIGNALS.length} signals · {CATEGORIES.length} dimensions · real-time composite</div>
          </div>
        </div>
        <div className="sc-selectors">
          <div className="sc-sel-group">
            <label className="sc-sel-label">ORIGIN REGION</label>
            <select className="sc-select" value={country} onChange={e => setCountry(e.target.value)}>
              {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="sc-body">
        <section className="sc-context-strip">
          {GLOBAL_STATS.map((s, i) => (
            <div key={i} className="sc-ctx-card">
              <div className="sc-ctx-value">{s.value}</div>
              <div className="sc-ctx-label">{s.label}</div>
              <div className="sc-ctx-sub">{s.sub}</div>
            </div>
          ))}
        </section>

        <section className="sc-dials-section">
          <div className="sc-dials">
            {CATEGORIES.map(cat => {
              const v = scores[cat.id]
              const sub = v > 0.55
                ? (cat.id === 'fraud' ? 'Suspend certifications' : cat.id === 'moral' ? 'Immediate escalation' : 'Field investigation required')
                : v > 0.30
                ? (cat.id === 'fraud' ? 'Certificate audit' : cat.id === 'moral' ? 'Enhanced due diligence' : 'Enhanced DD')
                : 'Standard monitoring'
              return (
                <ScoreDial
                  key={cat.id}
                  label={cat.label + ' Risk'}
                  value={v}
                  color={cat.color}
                  sub={sub}
                />
              )
            })}
            <div className="sc-dial-divider" />
            <CompositeDial value={scores.composite} />
          </div>
          <div className="sc-formula-compact">
            <span className="sc-fc-label">Composite</span>
            <span className="sc-fc-eq">
              = max({CATEGORIES.map((cat, i) => (
                <span key={cat.id}>{i > 0 && ', '}{Math.round(scores[cat.id] * 100)}%</span>
              ))}) × 0.6 + mean × 0.4
              {' '}= <strong style={{ color: riskColor(scores.composite) }}>{Math.round(scores.composite * 100)}%</strong>
            </span>
          </div>
        </section>

        <section className="sc-intel-section">
          <div className="sc-intel-header">
            <div className="sc-intel-headline">
              <span className="sc-intel-badge" style={{ background: `${intel.riskColor}18`, borderColor: `${intel.riskColor}40`, color: intel.riskColor }}>{intel.risk}</span>
              <span className="sc-intel-title">{intel.headline}</span>
            </div>
          </div>
          <p className="sc-intel-summary">{intel.summary}</p>
          <div className="sc-intel-body">
            {intel.facts.length > 0 && (
              <div className="sc-intel-facts">
                <div className="sc-intel-section-label">Key data points</div>
                {intel.facts.map((f, i) => (
                  <div key={i} className="sc-fact-row">
                    <span className="sc-fact-key">{f.k}</span>
                    <span className="sc-fact-val">{f.v}</span>
                    <span className="sc-fact-src">{f.src}</span>
                  </div>
                ))}
              </div>
            )}
            {intel.alerts.length > 0 && (
              <div className="sc-intel-alerts">
                <div className="sc-intel-section-label">Active risk flags</div>
                {intel.alerts.map((a, i) => (
                  <div key={i} className="sc-alert-row" style={{ borderLeftColor: alertColor(a.level) }}>
                    <span style={{ color: alertColor(a.level), fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>{a.level}</span>
                    <span className="sc-alert-text">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="sc-mass-section">
          <div className="sc-signals-header">
            <div className="sc-sh-title">Mass Balance Analysis</div>
            <div className="sc-sh-sub">UN Comtrade mirror discrepancies · 2023 · threshold: &gt;25% gap = suspect</div>
          </div>
          <div className="sc-mass-table">
            <div className="sc-mass-head">
              <span>Origin</span><span>Via</span><span>Destination</span><span>HS Code</span>
              <span style={{ textAlign: 'right' }}>Declared Export</span>
              <span style={{ textAlign: 'right' }}>Declared Import</span>
              <span style={{ textAlign: 'right' }}>Gap</span>
              <span>Assessment</span>
            </div>
            {MASS_BALANCE.map((row, i) => {
              const gc = gapColor(row.flag)
              return (
                <div key={i} className="sc-mass-row">
                  <span className="sc-mass-country">{row.origin}</span>
                  <span className="sc-mass-via">{row.via}</span>
                  <span className="sc-mass-country">{row.dest}</span>
                  <span className="sc-mass-hs mono">{row.hs}</span>
                  <span className="sc-mass-num">{row.exp.toLocaleString()} t</span>
                  <span className="sc-mass-num">{row.imp.toLocaleString()} t</span>
                  <span className="sc-mass-gap" style={{ color: gc }}>{row.flag === 'clean' ? `${row.gap}%` : `${row.gap}% ▲`}</span>
                  <span className="sc-mass-note">{row.note}</span>
                </div>
              )
            })}
          </div>
          <div className="sc-mass-legend">
            {[['#f87171','Critical — suspend sourcing'],['#fb923c','High — enhanced due diligence'],['#4ade80','Clean (< 10% gap)']].map(([c, l]) => (
              <span key={l} className="sc-mass-leg-item">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
                {l}
              </span>
            ))}
          </div>
        </section>

        <section className="sc-method-section">
          <button className="sc-method-toggle" onClick={() => setShowMethod(v => !v)}>
            <span className="sc-method-toggle-title">How the score is calculated</span>
            <span className="sc-method-toggle-hint">{showMethod ? 'Collapse' : 'Expand full methodology'}</span>
            <span className="sc-method-chev">{showMethod ? '▲' : '▼'}</span>
          </button>
          <div className="sc-three-steps">
            {[
              ['01', 'Signal effect', 'Effect = 0.6 × triggerP × severity × confidence × (1 − deniability). The 0.6 damping factor prevents saturation from multiple signals in the same dimension.'],
              ['02', 'Dimension score', 'D = 1 − ∏(1 − Effect). Bayesian noisy-OR: two independent signals at 30% combine to 51%, not 60%. No artificial cap needed with dampened effects.'],
              ['03', 'Composite fusion', 'Composite = max(D) × 0.6 + mean(D) × 0.4. Blends worst-dimension signal (60% weight) with average severity (40% weight), preventing full saturation when all dimensions are high.'],
            ].map(([n, t, d]) => (
              <div key={n} className="sc-step">
                <div className="sc-step-num">{n}</div>
                <div className="sc-step-body">
                  <div className="sc-step-title">{t}</div>
                  <div className="sc-step-desc">{d}</div>
                </div>
              </div>
            ))}
          </div>
          {showMethod && (
            <div className="sc-method-deep">
              <div className="sc-method-grid">
                {[
                  ['Why four dimensions?', 'Child labour, forced labour, document fraud, and moral risk are analytically distinct. A site can show high child-labour risk but low fraud risk. Separate dimensions prevent dilution: a clean fraud record cannot offset a catastrophic child-labour or moral risk signal.'],
                  ['Why Bayesian product, not average?', 'Averaging dilutes strong signals. The product formula models independent risk events: child 85% + forced 70% = 1 − (0.15 × 0.30) = 95.5%, not 77.5%. Two independent risk types converging is exponentially more alarming.'],
                  ['Deniability — the critical variable', 'Deniability measures how easily an operator can explain a signal away. A production spike could be new equipment. A cert dated before the mine permit is logically impossible (deny ≈ 0). df3 at sev 0.98 / conf 0.99 / deny 0.01 is the engine\'s most decisive signal.'],
                  ['Investigation thresholds', null],
                ].map(([h, p]) => (
                  <div key={h} className="sc-method-card">
                    <h4>{h}</h4>
                    {p ? <p>{p}</p> : (
                      <div className="sc-thresholds">
                        {[['#4ade80','0–30%','Low — standard monitoring'],['#fbbf24','30–55%','Moderate — enhanced due diligence'],['#fb923c','55–75%','High — field investigation'],['#f87171','75%+','Critical — suspend sourcing']].map(([c, r, l]) => (
                          <div key={r} className="sc-th"><span style={{ color: c }}>{r}</span><span>{l}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="sc-full-formula">
                <div className="sc-ff-label">Full scoring formula</div>
                <pre className="sc-formula sc-formula-lg">{`Effect(s)  = 0.6 × triggerP × severity × confidence × (1 − deniability)
D(dim)     = 1 − ∏ [ 1 − Effect(s) ]   ← Bayesian noisy-OR
Composite  = max(D_CL, D_FL, D_DF, D_MR) × 0.6 + mean(D) × 0.4`}</pre>
              </div>
            </div>
          )}
        </section>

        <section className="sc-signals-section">
          <div className="sc-signals-header">
            <div className="sc-sh-title">Signal Library</div>
            <div className="sc-sh-sub">13 evidence signals · click any row to expand formula, documented case, and sources</div>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="sc-cat-block">
              <div className="sc-cat-head" style={{ borderLeftColor: cat.color }}>
                <span className="sc-cat-icon" style={{ color: cat.color }}>{cat.icon}</span>
                <span className="sc-cat-name">{cat.label}</span>
                <span className="sc-cat-dim-score" style={{ color: cat.color }}>{Math.round(scores[cat.id] * 100)}%</span>
                <span className="sc-cat-count">{cat.ids.length} signals in dimension</span>
              </div>
              <div className="sc-sig-table-head">
                <span>Signal</span><span>Effective weight</span><span>Parameters</span><span />
              </div>
              {SIGNALS.filter(s => cat.ids.includes(s.id)).map(sig => (
                <SignalRow key={sig.id} sig={sig} catColor={cat.color} weight={sigWeights[sig.id]}
                  expanded={expanded === sig.id} onToggle={() => setExpanded(e => e === sig.id ? null : sig.id)} />
              ))}
            </div>
          ))}
        </section>

        <footer className="sc-footer">
          <span>REEtrieve Signal Engine · Hack Summit 2026</span>
          <span>UN Comtrade · ILO · NASA VIIRS · ESA Sentinel · USGS · RMI · Walk Free · EITI · MarineTraffic · ICIJ · GFI</span>
        </footer>
      </div>
    </div>
  )
}
