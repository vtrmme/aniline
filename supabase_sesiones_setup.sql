create table if not exists public.sesiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  anime_id uuid not null,
  episodio_numero int not null check (episodio_numero >= 1),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_seen_at timestamptz not null default now(),
  segundos_visto int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sesiones_user_started_idx
  on public.sesiones (user_id, started_at desc);

create index if not exists sesiones_anime_ep_idx
  on public.sesiones (anime_id, episodio_numero, started_at desc);
