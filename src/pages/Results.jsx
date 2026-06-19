import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { MATCHES, formatKickoff } from '../lib/matches'

export default function Results() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [liveFlash, setLiveFlash] = useState(false)

  const loadResults = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const { data } = await supabase.from('results').select('match_id, home_score, away_score, scorers')
    const rMap = {}
    ;(data || []).forEach(r => { rMap[r.match_id] = r })
    setResults(rMap)
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

  const byDate = {}
  MATCHES.forEach(m => {
    const date = m.kickoff.slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(m)
  })

  const playedCount = Object.keys(results).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, color: 'var(--c-text-2)' }}>
          Resultados oficiales
          {liveFlash && <span style={{ marginLeft: 8, color: 'var(--c-green)', fontWeight: 600 }}>● actualizado</span>}
        </p>
        <span className="badge badge-group">{playedCount}/72 jugados</span>
      </div>

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
              return (
                <div key={m.id} className="card" style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textAlign: 'right' }}>{m.home}</span>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 17, fontWeight: 700, padding: '4px 12px',
                      background: 'var(--c-bg)', borderRadius: 8, minWidth: 64, justifyContent: 'center',
                    }}>
                      <span>{r.home_score}</span>
                      <span style={{ color: 'var(--c-text-3)', fontSize: 13 }}>–</span>
                      <span>{r.away_score}</span>
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{m.away}</span>
                  </div>
                  {r.scorers && (
                    <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 8, textAlign: 'center' }}>
                      ⚽ {r.scorers}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 6, textAlign: 'center' }}>
                    Grupo {m.group} · {m.stadium} · {formatKickoff(m.kickoff)}
                  </div>
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
