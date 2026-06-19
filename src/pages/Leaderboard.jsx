import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { MATCHES, calcPoints } from '../lib/matches'
import Flag from '../components/Flag'

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [picks, setPicks] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [liveFlash, setLiveFlash] = useState(false)

  const loadAll = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const [{ data: pls }, { data: pks }, { data: res }] = await Promise.all([
      supabase.from('players').select('id, name').order('created_at'),
      supabase.from('picks').select('player_id, match_id, home_score, away_score'),
      supabase.from('results').select('match_id, home_score, away_score, scorers, live_status'),
    ])
    setPlayers(pls || [])
    setPicks(pks || [])
    const rMap = {}
    ;(res || []).forEach(r => { rMap[r.match_id] = r })
    setResults(rMap)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Realtime: refresca automáticamente cuando cambian resultados, picks o jugadores
  useEffect(() => {
    const channel = supabase
      .channel('polla-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => {
        loadAll(false)
        flashLive()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        loadAll(false)
        flashLive()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picks' }, () => {
        loadAll(false)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadAll])

  // Auto-sync: llama a /api/sync-results cada 20s mientras esta pantalla esté abierta,
  // para traer resultados nuevos desde la fuente externa sin que el admin tenga que apretar el botón
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/sync-results', {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_CRON_SECRET || ''}` },
      }).catch(() => {})
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  function flashLive() {
    setLiveFlash(true)
    setTimeout(() => setLiveFlash(false), 2000)
  }

  if (loading) return <p style={{ color: 'var(--c-text-2)', padding: '1rem 0' }}>Cargando tabla...</p>
  if (!players.length) return (
    <div className="card">
      <p style={{ color: 'var(--c-text-2)', fontSize: 14 }}>Aún no hay participantes. ¡Sé el primero en registrarte!</p>
    </div>
  )

  const resultedCount = Object.keys(results).length

  const ranked = players.map(p => {
    const myPicks = picks.filter(pk => pk.player_id === p.id)
    let pts = 0, exact = 0, winner = 0, miss = 0, pending = 0
    MATCHES.forEach(m => {
      const res = results[m.id]
      const pick = myPicks.find(pk => pk.match_id === m.id)
      if (!res) { if (pick) pending++; return }
      if (!pick) { miss++; return }
      const p_ = calcPoints(pick, res)
      pts += p_
      if (p_ >= 3) exact++
      else if (p_ === 1) winner++
      else miss++
    })
    return { ...p, pts, exact, winner, miss, pending }
  }).sort((a, b) => b.pts - a.pts || b.exact - a.exact)

  const medals = ['🥇', '🥈', '🥉']

  // Últimos 3 resultados para mostrar resumen "en vivo"
  const recentResults = MATCHES
    .filter(m => results[m.id])
    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff))
    .slice(0, 3)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: 'var(--c-text-2)' }}>
          {players.length} participantes
          {liveFlash && <span style={{ marginLeft: 8, color: 'var(--c-green)', fontWeight: 600 }}>● actualizado</span>}
        </p>
        <span className="badge badge-group">{resultedCount}/72 resultados</span>
      </div>

      {recentResults.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', background: 'var(--c-bg)' }}>
          <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-green)', display: 'inline-block' }}></span>
            Últimos resultados
          </div>
          {recentResults.map((m, idx) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 0',
              borderTop: idx > 0 ? '1px solid var(--c-border)' : 'none',
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Flag team={m.home} size={16} /> {m.home}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, padding: '0 8px' }}>
                {results[m.id].home_score} – {results[m.id].away_score}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                {m.away} <Flag team={m.away} size={16} />
              </div>
            </div>
          ))}
        </div>
      )}

      {ranked.map((p, i) => (
        <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: i < 3 ? 22 : 15, minWidth: 28, textAlign: 'center', color: 'var(--c-text-2)', fontWeight: 600 }}>
            {medals[i] || `#${i + 1}`}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 2 }}>
              <span className="badge badge-exact" style={{ marginRight: 4 }}>✅ {p.exact}</span>
              <span className="badge badge-winner" style={{ marginRight: 4 }}>↗ {p.winner}</span>
              <span className="badge badge-miss">❌ {p.miss}</span>
              {p.pending > 0 && <span style={{ marginLeft: 6, color: 'var(--c-text-3)' }}>· {p.pending} pendiente{p.pending > 1 ? 's' : ''}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{p.pts}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>pts</div>
          </div>
        </div>
      ))}

      <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--c-border)' }}>
        ✅ exacto = 3pts &nbsp;·&nbsp; empate exacto = 5pts &nbsp;·&nbsp; ↗ ganador = 1pt &nbsp;·&nbsp; 🔴 en vivo
      </div>
    </div>
  )
}
