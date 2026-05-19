import { jsonResponse } from './response';

// Wrapper fuer Next-Route-Handler. Sorgt fuer einheitliches strukturiertes
// Error-Logging und verhindert, dass interne Fehlermeldungen/Stacks zum Client
// leaken (statt dessen generisches "Interner Fehler").
//
// Domain-Fehler (z.B. ZodError-Antworten, 4xx vom Supabase-Client) muss der
// Handler selber via jsonResponse(..., 4xx) zuruckgeben — die werden hier nicht
// verschluckt, weil der Wrapper sie als regulaeren Return-Value durchreicht.
// Nur unerwartete Exceptions landen im Catch.
//
// Signatur ist bewusst generisch ueber `Args`, damit der Wrapper auch fuer
// Routes mit `ctx: { params: Promise<...> }` (z.B. /api/pantry/[id]) ohne
// TypeScript-Schmerzen funktioniert.
export function wrapApiHandler<Args extends unknown[]>(
  name: string,
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error('[api]', { route: name, message, stack });
      return jsonResponse({ error: 'Interner Fehler' }, 500);
    }
  };
}
