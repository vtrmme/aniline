-- ============================================
-- Supabase Setup para AniLine
-- Ejecutar en el SQL Editor de Supabase
-- (Se puede ejecutar varias veces sin errores)
-- ============================================

-- 1. Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de animes
CREATE TABLE IF NOT EXISTS animes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT,
  sinopsis_es TEXT,
  sinopsis_en TEXT,
  poster_url TEXT,
  banner_url TEXT,
  genero TEXT[],
  anio INTEGER,
  estado TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de episodios
CREATE TABLE IF NOT EXISTS episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  title_es TEXT,
  title_en TEXT,
  video_url TEXT,
  youtube_url TEXT,
  orden INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(anime_id, numero)
);

-- 4. Tabla de watchlist
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
  estado TEXT CHECK (estado IN ('para_ver', 'viendo', 'visto')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- 5. Habilitar RLS
ALTER TABLE animes ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de lectura pública para animes y episodios
DROP POLICY IF EXISTS "animes_public_read" ON animes;
CREATE POLICY "animes_public_read" ON animes FOR SELECT USING (true);

DROP POLICY IF EXISTS "episodes_public_read" ON episodes;
CREATE POLICY "episodes_public_read" ON episodes FOR SELECT USING (true);

-- 7. Políticas de watchlist (solo el propietario)
DROP POLICY IF EXISTS "watchlist_owner_all" ON watchlists;
CREATE POLICY "watchlist_owner_all" ON watchlists FOR ALL USING (auth.uid() = user_id);

-- 8. Crear bucket de almacenamiento para videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'episode-videos',
  'episode-videos',
  false,
  524288000, -- 500 MB
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska']
)
ON CONFLICT (id) DO NOTHING;

-- 9. Políticas del bucket episode-videos
DROP POLICY IF EXISTS "episode-videos-public-read" ON storage.objects;
CREATE POLICY "episode-videos-public-read" ON storage.objects
FOR SELECT USING ( bucket_id = 'episode-videos' );

DROP POLICY IF EXISTS "episode-videos-authenticated-upload" ON storage.objects;
CREATE POLICY "episode-videos-authenticated-upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'episode-videos'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "episode-videos-owner-delete" ON storage.objects;
CREATE POLICY "episode-videos-owner-delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'episode-videos'
  AND auth.uid() = owner
);

DROP POLICY IF EXISTS "episode-videos-owner-update" ON storage.objects;
CREATE POLICY "episode-videos-owner-update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'episode-videos'
  AND auth.uid() = owner
);
