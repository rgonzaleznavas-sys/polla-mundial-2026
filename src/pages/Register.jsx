import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Register({ onReady }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')

    // Check if player already exists
    const { data: existing } = await supabase
      .from('players')
      .select('id, name')
      .ilike('name', trimmed)
      .single()

    if (existing) {
      onReady(existing)
      setLoading(false)
      return
    }

    // Create new player
    const { data, error: err } = await supabase
      .from('players')
      .insert({ name: trimmed })
      .select('id, name')
      .single()

    if (err) {
      setError('Error al registrar. Intenta de nuevo.')
      setLoading(false)
      return
    }

    onReady(data)
    setLoading(false)
  }

  return (
    <div className="card" style={{ maxWidth: 400 }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Registrarse</h2>
      <p style={{ fontSize: 13, color: 'var(--c-text-2)', marginBottom: '1rem' }}>
        Ingresa tu nombre para guardar tus pronósticos. Si ya te registraste antes, usa el mismo nombre para continuar.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="text"
          placeholder="Tu nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        <button type="submit" className="primary" disabled={loading || !name.trim()}>
          {loading ? 'Cargando...' : 'Entrar →'}
        </button>
        {error && <p style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</p>}
      </form>
      <p style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: '1rem' }}>
        Puntuación: resultado exacto = 3pts · empate exacto = 5pts · ganador correcto = 1pt
      </p>
    </div>
  )
}
