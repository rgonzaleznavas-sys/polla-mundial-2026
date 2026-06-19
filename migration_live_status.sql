-- Agregar columna de estado en vivo (minuto del partido o null si no está jugando)
ALTER TABLE results ADD COLUMN IF NOT EXISTS live_status text;
