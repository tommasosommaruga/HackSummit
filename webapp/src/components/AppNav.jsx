import './AppNav.css'

const NAV_ITEMS = [
  { id: 'map',     icon: '⛏',  label: 'Mines & Refineries' },
  { id: 'chain',   icon: '⛓',  label: 'Supply Chain' },
  { id: 'scoring', icon: '◈',   label: 'Risk Scoring' },
  { id: 'trust',   icon: '◎',   label: 'Trust Score' },
  { id: 'audit',   icon: '🔍',  label: 'Audit Dashboard' },
]

export default function AppNav({ page, onNav }) {
  return (
    <nav className="app-nav">
      <div className="app-nav-logo" onClick={() => onNav('map')}>
        REE<span>trieve</span>
      </div>

      <div className="app-nav-links">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`app-nav-link ${page === item.id ? 'active' : ''}`}
            onClick={() => onNav(item.id)}
          >
            <span className="app-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="app-nav-right">
        <div className="app-nav-pulse"><span className="app-nav-dot" />LIVE</div>
        <div className="app-nav-tag">HACK SUMMIT · 2026</div>
      </div>
    </nav>
  )
}
