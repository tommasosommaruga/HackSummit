import { useState } from 'react'
import AppNav from './components/AppNav.jsx'
import MapPage from './pages/MapPage.jsx'
import ChainPage from './pages/ChainPage.jsx'
import RecyclingPage from './pages/RecyclingPage.jsx'
import ScoringPage from './pages/ScoringPage.jsx'
import AuditPage from './pages/AuditPage.jsx'
import FloatingChat from './components/FloatingChat.jsx'
import './App.css'

export default function App() {
  const [page, setPage] = useState('map')

  function renderPage() {
    if (page === 'map')     return <MapPage />
    if (page === 'chain')   return <ChainPage />
    if (page === 'recycling') return <RecyclingPage />
    if (page === 'scoring') return <ScoringPage />
    if (page === 'audit')   return <AuditPage />
    return null
  }

  return (
    <div className="app-shell">
      <AppNav page={page} onNav={setPage} />
      <div className="page-container">
        {renderPage()}
      </div>
      <FloatingChat />
    </div>
  )
}
