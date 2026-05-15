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

export default withSerwist(nextConfig);
