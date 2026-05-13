import type { SupabaseClient } from '@supabase/supabase-js';
import { getMealContext } from './sections/meal';
import { getWeightContext } from './sections/weight';
import type { UserContextProvider, UserContextSection } from './types';

/**
 * Registry aller aktiven Kontext-Provider. Neue Domäne hinzufügen:
 * 1. Provider-Funktion in `./sections/<domain>.ts` schreiben
 * 2. Hier in die Liste eintragen
 *
 * Reihenfolge bestimmt die Reihenfolge im gerenderten Prompt.
 */
const PROVIDERS: UserContextProvider[] = [getWeightContext, getMealContext];

export async function buildUserContext(
  client: SupabaseClient,
  userId: string,
): Promise<UserContextSection[]> {
  return Promise.all(PROVIDERS.map((p) => p(client, userId)));
}

export function renderContextForPrompt(sections: UserContextSection[]): string {
  if (sections.length === 0) return '';

  const lines: string[] = ['## Aktueller Stand des Nutzers', ''];

  for (const section of sections) {
    lines.push(`### ${section.label}`);
    lines.push(section.summary);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
