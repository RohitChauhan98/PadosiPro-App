import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/env.ts'],
    // Single shared SQLite file: run test files sequentially.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
