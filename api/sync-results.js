// /api/sync-results.js
// Consulta API-Football por los partidos del Mundial 2026 y actualiza Supabase
// Se ejecuta automáticamente vía Vercel Cron (ver vercel.json)

import { createClient } from '@supabase/supabase-js'

// Mapeo de nombres de equipo de API-Football -> nombres usados en la app
const TEAM_NAME_MAP = {
  'Mexico': 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'Chequia',
  'Canada': 'Canadá',
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

function normalizeTeam(apiName) {
  return TEAM_NAME_MAP[apiName] || apiName
}

export default async function handler(req, res) {
  // Protección simple: solo Vercel Cron o llamadas con el secret pueden ejecutar esto
  const authHeader = req.headers['authorization']
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const apiKey = process.env.API_FOOTBALL_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Traer fixtures del Mundial 2026 (league=1, season=2026) desde API-Football
    const apiRes = await fetch(
      'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
      {
        headers: {
          'x-apisports-key': apiKey,
        },
      }
    )

    if (!apiRes.ok) {
      const text = await apiRes.text()
      return res.status(502).json({ error: 'API-Football request failed', detail: text })
    }

    const apiData = await apiRes.json()
    const fixtures = apiData.response || []

    // Traer nuestros partidos locales (los 72 de fase de grupos) para hacer match por equipos
    const { MATCHES } = await import('../src/lib/matches.js')

    let updated = 0
    const errors = []

    for (const fixture of fixtures) {
      const homeApi = normalizeTeam(fixture.teams?.home?.name)
      const awayApi = normalizeTeam(fixture.teams?.away?.name)
      const status = fixture.fixture?.status?.short // 'FT' = finalizado, 'NS' = no iniciado, '1H','2H', etc = en vivo
      const homeGoals = fixture.goals?.home
      const awayGoals = fixture.goals?.away

      // Solo nos interesan partidos con marcador disponible (en vivo o finalizados)
      if (homeGoals === null || awayGoals === null) continue

      // Buscar el match_id local correspondiente por nombres de equipo
      const localMatch = MATCHES.find(
        m => m.home === homeApi && m.away === awayApi
      )
      if (!localMatch) continue

      // Armar texto de goleadores si hay eventos disponibles
      let scorers = null
      if (fixture.events) {
        const goals = fixture.events.filter(e => e.type === 'Goal')
        if (goals.length) {
          scorers = goals
            .map(g => `${g.player?.name || '?'} ${g.time?.elapsed}'${g.time?.extra ? '+' + g.time.extra : ''}`)
            .join(', ')
        }
      }

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
      fixturesFromApi: fixtures.length,
      updated,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
