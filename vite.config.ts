import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@/docker': resolve(__dirname, './src/docker'),
      '@/monorepo': resolve(__dirname, './src/monorepo'),
    },

    extensions: ['.js', '.ts', '.json'], // 👈 Important
  },
  test: {
    disableConsoleIntercept: true,
    setupFiles: ['tsx/esm'],
  },
});
