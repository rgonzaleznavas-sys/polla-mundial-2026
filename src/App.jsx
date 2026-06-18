import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Register from './pages/Register.jsx'
import Picks from './pages/Picks.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Admin from './pages/Admin.jsx'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin2026'

export default function App() {
  const [view, setView] = useState('leaderboard') // leaderboard | picks | admin
  const [player, setPlayer] = useState(null) // { id, name }
  const [adminMode, setAdminMode] = useState(false)
  const [adminInput, setAdminInput] = useState('')
  const [adminError, setAdminError] = useState('')
  const [showAdminLogin, setShowAdminLogin] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('polla_player')
    if (saved) {
      try { setPlayer(JSON.parse(saved)) } catch(e) {}
    }
  }, [])

  function handlePlayerReady(p) {
    setPlayer(p)
    localStorage.setItem('polla_player', JSON.stringify(p))
    setView('picks')
  }

  function handleAdminLogin(e) {
    e.preventDefault()
    if (adminInput === ADMIN_PASSWORD) {
      setAdminMode(true)
      setShowAdminLogin(false)
      setView('admin')
      setAdminError('')
    } else {
      setAdminError('Contraseña incorrecta')
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>⚽ Polla Mundial 2026</h1>
          <p style={{ fontSize: 12, color: 'var(--c-text-2)' }}>Fase de grupos · 72 partidos</p>
        </div>
        {player && (
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', textAlign: 'right' }}>
            👤 {player.name}
            <br />
            <button style={{ fontSize: 11, padding: '2px 6px', marginTop: 4 }} onClick={() => {
              setPlayer(null)
              localStorage.removeItem('polla_player')
              setView('leaderboard')
            }}>Cambiar</button>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', borderBottom: '1px solid var(--c-border)', paddingBottom: 0 }}>
        {[
          { key: 'leaderboard', label: '🏆 Tabla' },
          { key: 'picks', label: '📝 Pronósticos' },
          ...(adminMode ? [{ key: 'admin', label: '🔧 Admin' }] : []),
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setView(key)} style={{
            border: 'none', background: 'none', padding: '6px 12px', marginBottom: -1,
            borderBottom: view === key ? '2px solid var(--c-accent)' : '2px solid transparent',
            fontWeight: view === key ? 600 : 400,
            color: view === key ? 'var(--c-text)' : 'var(--c-text-2)',
            fontSize: 14, borderRadius: 0,
          }}>{label}</button>
        ))}
        <div style={{ flex: 1 }} />
        {!adminMode && (
          <button onClick={() => setShowAdminLogin(v => !v)} style={{
            fontSize: 11, color: 'var(--c-text-3)', border: 'none',
            background: 'none', padding: '4px 8px',
          }}>Admin</button>
        )}
      </div>

      {/* Admin login inline */}
      {showAdminLogin && !adminMode && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="password"
              placeholder="Contraseña admin"
              value={adminInput}
              onChange={e => setAdminInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="primary">Entrar</button>
          </form>
          {adminError && <p style={{ color: 'var(--c-red)', fontSize: 13, marginTop: 6 }}>{adminError}</p>}
        </div>
      )}

      {/* Views */}
      {view === 'leaderboard' && <Leaderboard />}
      {view === 'picks' && (
        player
          ? <Picks player={player} />
          : <Register onReady={handlePlayerReady} />
      )}
      {view === 'admin' && adminMode && <Admin />}
    </div>
  )
}
