import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{js,mjs}'],
    setupFiles: ['tests/setup/env.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        'src/config/database.js',
        'src/config/logger.js',
        'src/config/stripe.js',
      ],
    },
  },
});
