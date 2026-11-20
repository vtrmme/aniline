function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const serverEnv = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get GOOGLE_CLIENT_ID() {
    return required("GOOGLE_CLIENT_ID");
  },
  get GOOGLE_CLIENT_SECRET() {
    return required("GOOGLE_CLIENT_SECRET");
  },
  get NEXTAUTH_SECRET() {
    return required("NEXTAUTH_SECRET");
  },
  get NEXTAUTH_URL() {
    return optional("NEXTAUTH_URL");
  },
  get TMDB_API_KEY() {
    return optional("TMDB_API_KEY");
  },
  get SUBDL_API_KEY() {
    return optional("SUBDL_API_KEY");
  },
  get STREAM_RESOLVER_URL() {
    return optional("STREAM_RESOLVER_URL");
  },
  get UPSTASH_REDIS_REST_URL() {
    return optional("UPSTASH_REDIS_REST_URL");
  },
  get UPSTASH_REDIS_REST_TOKEN() {
    return optional("UPSTASH_REDIS_REST_TOKEN");
  },
  get JINA_API_KEY() {
    return optional("JINA_API_KEY");
  },
  get VIDCDN_RELAY_URL() {
    return optional("VIDCDN_RELAY_URL");
  },
  get VIDCDN_RELAY_KEY() {
    return optional("VIDCDN_RELAY_KEY");
  },
  get OWNER_EMAIL() {
    return optional("OWNER_EMAIL");
  },
  get OWNER_USER_ID() {
    return optional("OWNER_USER_ID");
  },
};

export const publicEnv = {
  get NEXT_PUBLIC_SITE_URL() {
    return optional("NEXT_PUBLIC_SITE_URL");
  },
  get NEXT_PUBLIC_APK_DOWNLOAD_URL() {
    return optional("NEXT_PUBLIC_APK_DOWNLOAD_URL");
  },
  get NEXT_PUBLIC_STREAM_PROVIDERS() {
    return optional("NEXT_PUBLIC_STREAM_PROVIDERS");
  },
};
