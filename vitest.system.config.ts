import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/system/**/*.test.ts'],
    testTimeout: 180_000,
    fileParallelism: false,
  },
});
