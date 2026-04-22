import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{js,mjs}'],
    setupFiles: ['tests/setup/env.js'],
  },
});
