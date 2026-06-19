import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { MATCHES, formatKickoff, isOpen, calcPoints } from '../lib/matches'
import Flag from '../components/Flag'

export default function Results() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [liveFlash, setLiveFlash] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [allPicks, setAllPicks] = useState([])
  const [players, setPlayers] = useState([])

  const loadResults = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const [{ data: res }, { data: picks }, { data: pls }] = await Promise.all([
      supabase.from('results').select('match_id, home_score, away_score, scorers, live_status'),
      supabase.from('picks').select('player_id, match_id, home_score, away_score'),
      supabase.from('players').select('id, name'),
    ])
    const rMap = {}
    ;(res || []).forEach(r => { rMap[r.match_id] = r })
    setResults(rMap)
    setAllPicks(picks || [])
    setPlayers(pls || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadResults() }, [loadResults])

  useEffect(() => {
    const channel = supabase
      .channel('results-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => {
        loadResults(false)
        setLiveFlash(true)
        setTimeout(() => setLiveFlash(false), 2000)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadResults])

  if (loading) return <p style={{ color: 'var(--c-text-2)', padding: '1rem 0' }}>Cargando resultados...</p>

  function formatLiveTime(status) {
    if (!status) return ''
    const s = String(status).toLowerCase()
    if (s === 'halftime' || s === 'ht') return 'Medio tiempo'
    if (s === 'fulltime' || s === 'finished') return 'Final'
    if (/^\d+(\+\d+)?$/.test(s)) return `${s}'`
    return status
  }

  const byDate = {}
  MATCHES.forEach(m => {
    const date = m.kickoff.slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(m)
  })

  const playedCount = Object.keys(results).length
  const liveMatches = MATCHES.filter(m => results[m.id]?.live_status)

  function playerName(id) {
    return players.find(p => p.id === id)?.name || '?'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: 'var(--c-text-2)' }}>
          Resultados oficiales
          {liveFlash && <span style={{ marginLeft: 8, color: 'var(--c-green)', fontWeight: 600 }}>● actualizado</span>}
        </p>
        <span className="badge badge-group">{playedCount}/72 jugados</span>
      </div>

      {liveMatches.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: '#fff',
            background: 'var(--c-red)', padding: '6px 12px', borderRadius: '8px 8px 0 0',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }}></span>
            EN VIVO AHORA
          </div>
          <div className="card" style={{ borderRadius: '0 0 12px 12px' }}>
            {liveMatches.map((m, idx) => {
              const r = results[m.id]
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                  borderTop: idx > 0 ? '1px solid var(--c-border)' : 'none',
                }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>{m.home} <Flag team={m.home} size={16} /></span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, padding: '2px 10px', background: 'var(--c-red-bg)', borderRadius: 6 }}>
                      {r.home_score} – {r.away_score}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-red)' }}>{formatLiveTime(r.live_status)}</span>
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}><Flag team={m.away} size={16} /> {m.away}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {Object.entries(byDate).map(([date, matches]) => {
        const matchesWithResults = matches.filter(m => results[m.id])
        if (!matchesWithResults.length) return null
        const label = new Date(date + 'T12:00:00').toLocaleDateString('es-PA', { weekday: 'short', month: 'short', day: 'numeric' })
        return (
          <div key={date} style={{ marginBottom: '1.25rem' }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)',
              textTransform: 'uppercase', letterSpacing: '.05em',
              marginBottom: 6, padding: '4px 0',
              borderBottom: '1px solid var(--c-border)'
            }}>{label}</div>
            {matchesWithResults.map(m => {
              const r = results[m.id]
              const closed = !isOpen(m)
              const isExpanded = expanded === m.id
              const matchPicks = allPicks.filter(p => p.match_id === m.id)
              return (
                <div key={m.id} className="card" style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>{m.home} <Flag team={m.home} /></span>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 17, fontWeight: 700, padding: '4px 12px',
                        background: r.live_status ? 'var(--c-red-bg)' : 'var(--c-bg)', borderRadius: 8, minWidth: 64, justifyContent: 'center',
                      }}>
                        <span>{r.home_score}</span>
                        <span style={{ color: 'var(--c-text-3)', fontSize: 13 }}>–</span>
                        <span>{r.away_score}</span>
                      </div>
                      {r.live_status && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--c-red)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--c-red)', display: 'inline-block' }}></span>
                          {formatLiveTime(r.live_status)}
                        </span>
                      )}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><Flag team={m.away} /> {m.away}</span>
                  </div>
                  {r.scorers && (
                    <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 8, textAlign: 'center' }}>
                      ⚽ {r.scorers}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 6, textAlign: 'center' }}>
                    Grupo {m.group} · {m.stadium} · {formatKickoff(m.kickoff)}
                  </div>

                  {closed && matchPicks.length > 0 && (
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : m.id)}
                        style={{ fontSize: 11, padding: '4px 10px' }}
                      >
                        {isExpanded ? '▲ Ocultar pronósticos' : `▼ Ver pronósticos (${matchPicks.length})`}
                      </button>
                    </div>
                  )}

                  {closed && isExpanded && (
                    <div style={{ marginTop: 8, borderTop: '1px solid var(--c-border)', paddingTop: 8 }}>
                      {matchPicks
                        .slice()
                        .sort((a, b) => calcPoints(b, r) - calcPoints(a, r))
                        .map(p => {
                          const pts = calcPoints(p, r)
                          return (
                            <div key={p.player_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '4px 4px' }}>
                              <span style={{ color: 'var(--c-text-2)' }}>{playerName(p.player_id)}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 600 }}>{p.home_score}–{p.away_score}</span>
                                <span className={`badge ${pts >= 3 ? 'badge-exact' : pts === 1 ? 'badge-winner' : 'badge-miss'}`} style={{ fontSize: 10 }}>
                                  {pts >= 3 ? `+${pts}` : pts === 1 ? '+1' : '0'}
                                </span>
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {playedCount === 0 && (
        <div className="card">
          <p style={{ color: 'var(--c-text-2)', fontSize: 14 }}>Aún no hay resultados cargados.</p>
        </div>
      )}
    </div>
  )
}
