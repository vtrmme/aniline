-- Tabla de perfiles de usuario (Google/NextAuth)
-- Ejecutar en el SQL Editor de Supabase (seguro de ejecutar varias veces)

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  image TEXT,
  provider TEXT DEFAULT 'google',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrar tabla existente que use "id" en lugar de "user_id"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN id TO user_id;
  END IF;
END $$;

-- Asegurar columnas si la tabla ya existía sin ellas
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'google';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Asegurar clave primaria en user_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.profiles ADD PRIMARY KEY (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Sin políticas públicas: acceso solo vía service_role desde el servidor
