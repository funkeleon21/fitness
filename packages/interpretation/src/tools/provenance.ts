import type { EventProvenance } from '@fitness/core';

const CHAT_MODEL = 'claude-sonnet-4-6-default';
const CHAT_PROMPT_VERSION = 'labor-chat-tools-v1';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const obj = value as Record<string, unknown>;
  const entries = Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`);
  return `{${entries.join(',')}}`;
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function toolRawInput(rawInput: string | null | undefined, fallback: unknown): string {
  const trimmed = rawInput?.trim();
  if (trimmed) return trimmed;
  return stableStringify(fallback);
}

export function toolProvenance(rawInput: string): EventProvenance {
  return {
    provider: 'langdock',
    model: CHAT_MODEL,
    prompt_hash: shortHash(CHAT_PROMPT_VERSION),
    input_hash: shortHash(rawInput),
  };
}

export function toolExternalId(toolName: string, input: unknown): string {
  return `${toolName}:${shortHash(stableStringify(input))}`;
}
