import type { SupabaseClient } from '@supabase/supabase-js';
import type { ToolSet } from 'ai';

/**
 * Kontext, der jedem Tool-Set zur Laufzeit übergeben wird.
 * Das authentifizierte Supabase-Client trägt die User-Session — alle
 * Tool-Aufrufe laufen damit unter RLS, niemand kann fremde Daten anfassen.
 */
export interface ChatToolContext {
  client: SupabaseClient;
  userId: string;
}

/**
 * Factory für die Tools einer Domäne. Bekommt den User-Kontext und liefert
 * ein AI-SDK-konformes ToolSet zurück (Record von Tool-Name → Tool-Definition).
 */
export type ChatToolset = (ctx: ChatToolContext) => ToolSet;
