-- =============================================
-- POLLA MUNDIAL 2026 — Supabase Schema
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

-- Tabla de participantes
CREATE TABLE players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índice para búsqueda por nombre (case-insensitive)
CREATE INDEX players_name_lower ON players (lower(name));

-- Tabla de pronósticos
CREATE TABLE picks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  match_id integer NOT NULL,
  home_score integer,
  away_score integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(player_id, match_id)
);

-- Tabla de resultados reales (solo admin los ingresa)
CREATE TABLE results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id integer NOT NULL UNIQUE,
  home_score integer NOT NULL,
  away_score integer NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Players: cualquiera puede leer e insertar (registro libre)
CREATE POLICY "players_select" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT WITH CHECK (true);

-- Picks: cualquiera puede leer, insertar y actualizar (el control es por player_id en la app)
CREATE POLICY "picks_select" ON picks FOR SELECT USING (true);
CREATE POLICY "picks_insert" ON picks FOR INSERT WITH CHECK (true);
CREATE POLICY "picks_update" ON picks FOR UPDATE USING (true);
CREATE POLICY "picks_upsert" ON picks FOR INSERT WITH CHECK (true);

-- Results: solo lectura pública, escritura libre (la clave admin la controla la app)
CREATE POLICY "results_select" ON results FOR SELECT USING (true);
CREATE POLICY "results_insert" ON results FOR INSERT WITH CHECK (true);
CREATE POLICY "results_update" ON results FOR UPDATE USING (true);
