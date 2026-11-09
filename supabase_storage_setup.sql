-- Ejecutar en el SQL Editor de Supabase
-- Crea el bucket de almacenamiento para videos de episodios

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'episode-videos',
  'episode-videos',
  false,
  524288000, -- 500 MB
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket episode-videos

-- Permitir lectura pública de videos (para reproducir)
CREATE POLICY "episode-videos-public-read" ON storage.objects
FOR SELECT USING ( bucket_id = 'episode-videos' );

-- Permitir subida solo a usuarios autenticados
CREATE POLICY "episode-videos-authenticated-upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'episode-videos'
  AND auth.uid() IS NOT NULL
);

-- Permitir eliminar solo al propietario
CREATE POLICY "episode-videos-owner-delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'episode-videos'
  AND auth.uid() = owner
);

-- Permitir actualizar solo al propietario
CREATE POLICY "episode-videos-owner-update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'episode-videos'
  AND auth.uid() = owner
);
