// /api/sync-results.js
// Consulta worldcup26.ir (gratis, sin API key) que incluye marcador EN VIVO
// (time_elapsed) además de resultados finales, y actualiza Supabase.
// Se ejecuta automáticamente vía Vercel Cron, el auto-sync del frontend (cada 20s),
// o manualmente desde el botón "Actualizar ahora" en el panel Admin.

import { createClient } from '@supabase/supabase-js'

const TEAMS_URL = 'https://worldcup26.ir/get/teams'
const GAMES_URL = 'https://worldcup26.ir/get/games'

// Mapeo de nombres en inglés (worldcup26.ir) -> nombres usados en la app
const TEAM_NAME_MAP = {
  'Mexico': 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'Chequia',
  'Canada': 'Canadá',
  'Bosnia and Herzegovina': 'Bosnia & Herz.',
  'United States': 'Estados Unidos',
  'USA': 'Estados Unidos',
  'Paraguay': 'Paraguay',
  'Haiti': 'Haití',
  'Scotland': 'Escocia',
  'Australia': 'Australia',
  'Turkey': 'Turquía',
  'Brazil': 'Brasil',
  'Morocco': 'Marruecos',
  'Qatar': 'Catar',
  'Switzerland': 'Suiza',
  'Ivory Coast': 'Costa de Marfil',
  'Ecuador': 'Ecuador',
  'Germany': 'Alemania',
  'Curaçao': 'Curazao',
  'Curacao': 'Curazao',
  'Netherlands': 'Países Bajos',
  'Japan': 'Japón',
  'Sweden': 'Suecia',
  'Tunisia': 'Túnez',
  'Saudi Arabia': 'Arabia Saudita',
  'Uruguay': 'Uruguay',
  'Spain': 'España',
  'Cape Verde': 'Cabo Verde',
  'Iran': 'Irán',
  'New Zealand': 'Nueva Zelanda',
  'Belgium': 'Bélgica',
  'Egypt': 'Egipto',
  'France': 'Francia',
  'Senegal': 'Senegal',
  'Iraq': 'Irak',
  'Norway': 'Noruega',
  'Argentina': 'Argentina',
  'Algeria': 'Argelia',
  'Austria': 'Austria',
  'Jordan': 'Jordania',
  'Ghana': 'Ghana',
  'Panama': 'Panamá',
  'England': 'Inglaterra',
  'Croatia': 'Croacia',
  'Portugal': 'Portugal',
  'Democratic Republic of the Congo': 'RD Congo',
  'DR Congo': 'RD Congo',
  'Uzbekistan': 'Uzbekistán',
  'Colombia': 'Colombia',
}

function normalizeTeam(name) {
  if (!name) return name
  return TEAM_NAME_MAP[name] || name
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const [teamsRes, gamesRes] = await Promise.all([
      fetch(TEAMS_URL),
      fetch(GAMES_URL),
    ])

    if (!teamsRes.ok || !gamesRes.ok) {
      return res.status(502).json({ error: 'worldcup26.ir request failed' })
    }

    const teamsData = await teamsRes.json()
    const gamesData = await gamesRes.json()

    const teams = teamsData.teams || []
    const games = gamesData.games || gamesData.matches || []

    // Mapa id de equipo -> nombre normalizado
    const teamById = {}
    teams.forEach(t => { teamById[t.id] = normalizeTeam(t.name_en) })

    const { MATCHES } = await import('../src/lib/matches.js')

    let updated = 0
    let liveCount = 0
    const errors = []

    for (const game of games) {
      const homeId = game.home_team_id
      const awayId = game.away_team_id
      if (!homeId || !awayId || homeId === '0' || awayId === '0') continue

      const homeName = teamById[homeId]
      const awayName = teamById[awayId]
      if (!homeName || !awayName) continue

      const localMatch = MATCHES.find(m => m.home === homeName && m.away === awayName)
      if (!localMatch) continue

      const isLive = game.time_elapsed && game.time_elapsed !== 'notstarted' && game.time_elapsed !== 'finished'
      const isFinished = game.finished === true || game.finished === 'TRUE'
      const hasScore = game.home_score !== null && game.home_score !== undefined && game.home_score !== ''

      // Solo actualizamos si el partido ya empezó (en vivo) o terminó, y tiene marcador
      if (!isLive && !isFinished) continue
      if (!hasScore) continue

      let scorers = null
      const parseScorers = (raw) => {
        if (!raw || raw === 'null') return []
        try {
          const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
          if (!Array.isArray(arr)) return []
          return arr.map(g => `${g.name || g.player || '?'} ${g.minute || ''}'`.trim())
        } catch {
          return []
        }
      }
      const homeScorers = parseScorers(game.home_scorers)
      const awayScorers = parseScorers(game.away_scorers)
      const allScorers = [...homeScorers, ...awayScorers]
      if (allScorers.length) scorers = allScorers.join(', ')

      const { error } = await supabase.from('results').upsert(
        {
          match_id: localMatch.id,
          home_score: parseInt(game.home_score) || 0,
          away_score: parseInt(game.away_score) || 0,
          scorers,
          live_status: isFinished ? null : (isLive ? game.time_elapsed : null),
        },
        { onConflict: 'match_id' }
      )

      if (error) {
        errors.push({ match_id: localMatch.id, error: error.message })
      } else {
        updated++
        if (isLive) liveCount++
      }
    }

    return res.status(200).json({
      ok: true,
      gamesFromSource: games.length,
      updated,
      liveNow: liveCount,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
