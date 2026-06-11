import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@karhabti/i18n', '@karhabti/types', '@karhabti/validation'],
  experimental: {
    // The app lives in a pnpm monorepo; trace files from the workspace root.
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
};

export default nextConfig;
