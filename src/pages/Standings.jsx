import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { MATCHES } from '../lib/matches'
import Flag from '../components/Flag'

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function computeStandings(group, results) {
  const teams = {}
  const matches = MATCHES.filter(m => m.group === group)

  matches.forEach(m => {
    if (!teams[m.home]) teams[m.home] = { team: m.home, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, form: [] }
    if (!teams[m.away]) teams[m.away] = { team: m.away, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, form: [] }
  })

  matches.forEach(m => {
    const r = results[m.id]
    if (!r || r.home_score === null || r.home_score === undefined) return
    const home = teams[m.home]
    const away = teams[m.away]
    home.pj++; away.pj++
    home.gf += r.home_score; home.gc += r.away_score
    away.gf += r.away_score; away.gc += r.home_score

    if (r.home_score > r.away_score) {
      home.g++; home.pts += 3; home.form.push('W')
      away.p++; away.form.push('L')
    } else if (r.home_score < r.away_score) {
      away.g++; away.pts += 3; away.form.push('W')
      home.p++; home.form.push('L')
    } else {
      home.e++; home.pts += 1; home.form.push('D')
      away.e++; away.pts += 1; away.form.push('D')
    }
  })

  return Object.values(teams).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const dgA = a.gf - a.gc, dgB = b.gf - b.gc
    if (dgB !== dgA) return dgB - dgA
    return b.gf - a.gf
  })
}

export default function Standings() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)

  const loadResults = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const { data } = await supabase.from('results').select('match_id, home_score, away_score')
    const rMap = {}
    ;(data || []).forEach(r => { rMap[r.match_id] = r })
    setResults(rMap)
    setLoading(false)
  }, [])

  useEffect(() => { loadResults() }, [loadResults])

  useEffect(() => {
    const channel = supabase
      .channel('standings-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => loadResults(false))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadResults])

  if (loading) return <p style={{ color: 'var(--c-text-2)', padding: '1rem 0' }}>Cargando posiciones...</p>

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--c-text-2)', marginBottom: '1rem' }}>
        Posiciones calculadas en base a los resultados oficiales cargados
      </p>

      {GROUPS.map(group => {
        const standings = computeStandings(group, results)
        return (
          <div key={group} style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#fff',
              background: 'var(--header-gradient)',
              padding: '6px 12px', borderRadius: '8px 8px 0 0',
            }}>Grupo {group}</div>
            <div className="card" style={{ borderRadius: '0 0 12px 12px', padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--c-border)', color: 'var(--c-text-3)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600 }}>Equipo</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>PJ</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>G</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>E</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>P</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>GF</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>GC</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>DG</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((t, i) => (
                    <tr key={t.team} style={{
                      borderBottom: i < standings.length - 1 ? '1px solid var(--c-border)' : 'none',
                      background: i < 2 ? 'var(--c-green-bg)' : 'transparent',
                    }}>
                      <td style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                        <span style={{ color: 'var(--c-text-3)', fontSize: 11, width: 12 }}>{i + 1}</span>
                        <Flag team={t.team} size={18} />
                        {t.team}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>{t.pj}</td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>{t.g}</td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>{t.e}</td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>{t.p}</td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>{t.gf}</td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>{t.gc}</td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>{t.gf - t.gc > 0 ? '+' : ''}{t.gf - t.gc}</td>
                      <td style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 700 }}>{t.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      <p style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: '1rem' }}>
        🟩 Posiciones resaltadas = clasifican a octavos de final (primeros dos de cada grupo)
      </p>
    </div>
  )
}
