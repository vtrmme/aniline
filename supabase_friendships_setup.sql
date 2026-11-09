-- Tabla de amistades entre usuarios
-- Ejecutar en el SQL Editor de Supabase
-- Usamos email (texto) como identificador común entre NextAuth y Supabase Auth

CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  friend_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_email, friend_email)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_friendships_user_email ON friendships(user_email);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_email ON friendships(friend_email);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Habilitar RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (usando email en lugar de auth.uid())
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (true);

CREATE POLICY "Users can create friendship requests" ON friendships
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update friendship status" ON friendships
  FOR UPDATE WITH CHECK (true);

CREATE POLICY "Users can delete their own friendships" ON friendships
  FOR DELETE WITH CHECK (true);
