-- ============================================
-- Migración streaming para AniLine (idempotente)
-- Ejecutar en el SQL Editor de Supabase
-- NO borra nada: solo añade columnas/índices
-- ============================================

-- 1. Columna anilist_id en animes (para los embeds por ID de AniList)
ALTER TABLE animes ADD COLUMN IF NOT EXISTS anilist_id INTEGER;

-- 2. Rellenar anilist_id desde el prefijo del slug ({id}-{titulo})
UPDATE animes
SET anilist_id = NULLIF(regexp_replace(slug, '^([0-9]+)-.*$', '\1'), '')::INTEGER
WHERE anilist_id IS NULL
  AND slug ~ '^[0-9]+-';

-- 3. Índice para buscar rápido por anilist_id
CREATE INDEX IF NOT EXISTS idx_animes_anilist_id ON animes(anilist_id);

-- 4. Columna segundos en historial (progreso de reproducción en segundos)
--    La tabla historial ya existe en tu BD; si no existiera, la crea igual.
CREATE TABLE IF NOT EXISTS historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
  episodio_numero INTEGER NOT NULL,
  segundos INTEGER NOT NULL DEFAULT 0,
  visto_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, anime_id, episodio_numero)
);

ALTER TABLE historial ADD COLUMN IF NOT EXISTS segundos INTEGER NOT NULL DEFAULT 0;

-- 5. RLS para historial (si no lo tenía)
ALTER TABLE historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historial_owner_all" ON historial;
CREATE POLICY "historial_owner_all" ON historial
FOR ALL USING (user_id = auth.uid()::text);

-- 5b. Restricción única de episodios (evita duplicados anime+número)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'episodes_anime_id_numero_key'
      AND conrelid = 'episodes'::regclass
  ) THEN
    ALTER TABLE episodes ADD CONSTRAINT episodes_anime_id_numero_key UNIQUE (anime_id, numero);
  END IF;
END $$;

-- 6. Asegurar columnas que ya usa el código pero no estaban en supabase_setup.sql
ALTER TABLE animes ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE animes ADD COLUMN IF NOT EXISTS estudio TEXT;
ALTER TABLE animes ADD COLUMN IF NOT EXISTS puntuacion REAL;
ALTER TABLE animes ADD COLUMN IF NOT EXISTS episodios_count INTEGER;
ALTER TABLE animes ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE animes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE episodes ADD COLUMN IF NOT EXISTS sinopsis_es TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS sinopsis_en TEXT;

ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS puntuacion REAL;
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS progreso INTEGER;
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
