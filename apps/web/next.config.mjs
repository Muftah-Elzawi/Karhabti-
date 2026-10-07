import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output emits absolute symlinks into the pnpm store — recursive
  // deletes on Windows follow them and corrupt node_modules. Only Docker
  // builds (Linux) set NEXT_OUTPUT=standalone; local builds skip it.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  transpilePackages: ['@karhabti/i18n', '@karhabti/types', '@karhabti/ui', '@karhabti/validation'],
  experimental: {
    // The app lives in a pnpm monorepo; trace files from the workspace root.
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
};

export default nextConfig;
