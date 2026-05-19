// Zentrales Helfer-Modul fuer Next-API-Routes: JSON-Response konsistent
// erzeugen, damit nicht jede Route ihre eigene Variante mit leicht abweichenden
// Headern definiert.

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
