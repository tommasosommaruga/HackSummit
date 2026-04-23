import { useState } from 'react'
import AuditChat from './AuditChat.jsx'
import { HIGH_RISK_ENTITIES } from '../data/audit.js'
import './FloatingChat.css'

export default function FloatingChat() {
  const [open, setOpen]       = useState(false)
  const [entityId, setEntityId] = useState(HIGH_RISK_ENTITIES[0].id)

  const entity = HIGH_RISK_ENTITIES.find(e => e.id === entityId)

  return (
    <div className="fc-root">
      {/* ── floating panel ── */}
      {open && (
        <div className="fc-panel">
          <div className="fc-header">
            <span className="fc-orb">⬡</span>
            <select
              className="fc-entity-select"
              value={entityId}
              onChange={e => setEntityId(e.target.value)}
            >
              {HIGH_RISK_ENTITIES.map(e => (
                <option key={e.id} value={e.id}>
                  {e.flag} {e.name}
                </option>
              ))}
            </select>
            <button className="fc-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="fc-body">
            <AuditChat entity={entity} />
          </div>
        </div>
      )}

      {/* ── toggle button ── */}
      {!open && (
        <button className="fc-toggle" onClick={() => setOpen(true)} title="Open AI chat">
          <span className="fc-toggle-orb">⬡</span>
          <span className="fc-toggle-label">Ask AI</span>
        </button>
      )}
    </div>
  )
}
