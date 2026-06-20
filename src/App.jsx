import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Register from './pages/Register.jsx'
import Picks from './pages/Picks.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Results from './pages/Results.jsx'
import Standings from './pages/Standings.jsx'
import Admin from './pages/Admin.jsx'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin2026'

export default function App() {
  const [view, setView] = useState('leaderboard')
  const [player, setPlayer] = useState(null)
  const [adminMode, setAdminMode] = useState(false)
  const [adminInput, setAdminInput] = useState('')
  const [adminError, setAdminError] = useState('')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const [tapTimer, setTapTimer] = useState(null)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect iOS (Safari doesn't support beforeinstallprompt, needs manual instructions)
    const ua = window.navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
    setIsIOS(ios)

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    const dismissed = localStorage.getItem('polla_install_dismissed')

    if (!isStandalone && !dismissed) {
      if (ios) {
        setShowInstallBanner(true)
      }
    }

    function handleBeforeInstall(e) {
      e.preventDefault()
      setInstallPrompt(e)
      if (!isStandalone && !dismissed) setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  async function handleInstallClick() {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstallBanner(false)
      }
      setInstallPrompt(null)
    }
  }

  function dismissInstallBanner() {
    setShowInstallBanner(false)
    localStorage.setItem('polla_install_dismissed', '1')
  }

  function handleTitleTap() {
    const newCount = tapCount + 1
    setTapCount(newCount)
    if (tapTimer) clearTimeout(tapTimer)
    if (newCount >= 3) {
      setShowAdminLogin(true)
      setTapCount(0)
      return
    }
    const t = setTimeout(() => setTapCount(0), 600)
    setTapTimer(t)
  }

  useEffect(() => {
    const saved = localStorage.getItem('polla_player')
    if (saved) {
      try {
        const parsedPlayer = JSON.parse(saved)
        // Verifica que el participante guardado siga existiendo (no haya sido borrado por el admin)
        supabase
          .from('players')
          .select('id, name')
          .eq('id', parsedPlayer.id)
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              // El participante fue borrado — limpia el storage para permitir registrarse de nuevo
              localStorage.removeItem('polla_player')
              setPlayer(null)
            } else {
              setPlayer(data)
            }
          })
      } catch(e) {
        localStorage.removeItem('polla_player')
      }
    }
    // Genera un ID de dispositivo persistente para evitar múltiples registros
    let deviceId = localStorage.getItem('polla_device_id')
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('polla_device_id', deviceId)
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
      <div className="header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={handleTitleTap} style={{ cursor: 'default', userSelect: 'none', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>⚽ Polla Mundial 2026</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Fase de grupos · 72 partidos</p>
        </div>
        {player && (
          <div style={{ fontSize: 13, color: '#fff', textAlign: 'right', position: 'relative', zIndex: 1 }}>
            👤 {player.name}
          </div>
        )}
      </div>

      {showInstallBanner && (
        <div className="card" style={{
          marginBottom: '1rem',
          background: 'var(--c-gold-bg)', borderColor: 'var(--c-gold)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon-192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Instala la app</div>
              {isIOS ? (
                <div style={{ fontSize: 11, color: 'var(--c-text-2)' }}>
                  Toca <strong>Compartir</strong> (⬆️ abajo) → <strong>"Agregar a pantalla de inicio"</strong>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--c-text-2)' }}>
                  Toca los <strong>⋮ tres puntos</strong> arriba a la derecha de Chrome → <strong>"Instalar app"</strong>
                </div>
              )}
            </div>
            <button onClick={dismissInstallBanner} style={{ fontSize: 16, padding: '4px 8px', border: 'none', background: 'none', color: 'var(--c-text-3)' }}>×</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', borderBottom: '1px solid var(--c-border)', paddingBottom: 0 }}>
        {[
          { key: 'leaderboard', label: '🏆 Tabla' },
          { key: 'results', label: '⚽ Resultados' },
          { key: 'standings', label: '📊 Posiciones' },
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
      </div>

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

      {view === 'leaderboard' && <Leaderboard />}
      {view === 'results' && <Results />}
      {view === 'standings' && <Standings />}
      {view === 'picks' && (
        player
          ? <Picks player={player} />
          : <Register onReady={handlePlayerReady} />
      )}
      {view === 'admin' && adminMode && <Admin />}
    </div>
  )
}
