import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@fitness/core',
    '@fitness/db',
    '@fitness/ingestion',
    '@fitness/interpretation',
  ],
};

export default nextConfig;
