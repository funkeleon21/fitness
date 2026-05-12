import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '../../.env.local' });
config({ path: '../../.env' });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL ist nicht gesetzt. Lege .env.local an (siehe .env.example) und trage die Supabase-Postgres-URI ein.',
  );
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
