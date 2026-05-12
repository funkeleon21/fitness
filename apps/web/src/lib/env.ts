function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  }
  return value;
}

// Public-safe (NEXT_PUBLIC_*) — landen im Browser-Bundle.
export const env = {
  SUPABASE_URL: required('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_PUBLISHABLE_KEY: required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
};

// Server-only — lazy ausgewertet, damit der Browser-Build nicht über fehlende Server-Vars stolpert.
export function serverEnv() {
  return {
    LANGDOCK_API_KEY: required('LANGDOCK_API_KEY'),
  };
}
