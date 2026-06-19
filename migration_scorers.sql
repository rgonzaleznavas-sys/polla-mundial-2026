-- =============================================
-- MIGRACIÓN: agregar goleadores a resultados
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

ALTER TABLE results ADD COLUMN IF NOT EXISTS scorers text;

-- scorers guarda texto libre, ej: "Messi 17', 60', 76'"
