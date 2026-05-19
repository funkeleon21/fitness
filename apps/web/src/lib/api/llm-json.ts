// LLMs verpacken JSON gerne in ```json ... ``` oder ``` ... ``` trotz expliziter
// Anweisung. Strippt fuehrende/nachfolgende Fences und Whitespace, damit
// JSON.parse direkt damit klarkommt. Fallback: erstes { bis letztes } extrahieren
// — robust gegen Vor-/Nachgeschwafel.
export function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}
