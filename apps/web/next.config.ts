import { withSentryConfig } from '@sentry/nextjs';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  cacheOnNavigation: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  transpilePackages: [
    '@fitness/core',
    '@fitness/db',
    '@fitness/ingestion',
    '@fitness/interpretation',
  ],
};

export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  // Source-Map-Upload und Release-Tracking laufen nur, wenn SENTRY_AUTH_TOKEN
  // gesetzt ist (Vercel-Build). Ohne Token: stiller Skip, Build funktioniert
  // weiter — Errors landen dann ohne Stacktrace-Symbolication im Sentry-UI.
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
