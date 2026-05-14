import type { ToolSet } from 'ai';
import { mealTools } from './sets/meal';
import { nutritionTargetsTools } from './sets/nutrition-targets';
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
const TOOLSETS: ChatToolset[] = [weightTools, mealTools, nutritionTargetsTools];

export interface BuildChatToolsOptions {
  /**
   * Optional Whitelist von Tool-Namen. Wenn gesetzt, werden nur diese Tools
   * exposed. Nützlich für spezialisierte Agents (z.B. Nutrition-Coach), die
   * nur einen Teil der Tools brauchen sollen, damit das LLM nicht abdriftet.
   */
  include?: string[];
}

export function buildChatTools(ctx: ChatToolContext, options: BuildChatToolsOptions = {}): ToolSet {
  const merged: ToolSet = {};
  for (const set of TOOLSETS) {
    Object.assign(merged, set(ctx));
  }
  if (!options.include) return merged;
  const allowed = new Set(options.include);
  const filtered: ToolSet = {};
  for (const [name, tool] of Object.entries(merged)) {
    if (allowed.has(name)) filtered[name] = tool;
  }
  return filtered;
}
