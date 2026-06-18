import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MATCHES, formatKickoff } from '../lib/matches'

export default function Admin() {
  const [results, setResults] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('results').select('match_id, home_score, away_score')
      const rMap = {}
      ;(data || []).forEach(r => { rMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score } })
      setResults(rMap)
      setLoaded(true)
    }
    load()
  }, [])

  function handleChange(matchId, side, val) {
    const parsed = val === '' ? null : Math.max(0, Math.min(20, parseInt(val) || 0))
    setResults(r => ({ ...r, [matchId]: { ...(r[matchId] || {}), [side]: parsed } }))
  }

  async function saveResult(matchId) {
    const r = results[matchId]
    if (!r || r.home_score === null || r.away_score === null) return
    setSaving(s => ({ ...s, [matchId]: true }))
    const { error } = await supabase.from('results').upsert(
      { match_id: matchId, home_score: r.home_score, away_score: r.away_score },
      { onConflict: 'match_id' }
    )
    setSaving(s => ({ ...s, [matchId]: false }))
    if (!error) {
      setSaved(s => ({ ...s, [matchId]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [matchId]: false })), 2000)
    }
  }

  if (!loaded) return <p style={{ color: 'var(--c-text-2)', padding: '1rem 0' }}>Cargando...</p>

  // Group by date
  const byDate = {}
  MATCHES.forEach(m => {
    const date = m.kickoff.slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(m)
  })

  const doneCount = Object.keys(results).filter(id => results[id]?.home_score !== null).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Panel de resultados</h2>
        <span className="badge badge-group">{doneCount}/72 ingresados</span>
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
              const r = results[m.id] || { home_score: null, away_score: null }
              const hasResult = r.home_score !== null && r.away_score !== null
              return (
                <div key={m.id} className="card" style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textAlign: 'right' }}>{m.home}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number" min="0" max="20"
                        value={r.home_score ?? ''}
                        onChange={e => handleChange(m.id, 'home_score', e.target.value)}
                        style={{ width: 38, textAlign: 'center', padding: '6px 4px', fontSize: 15, fontWeight: 600 }}
                      />
                      <span style={{ color: 'var(--c-text-3)', fontSize: 13 }}>–</span>
                      <input
                        type="number" min="0" max="20"
                        value={r.away_score ?? ''}
                        onChange={e => handleChange(m.id, 'away_score', e.target.value)}
                        style={{ width: 38, textAlign: 'center', padding: '6px 4px', fontSize: 15, fontWeight: 600 }}
                      />
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{m.away}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                      Grupo {m.group} · {formatKickoff(m.kickoff)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {saved[m.id] && <span style={{ fontSize: 12, color: 'var(--c-green)' }}>✓ Guardado</span>}
                      <button
                        onClick={() => saveResult(m.id)}
                        disabled={saving[m.id] || r.home_score === null || r.away_score === null}
                        className={hasResult ? '' : 'primary'}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                      >
                        {saving[m.id] ? '...' : hasResult ? 'Actualizar' : 'Guardar'}
                      </button>
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
