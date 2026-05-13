import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ein Kontext-Block pro Domäne. Wird im System-Prompt des Chats gerendert,
 * damit der Assistent weiß, was über den Nutzer aktuell bekannt ist.
 *
 * `available: false` heißt: die Domäne existiert, aber es liegen noch keine
 * Daten vor. Wir rendern sie trotzdem, damit der Assistent das ausspricht
 * statt zu raten (Prinzip 7 — wissenschaftliche Ehrlichkeit).
 */
export interface UserContextSection {
  domain: string;
  label: string;
  available: boolean;
  summary: string;
}

export type UserContextProvider = (
  client: SupabaseClient,
  userId: string,
) => Promise<UserContextSection>;
