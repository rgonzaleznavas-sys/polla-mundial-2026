import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { MATCHES, isOpen, formatKickoff, calcPoints } from '../lib/matches'

export default function Picks({ player }) {
  const [picks, setPicks] = useState({})    // { matchId: { home_score, away_score } }
  const [results, setResults] = useState({}) // { matchId: { home_score, away_score } }
  const [saving, setSaving] = useState({})
  const [loaded, setLoaded] = useState(false)

  const loadData = useCallback(async () => {
    const [{ data: picksData }, { data: resultsData }] = await Promise.all([
      supabase.from('picks').select('match_id, home_score, away_score').eq('player_id', player.id),
      supabase.from('results').select('match_id, home_score, away_score'),
    ])
    const pMap = {}
    ;(picksData || []).forEach(p => { pMap[p.match_id] = { home_score: p.home_score, away_score: p.away_score } })
    const rMap = {}
    ;(resultsData || []).forEach(r => { rMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score } })
    setPicks(pMap)
    setResults(rMap)
    setLoaded(true)
  }, [player.id])

  useEffect(() => { loadData() }, [loadData])

  async function savePick(matchId, homeScore, awayScore) {
    setSaving(s => ({ ...s, [matchId]: true }))
    const { error } = await supabase.from('picks').upsert(
      { player_id: player.id, match_id: matchId, home_score: homeScore, away_score: awayScore },
      { onConflict: 'player_id,match_id' }
    )
    if (!error) {
      setPicks(p => ({ ...p, [matchId]: { home_score: homeScore, away_score: awayScore } }))
    }
    setSaving(s => ({ ...s, [matchId]: false }))
  }

  function handleScore(matchId, side, val) {
    const parsed = val === '' ? null : Math.max(0, Math.min(20, parseInt(val) || 0))
    const current = picks[matchId] || { home_score: null, away_score: null }
    const updated = { ...current, [side]: parsed }
    setPicks(p => ({ ...p, [matchId]: updated }))
    if (updated.home_score !== null && updated.away_score !== null) {
      savePick(matchId, updated.home_score, updated.away_score)
    }
  }

  if (!loaded) return <p style={{ color: 'var(--c-text-2)', padding: '1rem 0' }}>Cargando pronósticos...</p>

  // Group matches by date
  const byDate = {}
  MATCHES.forEach(m => {
    const date = m.kickoff.slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(m)
  })

  const openCount = MATCHES.filter(isOpen).length
  const filledOpen = MATCHES.filter(m => isOpen(m) && picks[m.id]?.home_score !== null && picks[m.id]?.away_score !== null).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: 'var(--c-text-2)' }}>
          Pronósticos de <strong>{player.name}</strong>
        </p>
        <span className="badge badge-group">{filledOpen}/{openCount} completados</span>
      </div>

      {Object.entries(byDate).map(([date, matches]) => {
        const label = new Date(date + 'T12:00:00').toLocaleDateString('es-PA', { weekday: 'short', month: 'short', day: 'numeric' })
        return (
          <div key={date} style={{ marginBottom: '1.25rem' }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)',
              textTransform: 'uppercase', letterSpacing: '.05em',
              marginBottom: 6, padding: '4px 0',
              borderBottom: '1px solid var(--c-border)'
            }}>{label}</div>
            {matches.map(m => {
              const open = isOpen(m)
              const pick = picks[m.id] || { home_score: null, away_score: null }
              const result = results[m.id]
              const pts = result ? calcPoints(pick, result) : null
              return (
                <div key={m.id} className="card" style={{ marginBottom: 6, opacity: !open && !result ? .65 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textAlign: 'right' }}>{m.home}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number" min="0" max="20"
                        value={pick.home_score ?? ''}
                        disabled={!open}
                        onChange={e => handleScore(m.id, 'home_score', e.target.value)}
                        style={{ width: 38, textAlign: 'center', padding: '6px 4px', fontSize: 15, fontWeight: 600 }}
                      />
                      <span style={{ color: 'var(--c-text-3)', fontSize: 13 }}>–</span>
                      <input
                        type="number" min="0" max="20"
                        value={pick.away_score ?? ''}
                        disabled={!open}
                        onChange={e => handleScore(m.id, 'away_score', e.target.value)}
                        style={{ width: 38, textAlign: 'center', padding: '6px 4px', fontSize: 15, fontWeight: 600 }}
                      />
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{m.away}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`badge badge-group`}>Grupo {m.group}</span>
                      <span className={`badge ${open ? 'badge-open' : 'badge-closed'}`}>
                        {open ? '🟢 Abierto' : '🔒 Cerrado'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{formatKickoff(m.kickoff)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {result && (
                        <span style={{ fontSize: 12, color: 'var(--c-text-2)' }}>
                          Real: <strong>{result.home_score}–{result.away_score}</strong>
                        </span>
                      )}
                      {pts !== null && (
                        <span className={`badge ${pts >= 3 ? 'badge-exact' : pts === 1 ? 'badge-winner' : 'badge-miss'}`}>
                          {pts >= 3 ? `+${pts}pts ✅` : pts === 1 ? '+1pt ↗' : '0pts ❌'}
                        </span>
                      )}
                      {saving[m.id] && <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>💾</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
