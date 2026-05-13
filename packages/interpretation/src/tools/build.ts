import type { ToolSet } from 'ai';
import { mealTools } from './sets/meal';
import { weightTools } from './sets/weight';
import type { ChatToolContext, ChatToolset } from './types';

/**
 * Registry aller aktiven Tool-Sets. Neue Domäne hinzufügen:
 * 1. Tool-Set-Funktion in `./sets/<domain>.ts` schreiben
 * 2. Hier in die Liste eintragen
 *
 * Tool-Namen müssen über Sets hinweg eindeutig sein (z.B. `log_weight`,
 * `log_meal`, `log_training` — niemals nur `log`).
 */
const TOOLSETS: ChatToolset[] = [weightTools, mealTools];

export function buildChatTools(ctx: ChatToolContext): ToolSet {
  const merged: ToolSet = {};
  for (const set of TOOLSETS) {
    Object.assign(merged, set(ctx));
  }
  return merged;
}
