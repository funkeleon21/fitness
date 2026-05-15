'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body>
        <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1>Etwas ist schiefgelaufen.</h1>
          <p>Der Fehler wurde an das Monitoring gemeldet. Bitte Seite neu laden.</p>
        </main>
      </body>
    </html>
  );
}
