import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@/cli': resolve(__dirname, './src/cli/index.js'),
      '@/config': resolve(__dirname, './src/config/index.js'),
      '@/docker': resolve(__dirname, './src/docker/index.js'),
      '@/git': resolve(__dirname, './src/git/index.js'),
      '@/monorepo': resolve(__dirname, './src/monorepo/index.js'),
    },

    extensions: ['.js', '.ts', '.json'], // 👈 Important
  },
  test: {
    disableConsoleIntercept: true,
    setupFiles: ['tsx/esm'],
  },
});
