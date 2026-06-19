import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MATCHES, formatKickoff } from '../lib/matches'

export default function Admin() {
  const [tab, setTab] = useState('results') // results | players
  const [results, setResults] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [players, setPlayers] = useState([])
  const [deleting, setDeleting] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  async function syncNow() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/sync-results', {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_CRON_SECRET || ''}` },
      })
      const data = await res.json()
      if (res.ok) {
        setSyncMsg({ ok: true, text: `✓ Sincronizado: ${data.updated} resultado(s) actualizado(s) de ${data.fixturesFromApi} partidos consultados.` })
        loadResults()
      } else {
        setSyncMsg({ ok: false, text: `Error: ${data.error || 'No se pudo sincronizar'}` })
      }
    } catch (e) {
      setSyncMsg({ ok: false, text: `Error de conexión: ${e.message}` })
    }
    setSyncing(false)
  }

  useEffect(() => {
    loadResults()
    loadPlayers()
  }, [])

  async function loadResults() {
    const { data } = await supabase.from('results').select('match_id, home_score, away_score, scorers')
    const rMap = {}
    ;(data || []).forEach(r => { rMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score, scorers: r.scorers || '' } })
    setResults(rMap)
    setLoaded(true)
  }

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('id, name, created_at').order('created_at')
    setPlayers(data || [])
  }

  function handleChange(matchId, field, val) {
    if (field === 'scorers') {
      setResults(r => ({ ...r, [matchId]: { ...(r[matchId] || {}), scorers: val } }))
      return
    }
    const parsed = val === '' ? null : Math.max(0, Math.min(20, parseInt(val) || 0))
    setResults(r => ({ ...r, [matchId]: { ...(r[matchId] || {}), [field]: parsed } }))
  }

  async function saveResult(matchId) {
    const r = results[matchId]
    if (!r || r.home_score === null || r.away_score === null) return
    setSaving(s => ({ ...s, [matchId]: true }))
    const { error } = await supabase.from('results').upsert(
      { match_id: matchId, home_score: r.home_score, away_score: r.away_score, scorers: r.scorers || null },
      { onConflict: 'match_id' }
    )
    setSaving(s => ({ ...s, [matchId]: false }))
    if (!error) {
      setSaved(s => ({ ...s, [matchId]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [matchId]: false })), 2000)
    }
  }

  async function deletePlayer(id) {
    setDeleting(d => ({ ...d, [id]: true }))
    const { error } = await supabase.from('players').delete().eq('id', id)
    setDeleting(d => ({ ...d, [id]: false }))
    setConfirmDelete(null)
    if (!error) {
      setPlayers(p => p.filter(pl => pl.id !== id))
    }
  }

  if (!loaded) return <p style={{ color: 'var(--c-text-2)', padding: '1rem 0' }}>Cargando...</p>

  const byDate = {}
  MATCHES.forEach(m => {
    const date = m.kickoff.slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(m)
  })

  const doneCount = Object.keys(results).filter(id => results[id]?.home_score !== null && results[id]?.home_score !== undefined).length

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
        <button
          onClick={() => setTab('results')}
          style={{
            fontSize: 13, padding: '6px 14px',
            background: tab === 'results' ? 'var(--c-accent)' : 'var(--c-surface)',
            color: tab === 'results' ? '#fff' : 'var(--c-text)',
            borderColor: tab === 'results' ? 'var(--c-accent)' : 'var(--c-border)',
          }}
        >Resultados</button>
        <button
          onClick={() => setTab('players')}
          style={{
            fontSize: 13, padding: '6px 14px',
            background: tab === 'players' ? 'var(--c-accent)' : 'var(--c-surface)',
            color: tab === 'players' ? '#fff' : 'var(--c-text)',
            borderColor: tab === 'players' ? 'var(--c-accent)' : 'var(--c-border)',
          }}
        >Participantes ({players.length})</button>
      </div>

      {tab === 'results' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Panel de resultados</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-group">{doneCount}/72 ingresados</span>
              <button
                onClick={syncNow}
                disabled={syncing}
                className="primary"
                style={{ fontSize: 12, padding: '6px 12px' }}
              >{syncing ? '🔄 Actualizando...' : '🔄 Actualizar ahora'}</button>
            </div>
          </div>
          {syncMsg && (
            <div className="card" style={{ marginBottom: '1rem', fontSize: 13, background: syncMsg.ok ? 'var(--c-green-bg)' : 'var(--c-red-bg)', color: syncMsg.ok ? 'var(--c-green)' : 'var(--c-red)', border: 'none' }}>
              {syncMsg.text}
            </div>
          )}

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
                  const r = results[m.id] || { home_score: null, away_score: null, scorers: '' }
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

                      <input
                        type="text"
                        placeholder="Goleadores (opcional) — ej: Messi 17', 60'"
                        value={r.scorers || ''}
                        onChange={e => handleChange(m.id, 'scorers', e.target.value)}
                        style={{ width: '100%', marginTop: 8, fontSize: 12, padding: '6px 8px' }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                          Grupo {m.group} · {m.stadium} · {formatKickoff(m.kickoff)}
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
      )}

      {tab === 'players' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>Gestionar participantes</h2>
          {players.length === 0 && (
            <p style={{ color: 'var(--c-text-2)', fontSize: 14 }}>No hay participantes registrados aún.</p>
          )}
          {players.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                  Registrado: {new Date(p.created_at).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              {confirmDelete === p.id ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--c-red)' }}>¿Borrar?</span>
                  <button
                    onClick={() => deletePlayer(p.id)}
                    disabled={deleting[p.id]}
                    style={{ fontSize: 12, padding: '4px 10px', background: 'var(--c-red)', color: '#fff', borderColor: 'var(--c-red)' }}
                  >{deleting[p.id] ? '...' : 'Sí, borrar'}</button>
                  <button onClick={() => setConfirmDelete(null)} style={{ fontSize: 12, padding: '4px 10px' }}>Cancelar</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(p.id)}
                  style={{ fontSize: 12, padding: '4px 10px', color: 'var(--c-red)' }}
                >🗑 Borrar</button>
              )}
            </div>
          ))}
          <p style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: '1rem' }}>
            Borrar un participante también elimina todos sus pronósticos guardados.
          </p>
        </div>
      )}
    </div>
  )
}
