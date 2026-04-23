import { useState, useRef, useCallback } from 'react'
import {
  CONTINENTS, HIGH_RISK_ENTITIES, RISK_FLAGS,
  AUDIT_CATEGORIES, GRADE_CONFIG, AUDIT_HISTORY,
} from '../data/audit.js'
import AuditChat from '../components/AuditChat.jsx'
import './AuditPage.css'

// ── helpers ──────────────────────────────────────────────────────────────────

function riskColor(score) {
  if (score >= 85) return '#f87171'
  if (score >= 70) return '#fb923c'
  if (score >= 55) return '#fbbf24'
  return '#4ade80'
}

function suggestGrade(pct) {
  if (pct >= 90) return 'A'
  if (pct >= 75) return 'B'
  if (pct >= 55) return 'C'
  if (pct >= 35) return 'D'
  return 'F'
}

function recalcScore(base, grade, checkedPct) {
  const { multiplier } = GRADE_CONFIG[grade]
  // Grade multiplier × modest bonus for thoroughness
  const thoroughnessBonus = 1 - checkedPct * 0.08
  return Math.min(99, Math.max(1, Math.round(base * multiplier * thoroughnessBonus)))
}

const TOTAL_ITEMS = AUDIT_CATEGORIES.reduce((s, c) => s + c.items.length, 0)

// ── sub-components ────────────────────────────────────────────────────────────

