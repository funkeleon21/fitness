import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
