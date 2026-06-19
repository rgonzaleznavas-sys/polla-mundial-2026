// /api/sync-results.js
// Consulta el dataset público y gratuito de openfootball/worldcup.json
// (no requiere API key) y actualiza Supabase con los resultados reales.
// Se ejecuta automáticamente vía Vercel Cron, o manualmente desde el botón
// "Actualizar ahora" en el panel Admin.

import { createClient } from '@supabase/supabase-js'

const WORLDCUP_JSON_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

// Mapeo de nombres de equipo del dataset (en inglés) -> nombres usados en la app
const TEAM_NAME_MAP = {
  'Mexico': 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'Chequia',
  'Canada': 'Canadá',
  'Bosnia & Herzegovina': 'Bosnia & Herz.',
  'Bosnia and Herzegovina': 'Bosnia & Herz.',
  'USA': 'Estados Unidos',
  'United States': 'Estados Unidos',
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
  "Côte d'Ivoire": 'Costa de Marfil',
  'Ecuador': 'Ecuador',
  'Germany': 'Alemania',
  'Curacao': 'Curazao',
  'Curaçao': 'Curazao',
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
  'DR Congo': 'RD Congo',
  'Congo DR': 'RD Congo',
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
    const dataRes = await fetch(WORLDCUP_JSON_URL)
    if (!dataRes.ok) {
      const text = await dataRes.text()
      return res.status(502).json({ error: 'openfootball request failed', detail: text })
    }
    const data = await dataRes.json()
    const allMatches = data.matches || []

    const { MATCHES } = await import('../src/lib/matches.js')

    let updated = 0
    const errors = []

    for (const match of allMatches) {
      if (!match.score || !match.score.ft) continue

      const homeApi = normalizeTeam(match.team1)
      const awayApi = normalizeTeam(match.team2)
      const [homeGoals, awayGoals] = match.score.ft

      const localMatch = MATCHES.find(m => m.home === homeApi && m.away === awayApi)
      if (!localMatch) continue

      let scorers = null
      const goals1 = (match.goals1 || []).map(g => `${g.name} ${g.minute}'`)
      const goals2 = (match.goals2 || []).map(g => `${g.name} ${g.minute}'`)
      const allScorers = [...goals1, ...goals2]
      if (allScorers.length) scorers = allScorers.join(', ')

      const { error } = await supabase.from('results').upsert(
        {
          match_id: localMatch.id,
          home_score: homeGoals,
          away_score: awayGoals,
          scorers,
        },
        { onConflict: 'match_id' }
      )

      if (error) {
        errors.push({ match_id: localMatch.id, error: error.message })
      } else {
        updated++
      }
    }

    return res.status(200).json({
      ok: true,
      matchesFromSource: allMatches.length,
      updated,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