function EntityCard({ entity, onInspect }) {
  const rc = riskColor(entity.riskScore)
  const hasAudit = !!entity.lastAudit

  return (
    <div
      className="entity-card"
      style={{ '--card-color': rc }}
      onClick={() => onInspect(entity)}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        borderRadius: '14px 14px 0 0',
        background: `linear-gradient(90deg, ${rc}, transparent)`,
      }} />

      <div className="entity-card-head">
        <div>
          <div className="entity-card-title">{entity.name}</div>
          <div className="entity-card-country">
            <span>{entity.flag}</span>
            <span>{entity.country}</span>
          </div>
        </div>
        <div className="risk-badge">
          <div className="risk-num" style={{ color: rc }}>{entity.riskScore}</div>
          <div className="risk-lbl">Risk</div>
        </div>
      </div>

      <div className="entity-card-industry">{entity.industry}</div>

      <div className="entity-flags">
        {entity.riskFlags.slice(0, 3).map(f => {
          const cfg = RISK_FLAGS[f]
          return (
            <span
              key={f}
              className="eflag"
              style={{
                color: cfg.color,
                borderColor: cfg.color + '40',
                background: cfg.color + '15',
              }}
            >
              {cfg.icon} {cfg.label}
            </span>
          )
        })}
        {entity.riskFlags.length > 3 && (
          <span className="eflag" style={{ color: '#4a5568', borderColor: '#374151', background: 'rgba(255,255,255,0.03)' }}>
            +{entity.riskFlags.length - 3} more
          </span>
        )}
      </div>

      <div className="entity-card-footer">
        <div className="entity-audit-status">
          <span className="audit-status-dot" style={{ background: hasAudit ? '#4ade80' : '#374151' }} />
          {hasAudit ? `Last audit: ${entity.lastAudit}` : 'No prior audit'}
        </div>
        <button className="inspect-btn" onClick={e => { e.stopPropagation(); onInspect(entity) }}>
          🔍 Inspect
        </button>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ entity }) {
  return (
    <div>
      <div className="overview-grid">
        {[
          { label: 'Industry',       value: entity.industry },
          { label: 'Country',        value: `${entity.flag}  ${entity.country}` },
          { label: 'Volume',         value: entity.volume },
          { label: 'Certification',  value: entity.certStatus },
          { label: 'Last Audit',     value: entity.lastAudit ?? 'Never' },
          { label: 'Continent',      value: CONTINENTS.find(c => c.id === entity.continent)?.label ?? '—' },
        ].map(({ label, value }) => (
          <div className="ov-card" key={label}>
            <div className="ov-card-label">{label}</div>
            <div className="ov-card-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="ov-note">
        <strong>Intel Note — </strong>{entity.note}
      </div>

      <div className="ov-flags-section">
        <h4>Active Risk Flags</h4>
        <div className="ov-flags">
          {entity.riskFlags.map(f => {
            const cfg = RISK_FLAGS[f]
            return (
              <div
                key={f}
                className="ov-flag"
                style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.color + '12' }}
              >
                {cfg.icon} {cfg.label}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Checklist tab ─────────────────────────────────────────────────────────────

function ChecklistTab({ entity, auditState, onChange, onSubmit }) {
  const [openCats, setOpenCats] = useState(
    () => Object.fromEntries(AUDIT_CATEGORIES.map(c => [c.id, true]))
  )
  const { checked, grade, submitted } = auditState

  const checkedCount = Object.values(checked).filter(Boolean).length
  const pct = checkedCount / TOTAL_ITEMS
  const barColor = pct >= 0.75 ? '#4ade80' : pct >= 0.5 ? '#fbbf24' : '#f87171'
  const suggested = suggestGrade(pct * 100)

  function toggleItem(id) {
    onChange({ checked: { ...checked, [id]: !checked[id] } })
  }
  function setGrade(g) {
    onChange({ grade: g })
  }
  function toggleCat(id) {
    setOpenCats(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (submitted) {
    const newScore = recalcScore(entity.riskScore, grade, pct)
    return (
      <div>
        <div className="submit-success" style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          ✅ Inspection submitted — risk score recalculated
        </div>
        <div className="risk-delta-bar" style={{ marginBottom: '1.25rem' }}>
          <div className="rdb-score">
            <div className="rdb-num" style={{ color: riskColor(entity.riskScore) }}>{entity.riskScore}</div>
            <div className="rdb-lbl">Before</div>
          </div>
          <div className="rdb-arrow">→</div>
          <div className="rdb-score">
            <div className={`rdb-num ${newScore < entity.riskScore ? 'rdb-new' : 'rdb-same'}`}>{newScore}</div>
            <div className="rdb-lbl">After</div>
          </div>
          <div className="rdb-mid">
            <div className="rdb-progress">
              <div className="rdb-fill" style={{
                width: `${newScore}%`,
                background: `linear-gradient(90deg, ${riskColor(newScore)}, ${riskColor(newScore)}88)`,
              }} />
            </div>
            <div className="rdb-hint">
              Grade {grade} · {checkedCount}/{TOTAL_ITEMS} items verified · −{entity.riskScore - newScore} pts
            </div>
          </div>
          <div
            className="gas-pill"
            style={{ background: GRADE_CONFIG[grade].bg, color: GRADE_CONFIG[grade].color, fontSize: '1.1rem', padding: '0.2rem 0.65rem' }}
          >
            {grade}
          </div>
        </div>
        <button className="submit-btn" style={{ marginBottom: 0 }} onClick={() => onChange({ submitted: false })}>
          ← Edit Report
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* progress bar */}
      <div className="checklist-progress">
        <div>
          <div className="cp-pct" style={{ color: barColor }}>{Math.round(pct * 100)}%</div>
          <div className="cp-label">Complete</div>
        </div>
        <div className="cp-bar-wrap">
          <div className="cp-bar-fill" style={{ width: `${pct * 100}%`, background: barColor }} />
        </div>
        <div className="cp-label">{checkedCount} / {TOTAL_ITEMS} items</div>
      </div>

      {/* categories */}
      {AUDIT_CATEGORIES.map(cat => {
        const catChecked = cat.items.filter(it => checked[it.id]).length
        const isOpen = openCats[cat.id]
        return (
          <div className="checklist-category" key={cat.id}>
            <div className="cc-header" onClick={() => toggleCat(cat.id)}>
              <span className="cc-icon">{cat.icon}</span>
              <span className="cc-title">{cat.label}</span>
              <span className="cc-progress">{catChecked}/{cat.items.length}</span>
              <span className={`cc-chevron ${isOpen ? 'open' : ''}`}>▾</span>
            </div>
            {isOpen && (
              <div className="cc-items">
                {cat.items.map(item => (
                  <div
                    key={item.id}
                    className={`cc-item ${checked[item.id] ? 'checked' : ''}`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className={`cc-checkbox ${checked[item.id] ? 'checked' : ''}`}>
                      {checked[item.id] && '✓'}
                    </div>
                    <div className="cc-item-text">{item.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* grading */}
      <div className="grading-section">
        <h4>Inspection Grade</h4>
        <div className="grade-auto-suggest">
          <span>Auto-suggested based on checklist completion:</span>
          <span
            className="gas-pill"
            style={{ background: GRADE_CONFIG[suggested].bg, color: GRADE_CONFIG[suggested].color }}
          >
            {suggested} — {GRADE_CONFIG[suggested].label}
          </span>
        </div>
        <div className="grade-options">
          {Object.entries(GRADE_CONFIG).map(([letter, cfg]) => (
            <button
              key={letter}
              className={`grade-btn ${grade === letter ? 'selected' : ''}`}
              style={{ '--gc': cfg.color }}
              onClick={() => setGrade(letter)}
            >
              <span className="grade-letter">{letter}</span>
              <span className="grade-desc">{cfg.label}</span>
            </button>
          ))}
        </div>
        <div className="submit-row">
          <button
            className="submit-btn"
            disabled={!grade || checkedCount === 0}
            onClick={() => { onChange({ submitted: true }); onSubmit() }}
          >
            ✓ Submit Inspection Report
          </button>
        </div>
        {(!grade || checkedCount === 0) && (
          <p style={{ fontSize: '0.72rem', color: '#374151', marginTop: '0.5rem' }}>
            Complete at least one item and select a grade to submit.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Upload tab ────────────────────────────────────────────────────────────────

function UploadTab({ entity, uploadState, onChange }) {
  const { file, meta, submitted } = uploadState
  const fileRef = useRef()
  const [dragging, setDragging] = useState(false)

  function handleFile(f) {
    if (f) onChange({ file: f })
  }
  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  if (submitted) {
    return (
      <div>
        <div className="submit-success" style={{ marginBottom: '1.25rem' }}>
          📤 Audit report submitted to REEtrieve verification queue
        </div>
        <div className="ov-note" style={{ marginBottom: '1.25rem' }}>
          <strong>Next steps — </strong> Document will be processed by the SGS Verification Bureau within 5–7 business days.
          A digital hash of the document has been anchored to the audit ledger for tamper detection.
        </div>
        <div className="overview-grid">
          {[
            { label: 'File',        value: file?.name ?? '—' },
            { label: 'Auditor',     value: meta.auditor || '—' },
            { label: 'Cert No.',    value: meta.certNo || '—' },
            { label: 'Audit Date',  value: meta.auditDate || '—' },
            { label: 'Org.',        value: meta.org || '—' },
          ].map(({ label, value }) => (
            <div className="ov-card" key={label}>
              <div className="ov-card-label">{label}</div>
              <div className="ov-card-value">{value}</div>
            </div>
          ))}
        </div>
        <button className="submit-btn" style={{ marginTop: '1rem' }} onClick={() => onChange({ submitted: false, file: null })}>
          ← Upload Another Report
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="upload-info-box">
        <span className="upload-info-icon">ℹ</span>
        <span>
          Upload completed audit report PDFs from certified third-party inspectors (SGS, Bureau Veritas, Intertek, LRQA).
          Reports are hashed on submission and cross-referenced against the REEtrieve audit ledger. Accepted formats: PDF, DOCX, XLSX.
        </span>
      </div>

      {file ? (
        <div className="uploaded-file">
          <span className="uf-icon">📄</span>
          <div className="uf-info">
            <div className="uf-name">{file.name}</div>
            <div className="uf-size">{(file.size / 1024).toFixed(1)} KB</div>
          </div>
          <button className="uf-remove" onClick={() => onChange({ file: null })}>✕</button>
        </div>
      ) : (
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          <div className="upload-zone-icon">📂</div>
          <div className="upload-zone-title">Drop your audit report here</div>
          <div className="upload-zone-sub">
            Supports PDF, DOCX, XLSX up to 50 MB<br />
            Reports must originate from a certified third-party inspection body
          </div>
          <button className="upload-zone-btn">Browse files</button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.xlsx"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      )}

      <div className="upload-meta-grid">
        {[
          { key: 'auditor',   label: 'Lead Auditor Name',      placeholder: 'e.g. J. Moreau', full: false },
          { key: 'org',       label: 'Inspection Organisation', placeholder: 'e.g. SGS Group', full: false },
          { key: 'certNo',    label: 'Certificate Number',      placeholder: 'e.g. SGS-2026-00341', full: false },
          { key: 'auditDate', label: 'Audit Date',              placeholder: 'YYYY-MM-DD', full: false },
          { key: 'notes',     label: 'Executive Summary (optional)', placeholder: 'Key findings…', full: true },
        ].map(({ key, label, placeholder, full }) => (
          <div className={`umeta-field ${full ? 'full' : ''}`} key={key}>
            <label className="umeta-label">{label}</label>
            <input
              className="umeta-input"
              placeholder={placeholder}
              value={meta[key] || ''}
              onChange={e => onChange({ meta: { ...meta, [key]: e.target.value } })}
            />
          </div>
        ))}
      </div>

      <button
        className="submit-btn"
        disabled={!file}
        onClick={() => onChange({ submitted: true })}
      >
        📤 Submit Report to Verification Queue
      </button>
      {!file && (
        <p style={{ fontSize: '0.72rem', color: '#374151', marginTop: '0.5rem' }}>
          Upload a document to enable submission.
        </p>
      )}
    </div>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({ entity }) {
  const records = AUDIT_HISTORY[entity.id] || []

  if (!records.length) {
    return (
      <div className="no-history">
        <div className="no-history-icon">📭</div>
        <p>No prior audit records for this entity.<br />Submit an inspection via the Checklist tab to begin the audit trail.</p>
      </div>
    )
  }

  return (
    <div className="history-timeline">
      {records.map((r, i) => {
        const gc = GRADE_CONFIG[r.grade]
        const delta = r.scoreBefore - r.scoreAfter
        return (
          <div key={i} className="ht-entry">
            <div className="ht-dot" style={{ color: gc.color, borderColor: gc.color + '60', background: gc.bg }}>
              {r.grade}
            </div>
            <div className="ht-content">
              <div className="ht-top">
                <span className="ht-date">{r.date}</span>
                <span className="ht-auditor">by {r.auditor}</span>
                {delta > 0 && (
                  <span className="ht-delta">−{delta} pts</span>
                )}
              </div>
              <div className="ht-notes">{r.notes}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Inspector Panel ───────────────────────────────────────────────────────────

function InspectorPanel({ entity, onClose, auditStates, onAuditChange }) {
  const [tab, setTab] = useState('overview')
  const state = auditStates[entity.id] || {}
  const { checked = {}, grade = null, submitted = false } = state
  const uploadState = state.upload || { file: null, meta: {}, submitted: false }

  const checkedCount = Object.values(checked).filter(Boolean).length
  const pct = checkedCount / TOTAL_ITEMS
  const newScore = (submitted && grade)
    ? recalcScore(entity.riskScore, grade, pct)
    : null

  function setAudit(patch) {
    onAuditChange(entity.id, { ...state, ...patch })
  }
  function setUpload(patch) {
    onAuditChange(entity.id, { ...state, upload: { ...uploadState, ...patch } })
  }

  const TABS = [
    { id: 'overview',  icon: '◎',  label: 'Overview' },
    { id: 'checklist', icon: '☑',  label: 'Checklist' },
    { id: 'upload',    icon: '📤', label: 'Upload' },
    { id: 'history',   icon: '📋', label: 'History' },
    { id: 'ai',        icon: '⬡',  label: 'Ask AI' },
  ]

  return (
    <>
      <div className="inspector-head">
        <div className="inspector-head-row">
          <div className="inspector-head-left">
            <div className="inspector-name">{entity.name}</div>
            <div className="inspector-meta">
              <span>{entity.flag} {entity.country}</span>
              <span>·</span>
              <span>{entity.industry}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="risk-delta-bar">
          <div className="rdb-score">
            <div className="rdb-num" style={{ color: riskColor(entity.riskScore) }}>{entity.riskScore}</div>
            <div className="rdb-lbl">Current</div>
          </div>
          {newScore !== null && (
            <>
              <div className="rdb-arrow">→</div>
              <div className="rdb-score">
                <div className={`rdb-num ${newScore < entity.riskScore ? 'rdb-new' : ''}`}>{newScore}</div>
                <div className="rdb-lbl">Post-Audit</div>
              </div>
            </>
          )}
          <div className="rdb-mid">
            <div className="rdb-progress">
              <div className="rdb-fill" style={{
                width: `${newScore ?? entity.riskScore}%`,
                background: `linear-gradient(90deg, ${riskColor(newScore ?? entity.riskScore)}, transparent)`,
              }} />
            </div>
            <div className="rdb-hint">
              {newScore !== null
                ? `Grade ${grade} applied · risk reduced by ${entity.riskScore - newScore} pts`
                : `${entity.riskScore}% risk index · ${checkedCount > 0 ? `${checkedCount}/${TOTAL_ITEMS} items verified` : 'pending inspection'}`
              }
            </div>
          </div>
          {newScore !== null && grade && (
            <div className="gas-pill" style={{
              background: GRADE_CONFIG[grade].bg,
              color: GRADE_CONFIG[grade].color,
              fontSize: '0.95rem',
              padding: '0.3rem 0.7rem',
              borderRadius: '8px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 800,
            }}>
              {grade}
            </div>
          )}
        </div>
      </div>

      <div className="inspector-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`itab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="itab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className={`inspector-body ${tab === 'ai' ? 'inspector-body--chat' : ''}`}>
        {tab === 'overview'  && <OverviewTab entity={entity} />}
        {tab === 'checklist' && (
          <ChecklistTab
            entity={entity}
            auditState={{ checked, grade, submitted }}
            onChange={patch => setAudit({ ...state, ...patch })}
            onSubmit={() => {}}
          />
        )}
        {tab === 'upload' && (
          <UploadTab
            entity={entity}
            uploadState={uploadState}
            onChange={setUpload}
          />
        )}
        {tab === 'history' && <HistoryTab entity={entity} />}
        {tab === 'ai'      && <AuditChat entity={entity} />}
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [continent, setContinent] = useState('all')
  const [selected, setSelected] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  // { [entityId]: { checked, grade, submitted, upload } }
  const [auditStates, setAuditStates] = useState({})

  const filtered = continent === 'all'
    ? HIGH_RISK_ENTITIES
    : HIGH_RISK_ENTITIES.filter(e => e.continent === continent)

  const sorted = [...filtered].sort((a, b) => b.riskScore - a.riskScore)

  function openInspector(entity) {
    setSelected(entity)
    setPanelOpen(true)
  }
  function closeInspector() {
    setPanelOpen(false)
    setTimeout(() => setSelected(null), 310)
  }
  function handleAuditChange(id, state) {
    setAuditStates(prev => ({ ...prev, [id]: state }))
  }

  // summary stats
  const audited   = HIGH_RISK_ENTITIES.filter(e => e.lastAudit || auditStates[e.id]?.submitted).length
  const critical  = HIGH_RISK_ENTITIES.filter(e => e.riskScore >= 85).length
  const pending   = HIGH_RISK_ENTITIES.length - audited

  return (
    <div className="audit-page">
      {/* header */}
      <div className="audit-header">
        <div className="audit-header-top">
          <div>
            <div className="audit-header-badge">
              <span className="audit-badge-dot" />
              SGS Compliance Framework
            </div>
            <div className="audit-title">
              High-Risk Audit &amp; <em>Compliance</em> Dashboard
            </div>
            <div className="audit-subtitle">
              Continent-based view of high-risk mining entities flagged for third-party inspection.
              Click any card to open the Inspector Workflow and submit audit findings.
            </div>
          </div>
          <div className="audit-stats">
            <div className="audit-stat">
              <div className="audit-stat-num" style={{ color: '#f87171' }}>{critical}</div>
              <div className="audit-stat-label">Critical</div>
            </div>
            <div className="audit-stat">
              <div className="audit-stat-num" style={{ color: '#fbbf24' }}>{pending}</div>
              <div className="audit-stat-label">Pending</div>
            </div>
            <div className="audit-stat">
              <div className="audit-stat-num" style={{ color: '#4ade80' }}>{audited}</div>
              <div className="audit-stat-label">Audited</div>
            </div>
          </div>
        </div>

        <div className="audit-summary-bar">
          {[
            { icon: '🌍', val: HIGH_RISK_ENTITIES.length, lbl: 'Flagged entities' },
            { icon: '⚠', val: HIGH_RISK_ENTITIES.filter(e => e.riskFlags.includes('child_labor')).length, lbl: 'Child labor risk' },
            { icon: '⚖', val: HIGH_RISK_ENTITIES.filter(e => e.riskFlags.includes('mass_balance')).length, lbl: 'Mass-balance gaps' },
            { icon: '🔀', val: HIGH_RISK_ENTITIES.filter(e => e.riskFlags.includes('laundering_hub')).length, lbl: 'Laundering hubs' },
          ].map(({ icon, val, lbl }) => (
            <div className="audit-kpi" key={lbl}>
              <span className="audit-kpi-icon">{icon}</span>
              <span className="audit-kpi-val">{val}</span>
              <span className="audit-kpi-lbl">{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* continent tabs */}
      <div className="audit-tabs">
        {CONTINENTS.map(c => {
          const count = c.id === 'all'
            ? HIGH_RISK_ENTITIES.length
            : HIGH_RISK_ENTITIES.filter(e => e.continent === c.id).length
          return (
            <button
              key={c.id}
              className={`audit-tab ${continent === c.id ? 'active' : ''}`}
              onClick={() => setContinent(c.id)}
            >
              {c.id !== 'all' && (
                <span className="audit-tab-dot" style={{ background: c.color }} />
              )}
              {c.label}
              <span className="audit-tab-count">{count}</span>
            </button>
          )
        })}
      </div>

      {/* entity grid */}
      <div className="audit-body">
        <div className="audit-grid">
          {sorted.map(entity => (
            <EntityCard key={entity.id} entity={entity} onInspect={openInspector} />
          ))}
        </div>
      </div>

      {/* inspector panel */}
      <div className={`inspector-overlay ${panelOpen || selected ? '' : ''}`}
        style={{ pointerEvents: panelOpen ? 'all' : 'none' }}
      >
        <div
          className="inspector-backdrop"
          style={{ opacity: panelOpen ? 1 : 0, transition: 'opacity 0.3s' }}
          onClick={closeInspector}
        />
        <div className={`inspector-panel ${panelOpen ? 'open' : ''}`}>
          {selected && (
            <InspectorPanel
              entity={selected}
              onClose={closeInspector}
              auditStates={auditStates}
              onAuditChange={handleAuditChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}
