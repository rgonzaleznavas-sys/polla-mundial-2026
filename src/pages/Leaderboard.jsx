import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MATCHES, calcPoints } from '../lib/matches'

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [picks, setPicks] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: pls }, { data: pks }, { data: res }] = await Promise.all([
        supabase.from('players').select('id, name').order('created_at'),
        supabase.from('picks').select('player_id, match_id, home_score, away_score'),
        supabase.from('results').select('match_id, home_score, away_score'),
      ])
      setPlayers(pls || [])
      setPicks(pks || [])
      const rMap = {}
      ;(res || []).forEach(r => { rMap[r.match_id] = r })
      setResults(rMap)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p style={{ color: 'var(--c-text-2)', padding: '1rem 0' }}>Cargando tabla...</p>
  if (!players.length) return (
    <div className="card">
      <p style={{ color: 'var(--c-text-2)', fontSize: 14 }}>Aún no hay participantes. ¡Sé el primero en registrarte!</p>
    </div>
  )

  const resultedCount = Object.keys(results).length

  // Compute scores per player
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: 'var(--c-text-2)' }}>{players.length} participantes</p>
        <span className="badge badge-group">{resultedCount}/72 resultados</span>
      </div>

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
        ✅ exacto = 3pts &nbsp;·&nbsp; empate exacto = 5pts &nbsp;·&nbsp; ↗ ganador = 1pt
      </div>
    </div>
  )
}
