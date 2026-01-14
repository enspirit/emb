import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120000, // 2 minutes for docs validation
    hookTimeout: 60000,
  },
});
