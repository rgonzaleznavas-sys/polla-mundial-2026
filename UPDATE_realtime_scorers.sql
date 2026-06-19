-- =============================================
-- ACTUALIZACIÓN: goleadores + tiempo real
-- Ejecutar en: Supabase > SQL Editor
-- =============================================

-- 1. Agregar columna de goleadores (texto libre)
ALTER TABLE results ADD COLUMN IF NOT EXISTS scorers text;

-- 2. Activar Realtime para que la tabla se actualice sola
ALTER PUBLICATION supabase_realtime ADD TABLE results;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE picks;

-- Nota: si alguna tabla da error "ya existe en la publicación", ignóralo y sigue con la siguiente línea.
