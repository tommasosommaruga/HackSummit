import { useState, useCallback } from 'react'
import AppNav from './components/AppNav.jsx'
import MapPage from './pages/MapPage.jsx'
import ChainPage from './pages/ChainPage.jsx'
import ScoringPage from './pages/ScoringPage.jsx'
import TrustPage from './pages/TrustPage.jsx'
import './App.css'

export default function App() {
  const [page, setPage] = useState('map')

  function renderPage() {
    if (page === 'map')     return <MapPage />
    if (page === 'chain')   return <ChainPage />
    if (page === 'scoring') return <ScoringPage />
    if (page === 'trust')   return <TrustPage onGoMap={() => setPage('map')} />
    return null
  }

  return (
    <div className="app-shell">
      <AppNav page={page} onNav={setPage} />
      <div className="page-container">
        {renderPage()}
      </div>
    </div>
  )
}
